
// Admin reviews for FICTIONAL demo payments.

import express from "express";
import { createHash, randomUUID } from "node:crypto";
import db from "../db.js";

const router = express.Router();

const origins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
]);

function cents(value) {
  const text = String(value);

  if (!/^\d{1,8}\.\d{2}$/.test(text)) {
    throw new Error("Invalid payment amount.");
  }

  const [whole, fraction] = text.split(".");
  return Number(whole) * 100 + Number(fraction);
}

router.patch("/:paymentId/review", async (req, res, next) => {
  const paymentId = Number(req.params.paymentId);

  if (!Number.isSafeInteger(paymentId) || paymentId < 1) {
    return next();
  }

  let connection;
  let inTransaction = false;

  try {
    // Preserve the existing manual-payment review.
    const [kinds] = await db.execute(
      "SELECT payment_method FROM booking_payments WHERE payment_id = ? LIMIT 1",
      [paymentId]
    );

    if (!String(kinds[0]?.payment_method ?? "").startsWith("demo_")) {
      return next();
    }

    // Authenticate the administrator.
    const token = req.cookies?.tf_session;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      return res.status(401).json({
        success: false,
        message: "Log in as admin.",
      });
    }

    const hash = createHash("sha256")
      .update(token)
      .digest("hex");

    const [admins] = await db.execute(
      `SELECT u.user_id
       FROM user_sessions s
       JOIN users u ON u.user_id = s.user_id
       WHERE s.session_hash = ?
         AND s.expires_at > UTC_TIMESTAMP()
         AND u.account_status = 'active'
         AND u.role = 'admin'
       LIMIT 1`,
      [hash]
    );

    if (!admins.length) {
      return res.status(403).json({
        success: false,
        message: "Admin account required.",
      });
    }

    if (
      !origins.has(req.get("Origin")) ||
      req.get("X-TF-Action") !== "manual-payment"
    ) {
      return res.status(403).json({
        success: false,
        message: "Untrusted payment action.",
      });
    }

    const action = req.body?.action;

    const remarks =
      typeof req.body?.remarks === "string"
        ? req.body.remarks.trim()
        : "";

    if (
      !["approve", "reject"].includes(action) ||
      remarks.length < 10 ||
      remarks.length > 350 ||
      (
        action === "approve" &&
        req.body?.independently_verified !== true
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Select approve/reject, enter 10–350 characters, " +
          "and confirm the demo review before approval.",
      });
    }

    const [owners] = await db.execute(
      `SELECT b.student_id, ts.tutor_id
       FROM booking_payments p
       JOIN bookings b
         ON b.booking_id = p.booking_id
       JOIN tutor_subjects ts
         ON ts.offering_id = b.offering_id
       WHERE p.payment_id = ?
       LIMIT 1`,
      [paymentId]
    );

    if (!owners.length) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    inTransaction = true;

    // Lock student and tutor records.
    await connection.execute(
      "SELECT user_id FROM users WHERE user_id = ? FOR UPDATE",
      [owners[0].student_id]
    );

    await connection.execute(
      "SELECT tutor_id FROM tutor_profiles WHERE tutor_id = ? FOR UPDATE",
      [owners[0].tutor_id]
    );

    const [payments] = await connection.execute(
      `SELECT
          p.payment_id,
          p.booking_id,
          p.payment_status,
          p.payment_method,
          p.payment_reference,
          p.amount_due,
          p.amount_paid,
          p.amount_refunded,
          p.currency,
          b.student_id,
          b.total_amount,
          b.booking_status,
          ts.tutor_id
       FROM booking_payments p
       JOIN bookings b
         ON b.booking_id = p.booking_id
       JOIN tutor_subjects ts
         ON ts.offering_id = b.offering_id
       WHERE p.payment_id = ?
       FOR UPDATE`,
      [paymentId]
    );

    const payment = payments[0];

    if (
      !payment ||
      payment.payment_status !== "pending_verification" ||
      !["accepted", "completed"].includes(payment.booking_status) ||
      !String(payment.payment_method).startsWith("demo_")
    ) {
      await connection.rollback();
      inTransaction = false;

      return res.status(409).json({
        success: false,
        message: "This demo payment is no longer awaiting review.",
      });
    }

    const [attempts] = await connection.execute(
      `SELECT
          attempt_id,
          payment_method,
          source_last4,
          attempt_status
       FROM demo_payment_attempts
       WHERE booking_id = ?
         AND student_id = ?
         AND attempt_reference = ?
       FOR UPDATE`,
      [
        payment.booking_id,
        payment.student_id,
        payment.payment_reference,
      ]
    );

    const attempt = attempts[0];

    if (
      !attempt ||
      attempt.attempt_status !== "pending_review" ||
      payment.payment_method !== `demo_${attempt.payment_method}`
    ) {
      await connection.rollback();
      inTransaction = false;

      return res.status(409).json({
        success: false,
        message: "Demo attempt cannot be verified. Refresh the queue.",
      });
    }

    // =====================================
    // APPROVE THE SIMULATED PAYMENT
    // =====================================

    if (action === "approve") {
      if (
        payment.currency !== "PHP" ||
        cents(payment.amount_due) !== cents(payment.total_amount) ||
        cents(payment.amount_paid) !== 0 ||
        cents(payment.amount_refunded) !== 0
      ) {
        await connection.rollback();
        inTransaction = false;

        return res.status(409).json({
          success: false,
          message: "Payment amount requires administrator review.",
        });
      }

      // Prevent duplicate simulated receipts.
      const [existing] = await connection.execute(
        "SELECT receipt_id FROM demo_payment_receipts WHERE booking_id = ? LIMIT 1",
        [payment.booking_id]
      );

      if (existing.length) {
        await connection.rollback();
        inTransaction = false;

        return res.status(409).json({
          success: false,
          message: "A demo receipt already exists.",
        });
      }

      const [fees] = await connection.execute(
        "SELECT commission_bps FROM platform_fee_config WHERE config_id = 1 LIMIT 1"
      );

      const bps = Number(fees[0]?.commission_bps);

      if (
        !Number.isInteger(bps) ||
        bps < 0 ||
        bps > 10000
      ) {
        throw new Error("Platform commission is not configured.");
      }

      const gross = cents(payment.amount_due);
      const platformFee = Math.round(gross * bps / 10000);
      const tutorShare = gross - platformFee;

      const receiptNumber =
        `TF-DEMO-${randomUUID()}`;

      const [receipt] = await connection.execute(
        `INSERT INTO demo_payment_receipts
         (
           attempt_id,
           booking_id,
           student_id,
           tutor_id,
           receipt_number,
           payment_method,
           source_last4,
           currency,
           gross_cents,
           commission_bps,
           platform_fee_cents,
           tutor_earnings_cents,
           receipt_status
         )
         VALUES (
           ?, ?, ?, ?, ?, ?, ?,
           'PHP', ?, ?, ?, ?, 'paid'
         )`,
        [
          attempt.attempt_id,
          payment.booking_id,
          payment.student_id,
          payment.tutor_id,
          receiptNumber,
          attempt.payment_method,
          attempt.source_last4,
          gross,
          bps,
          platformFee,
          tutorShare,
        ]
      );

      // Credit fictional tutor earnings.
      if (tutorShare > 0) {
        await connection.execute(
          `INSERT INTO demo_earnings_ledger
           (
             receipt_id,
             beneficiary_type,
             beneficiary_user_id,
             entry_type,
             amount_delta_cents
           )
           VALUES (?, 'tutor', ?, 'payment_credit', ?)`,
          [
            receipt.insertId,
            payment.tutor_id,
            tutorShare,
          ]
        );
      }

      // Record fictional platform commission.
      if (platformFee > 0) {
        await connection.execute(
          `INSERT INTO demo_earnings_ledger
           (
             receipt_id,
             beneficiary_type,
             beneficiary_user_id,
             entry_type,
             amount_delta_cents
           )
           VALUES (?, 'platform', NULL, 'payment_credit', ?)`,
          [receipt.insertId, platformFee]
        );
      }

      await connection.execute(
        "UPDATE demo_payment_attempts SET attempt_status = 'paid' WHERE attempt_id = ?",
        [attempt.attempt_id]
      );

      const [updated] = await connection.execute(
        `UPDATE booking_payments
         SET payment_status = 'paid',
             amount_paid = amount_due,
             payment_reference = ?,
             verified_by = ?,
             verified_at = UTC_TIMESTAMP(),
             paid_at = UTC_TIMESTAMP(),
             remarks = ?
         WHERE payment_id = ?
           AND payment_status = 'pending_verification'`,
        [
          receiptNumber,
          admins[0].user_id,
          `SIMULATED payment approved by admin: ${remarks}`.slice(0, 500),
          paymentId,
        ]
      );

      if (updated.affectedRows !== 1) {
        throw new Error("Payment changed during approval.");
      }

      await connection.execute(
        `INSERT INTO booking_payment_history
         (
           payment_id,
           changed_by_user_id,
           old_status,
           new_status,
           remarks
         )
         VALUES (?, ?, 'pending_verification', 'paid', ?)`,
        [
          paymentId,
          admins[0].user_id,
          `DEMO ONLY: admin approved simulated receipt ${receiptNumber}: ${remarks}`
            .slice(0, 500),
        ]
      );

    } else {
      // =====================================
      // REJECT THE SIMULATED PAYMENT
      // =====================================

      await connection.execute(
        "UPDATE demo_payment_attempts SET attempt_status = 'cancelled' WHERE attempt_id = ?",
        [attempt.attempt_id]
      );

      const [updated] = await connection.execute(
        `UPDATE booking_payments
         SET payment_status = 'unpaid',
             amount_paid = 0,
             payment_method = NULL,
             payment_reference = NULL,
             verified_by = NULL,
             verified_at = NULL,
             paid_at = NULL,
             remarks = ?
         WHERE payment_id = ?
           AND payment_status = 'pending_verification'`,
        [
          `Rejected simulated payment: ${remarks}`.slice(0, 500),
          paymentId,
        ]
      );

      if (updated.affectedRows !== 1) {
        throw new Error("Payment changed during rejection.");
      }

      await connection.execute(
        `INSERT INTO booking_payment_history
         (
           payment_id,
           changed_by_user_id,
           old_status,
           new_status,
           remarks
         )
         VALUES (?, ?, 'pending_verification', 'unpaid', ?)`,
        [
          paymentId,
          admins[0].user_id,
          `DEMO ONLY: admin rejected simulated claim: ${remarks}`
            .slice(0, 500),
        ]
      );
    }

    await connection.commit();
    inTransaction = false;

    return res.json({
      success: true,
      payment_id: paymentId,
      payment_status:
        action === "approve" ? "paid" : "unpaid",
      message:
        action === "approve"
          ? "Simulated payment approved; fictional receipt and earnings recorded."
          : "Simulated payment rejected; student may retry checkout.",
    });

  } catch (error) {
    if (inTransaction && connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Admin demo review error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not review this simulated payment.",
    });
  } finally {
    connection?.release();
  }
});

export default router;

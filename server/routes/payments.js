// server/routes/payments.js
// Manual payment claims reviewed by administrators.
// No payment gateway or automatic collection is used.

import express from "express";
import { createHash } from "node:crypto";
import db from "../db.js";

const router = express.Router();

const METHODS = new Set([
  "gcash",
  "maya",
  "bank_transfer",
]);

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
]);

function fail(res, error) {
  console.error("Payment API error:", error);

  return res.status(500).json({
    success: false,
    message: "Payment operation failed on the server.",
  });
}

function role(required) {
  return (_req, res, next) => {
    if (res.locals.auth.role !== required) {
      return res.status(403).json({
        success: false,
        message: `${required} account required.`,
      });
    }

    next();
  };
}

// CSRF protection for cookie-authenticated changes.

function protectMutation(req, res, next) {
  if (
    !ALLOWED_ORIGINS.has(req.get("Origin")) ||
    req.get("X-TF-Action") !== "manual-payment"
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Payment changes must come from the TutoFriends website.",
    });
  }

  next();
}

// ==========================================
// AUTHENTICATE STUDENT OR ADMIN
// ==========================================

router.use(async (req, res, next) => {
  const token = req.cookies?.tf_session;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return res.status(401).json({
      success: false,
      message: "Please log in first.",
    });
  }

  try {
    const hash = createHash("sha256")
      .update(token)
      .digest("hex");

    const [rows] = await db.execute(
      `
      SELECT
        u.user_id,
        u.role
      FROM user_sessions us
      JOIN users u
        ON u.user_id = us.user_id
      WHERE us.session_hash = ?
        AND us.expires_at > UTC_TIMESTAMP()
        AND u.account_status = 'active'
        AND u.role IN ('student', 'admin')
      LIMIT 1
      `,
      [hash]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message:
          "Session expired or account not authorized.",
      });
    }

    res.locals.auth = rows[0];

    next();
  } catch (error) {
    return fail(res, error);
  }
});

// ==========================================
// STUDENT: VIEW OWN PAYMENTS
// GET /api/payments/me
// ==========================================

router.get(
  "/me",
  role("student"),
  async (_req, res) => {
    try {
      const [rows] = await db.execute(
        `
        SELECT
          bp.payment_id,
          bp.booking_id,
          bp.amount_due,
          bp.amount_paid,
          bp.amount_refunded,
          bp.currency,
          bp.payment_status,
          bp.payment_method,
          bp.payment_reference,
          bp.created_at,
          bp.updated_at,
          b.booking_status,
          DATE_FORMAT(
            b.session_date,
            '%Y-%m-%d'
          ) AS session_date

        FROM booking_payments bp

        JOIN bookings b
          ON b.booking_id = bp.booking_id

        WHERE b.student_id = ?

        ORDER BY bp.payment_id DESC
        LIMIT 100
        `,
        [res.locals.auth.user_id]
      );

      return res.json({
        success: true,
        payments: rows,
      });
    } catch (error) {
      return fail(res, error);
    }
  }
);

// ==========================================
// ADMIN: GET PENDING VERIFICATIONS
// GET /api/payments/admin/pending
// ==========================================

router.get(
  "/admin/pending",
  role("admin"),
  async (_req, res) => {
    try {
      const [rows] = await db.execute(
        `
        SELECT
          bp.payment_id,
          bp.booking_id,
          bp.amount_due,
          bp.currency,
          bp.payment_method,
          bp.payment_reference,
          bp.payment_status,
          bp.updated_at,

          b.booking_status,
          b.student_id,

          su.full_name AS student_name,
          tu.full_name AS tutor_name

        FROM booking_payments bp

        JOIN bookings b
          ON b.booking_id = bp.booking_id

        JOIN users su
          ON su.user_id = b.student_id

        JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id

        JOIN users tu
          ON tu.user_id = ts.tutor_id

        WHERE bp.payment_status = 'pending_verification'

        ORDER BY
          bp.updated_at ASC,
          bp.payment_id ASC

        LIMIT 100
        `
      );

      return res.json({
        success: true,
        payments: rows,
      });
    } catch (error) {
      return fail(res, error);
    }
  }
);

// ==========================================
// STUDENT: SUBMIT PAYMENT REFERENCE
// POST /api/payments/:bookingId/submit
//
// This is a payment CLAIM, not confirmation.
// Only accepted bookings are eligible.
// ==========================================

router.post(
  "/:bookingId/submit",
  role("student"),
  protectMutation,
  async (req, res) => {
    const bookingId = Number(
      req.params.bookingId
    );

    const method =
      typeof req.body?.payment_method === "string"
        ? req.body.payment_method
            .trim()
            .toLowerCase()
        : "";

    const reference =
      typeof req.body?.payment_reference === "string"
        ? req.body.payment_reference.trim()
        : "";

    if (
      !Number.isSafeInteger(bookingId) ||
      bookingId < 1 ||
      !METHODS.has(method) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{5,99}$/.test(
        reference
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide a valid booking ID, payment method " +
          "and 6–100 character transaction reference. " +
          "Do not enter card numbers, PINs, OTPs or passwords.",
      });
    }

    let connection;
    let started = false;

    try {
      const studentId =
        res.locals.auth.user_id;

      // Check ownership.

      const [owners] = await db.execute(
        `
        SELECT
          b.student_id,
          ts.tutor_id

        FROM bookings b

        JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id

        WHERE b.booking_id = ?
        LIMIT 1
        `,
        [bookingId]
      );

      if (
        !owners.length ||
        Number(owners[0].student_id) !==
          Number(studentId)
      ) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      connection = await db.getConnection();

      await connection.beginTransaction();
      started = true;

      // Same lock order as the booking route.

      await connection.execute(
        `SELECT user_id FROM users
         WHERE user_id = ? FOR UPDATE`,
        [studentId]
      );

      await connection.execute(
        `SELECT tutor_id FROM tutor_profiles
         WHERE tutor_id = ? FOR UPDATE`,
        [owners[0].tutor_id]
      );

      const [rows] = await connection.execute(
        `
        SELECT
          b.student_id,
          b.booking_status,

          bp.payment_id,
          bp.payment_status,
          bp.amount_due,
          bp.payment_method,
          bp.payment_reference

        FROM bookings b

        JOIN booking_payments bp
          ON bp.booking_id = b.booking_id

        WHERE b.booking_id = ?
        FOR UPDATE
        `,
        [bookingId]
      );

      if (
        !rows.length ||
        Number(rows[0].student_id) !==
          Number(studentId)
      ) {
        await connection.rollback();
        started = false;

        return res.status(409).json({
          success: false,
          message:
            "Payment record missing or booking changed. " +
            "Contact an administrator.",
        });
      }

      const payment = rows[0];

      if (
        payment.booking_status !== "accepted"
      ) {
        await connection.rollback();
        started = false;

        return res.status(409).json({
          success: false,
          message:
            "Only accepted bookings can receive a payment claim.",
        });
      }

      if (
        payment.payment_status !== "unpaid"
      ) {
        await connection.rollback();
        started = false;

        return res.status(409).json({
          success: false,
          message:
            "This payment is already submitted or processed.",
        });
      }

      // Prevent reuse of an existing reference.
      // The unique MySQL index also prevents
      // simultaneous duplicate references.

      const [duplicates] =
        await connection.execute(
          `
          SELECT payment_id

          FROM booking_payments

          WHERE payment_method = ?
            AND payment_reference = ?
            AND payment_id <> ?

          LIMIT 1
          `,
          [
            method,
            reference,
            payment.payment_id,
          ]
        );

      if (duplicates.length) {
        await connection.rollback();
        started = false;

        return res.status(409).json({
          success: false,
          message:
            "This transaction reference is already in use.",
        });
      }

      // Update to pending verification.
      // No amount is marked as paid.

      await connection.execute(
        `
        UPDATE booking_payments

        SET
          payment_status = 'pending_verification',
          payment_method = ?,
          payment_reference = ?,
          verified_by = NULL,
          verified_at = NULL,
          paid_at = NULL,
          remarks = 'Claim submitted; not yet verified'

        WHERE payment_id = ?
        `,
        [
          method,
          reference,
          payment.payment_id,
        ]
      );

      await connection.execute(
        `
        INSERT INTO booking_payment_history (
          payment_id,
          changed_by_user_id,
          old_status,
          new_status,
          remarks
        )

        VALUES (
          ?,
          ?,
          'unpaid',
          'pending_verification',
          ?
        )
        `,
        [
          payment.payment_id,
          studentId,
          `Unverified ${method} claim; reference ${reference}`,
        ]
      );

      await connection.commit();
      started = false;

      return res.status(201).json({
        success: true,
        message:
          "Payment reference submitted for administrator review. " +
          "No payment has been verified.",
        payment_id: payment.payment_id,
        payment_status: "pending_verification",
        amount_paid: "0.00",
      });
    } catch (error) {
      if (
        started &&
        connection
      ) {
        await connection.rollback();
      }

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "This transaction reference is already in use.",
        });
      }

      return fail(res, error);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// ==========================================
// ADMIN: REVIEW PAYMENT REFERENCE
// PATCH /api/payments/:paymentId/review
//
// Approve only after independent verification.
// Reject returns the payment to Unpaid.
// ==========================================

router.patch(
  "/:paymentId/review",
  role("admin"),
  protectMutation,
  async (req, res) => {
    const paymentId = Number(
      req.params.paymentId
    );

    const action = req.body?.action;

    const remarks =
      typeof req.body?.remarks === "string"
        ? req.body.remarks.trim()
        : "";

    const independentlyVerified =
      req.body?.independently_verified === true;

    if (
      !Number.isSafeInteger(paymentId) ||
      paymentId < 1 ||
      !["approve", "reject"].includes(action) ||
      remarks.length < 10 ||
      remarks.length > 350 ||
      (
        action === "approve" &&
        !independentlyVerified
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide approve/reject and a 10–350 character " +
          "review note. Approval requires independent " +
          "verification confirmation.",
      });
    }

    let connection;
    let started = false;

    try {
      const [owners] = await db.execute(
        `
        SELECT
          b.student_id,
          ts.tutor_id

        FROM booking_payments bp

        JOIN bookings b
          ON b.booking_id = bp.booking_id

        JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id

        WHERE bp.payment_id = ?
        LIMIT 1
        `,
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
      started = true;

      await connection.execute(
        `SELECT user_id FROM users
         WHERE user_id = ? FOR UPDATE`,
        [owners[0].student_id]
      );

      await connection.execute(
        `SELECT tutor_id FROM tutor_profiles
         WHERE tutor_id = ? FOR UPDATE`,
        [owners[0].tutor_id]
      );

      const [rows] = await connection.execute(
        `
        SELECT
          bp.payment_id,
          bp.payment_status,
          bp.payment_method,
          bp.payment_reference,
          b.booking_status

        FROM booking_payments bp

        JOIN bookings b
          ON b.booking_id = bp.booking_id

        WHERE bp.payment_id = ?
        FOR UPDATE
        `,
        [paymentId]
      );

      if (
        !rows.length ||
        rows[0].payment_status !==
          "pending_verification"
      ) {
        await connection.rollback();
        started = false;

        return res.status(409).json({
          success: false,
          message:
            "Payment is not awaiting verification.",
        });
      }

      const claim = rows[0];

      if (
        !["accepted", "completed"].includes(
          claim.booking_status
        )
      ) {
        await connection.rollback();
        started = false;

        return res.status(409).json({
          success: false,
          message:
            "Booking is not eligible for payment approval.",
        });
      }

      const newStatus =
        action === "approve"
          ? "paid"
          : "unpaid";

      if (action === "approve") {
        // Administrator confirms receipt
        // through a separate trusted source.

        await connection.execute(
          `
          UPDATE booking_payments

          SET
            payment_status = 'paid',
            amount_paid = amount_due,
            verified_by = ?,
            verified_at = UTC_TIMESTAMP(),
            paid_at = UTC_TIMESTAMP(),
            remarks = ?

          WHERE payment_id = ?
          `,
          [
            res.locals.auth.user_id,
            remarks,
            paymentId,
          ]
        );
      } else {
        // Reject claim.
        // Clear the current reference so the
        // student may submit a corrected one.

        await connection.execute(
          `
          UPDATE booking_payments

          SET
            payment_status = 'unpaid',
            payment_method = NULL,
            payment_reference = NULL,
            verified_by = NULL,
            verified_at = NULL,
            paid_at = NULL,
            remarks = ?

          WHERE payment_id = ?
          `,
          [
            remarks,
            paymentId,
          ]
        );
      }

      // Record the review in the audit log.

      const audit =
        action === "approve"
          ? `Admin confirmed external payment independently: ${remarks}`
          : `Rejected ${claim.payment_method} reference ${claim.payment_reference}: ${remarks}`;

      await connection.execute(
        `
        INSERT INTO booking_payment_history (
          payment_id,
          changed_by_user_id,
          old_status,
          new_status,
          remarks
        )

        VALUES (
          ?,
          ?,
          'pending_verification',
          ?,
          ?
        )
        `,
        [
          paymentId,
          res.locals.auth.user_id,
          newStatus,
          audit.slice(0, 500),
        ]
      );

      await connection.commit();
      started = false;

      return res.json({
        success: true,
        message:
          action === "approve"
            ? "Payment independently verified and marked paid."
            : "Payment claim rejected; student may resubmit.",
        payment_id: paymentId,
        payment_status: newStatus,
      });
    } catch (error) {
      if (
        started &&
        connection
      ) {
        await connection.rollback();
      }

      return fail(res, error);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

export default router;
// server/routes/demoEarnings.js
// Read-only earnings API for the TutoFriends demo payment system.
// All amounts are fictional. No withdrawals or real transfers.

import express from "express";
import { createHash } from "node:crypto";
import db from "../db.js";

const router = express.Router();

// ==========================================
// DEMO MODE GUARD
// ==========================================

router.use((_req, res, next) => {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_DEMO_PAYMENTS !== "true"
  ) {
    return res.status(503).json({
      success: false,
      message: "Demo earnings are disabled.",
    });
  }

  next();
});

// ==========================================
// AUTHENTICATION
// Uses the existing TutoFriends session cookie.
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
        AND u.role IN ('tutor', 'admin')

      LIMIT 1
      `,
      [hash]
    );

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message:
          "An active tutor or admin account is required.",
      });
    }

    res.locals.auth = rows[0];

    next();
  } catch (error) {
    console.error(
      "Demo earnings authentication error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Could not verify your session.",
    });
  }
});

// ==========================================
// ROLE GUARD
// ==========================================

function requireRole(role) {
  return (_req, res, next) => {
    if (res.locals.auth?.role !== role) {
      return res.status(403).json({
        success: false,
        message: `${role} access required.`,
      });
    }

    next();
  };
}

// ==========================================
// MONEY HELPER
// Database values are stored in centavos.
// ==========================================

function money(cents) {
  return (
    Number(cents || 0) / 100
  ).toFixed(2);
}

function maskedNumber(last4) {
  return `•••• ${String(last4 || "").slice(-4)}`;
}

// ==========================================
// TUTOR DEMO EARNINGS
//
// GET /api/demo-earnings/tutor
//
// Returns only the logged-in tutor's records.
// ==========================================

router.get(
  "/tutor",
  requireRole("tutor"),
  async (_req, res) => {
    const tutorId =
      res.locals.auth.user_id;

    try {
      const [summaryRows] =
        await db.execute(
          `
          SELECT
            COUNT(DISTINCT r.receipt_id)
              AS transaction_count,

            COALESCE(
              SUM(l.amount_delta_cents),
              0
            ) AS total_earnings_cents

          FROM demo_earnings_ledger l

          JOIN demo_payment_receipts r
            ON r.receipt_id = l.receipt_id

          WHERE l.beneficiary_type = 'tutor'
            AND l.beneficiary_user_id = ?
            AND l.entry_type = 'payment_credit'
            AND r.receipt_status = 'paid'
          `,
          [tutorId]
        );

      const [rows] = await db.execute(
        `
        SELECT
          r.receipt_id,
          r.receipt_number,
          r.booking_id,

          r.payment_method,
          r.source_last4,
          r.currency,

          r.gross_cents,
          l.amount_delta_cents
            AS tutor_earnings_cents,
          r.platform_fee_cents,

          r.receipt_status,

          DATE_FORMAT(
            r.created_at,
            '%Y-%m-%d %H:%i:%s'
          ) AS created_at,

          su.full_name AS student_name,
          s.subject_name

        FROM demo_earnings_ledger l

        JOIN demo_payment_receipts r
          ON r.receipt_id = l.receipt_id

        JOIN bookings b
          ON b.booking_id = r.booking_id

        JOIN users su
          ON su.user_id = r.student_id

        LEFT JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id

        LEFT JOIN subjects s
          ON s.subject_id = ts.subject_id

        WHERE l.beneficiary_type = 'tutor'
          AND l.beneficiary_user_id = ?
          AND l.entry_type = 'payment_credit'
          AND r.receipt_status = 'paid'

        ORDER BY r.receipt_id DESC

        LIMIT 100
        `,
        [tutorId]
      );

      const summary =
        summaryRows[0] || {};

      return res.json({
        success: true,

        environment:
          "SIMULATION ONLY — NO REAL MONEY",

        summary: {
          transaction_count: Number(
            summary.transaction_count || 0
          ),

          total_demo_earnings: money(
            summary.total_earnings_cents
          ),

          currency: "PHP",
        },

        transactions: rows.map((row) => ({
          receipt_id: row.receipt_id,
          receipt_number: row.receipt_number,
          booking_id: row.booking_id,

          student_name: row.student_name,
          subject_name: row.subject_name,

          payment_method: row.payment_method,

          masked_number: maskedNumber(
            row.source_last4
          ),

          gross_amount: money(
            row.gross_cents
          ),

          tutor_earnings: money(
            row.tutor_earnings_cents
          ),

          platform_fee: money(
            row.platform_fee_cents
          ),

          receipt_status: row.receipt_status,
          created_at: row.created_at,
        })),
      });
    } catch (error) {
      console.error(
        "Tutor demo earnings error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load tutor demo earnings.",
      });
    }
  }
);

// ==========================================
// ADMIN PLATFORM EARNINGS
//
// GET /api/demo-earnings/admin
//
// Returns all demo receipts and totals.
// ==========================================

router.get(
  "/admin",
  requireRole("admin"),
  async (_req, res) => {
    try {
      const [summaryRows] =
        await db.execute(
          `
          SELECT
            COUNT(*) AS transaction_count,

            COALESCE(
              SUM(gross_cents),
              0
            ) AS gross_cents

          FROM demo_payment_receipts

          WHERE receipt_status = 'paid'
          `
        );

      const [ledgerRows] =
        await db.execute(
          `
          SELECT
            l.beneficiary_type,

            COALESCE(
              SUM(l.amount_delta_cents),
              0
            ) AS total_cents

          FROM demo_earnings_ledger l

          JOIN demo_payment_receipts r
            ON r.receipt_id = l.receipt_id

          WHERE l.entry_type = 'payment_credit'
            AND r.receipt_status = 'paid'
            AND l.beneficiary_type IN (
              'tutor',
              'platform'
            )

          GROUP BY l.beneficiary_type
          `
        );

      const totals = {
        tutor: 0,
        platform: 0,
      };

      for (const row of ledgerRows) {
        totals[row.beneficiary_type] =
          Number(row.total_cents || 0);
      }

      const [rows] = await db.execute(
        `
        SELECT
          r.receipt_id,
          r.receipt_number,
          r.booking_id,

          r.student_id,
          su.full_name AS student_name,

          r.tutor_id,
          tu.full_name AS tutor_name,

          s.subject_name,

          r.payment_method,
          r.source_last4,
          r.currency,

          r.gross_cents,
          r.tutor_earnings_cents,
          r.platform_fee_cents,

          r.receipt_status,

          DATE_FORMAT(
            r.created_at,
            '%Y-%m-%d %H:%i:%s'
          ) AS created_at

        FROM demo_payment_receipts r

        JOIN users su
          ON su.user_id = r.student_id

        JOIN users tu
          ON tu.user_id = r.tutor_id

        LEFT JOIN bookings b
          ON b.booking_id = r.booking_id

        LEFT JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id

        LEFT JOIN subjects s
          ON s.subject_id = ts.subject_id

        WHERE r.receipt_status = 'paid'

        ORDER BY r.receipt_id DESC

        LIMIT 200
        `
      );

      const summary =
        summaryRows[0] || {};

      return res.json({
        success: true,

        environment:
          "SIMULATION ONLY — NO REAL MONEY",

        summary: {
          transaction_count: Number(
            summary.transaction_count || 0
          ),

          total_demo_sales: money(
            summary.gross_cents
          ),

          total_tutor_earnings: money(
            totals.tutor
          ),

          total_platform_commission: money(
            totals.platform
          ),

          currency: "PHP",
        },

        transactions: rows.map((row) => ({
          receipt_id: row.receipt_id,
          receipt_number: row.receipt_number,
          booking_id: row.booking_id,

          student_name: row.student_name,
          tutor_name: row.tutor_name,
          subject_name: row.subject_name,

          payment_method: row.payment_method,

          masked_number: maskedNumber(
            row.source_last4
          ),

          gross_amount: money(
            row.gross_cents
          ),

          tutor_earnings: money(
            row.tutor_earnings_cents
          ),

          platform_fee: money(
            row.platform_fee_cents
          ),

          receipt_status: row.receipt_status,
          created_at: row.created_at,
        })),
      });
    } catch (error) {
      console.error(
        "Admin demo earnings error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load admin demo earnings.",
      });
    }
  }
);

export default router;
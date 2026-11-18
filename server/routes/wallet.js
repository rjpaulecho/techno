// server/routes/wallet.js
// Read-only wallet estimates.
// Does not collect, transfer, or settle money.

import express from "express";
import { createHash } from "node:crypto";
import db from "../db.js";

const router = express.Router();
const MAX_ROWS = 200;

// ==========================================
// MONEY HELPERS
// ==========================================

function cents(value) {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Invalid booking amount.");
  }

  return Math.round(n * 100);
}

function amount(valueInCents) {
  return (valueInCents / 100).toFixed(2);
}

function unauthorized(res) {
  return res.status(401).json({
    success: false,
    message: "Please log in again.",
  });
}

// ==========================================
// SERVER SESSION AUTHENTICATION
// ==========================================

router.use(async (req, res, next) => {
  const token = req.cookies?.tf_session;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return unauthorized(res);
  }

  try {
    const hash = createHash("sha256")
      .update(token)
      .digest("hex");

    const [users] = await db.execute(
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

    if (!users.length) {
      return unauthorized(res);
    }

    res.locals.walletUser = users[0];

    next();
  } catch (error) {
    console.error(
      "Wallet authentication error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify session.",
    });
  }
});

// ==========================================
// READ BOOKING EARNING ESTIMATES
// ==========================================

async function quoteData(tutorId) {
  // Current platform fee configuration.

  const [configs] = await db.execute(
    `
    SELECT commission_bps

    FROM platform_fee_config

    WHERE config_id = 1

    LIMIT 1
    `
  );

  if (!configs.length) {
    const error = new Error(
      "Run Step 24 prerequisite: create " +
        "platform_fee_config and its default row."
    );

    error.code = "CONFIG_MISSING";
    throw error;
  }

  const currentBps = Number(
    configs[0].commission_bps
  );

  if (
    !Number.isInteger(currentBps) ||
    currentBps < 0 ||
    currentBps > 10000
  ) {
    throw new Error(
      "Invalid platform fee configuration."
    );
  }

  // Tutor requests only their own bookings.
  // Admin can view all tutor estimates.

  const filter =
    tutorId === null
      ? ""
      : "AND ts.tutor_id = ?";

  const params =
    tutorId === null ? [] : [tutorId];

  const [rows] = await db.execute(
    `
    SELECT
      b.booking_id,

      DATE_FORMAT(
        b.session_date,
        '%Y-%m-%d'
      ) AS session_date,

      b.booking_status,
      b.total_amount,
      b.currency,

      s.subject_name,

      su.full_name AS student_name,
      tu.full_name AS tutor_name,

      ts.tutor_id,

      bp.payment_status,

      brs.commission_bps AS snapshot_bps,

      brs.platform_fee_amount AS snapshot_fee,

      brs.tutor_share_amount AS snapshot_tutor_share

    FROM bookings b

    JOIN tutor_subjects ts
      ON ts.offering_id = b.offering_id

    JOIN users su
      ON su.user_id = b.student_id

    JOIN users tu
      ON tu.user_id = ts.tutor_id

    JOIN subjects s
      ON s.subject_id = ts.subject_id

    LEFT JOIN booking_payments bp
      ON bp.booking_id = b.booking_id

    LEFT JOIN booking_revenue_splits brs
      ON brs.booking_id = b.booking_id

    WHERE b.booking_status IN (
      'accepted',
      'completed'
    )
      AND b.currency = 'PHP'

      ${filter}

    ORDER BY
      b.session_date DESC,
      b.booking_id DESC

    LIMIT ${MAX_ROWS}
    `,
    params
  );

  // ========================================
  // CALCULATE ESTIMATED SHARES
  // ========================================

  let grossCents = 0;
  let feeCents = 0;
  let tutorCents = 0;

  const bookings = rows.map((row) => {
    const gross = cents(
      row.total_amount
    );

    const hasSnapshot =
      row.snapshot_bps != null;

    // Saved historical commission is used
    // when a split snapshot already exists.

    const bps = hasSnapshot
      ? Number(row.snapshot_bps)
      : currentBps;

    if (
      !Number.isInteger(bps) ||
      bps < 0 ||
      bps > 10000
    ) {
      throw new Error(
        "Invalid commission snapshot."
      );
    }

    // No snapshot: quote from current
    // platform commission configuration.

    const fee = hasSnapshot
      ? cents(row.snapshot_fee)
      : Math.round(
          (gross * bps) / 10000
        );

    const tutor = hasSnapshot
      ? cents(row.snapshot_tutor_share)
      : gross - fee;

    // Prevent unbalanced financial records.

    if (fee + tutor !== gross) {
      throw new Error(
        "Revenue split does not balance."
      );
    }

    grossCents += gross;
    feeCents += fee;
    tutorCents += tutor;

    return {
      booking_id: row.booking_id,

      session_date:
        row.session_date,

      subject_name:
        row.subject_name,

      student_name:
        row.student_name,

      tutor_name:
        row.tutor_name,

      booking_status:
        row.booking_status,

      payment_status:
        row.payment_status ?? null,

      gross_amount:
        amount(gross),

      commission_bps:
        bps,

      platform_fee_amount:
        amount(fee),

      tutor_share_amount:
        amount(tutor),

      rate_source: hasSnapshot
        ? "saved_snapshot"
        : "current_setting",
    };
  });

  // ========================================
  // RESPONSE
  // ========================================
  // No payment provider settlement is
  // connected yet.
  //
  // Do NOT convert manual Paid statuses
  // into actual withdrawable money.
  // ========================================

  return {
    commission_bps: currentBps,

    settlement_connected: false,

    totals: {
      estimated_gross:
        amount(grossCents),

      estimated_platform_fee:
        amount(feeCents),

      estimated_tutor_share:
        amount(tutorCents),

      withdrawable_balance:
        "0.00",

      bookings_shown:
        bookings.length,
    },

    bookings,

    note:
      `Estimates cover at most the latest ` +
      `${MAX_ROWS} accepted/completed PHP bookings. ` +
      `This is a quotation only; no actual ` +
      `funds are collected or made withdrawable ` +
      `by this estimate.`,
  };
}

// ==========================================
// ROLE-PROTECTED RESPONSE HANDLER
// ==========================================

function handler(requiredRole, tutorOnly) {
  return async (_req, res) => {
    if (
      res.locals.walletUser.role !==
      requiredRole
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized for this wallet.",
      });
    }

    try {
      const tutorId = tutorOnly
        ? res.locals.walletUser.user_id
        : null;

      return res.json({
        success: true,
        ...(await quoteData(tutorId)),
      });
    } catch (error) {
      console.error(
        "Wallet estimate error:",
        error
      );

      return res.status(
        error.code === "CONFIG_MISSING"
          ? 503
          : 500
      ).json({
        success: false,

        message:
          error.code === "CONFIG_MISSING"
            ? error.message
            : "Unable to load wallet estimates.",
      });
    }
  };
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Tutors: only their own estimates.
router.get(
  "/tutor",
  handler("tutor", true)
);

// Administrator: platform-wide preview.
router.get(
  "/admin",
  handler("admin", false)
);

export default router;
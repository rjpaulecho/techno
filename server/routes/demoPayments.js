// server/routes/demoPayments.js
// TutoFriends database-only payment simulator.
// NO REAL MONEY, REAL OTPs, OR ACTUAL BANK CHARGES.

import express from "express";

import {
  createHash,
  randomUUID,
} from "node:crypto";

import db from "../db.js";

const router = express.Router();

// ==========================================
// CONFIGURATION
// ==========================================

const METHODS = new Set([
  "gcash",
  "maya",
  "card",
  "bank_transfer",
]);

const ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function enabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_DEMO_PAYMENTS === "true"
  );
}

function respond(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// ==========================================
// MONEY HELPERS
// All calculations use integer centavos.
// ==========================================

function toCents(decimal) {
  const value = String(decimal);

  if (!/^\d{1,8}\.\d{2}$/.test(value)) {
    throw new Error(
      "Invalid database money amount."
    );
  }

  const [whole, fraction] = value.split(".");

  return (
    Number(whole) * 100 +
    Number(fraction)
  );
}

function toPesos(cents) {
  return (cents / 100).toFixed(2);
}

function quote(row, commissionBps) {
  const gross = toCents(row.total_amount);

  const fee = Math.round(
    (gross * commissionBps) / 10000
  );

  return {
    gross,
    fee,
    tutor: gross - fee,
    commissionBps,
  };
}

// ==========================================
// READ CURRENT PLATFORM COMMISSION
// ==========================================

async function getCommission(connection) {
  const [rows] = await connection.execute(
    `
    SELECT commission_bps
    FROM platform_fee_config
    WHERE config_id = 1
    LIMIT 1
    `
  );

  const bps = Number(
    rows[0]?.commission_bps
  );

  if (
    !rows.length ||
    !Number.isInteger(bps) ||
    bps < 0 ||
    bps > 10000
  ) {
    throw new Error(
      "Platform commission configuration " +
      "is missing or invalid."
    );
  }

  return bps;
}

// ==========================================
// GET STUDENT BOOKING
// ==========================================

async function findBooking(
  connection,
  bookingId,
  studentId,
  lock = false
) {
  const [rows] = await connection.execute(
    `
    SELECT
      b.booking_id,
      b.student_id,
      b.booking_status,
      b.total_amount,
      b.currency,

      ts.tutor_id,

      bp.payment_id,
      bp.amount_due,
      bp.amount_paid,
      bp.payment_status

    FROM bookings b

    JOIN tutor_subjects ts
      ON ts.offering_id = b.offering_id

    LEFT JOIN booking_payments bp
      ON bp.booking_id = b.booking_id

    WHERE b.booking_id = ?
      AND b.student_id = ?

    LIMIT 1

    ${lock ? "FOR UPDATE" : ""}
    `,
    [bookingId, studentId]
  );

  return rows[0] || null;
}

// ==========================================
// PAYMENT ELIGIBILITY
// ==========================================

async function eligibility(
  connection,
  booking,
  bookingId
) {
  if (!booking) {
    return "Booking not found.";
  }

  if (
    booking.booking_status !== "accepted"
  ) {
    return (
      "The tutor must accept this " +
      "booking first."
    );
  }

  if (!booking.payment_id) {
    return (
      "Booking has no payment record."
    );
  }

  if (
    booking.payment_status !== "unpaid"
  ) {
    return (
      "This booking already has a " +
      "payment or manual claim."
    );
  }

  if (
    booking.currency !== "PHP" ||
    toCents(booking.total_amount) !==
      toCents(booking.amount_due) ||
    Number(booking.amount_paid) !== 0
  ) {
    return (
      "The booking amounts need " +
      "administrator review."
    );
  }

  // Prevent a duplicate receipt even if an
  // existing payment status was changed later.

  const [receipts] = await connection.execute(
    `
    SELECT receipt_id
    FROM demo_payment_receipts
    WHERE booking_id = ?
    LIMIT 1
    `,
    [bookingId]
  );

  if (receipts.length) {
    return (
      "This booking already has " +
      "a demo receipt."
    );
  }

  return null;
}

// ==========================================
// AUTHENTICATE STUDENT SESSION
// ==========================================

router.use(async (req, res, next) => {
  const token =
    req.cookies?.tf_session;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return respond(
      res,
      401,
      "Please log in as a student."
    );
  }

  try {
    const hash = createHash("sha256")
      .update(token)
      .digest("hex");

    const [rows] = await db.execute(
      `
      SELECT u.user_id

      FROM user_sessions us

      JOIN users u
        ON u.user_id = us.user_id

      WHERE us.session_hash = ?
        AND us.expires_at > UTC_TIMESTAMP()
        AND u.account_status = 'active'
        AND u.role = 'student'

      LIMIT 1
      `,
      [hash]
    );

    if (!rows.length) {
      return respond(
        res,
        401,
        "Student session expired."
      );
    }

    res.locals.studentId =
      rows[0].user_id;

    return next();
  } catch (error) {
    console.error(
      "Demo payment session error:",
      error
    );

    return respond(
      res,
      500,
      "Could not verify your session."
    );
  }
});

// ==========================================
// DEVELOPMENT AND REQUEST PROTECTION
// ==========================================

router.use((req, res, next) => {
  if (!enabled()) {
    return respond(
      res,
      503,
      "Demo payments are disabled."
    );
  }

  if (
    req.method === "POST" &&
    (
      !ORIGINS.has(req.get("Origin")) ||
      req.get("X-TF-Action") !==
        "demo-payment"
    )
  ) {
    return respond(
      res,
      403,
      "Untrusted demo payment request."
    );
  }

  return next();
});

// ==========================================
// GET PAYMENT PREVIEW
//
// GET /api/demo-payments/:bookingId/preview
// ==========================================

router.get(
  "/:bookingId/preview",
  async (req, res) => {
    const bookingId = Number(
      req.params.bookingId
    );

    if (
      !Number.isSafeInteger(bookingId) ||
      bookingId < 1
    ) {
      return respond(
        res,
        400,
        "Invalid booking ID."
      );
    }

    try {
      const booking = await findBooking(
        db,
        bookingId,
        res.locals.studentId
      );

      if (!booking) {
        return respond(
          res,
          404,
          "Booking not found."
        );
      }

      const bps =
        await getCommission(db);

      const calculation =
        quote(booking, bps);

      const reason =
        await eligibility(
          db,
          booking,
          bookingId
        );

      return res.json({
        success: true,

        enabled: reason === null,
        reason,

        booking_id: bookingId,

        gross_amount:
          toPesos(calculation.gross),

        platform_fee:
          toPesos(calculation.fee),

        tutor_share:
          toPesos(calculation.tutor),

        commission_percent:
          (bps / 100).toFixed(2),

        methods: [...METHODS],

        label:
          "SIMULATION ONLY — No real " +
          "account will be charged",
      });
    } catch (error) {
      console.error(
        "Demo preview error:",
        error
      );

      return respond(
        res,
        500,
        "Unable to load demo payment preview."
      );
    }
  }
);

// ==========================================
// START SIMULATED PAYMENT
//
// POST /api/demo-payments/:bookingId/start
//
// Body:
// {
//   "payment_method": "gcash",
//   "sample_number": "09123456789"
// }
// ==========================================

router.post(
  "/:bookingId/start",
  async (req, res) => {
    const bookingId = Number(
      req.params.bookingId
    );

    const method =
      req.body?.payment_method;

    const sample =
      req.body?.sample_number;

    // Fictional digits only.
    // Never request a CVV, PIN or real card.

    if (
      !Number.isSafeInteger(bookingId) ||
      bookingId < 1 ||
      !METHODS.has(method) ||
      typeof sample !== "string" ||
      !/^\d{1,24}$/.test(sample)
    ) {
      return respond(
        res,
        400,
        "Select a method and enter 1–24 " +
        "fictional digits (numbers only)."
      );
    }

    let connection;

    try {
      const studentId =
        res.locals.studentId;

      const owner = await findBooking(
        db,
        bookingId,
        studentId
      );

      if (!owner) {
        return respond(
          res,
          404,
          "Booking not found."
        );
      }

      connection =
        await db.getConnection();

      await connection.beginTransaction();

      // Lock in the same order as the
      // existing bookings and payments APIs.

      await connection.execute(
        `
        SELECT user_id
        FROM users
        WHERE user_id = ?
        FOR UPDATE
        `,
        [studentId]
      );

      await connection.execute(
        `
        SELECT tutor_id
        FROM tutor_profiles
        WHERE tutor_id = ?
        FOR UPDATE
        `,
        [owner.tutor_id]
      );

      const booking = await findBooking(
        connection,
        bookingId,
        studentId,
        true
      );

      const reason =
        await eligibility(
          connection,
          booking,
          bookingId
        );

      if (reason) {
        await connection.rollback();

        return respond(
          res,
          409,
          reason
        );
      }

      // Cancel any older unconfirmed
      // simulated attempts for this booking.
      // Previous history is preserved.

      await connection.execute(
        `
        UPDATE demo_payment_attempts

        SET attempt_status = 'cancelled'

        WHERE booking_id = ?
          AND attempt_status = 'awaiting_otp'
        `,
        [bookingId]
      );

      const reference =
        `TF-ATTEMPT-${randomUUID()}`;

      const last4 = sample
        .slice(-4)
        .padStart(4, "*");

      // Only the last four fictional digits
      // are stored in the database.

      const [result] =
        await connection.execute(
          `
          INSERT INTO demo_payment_attempts (
            booking_id,
            student_id,
            payment_method,
            source_last4,
            attempt_reference,
            attempt_status,
            expires_at
          )

          VALUES (
            ?, ?, ?, ?, ?,
            'awaiting_otp',
            DATE_ADD(
              UTC_TIMESTAMP(),
              INTERVAL 10 MINUTE
            )
          )
          `,
          [
            bookingId,
            studentId,
            method,
            last4,
            reference,
          ]
        );

      await connection.commit();

      return res.status(201).json({
        success: true,

        attempt_id: result.insertId,

        payment_method: method,

        masked_number:
          `•••• ${last4}`,

        otp_required: true,

        expires_in_minutes: 10,

        message:
          "Enter ANY numeric test OTP. " +
          "No message was sent.",
      });
    } catch (error) {
      if (connection) {
        await connection
          .rollback()
          .catch(() => {});
      }

      console.error(
        "Start demo payment error:",
        error
      );

      return respond(
        res,
        500,
        "Could not start simulated payment."
      );
    } finally {
      connection?.release();
    }
  }
);

// ==========================================
// CONFIRM SIMULATED OTP
//
// POST /api/demo-payments/attempts/:id/confirm
//
// Body:
// {
//   "otp": "123456"
// }
//
// ANY 1–12 NUMERIC DIGITS ARE ACCEPTED.
// OTP IS NEVER STORED OR SENT.
// ==========================================

router.post(
  "/attempts/:attemptId/confirm",
  async (req, res) => {
    const attemptId = Number(
      req.params.attemptId
    );

    const otp = req.body?.otp;

    if (
      !Number.isSafeInteger(attemptId) ||
      attemptId < 1 ||
      typeof otp !== "string" ||
      !/^\d{1,12}$/.test(otp)
    ) {
      return respond(
        res,
        400,
        "Enter any numeric demo OTP " +
        "(1–12 digits)."
      );
    }

    let connection;

    try {
      const studentId =
        res.locals.studentId;

      const [basic] = await db.execute(
        `
        SELECT
          a.booking_id,
          ts.tutor_id

        FROM demo_payment_attempts a

        JOIN bookings b
          ON b.booking_id = a.booking_id

        JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id

        WHERE a.attempt_id = ?
          AND a.student_id = ?

        LIMIT 1
        `,
        [attemptId, studentId]
      );

      if (!basic.length) {
        return respond(
          res,
          404,
          "Demo attempt not found."
        );
      }

      const bookingId =
        basic[0].booking_id;

      const tutorId =
        basic[0].tutor_id;

      connection =
        await db.getConnection();

      await connection.beginTransaction();

      // Lock related records to prevent
      // double confirmation.

      await connection.execute(
        `
        SELECT user_id
        FROM users
        WHERE user_id = ?
        FOR UPDATE
        `,
        [studentId]
      );

      await connection.execute(
        `
        SELECT tutor_id
        FROM tutor_profiles
        WHERE tutor_id = ?
        FOR UPDATE
        `,
        [tutorId]
      );

      const booking = await findBooking(
        connection,
        bookingId,
        studentId,
        true
      );

      const [attempts] =
        await connection.execute(
          `
          SELECT
            attempt_id,
            attempt_reference,
            payment_method,
            source_last4,
            attempt_status,

            (
              expires_at > UTC_TIMESTAMP()
            ) AS valid_time

          FROM demo_payment_attempts

          WHERE attempt_id = ?
            AND student_id = ?

          FOR UPDATE
          `,
          [attemptId, studentId]
        );

      if (
        !booking ||
        !attempts.length
      ) {
        await connection.rollback();

        return respond(
          res,
          409,
          "Booking or attempt changed."
        );
      }

      const attempt =
        attempts[0];


      // A demo OTP is not proof of payment.
      if (attempt.attempt_status === "pending_review") {
        await connection.commit();

        return res.json({
          success: true,
          payment_status: "pending_verification",
          attempt_reference: attempt.attempt_reference,
          message: "Demo payment already awaiting admin review.",
        });
      }

      if (attempt.attempt_status === "paid") {
        const [receipts] = await connection.execute(
          `SELECT receipt_number
           FROM demo_payment_receipts
           WHERE attempt_id = ?
           LIMIT 1`,
          [attemptId]
        );

        await connection.commit();

        return res.json({
          success: true,
          payment_status: "paid",
          attempt_reference: attempt.attempt_reference,
          receipt_number: receipts[0]?.receipt_number ?? null,
          message: "The simulated payment was already approved.",
        });
      }

      if (attempt.attempt_status !== "awaiting_otp") {
        await connection.rollback();

        return respond(
          res,
          409,
          "This simulated attempt is no longer active."
        );
      }

      if (!Number(attempt.valid_time)) {
        await connection.execute(
          "UPDATE demo_payment_attempts SET attempt_status = 'expired' WHERE attempt_id = ?",
          [attemptId]
        );

        await connection.commit();

        return respond(
          res,
          410,
          "Demo OTP expired. Start again."
        );
      }

      const reason = await eligibility(
        connection,
        booking,
        bookingId
      );

      if (reason) {
        await connection.rollback();
        return respond(res, 409, reason);
      }

      // Submit payment for admin review.
      // Do not create receipt or earnings here.
      const [updated] = await connection.execute(
        `UPDATE booking_payments
         SET payment_status = 'pending_verification',
             payment_method = ?,
             payment_reference = ?,
             verified_by = NULL,
             verified_at = NULL,
             paid_at = NULL,
             remarks = 'Demo checkout submitted; awaiting admin approval'
         WHERE payment_id = ?
           AND payment_status = 'unpaid'`,
        [
          `demo_${attempt.payment_method}`,
          attempt.attempt_reference,
          booking.payment_id,
        ]
      );

      if (updated.affectedRows !== 1) {
        throw new Error(
          "Payment status changed during demo checkout."
        );
      }

      await connection.execute(
        `UPDATE demo_payment_attempts
         SET attempt_status = 'pending_review',
             completed_at = UTC_TIMESTAMP()
         WHERE attempt_id = ?
           AND attempt_status = 'awaiting_otp'`,
        [attemptId]
      );

      await connection.execute(
        `INSERT INTO booking_payment_history
         (
           payment_id,
           changed_by_user_id,
           old_status,
           new_status,
           remarks
         )
         VALUES (?, ?, 'unpaid', 'pending_verification', ?)`,
        [
          booking.payment_id,
          studentId,
          `DEMO ONLY: ${attempt.payment_method} fictional checkout awaiting admin review`,
        ]
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        payment_status: "pending_verification",
        attempt_reference: attempt.attempt_reference,
        message:
          "Submitted to admin for demo payment approval. No money was charged.",
      });
    } catch (error) {
      if (connection) {
        await connection
          .rollback()
          .catch(() => {});
      }

      if (
        error.code === "ER_DUP_ENTRY"
      ) {
        return respond(
          res,
          409,
          "A demo receipt already exists. " +
          "Refresh transaction history."
        );
      }

      console.error(
        "Confirm demo payment error:",
        error
      );

      return respond(
        res,
        500,
        "Could not confirm simulated payment."
      );
    } finally {
      connection?.release();
    }
  }
);

// ==========================================
// STUDENT DEMO TRANSACTION HISTORY
//
// GET /api/demo-payments/me
// ==========================================

router.get(
  "/me",
  async (_req, res) => {
    try {
      const [rows] = await db.execute(
        `
        SELECT
          receipt_id,
          receipt_number,
          booking_id,
          payment_method,
          source_last4,

          gross_cents,
          platform_fee_cents,
          tutor_earnings_cents,

          receipt_status,

          DATE_FORMAT(
            created_at,
            '%Y-%m-%d %H:%i:%s'
          ) AS created_at

        FROM demo_payment_receipts

        WHERE student_id = ?

        ORDER BY receipt_id DESC

        LIMIT 100
        `,
        [res.locals.studentId]
      );

      return res.json({
        success: true,

        environment:
          "SIMULATED - NO REAL MONEY",

        receipts: rows.map(
          ({
            gross_cents,
            platform_fee_cents,
            tutor_earnings_cents,
            ...row
          }) => ({
            ...row,

            masked_number:
              `•••• ${row.source_last4}`,

            gross_amount:
              toPesos(Number(gross_cents)),

            platform_fee:
              toPesos(
                Number(platform_fee_cents)
              ),

            tutor_earnings:
              toPesos(
                Number(tutor_earnings_cents)
              ),
          })
        ),
      });
    } catch (error) {
      console.error(
        "Demo receipts error:",
        error
      );

      return respond(
        res,
        500,
        "Unable to load simulated receipts."
      );
    }
  }
);

export default router;
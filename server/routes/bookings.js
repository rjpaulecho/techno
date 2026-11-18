// server/routes/bookings.js
// MySQL bookings with initial unpaid payments.
// Times use Asia/Manila (UTC+08:00).

import express from "express";
import { createHash } from "node:crypto";
import db from "../db.js";

const router = express.Router();

const TRUSTED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
]);

router.use((req, res, next) => {
  if (
    ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) &&
    !TRUSTED_ORIGINS.has(req.get("Origin"))
  ) {
    return res.status(403).json({
      success: false,
      message: "Request origin not allowed.",
    });
  }

  next();
});

const SESSION_COOKIE = "tf_session";

const CLOCK_RE =
  /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const REQUEST_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_DURATIONS = new Set([
  30, 60, 90, 120, 150, 180, 210, 240,
]);

function errorResponse(res, error) {
  console.error("Booking API error:", error);

  return res.status(500).json({
    success: false,
    message: "Booking request failed on the server.",
  });
}

function minuteOfDay(value) {
  const [hours, minutes] =
    value.split(":").map(Number);

  return hours * 60 + minutes;
}

function clockFromMinutes(minutes) {
  return (
    `${String(
      Math.floor(minutes / 60)
    ).padStart(2, "0")}:` +
    `${String(
      minutes % 60
    ).padStart(2, "0")}`
  );
}

function validDate(value) {
  if (
    typeof value !== "string" ||
    !DATE_RE.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function weekdayMondayFirst(value) {
  const [year, month, day] =
    value.split("-").map(Number);

  const dow = new Date(
    Date.UTC(year, month - 1, day)
  ).getUTCDay();

  return dow === 0 ? 7 : dow;
}

function appointmentStartMs(date, time) {
  return new Date(
    `${date}T${time}:00+08:00`
  ).getTime();
}

// ==========================================
// CHECK TUTOR WORKING HOURS
// ==========================================

async function hasWorkingHours(
  connection,
  tutorId,
  date,
  start,
  end
) {
  const [rows] = await connection.execute(
    `
    SELECT
      TIME_FORMAT(
        start_time,
        '%H:%i'
      ) AS start_time,

      TIME_FORMAT(
        end_time,
        '%H:%i'
      ) AS end_time

    FROM tutor_availability

    WHERE tutor_id = ?
      AND day_of_week = ?
      AND is_active = 1
    `,
    [
      tutorId,
      weekdayMondayFirst(date),
    ]
  );

  return rows.some(
    (slot) =>
      slot.start_time <= start &&
      slot.end_time >= end
  );
}

// ==========================================
// SHARED BOOKING SELECT
// ==========================================


const SELECT_BOOKINGS = `
  SELECT
    b.booking_id,
    b.student_id,
    su.full_name AS student_name,
    su.email AS student_email,

    ts.tutor_id,
    tu.full_name AS tutor_name,

    b.offering_id,
    s.subject_name,

    DATE_FORMAT(
      b.session_date,
      '%Y-%m-%d'
    ) AS session_date,

    TIME_FORMAT(
      b.start_time,
      '%H:%i'
    ) AS start_time,

    TIME_FORMAT(
      b.end_time,
      '%H:%i'
    ) AS end_time,

    b.duration_minutes,
    b.hourly_rate_at_booking,
    b.total_amount,
    b.currency,
    b.student_message,

    CASE
      WHEN b.booking_status = 'pending'
       AND b.pending_expires_at <= UTC_TIMESTAMP()
      THEN 'expired'
      ELSE b.booking_status
    END AS booking_status,

    DATE_FORMAT(
      b.pending_expires_at,
      '%Y-%m-%d %H:%i:%s'
    ) AS pending_expires_at_utc,

    b.decision_note,
    b.created_at,
    b.updated_at,

    bp.payment_id,
    bp.payment_status,
    bp.amount_due,
    bp.amount_paid,
    bp.amount_refunded,
    bp.payment_method

  FROM bookings b

  JOIN users su
    ON su.user_id = b.student_id

  JOIN tutor_subjects ts
    ON ts.offering_id = b.offering_id

  JOIN users tu
    ON tu.user_id = ts.tutor_id

  JOIN subjects s
    ON s.subject_id = ts.subject_id

  LEFT JOIN booking_payments bp
    ON bp.booking_id = b.booking_id
`;


// ==========================================
// AUTHENTICATION
// ==========================================

router.use(async (req, res, next) => {
  const token =
    req.cookies?.[SESSION_COOKIE];

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
        AND u.role IN ('student', 'tutor')

      LIMIT 1
      `,
      [hash]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Session invalid or expired.",
      });
    }

    res.locals.auth = rows[0];

    return next();
  } catch (error) {
    return errorResponse(res, error);
  }
});

function requireRole(role) {
  return (_req, res, next) => {
    if (
      res.locals.auth.role !== role
    ) {
      return res.status(403).json({
        success: false,
        message: `${role} account required.`,
      });
    }

    return next();
  };
}

// ==========================================
// STUDENT BOOKING HISTORY
// GET /api/bookings/student
// ==========================================

router.get(
  "/student",
  requireRole("student"),
  async (_req, res) => {
    try {
      const [rows] = await db.execute(
        `
        ${SELECT_BOOKINGS}

        WHERE b.student_id = ?

        ORDER BY
          b.created_at DESC,
          b.booking_id DESC

        LIMIT 100
        `,
        [res.locals.auth.user_id]
      );

      return res.json({
        success: true,
        bookings: rows,
      });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

// ==========================================
// TUTOR BOOKING REQUESTS
// GET /api/bookings/tutor
// ==========================================

router.get(
  "/tutor",
  requireRole("tutor"),
  async (_req, res) => {
    try {
      const [rows] = await db.execute(
        `
        ${SELECT_BOOKINGS}

        WHERE ts.tutor_id = ?

        ORDER BY
          b.session_date,
          b.start_time,
          b.booking_id

        LIMIT 100
        `,
        [res.locals.auth.user_id]
      );

      return res.json({
        success: true,
        bookings: rows,
      });
    } catch (error) {
      return errorResponse(res, error);
    }
  }
);

// ==========================================
// CREATE STUDENT BOOKING
// POST /api/bookings
// ==========================================

router.post(
  "/",
  requireRole("student"),
  async (req, res) => {
    const {
      client_request_id,
      offering_id,
      session_date,
      start_time,
      duration_minutes,
      student_message = "",
    } = req.body ?? {};

    if (
      typeof client_request_id !== "string" ||
      !REQUEST_ID_RE.test(client_request_id) ||
      !Number.isSafeInteger(offering_id) ||
      offering_id < 1 ||
      !validDate(session_date) ||
      typeof start_time !== "string" ||
      !CLOCK_RE.test(start_time) ||
      !VALID_DURATIONS.has(duration_minutes) ||
      typeof student_message !== "string" ||
      student_message.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide a UUID request ID, offering ID, valid " +
          "date, time, duration, and optional message.",
      });
    }

    const startingMinute =
      minuteOfDay(start_time);

    const endingMinute =
      startingMinute + duration_minutes;

    if (endingMinute >= 1440) {
      return res.status(400).json({
        success: false,
        message:
          "Sessions must finish before midnight.",
      });
    }

    const end_time =
      clockFromMinutes(endingMinute);

    const startMs = appointmentStartMs(
      session_date,
      start_time
    );

    const now = Date.now();

    if (
      startMs < now + 30 * 60 * 1000 ||
      startMs > now + 90 * 86400000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Choose a session between 30 minutes and " +
          "90 days ahead (Manila time).",
      });
    }

    let connection;
    let transactionStarted = false;

    try {
      // Get offering tutor.

      const [initialRows] = await db.execute(
        `
        SELECT tutor_id
        FROM tutor_subjects
        WHERE offering_id = ?
        LIMIT 1
        `,
        [offering_id]
      );

      if (!initialRows.length) {
        return res.status(404).json({
          success: false,
          message: "Subject offering not found.",
        });
      }

      const tutorId =
        initialRows[0].tutor_id;

      const studentId =
        res.locals.auth.user_id;

      connection = await db.getConnection();

      await connection.beginTransaction();
      transactionStarted = true;

      // Consistent lock order.

      await connection.execute(
        `SELECT user_id FROM users
         WHERE user_id = ? FOR UPDATE`,
        [studentId]
      );

      await connection.execute(
        `SELECT tutor_id FROM tutor_profiles
         WHERE tutor_id = ? FOR UPDATE`,
        [tutorId]
      );

      // Duplicate request protection.

      const [sameRequest] =
        await connection.execute(
          `
          SELECT
            b.booking_id,
            b.student_id,
            bp.payment_status

          FROM bookings b

          LEFT JOIN booking_payments bp
            ON bp.booking_id = b.booking_id

          WHERE b.client_request_id = ?
          LIMIT 1
          `,
          [client_request_id]
        );

      if (sameRequest.length) {
        await connection.rollback();
        transactionStarted = false;

        if (
          Number(sameRequest[0].student_id) !==
          Number(studentId)
        ) {
          return res.status(409).json({
            success: false,
            message: "Request ID already used.",
          });
        }

        return res.json({
          success: true,
          message: "Booking request already recorded.",
          booking_id:
            sameRequest[0].booking_id,
          payment_status:
            sameRequest[0].payment_status,
        });
      }

      // Verify subject offering.

      const [offerRows] =
        await connection.execute(
          `
          SELECT
            ts.offering_id,
            ts.hourly_rate,
            ts.tutor_id

          FROM tutor_subjects ts

          JOIN tutor_profiles tp
            ON tp.tutor_id = ts.tutor_id

          JOIN users u
            ON u.user_id = ts.tutor_id

          JOIN subjects s
            ON s.subject_id = ts.subject_id

          WHERE ts.offering_id = ?
            AND ts.tutor_id = ?
            AND ts.is_active = 1
            AND tp.is_listed = 1
            AND tp.availability_status = 'available'
            AND u.role = 'tutor'
            AND u.account_status = 'active'
            AND s.is_active = 1
          `,
          [
            offering_id,
            tutorId,
          ]
        );

      if (!offerRows.length) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(409).json({
          success: false,
          message:
            "Tutor is not accepting requests for that subject.",
        });
      }

      // Check tutor working hours.

      const insideHours =
        await hasWorkingHours(
          connection,
          tutorId,
          session_date,
          start_time,
          end_time
        );

      if (!insideHours) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(409).json({
          success: false,
          message:
            "Requested time is outside the tutor's working hours.",
        });
      }

      // Check tutor time conflict.

      const [tutorConflicts] =
        await connection.execute(
          `
          SELECT b.booking_id

          FROM bookings b

          JOIN tutor_subjects ts
            ON ts.offering_id = b.offering_id

          WHERE ts.tutor_id = ?
            AND b.session_date = ?
            AND b.start_time < CAST(? AS TIME)
            AND b.end_time > CAST(? AS TIME)

            AND (
              b.booking_status = 'accepted'
              OR (
                b.booking_status = 'pending'
                AND b.pending_expires_at >
                    UTC_TIMESTAMP()
              )
            )

          LIMIT 1
          `,
          [
            tutorId,
            session_date,
            end_time,
            start_time,
          ]
        );

      // Check student time conflict.

      const [studentConflicts] =
        await connection.execute(
          `
          SELECT booking_id

          FROM bookings

          WHERE student_id = ?
            AND session_date = ?
            AND start_time < CAST(? AS TIME)
            AND end_time > CAST(? AS TIME)

            AND (
              booking_status = 'accepted'
              OR (
                booking_status = 'pending'
                AND pending_expires_at >
                    UTC_TIMESTAMP()
              )
            )

          LIMIT 1
          `,
          [
            studentId,
            session_date,
            end_time,
            start_time,
          ]
        );

      if (
        tutorConflicts.length ||
        studentConflicts.length
      ) {
        await connection.rollback();
        transactionStarted = false;

        return res.status(409).json({
          success: false,
          message:
            "This time conflicts with an existing booking.",
        });
      }

      // Calculate amount on the server.

      const hourlyRate = Number(
        offerRows[0].hourly_rate
      );

      const totalAmount = (
        Math.round(
          Math.round(hourlyRate * 100) *
            duration_minutes /
            60
        ) / 100
      ).toFixed(2);

      // Insert booking.

      const [bookingResult] =
        await connection.execute(
          `
          INSERT INTO bookings (
            client_request_id,
            student_id,
            offering_id,
            session_date,
            start_time,
            end_time,
            duration_minutes,
            hourly_rate_at_booking,
            total_amount,
            student_message,
            booking_status,
            pending_expires_at
          )

          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            'pending',
            DATE_ADD(
              UTC_TIMESTAMP(),
              INTERVAL 24 HOUR
            )
          )
          `,
          [
            client_request_id,
            studentId,
            offering_id,
            session_date,
            start_time,
            end_time,
            duration_minutes,
            hourlyRate.toFixed(2),
            totalAmount,
            student_message.trim() || null,
          ]
        );

      const bookingId =
        bookingResult.insertId;

      // Insert booking history.

      await connection.execute(
        `
        INSERT INTO booking_status_history (
          booking_id,
          changed_by_user_id,
          old_status,
          new_status,
          reason
        )

        VALUES (
          ?, ?, NULL, 'pending',
          'Student requested session'
        )
        `,
        [
          bookingId,
          studentId,
        ]
      );

      // Create initial Unpaid payment.

      const [paymentResult] =
        await connection.execute(
          `
          INSERT INTO booking_payments (
            booking_id,
            amount_due,
            amount_paid,
            amount_refunded,
            currency,
            payment_status
          )

          VALUES (
            ?, ?, 0.00, 0.00,
            'PHP', 'unpaid'
          )
          `,
          [
            bookingId,
            totalAmount,
          ]
        );

      // Insert initial payment history.

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
          NULL,
          NULL,
          'unpaid',
          'Initial payment record; no payment collected'
        )
        `,
        [paymentResult.insertId]
      );

      // Booking and payment save together.

      await connection.commit();
      transactionStarted = false;

      return res.status(201).json({
        success: true,
        message:
          "Booking request sent to the tutor.",
        booking_id: bookingId,
        booking_status: "pending",
        total_amount: totalAmount,
        currency: "PHP",
        payment_id:
          paymentResult.insertId,
        payment_status: "unpaid",
        amount_paid: "0.00",
      });
    } catch (error) {
      if (
        connection &&
        transactionStarted
      ) {
        await connection.rollback();
      }

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "This request was already submitted.",
        });
      }

      return errorResponse(res, error);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// ==========================================
// CHANGE BOOKING STATUS
// PATCH /api/bookings/:bookingId/status
//
// Tutor: accept, decline, complete
// Student: cancel
// ==========================================

router.patch(
  "/:bookingId/status",
  async (req, res) => {
    const bookingId = Number(
      req.params.bookingId
    );

    const {
      action,
      reason = "",
    } = req.body ?? {};

    if (
      !Number.isSafeInteger(bookingId) ||
      bookingId < 1 ||
      ![
        "accept",
        "decline",
        "complete",
        "cancel",
      ].includes(action) ||
      typeof reason !== "string" ||
      reason.length > 500
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID, action, or reason.",
      });
    }

    let connection;
    let transactionStarted = false;

    try {
      // Find student and tutor ownership.

      const [preRows] = await db.execute(
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

      if (!preRows.length) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      const studentId =
        preRows[0].student_id;

      const tutorId =
        preRows[0].tutor_id;

      const auth =
        res.locals.auth;

      const tutorAction =
        action !== "cancel";

      // Authorize the correct account.

      if (
        (
          tutorAction &&
          (
            auth.role !== "tutor" ||
            Number(auth.user_id) !==
              Number(tutorId)
          )
        ) ||
        (
          !tutorAction &&
          (
            auth.role !== "student" ||
            Number(auth.user_id) !==
              Number(studentId)
          )
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot change this booking.",
        });
      }

      connection = await db.getConnection();

      await connection.beginTransaction();
      transactionStarted = true;

      // Consistent lock order.

      await connection.execute(
        `SELECT user_id FROM users
         WHERE user_id = ? FOR UPDATE`,
        [studentId]
      );

      await connection.execute(
        `SELECT tutor_id FROM tutor_profiles
         WHERE tutor_id = ? FOR UPDATE`,
        [tutorId]
      );

      const [rows] = await connection.execute(
        `
        SELECT
          booking_status,
          student_id,
          offering_id,

          DATE_FORMAT(
            session_date,
            '%Y-%m-%d'
          ) AS session_date,

          TIME_FORMAT(
            start_time,
            '%H:%i'
          ) AS start_time,

          TIME_FORMAT(
            end_time,
            '%H:%i'
          ) AS end_time,

          pending_expires_at <=
            UTC_TIMESTAMP() AS is_expired

        FROM bookings

        WHERE booking_id = ?

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
        transactionStarted = false;

        return res.status(409).json({
          success: false,
          message:
            "Booking changed. Refresh and retry.",
        });
      }

      const booking = rows[0];

      // ====================================
      // PAYMENT CANCELLATION SAFEGUARD
      // ====================================
      // A submitted or paid booking must not
      // bypass payment review or refunds.

      if (action === "cancel") {
        const [paymentRows] =
          await connection.execute(
            `
            SELECT payment_status

            FROM booking_payments

            WHERE booking_id = ?

            FOR UPDATE
            `,
            [bookingId]
          );

        if (
          !paymentRows.length ||
          paymentRows[0].payment_status !==
            "unpaid"
        ) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "This booking has payment activity " +
              "or a missing payment record. " +
              "Contact an administrator before cancelling.",
          });
        }
      }

      // ====================================
      // EXPIRED REQUEST
      // ====================================

      if (
        booking.booking_status === "pending" &&
        booking.is_expired
      ) {
        await connection.execute(
          `
          UPDATE bookings

          SET booking_status = 'expired'

          WHERE booking_id = ?
          `,
          [bookingId]
        );

        await connection.execute(
          `
          INSERT INTO booking_status_history (
            booking_id,
            changed_by_user_id,
            old_status,
            new_status,
            reason
          )

          VALUES (
            ?,
            NULL,
            'pending',
            'expired',
            'Request expired before response'
          )
          `,
          [bookingId]
        );

        await connection.commit();
        transactionStarted = false;

        return res.status(409).json({
          success: false,
          message:
            "Booking request has expired.",
        });
      }

      let newStatus;

      // ====================================
      // CHECK ALLOWED TRANSITIONS
      // ====================================

      if (
        action === "accept" ||
        action === "decline"
      ) {
        if (
          booking.booking_status !== "pending"
        ) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "Only pending requests may be accepted or declined.",
          });
        }

        newStatus =
          action === "accept"
            ? "accepted"
            : "declined";
      } else if (
        action === "cancel"
      ) {
        if (
          ![
            "pending",
            "accepted",
          ].includes(
            booking.booking_status
          )
        ) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "Only pending or accepted bookings can be cancelled.",
          });
        }

        newStatus = "cancelled";
      } else {
        if (
          booking.booking_status !== "accepted"
        ) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "Only accepted sessions can be completed.",
          });
        }

        const endMs = appointmentStartMs(
          booking.session_date,
          booking.end_time
        );

        if (Date.now() < endMs) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "A session cannot be completed before its scheduled end.",
          });
        }

        newStatus = "completed";
      }

      // ====================================
      // VALIDATE ACCEPTANCE
      // ====================================

      if (action === "accept") {
        const startMs = appointmentStartMs(
          booking.session_date,
          booking.start_time
        );

        if (Date.now() >= startMs) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "Cannot accept a session that has already started.",
          });
        }

        const [offerRows] =
          await connection.execute(
            `
            SELECT ts.offering_id

            FROM tutor_subjects ts

            JOIN tutor_profiles tp
              ON tp.tutor_id = ts.tutor_id

            WHERE ts.offering_id = ?
              AND ts.is_active = 1
              AND tp.availability_status = 'available'
            `,
            [booking.offering_id]
          );

        if (!offerRows.length) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "Tutor offering is no longer available.",
          });
        }

        const insideHours =
          await hasWorkingHours(
            connection,
            tutorId,
            booking.session_date,
            booking.start_time,
            booking.end_time
          );

        if (!insideHours) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "Session is outside current working hours.",
          });
        }

        const [conflicts] =
          await connection.execute(
            `
            SELECT b.booking_id

            FROM bookings b

            JOIN tutor_subjects ts
              ON ts.offering_id = b.offering_id

            WHERE b.booking_id <> ?
              AND b.session_date = ?
              AND b.start_time < CAST(? AS TIME)
              AND b.end_time > CAST(? AS TIME)

              AND (
                ts.tutor_id = ?
                OR b.student_id = ?
              )

              AND (
                b.booking_status = 'accepted'
                OR (
                  b.booking_status = 'pending'
                  AND b.pending_expires_at >
                      UTC_TIMESTAMP()
                )
              )

            LIMIT 1
            `,
            [
              bookingId,
              booking.session_date,
              booking.end_time,
              booking.start_time,
              tutorId,
              studentId,
            ]
          );

        if (conflicts.length) {
          await connection.rollback();
          transactionStarted = false;

          return res.status(409).json({
            success: false,
            message:
              "A conflicting booking now exists.",
          });
        }
      }

      // ====================================
      // UPDATE BOOKING
      // ====================================

      await connection.execute(
        `
        UPDATE bookings

        SET
          booking_status = ?,

          decision_note =
            CASE
              WHEN ? IN ('accept', 'decline')
              THEN ?
              ELSE decision_note
            END,

          responded_at =
            CASE
              WHEN ? IN ('accept', 'decline')
              THEN UTC_TIMESTAMP()
              ELSE responded_at
            END,

          cancelled_at =
            CASE
              WHEN ? = 'cancel'
              THEN UTC_TIMESTAMP()
              ELSE cancelled_at
            END,

          completed_at =
            CASE
              WHEN ? = 'complete'
              THEN UTC_TIMESTAMP()
              ELSE completed_at
            END

        WHERE booking_id = ?
        `,
        [
          newStatus,
          action,
          reason.trim() || null,
          action,
          action,
          action,
          bookingId,
        ]
      );

      // Insert booking status history.

      await connection.execute(
        `
        INSERT INTO booking_status_history (
          booking_id,
          changed_by_user_id,
          old_status,
          new_status,
          reason
        )

        VALUES (?, ?, ?, ?, ?)
        `,
        [
          bookingId,
          auth.user_id,
          booking.booking_status,
          newStatus,
          reason.trim() || null,
        ]
      );

      // No payment status changes here.

      await connection.commit();
      transactionStarted = false;

      return res.json({
        success: true,
        message: `Booking ${newStatus}.`,
        booking_id: bookingId,
        booking_status: newStatus,
      });
    } catch (error) {
      if (
        connection &&
        transactionStarted
      ) {
        await connection.rollback();
      }

      return errorResponse(res, error);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

export default router;
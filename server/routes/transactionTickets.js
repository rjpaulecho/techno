
import express from "express";
import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import db from "../db.js";

const router = express.Router();

const ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function errorResponse(res, error) {
  console.error("Transaction ticket error:", error);

  return res.status(500).json({
    success: false,
    message: "Transaction service unavailable.",
  });
}

function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

router.use(async (req, res, next) => {
  const token = req.cookies?.tf_session;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return res.status(401).json({
      success: false,
      message: "Please sign in.",
    });
  }

  try {
    const hash = createHash("sha256")
      .update(token)
      .digest("hex");

    const [users] = await db.execute(
      `SELECT u.user_id, u.role
       FROM user_sessions s
       JOIN users u ON u.user_id = s.user_id
       WHERE s.session_hash = ?
         AND s.expires_at > UTC_TIMESTAMP()
         AND u.account_status = 'active'
         AND u.role IN ('student', 'tutor')
       LIMIT 1`,
      [hash]
    );

    if (!users.length) {
      return res.status(403).json({
        success: false,
        message: "Student or tutor account required.",
      });
    }

    res.locals.ticketUser = users[0];
    next();
  } catch (error) {
    return errorResponse(res, error);
  }
});

const recentChangeSql = `
  LEFT JOIN (
    SELECT
      payment_id,
      MAX(changed_at) AS latest_change
    FROM booking_payment_history
    GROUP BY payment_id
  ) h ON h.payment_id = p.payment_id
`;

async function syncTickets(user) {
  const ownerField =
    user.role === "student"
      ? "b.student_id"
      : "o.tutor_id";

  await db.execute(
    `INSERT IGNORE INTO transaction_ticket_state
       (user_id, payment_id, state, last_activity_at)
     SELECT
       ?,
       p.payment_id,
       'history',
       GREATEST(
         p.updated_at,
         COALESCE(h.latest_change, p.updated_at)
       )
     FROM booking_payments p
     JOIN bookings b
       ON b.booking_id = p.booking_id
     JOIN tutor_subjects o
       ON o.offering_id = b.offering_id
     ${recentChangeSql}
     WHERE ${ownerField} = ?
       AND (
         p.payment_status <> 'unpaid'
         OR p.payment_method IS NOT NULL
         OR EXISTS (
           SELECT 1
           FROM booking_payment_history bh
           WHERE bh.payment_id = p.payment_id
             AND bh.old_status IS NOT NULL
         )
       )`,
    [user.user_id, user.user_id]
  );

  await runCleanup(user.user_id);
}

async function runCleanup(userId = null) {
  const scope =
    userId === null ? "" : "AND t.user_id = ?";

  const args =
    userId === null ? [] : [userId];

  await db.execute(
    `UPDATE transaction_ticket_state t
     JOIN booking_payments p
       ON p.payment_id = t.payment_id
     ${recentChangeSql}
     SET
       t.state = 'history',
       t.archived_at = NULL,
       t.last_activity_at = GREATEST(
         p.updated_at,
         COALESCE(h.latest_change, p.updated_at)
       )
     WHERE t.state <> 'expired'
       ${scope}
       AND GREATEST(
         p.updated_at,
         COALESCE(h.latest_change, p.updated_at)
       ) > t.last_activity_at`,
    args
  );

  await db.execute(
    `UPDATE transaction_ticket_state t
     JOIN booking_payments p
       ON p.payment_id = t.payment_id
     SET
       t.state = 'history',
       t.archived_at = NULL,
       t.last_activity_at = UTC_TIMESTAMP()
     WHERE t.state = 'archived'
       ${scope}
       AND p.payment_status IN (
         'pending_verification',
         'refund_pending'
       )`,
    args
  );

  await db.execute(
    `UPDATE transaction_ticket_state t
     JOIN booking_payments p
       ON p.payment_id = t.payment_id
     SET
       t.state = 'archived',
       t.archived_at = UTC_TIMESTAMP(),
       t.last_activity_at = UTC_TIMESTAMP()
     WHERE t.state = 'history'
       ${scope}
       AND t.last_activity_at <
         UTC_TIMESTAMP() - INTERVAL 30 DAY
       AND (
         p.payment_status IN ('paid', 'refunded')
         OR (
           p.payment_status = 'unpaid'
           AND EXISTS (
             SELECT 1
             FROM booking_payment_history bh
             WHERE bh.payment_id = p.payment_id
               AND bh.old_status IS NOT NULL
           )
         )
       )`,
    args
  );

  await db.execute(
    `UPDATE transaction_ticket_state t
     SET
       t.state = 'expired',
       t.archived_at = NULL
     WHERE t.state = 'archived'
       ${scope}
       AND t.last_activity_at <
         UTC_TIMESTAMP() - INTERVAL 30 DAY`,
    args
  );
}

const ticketSql = `
  SELECT
    p.payment_id,
    p.booking_id,
    p.currency,
    p.amount_due,
    p.amount_paid,
    p.amount_refunded,
    p.payment_method,
    p.payment_status,
    p.payment_reference,
    p.paid_at,

    DATE_FORMAT(
      p.updated_at,
      '%Y-%m-%d %H:%i:%s'
    ) AS updated_at,

    b.booking_status,

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

    s.subject_name,

    su.full_name AS student_name,
    tu.full_name AS tutor_name,

    dr.receipt_number,
    dr.tutor_earnings_cents,
    dr.platform_fee_cents,

    t.state,

    DATE_FORMAT(
      t.last_activity_at,
      '%Y-%m-%d %H:%i:%s'
    ) AS last_activity_at,

    DATE_FORMAT(
      t.archived_at,
      '%Y-%m-%d %H:%i:%s'
    ) AS archived_at

  FROM transaction_ticket_state t

  JOIN booking_payments p
    ON p.payment_id = t.payment_id

  JOIN bookings b
    ON b.booking_id = p.booking_id

  JOIN tutor_subjects o
    ON o.offering_id = b.offering_id

  JOIN subjects s
    ON s.subject_id = o.subject_id

  JOIN users su
    ON su.user_id = b.student_id

  JOIN users tu
    ON tu.user_id = o.tutor_id

  LEFT JOIN demo_payment_receipts dr
    ON dr.booking_id = b.booking_id

  WHERE t.user_id = ?
    AND (
      CASE
        WHEN ? = 'student'
        THEN b.student_id
        ELSE o.tutor_id
      END
    ) = ?
    AND t.state <> 'expired'
`;

function publicTicket(row, role) {
  if (role === "tutor") {
    return row;
  }

  const {
    tutor_earnings_cents,
    platform_fee_cents,
    ...studentTicket
  } = row;

  return studentTicket;
}

async function ownedTicket(user, paymentId) {
  const [rows] = await db.execute(
    ticketSql +
      " AND p.payment_id = ? LIMIT 1",
    [
      user.user_id,
      user.role,
      user.user_id,
      paymentId,
    ]
  );

  return rows[0] ?? null;
}

router.get("/", async (req, res) => {
  try {
    const user = res.locals.ticketUser;

    const view =
      req.query.view === "archived"
        ? "archived"
        : "history";

    await syncTickets(user);

    const [rows] = await db.execute(
      ticketSql +
        ` AND t.state = ?
          ORDER BY
            p.updated_at DESC,
            p.payment_id DESC
          LIMIT 200`,
      [
        user.user_id,
        user.role,
        user.user_id,
        view,
      ]
    );

    return res.json({
      success: true,
      view,
      tickets: rows.map(row =>
        publicTicket(row, user.role)
      ),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
});

router.get("/:id/events", async (req, res) => {
  try {
    const id = validId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket.",
      });
    }

    const user = res.locals.ticketUser;

    await syncTickets(user);

    if (!(await ownedTicket(user, id))) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const [events] = await db.execute(
      `SELECT
         payment_history_id,
         old_status,
         new_status,
         remarks,

         DATE_FORMAT(
           changed_at,
           '%Y-%m-%d %H:%i:%s'
         ) AS changed_at

       FROM booking_payment_history

       WHERE payment_id = ?

       ORDER BY
         changed_at,
         payment_history_id`,
      [id]
    );

    return res.json({
      success: true,
      payment_id: id,
      events,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
});

router.patch("/:id/archive", async (req, res) => {
  try {
    if (!ORIGINS.has(req.get("Origin"))) {
      return res.status(403).json({
        success: false,
        message: "Untrusted request origin.",
      });
    }

    const id = validId(req.params.id);
    const action = req.body?.action;

    if (
      !id ||
      !["archive", "restore"].includes(action)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid action.",
      });
    }

    const user = res.locals.ticketUser;

    await syncTickets(user);

    const ticket = await ownedTicket(user, id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    if (
      [
        "pending_verification",
        "refund_pending",
      ].includes(ticket.payment_status)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Pending reviews cannot be archived.",
      });
    }

    const from =
      action === "archive"
        ? "history"
        : "archived";

    const to =
      action === "archive"
        ? "archived"
        : "history";

    if (ticket.state !== from) {
      return res.status(409).json({
        success: false,
        message: "Refresh the ticket list.",
      });
    }

    const [result] = await db.execute(
      `UPDATE transaction_ticket_state
       SET
         state = ?,
         last_activity_at = UTC_TIMESTAMP(),

         archived_at = CASE
           WHEN ? = 'archived'
           THEN UTC_TIMESTAMP()
           ELSE NULL
         END

       WHERE user_id = ?
         AND payment_id = ?
         AND state = ?`,
      [
        to,
        to,
        user.user_id,
        id,
        from,
      ]
    );

    if (!result.affectedRows) {
      return res.status(409).json({
        success: false,
        message: "Ticket changed; refresh.",
      });
    }

    return res.json({
      success: true,
      state: to,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
});

router.get("/:id/pdf", async (req, res) => {
  try {
    const id = validId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket.",
      });
    }

    const user = res.locals.ticketUser;

    await syncTickets(user);

    const ticket = await ownedTicket(user, id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not available.",
      });
    }

    await db.execute(
      `UPDATE transaction_ticket_state
       SET last_activity_at = UTC_TIMESTAMP()
       WHERE user_id = ?
         AND payment_id = ?
         AND state <> 'expired'`,
      [user.user_id, id]
    );

    const demo =
      String(ticket.payment_method ?? "")
        .startsWith("demo_") ||
      String(ticket.receipt_number ?? "")
        .startsWith("TF-DEMO-");

    const amount = value =>
      `PHP ${Number(value || 0).toFixed(2)}`;

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tutofriends-ticket-${id}.pdf"`
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    doc.on("error", error => {
      console.error("Ticket PDF error:", error);
      res.destroy(error);
    });

    doc.pipe(res);

    doc
      .font("Helvetica-Bold")
      .fontSize(23)
      .text("TUTOfriends");

    doc
      .moveDown()
      .fontSize(15)
      .text("Transaction Ticket");

    doc
      .moveDown()
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(
        demo
          ? "DEMO ONLY - NO REAL MONEY WAS CHARGED"
          : "Transaction status record - not independent proof of receipt of funds"
      );

    doc.moveDown();

    const items = [
      ["Ticket", `TF-TICKET-${id}`],
      ["Booking", String(ticket.booking_id)],
      [
        "Reference",
        ticket.receipt_number ||
          ticket.payment_reference ||
          "None",
      ],
      ["Status", ticket.payment_status],
      ["Booking status", ticket.booking_status],
      [
        "Payment method",
        ticket.payment_method || "Not set",
      ],
      ["Student", ticket.student_name],
      ["Tutor", ticket.tutor_name],
      ["Subject", ticket.subject_name],
      [
        "Session",
        `${ticket.session_date} ${ticket.start_time}-${ticket.end_time}`,
      ],
      ["Amount due", amount(ticket.amount_due)],
      ["Amount paid", amount(ticket.amount_paid)],
      [
        "Amount refunded",
        amount(ticket.amount_refunded),
      ],
      [
        "Last update (database time)",
        ticket.updated_at,
      ],
    ];

    if (
      user.role === "tutor" &&
      ticket.tutor_earnings_cents !== null
    ) {
      items.push([
        "Tutor demo earnings",
        amount(
          Number(ticket.tutor_earnings_cents) / 100
        ),
      ]);

      items.push([
        "Platform demo fee",
        amount(
          Number(ticket.platform_fee_cents) / 100
        ),
      ]);
    }

    for (const [label, value] of items) {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`${label}: ${String(value)}`);

      doc.moveDown(0.45);
    }

    doc
      .moveDown()
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Generated from TUTOfriends records. Ticket expiry never removes financial history."
      );

    doc.end();
  } catch (error) {
    if (res.headersSent) {
      return res.destroy(error);
    }

    return errorResponse(res, error);
  }
});

const cleanupTimer = setInterval(() => {
  runCleanup().catch(error =>
    console.error("Ticket archive cleanup:", error)
  );
}, 6 * 60 * 60 * 1000);

cleanupTimer.unref?.();

export default router;

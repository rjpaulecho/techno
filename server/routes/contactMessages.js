
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

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// Protect requests that change data against untrusted origins.
router.use((req, res, next) => {
  if (
    ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) &&
    !TRUSTED_ORIGINS.has(req.get("Origin"))
  ) {
    return fail(res, 403, "Request origin not allowed.");
  }

  next();
});

// Verify the user's existing TutoFriends session.
async function getSessionUser(req) {
  const token = req.cookies?.tf_session;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return null;
  }

  const hash = createHash("sha256")
    .update(token)
    .digest("hex");

  const [rows] = await db.execute(
    `SELECT
       u.user_id,
       u.full_name,
       u.email,
       u.role
     FROM user_sessions us
     JOIN users u ON u.user_id = us.user_id
     WHERE us.session_hash = ?
       AND us.expires_at > UTC_TIMESTAMP()
       AND u.account_status = 'active'
     LIMIT 1`,
    [hash]
  );

  return rows[0] || null;
}

// Require an administrator.
async function requireAdmin(req, res, next) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return fail(res, 401, "Please log in first.");
    }

    if (user.role !== "admin") {
      return fail(res, 403, "Administrator access required.");
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error("Contact admin authentication error:", error);
    return fail(res, 500, "Unable to verify your session.");
  }
}

// POST /api/contact-messages
// Submit a message using the authenticated user's account.
router.post("/", async (req, res) => {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return fail(res, 401, "Please log in before sending a message.");
    }

    const category = req.body?.category;
    const subject =
      typeof req.body?.subject === "string"
        ? req.body.subject.trim()
        : "";

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    const allowedCategories = [
      "feedback",
      "general",
      "technical",
      "other",
    ];

    if (!allowedCategories.includes(category)) {
      return fail(res, 400, "Please select a valid message category.");
    }

    if (subject.length < 3 || subject.length > 160) {
      return fail(res, 400, "Subject must contain 3 to 160 characters.");
    }

    if (message.length < 10 || message.length > 5000) {
      return fail(res, 400, "Message must contain 10 to 5,000 characters.");
    }

    const [result] = await db.execute(
      `INSERT INTO contact_messages
        (user_id, category, subject, message)
       VALUES (?, ?, ?, ?)`,
      [user.user_id, category, subject, message]
    );

    return res.status(201).json({
      success: true,
      message: "Your message has been sent successfully.",
      message_id: result.insertId,
    });
  } catch (error) {
    console.error("Contact message submission error:", error);
    return fail(res, 500, "Unable to send your message right now.");
  }
});

// GET /api/contact-messages
// Administrator inbox.
router.get("/", requireAdmin, async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         cm.message_id,
         cm.user_id,
         u.full_name AS sender_name,
         u.email AS sender_email,
         u.role AS sender_role,
         cm.category,
         cm.subject,
         cm.message,
         cm.is_read,
         cm.created_at
       FROM contact_messages cm
       JOIN users u ON u.user_id = cm.user_id
       ORDER BY cm.created_at DESC
       LIMIT 300`
    );

    return res.json({
      success: true,
      messages: rows,
      unread_count: rows.filter(
        (item) => Number(item.is_read) === 0
      ).length,
    });
  } catch (error) {
    console.error("Contact inbox error:", error);
    return fail(res, 500, "Unable to load contact messages.");
  }
});

// PATCH /api/contact-messages/:id/read
// Mark a message as read or unread.
router.patch("/:id/read", requireAdmin, async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    const isRead = req.body?.is_read;

    if (!Number.isSafeInteger(messageId) || messageId < 1) {
      return fail(res, 400, "Invalid message ID.");
    }

    if (typeof isRead !== "boolean") {
      return fail(res, 400, "A valid read status is required.");
    }

    const [result] = await db.execute(
      `UPDATE contact_messages
       SET is_read = ?
       WHERE message_id = ?`,
      [isRead ? 1 : 0, messageId]
    );

    if (result.affectedRows === 0) {
      return fail(res, 404, "Message not found.");
    }

    return res.json({
      success: true,
      message: isRead
        ? "Message marked as read."
        : "Message marked as unread.",
    });
  } catch (error) {
    console.error("Contact message update error:", error);
    return fail(res, 500, "Unable to update message status.");
  }
});

export default router;

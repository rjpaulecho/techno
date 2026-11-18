// server/routes/devLogin.js
// One-click login for LOCAL DEVELOPMENT ONLY.
//
// Accounts:
// - Test Student
// - Ralph (Tutor)
// - Admin (separate opt-in required)
//
// NEVER enable on a deployed server.

import express from "express";

import {
  createHash,
  randomBytes,
} from "node:crypto";

import db from "../db.js";

const router = express.Router();

// ==========================================
// ALLOWED LOCAL TEST ACCOUNTS
// ==========================================

const TEST_ACCOUNTS = Object.freeze({
  student: {
    role: "student",
    username: null,
    email: "teststudent1@example.com",
  },

  ralph: {
    role: "tutor",
    username: "tutor1",
    email: null,
  },

  admin: {
    role: "admin",
    username: "admin1",
    email: "admin@tutofriends.local",
  },
});

// ==========================================
// ALLOWED LOCAL ADDRESSES
// ==========================================

const LOCAL_IPS = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

const LOCAL_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

// ==========================================
// DEVELOPMENT AUTHORIZATION
// ==========================================

function isLocalDevelopment(req) {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_DEV_TEST_LOGIN === "true" &&
    LOCAL_IPS.has(req.socket.remoteAddress)
  );
}

// ==========================================
// ADMIN HAS A SEPARATE SWITCH
// ==========================================

function isAdminDevEnabled(req) {
  return (
    isLocalDevelopment(req) &&
    process.env.ENABLE_DEV_ADMIN_LOGIN === "true"
  );
}

// ==========================================
// GET /api/dev-login/enabled
// ==========================================

router.get("/enabled", (req, res) => {
  const enabled = isLocalDevelopment(req);

  return res.json({
    success: true,
    enabled,
    adminEnabled:
      enabled && isAdminDevEnabled(req),
  });
});

// ==========================================
// POST /api/dev-login
// ==========================================

router.post("/", async (req, res) => {
  // Never allow development login in production
  // or from a non-local connection.

  if (
    !isLocalDevelopment(req) ||
    !LOCAL_ORIGINS.has(req.get("Origin"))
  ) {
    return res.status(404).json({
      success: false,
      message: "Development login is unavailable.",
    });
  }

  const account =
    typeof req.body?.account === "string"
      ? req.body.account.trim()
      : "";

  if (
    !Object.hasOwn(TEST_ACCOUNTS, account)
  ) {
    return res.status(400).json({
      success: false,
      message: "Unknown development account.",
    });
  }

  // Admin requires additional explicit opt-in.
  if (
    account === "admin" &&
    !isAdminDevEnabled(req)
  ) {
    return res.status(403).json({
      success: false,
      message: "Admin instant login is disabled.",
    });
  }

  const target = TEST_ACCOUNTS[account];

  try {
    // ======================================
    // FIND EXACT ALLOWLISTED ACCOUNT
    // ======================================

    const [rows] = await db.execute(
      `
      SELECT
        user_id,
        full_name,
        username,
        email,
        role

      FROM users

      WHERE role = ?
        AND account_status = 'active'

        AND (
          ? IS NULL
          OR username = ?
        )

        AND (
          ? IS NULL
          OR email = ?
        )

      LIMIT 1
      `,
      [
        target.role,

        target.username,
        target.username,

        target.email,
        target.email,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message:
          "Test account not found. Check your seeded MySQL users.",
      });
    }

    const user = rows[0];

    // ======================================
    // CREATE RANDOM SERVER SESSION
    // ======================================

    const sessionToken = randomBytes(32)
      .toString("hex");

    const sessionHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    await db.execute(
      `
      INSERT INTO user_sessions (
        user_id,
        session_hash,
        expires_at
      )

      VALUES (
        ?,
        ?,
        DATE_ADD(
          UTC_TIMESTAMP(),
          INTERVAL 1 DAY
        )
      )
      `,
      [
        user.user_id,
        sessionHash,
      ]
    );

    // ======================================
    // SET HTTPONLY SESSION COOKIE
    // ======================================

    res.cookie(
      "tf_session",
      sessionToken,
      {
        httpOnly: true,
        secure: false, // Local HTTP only
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000,
      }
    );

    return res.json({
      success: true,

      message:
        `Development login successful: ${user.role}`,

      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Development login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create test session.",
    });
  }
});

export default router;
import express from "express";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import db from "../db.js";

const router = express.Router();

const COOKIE_NAME = "tf_session";
const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

const secureCookie = process.env.NODE_ENV === "production";

const sessionCookieOptions = {
  httpOnly: true,
  secure: secureCookie,
  sameSite: "lax",
  path: "/",
};

// ==========================================
// RETURN USER INFORMATION WITHOUT PASSWORD
// ==========================================

function safeUser(row) {
  return {
    user_id: row.user_id,
    full_name: row.full_name,
    username: row.username,
    email: row.email,
    role: row.role,
    bio: row.bio,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
  };
}

// ==========================================
// GET HASH OF SESSION COOKIE
// ==========================================

function getSessionHash(req) {
  const token = req.cookies?.[COOKIE_NAME];

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return null;
  }

  return createHash("sha256")
    .update(token)
    .digest("hex");
}

// ==========================================
// REGISTER STUDENT
// POST /api/auth/register
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const fullName = name.trim();
    const userEmail = email.trim().toLowerCase();

    if (fullName.length < 2 || fullName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Name must contain 2 to 150 characters.",
      });
    }

    if (
      userEmail.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and at most 72 bytes.",
      });
    }

    // Hash password before saving
    const passwordHash = await bcrypt.hash(password, 12);

    // Save student to MySQL
    const [result] = await db.execute(
      `INSERT INTO users
        (full_name, email, password_hash, role)
       VALUES (?, ?, ?, 'student')`,
      [fullName, userEmail, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      user: {
        user_id: result.insertId,
        full_name: fullName,
        email: userEmail,
        role: "student",
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Email address is already registered.",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// ==========================================
// LOGIN STUDENT OR TUTOR
// POST /api/auth/login
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};

    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      !identifier.trim() ||
      !password ||
      identifier.length > 255
    ) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required.",
      });
    }

    const loginId = identifier.trim().toLowerCase();

    // Find account in database
    const [rows] = await db.execute(
      `SELECT
          user_id,
          full_name,
          username,
          email,
          password_hash,
          role,
          bio,
          avatar_url,
          account_status,
          created_at
       FROM users
       WHERE email = ? OR username = ?
       LIMIT 1`,
      [loginId, loginId]
    );

    const user = rows[0];

    // Verify password
    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password.",
      });
    }

    if (user.account_status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This account is not active.",
      });
    }

    // Create a secure random session token
    const sessionToken = randomBytes(32).toString("hex");

    // Only save its hash in MySQL
    const sessionHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    await db.execute(
      `INSERT INTO user_sessions
        (session_hash, user_id, expires_at)
       VALUES (
         ?,
         ?,
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY)
       )`,
      [sessionHash, user.user_id]
    );

    // Browser receives a protected session cookie
    res.cookie(COOKIE_NAME, sessionToken, {
      ...sessionCookieOptions,
      maxAge: SESSION_MS,
    });

    return res.json({
      success: true,
      message: "Login successful.",
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// ==========================================
// GET CURRENTLY LOGGED-IN USER
// GET /api/auth/me
// ==========================================

router.get("/me", async (req, res) => {
  const sessionHash = getSessionHash(req);

  if (!sessionHash) {
    return res.status(401).json({
      success: false,
      message: "Not logged in.",
    });
  }

  try {
    const [rows] = await db.execute(
      `SELECT
          u.user_id,
          u.full_name,
          u.username,
          u.email,
          u.role,
          u.bio,
          u.avatar_url,
          u.created_at
       FROM user_sessions s
       JOIN users u
         ON u.user_id = s.user_id
       WHERE s.session_hash = ?
         AND s.expires_at > UTC_TIMESTAMP()
         AND u.account_status = 'active'
       LIMIT 1`,
      [sessionHash]
    );

    if (!rows.length) {
      res.clearCookie(
        COOKIE_NAME,
        sessionCookieOptions
      );

      return res.status(401).json({
        success: false,
        message: "Session expired or invalid.",
      });
    }

    return res.json({
      success: true,
      user: safeUser(rows[0]),
    });
  } catch (error) {
    console.error("Session verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// ==========================================
// LOGOUT
// POST /api/auth/logout
// ==========================================

router.post("/logout", async (req, res) => {
  try {
    const sessionHash = getSessionHash(req);

    // Delete the current session from MySQL
    if (sessionHash) {
      await db.execute(
        `DELETE FROM user_sessions
         WHERE session_hash = ?`,
        [sessionHash]
      );
    }

    res.clearCookie(
      COOKIE_NAME,
      sessionCookieOptions
    );

    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

export default router;
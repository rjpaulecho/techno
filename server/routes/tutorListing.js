
// server/routes/tutorListing.js

import express from "express";
import { createHash } from "node:crypto";
import db from "../db.js";

const router = express.Router();

// ==========================================
// AUTHENTICATE TUTOR
// ==========================================

router.use(async (req, res, next) => {
  const token = req.cookies?.tf_session;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return res.status(401).json({
      success: false,
      message: "Please log in as a tutor.",
    });
  }

  try {
    const sessionHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const [rows] = await db.execute(
      `SELECT u.user_id
       FROM user_sessions us
       JOIN users u
         ON u.user_id = us.user_id
       JOIN tutor_profiles tp
         ON tp.tutor_id = u.user_id
       WHERE us.session_hash = ?
         AND us.expires_at > UTC_TIMESTAMP()
         AND u.role = 'tutor'
         AND u.account_status = 'active'
       LIMIT 1`,
      [sessionHash]
    );

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message: "An active tutor account is required.",
      });
    }

    res.locals.tutorId = rows[0].user_id;

    return next();
  } catch (error) {
    console.error("Tutor listing authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify the tutor account.",
    });
  }
});

// ==========================================
// PUBLISH OR UNPUBLISH OWN PROFILE
// PUT /api/tutors/me/listing
// ==========================================

router.put("/me/listing", async (req, res) => {
  const { is_listed: isListed } = req.body ?? {};

  if (typeof isListed !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "is_listed must be true or false.",
    });
  }

  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    const tutorId = res.locals.tutorId;

    // Lock the tutor profile while checking
    // and updating its publication status.
    const [profiles] = await connection.execute(
      `SELECT tutor_id
       FROM tutor_profiles
       WHERE tutor_id = ?
       FOR UPDATE`,
      [tutorId]
    );

    if (!profiles.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Tutor profile not found.",
      });
    }

    // ========================================
    // CHECK REQUIREMENTS BEFORE PUBLISHING
    // ========================================

    if (isListed) {
      const [[subjectResult]] = await connection.execute(
        `SELECT COUNT(*) AS total
         FROM tutor_subjects ts
         JOIN subjects s
           ON s.subject_id = ts.subject_id
         WHERE ts.tutor_id = ?
           AND ts.is_active = 1
           AND s.is_active = 1
           AND ts.hourly_rate > 0`,
        [tutorId]
      );

      const [[availabilityResult]] = await connection.execute(
        `SELECT COUNT(*) AS total
         FROM tutor_availability
         WHERE tutor_id = ?
           AND is_active = 1
           AND start_time < end_time`,
        [tutorId]
      );

      if (Number(subjectResult.total) < 1) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Add and save at least one active subject with an hourly rate before publishing your profile.",
        });
      }

      if (Number(availabilityResult.total) < 1) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Add and save at least one weekly availability slot before publishing your profile.",
        });
      }
    }

    // ========================================
    // SAVE PUBLICATION STATUS
    // ========================================

    await connection.execute(
      `UPDATE tutor_profiles
       SET is_listed = ?
       WHERE tutor_id = ?`,
      [isListed ? 1 : 0, tutorId]
    );

    await connection.commit();

    return res.json({
      success: true,
      is_listed: isListed,
      message: isListed
        ? "Your profile is now published in the tutor catalog."
        : "Your profile has been unpublished from the tutor catalog.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Tutor listing update error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update your publication status.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;

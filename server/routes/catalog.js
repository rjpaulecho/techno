// server/routes/catalog.js
// Public catalog and working hours for published tutor accounts.

import express from "express";
import db from "../db.js";

const router = express.Router();

// ==========================================
// GET PUBLISHED TUTORS
// GET /api/catalog
// ==========================================

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        u.user_id AS tutor_id,
        u.full_name,
        u.bio,
        u.avatar_url,
        tp.headline,
        tp.years_experience,
        tp.availability_status,
        tp.timezone,

        EXISTS (
          SELECT 1
          FROM tutor_availability ta
          WHERE ta.tutor_id = u.user_id
            AND ta.is_active = 1
        ) AS has_weekly_hours,

        ts.offering_id,
        ts.subject_id,
        s.subject_name,
        ts.hourly_rate

      FROM users u

      JOIN tutor_profiles tp
        ON tp.tutor_id = u.user_id

      JOIN tutor_subjects ts
        ON ts.tutor_id = tp.tutor_id

      JOIN subjects s
        ON s.subject_id = ts.subject_id

      WHERE u.role = 'tutor'
        AND u.account_status = 'active'
        AND tp.is_listed = 1
        AND ts.is_active = 1
        AND s.is_active = 1

      ORDER BY u.full_name, s.subject_name
    `);

    const grouped = new Map();

    for (const row of rows) {
      if (!grouped.has(row.tutor_id)) {
        grouped.set(row.tutor_id, {
          tutor_id: row.tutor_id,
          name: row.full_name,
          headline: row.headline,
          bio: row.bio,
          avatar_url: row.avatar_url,
          years_experience: row.years_experience,
          timezone: row.timezone,
          available:
            row.availability_status === "available" &&
            Boolean(row.has_weekly_hours),
          subjects: [],
        });
      }

      grouped.get(row.tutor_id).subjects.push({
        offering_id: row.offering_id,
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        hourly_rate: Number(row.hourly_rate),
      });
    }

    return res.json({
      success: true,
      tutors: [...grouped.values()],
    });
  } catch (error) {
    console.error("Public catalog error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load tutors.",
    });
  }
});

// ==========================================
// GET TUTOR'S WEEKLY WORKING HOURS
// GET /api/catalog/:tutorId/availability
// ==========================================
// Publicly returns only weekly working hours,
// not private student bookings.
// ==========================================

router.get("/:tutorId/availability", async (req, res) => {
  const tutorId = Number(req.params.tutorId);

  if (
    !Number.isSafeInteger(tutorId) ||
    tutorId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid tutor ID.",
    });
  }

  try {
    const [tutors] = await db.execute(
      `
      SELECT
        tp.tutor_id,
        tp.timezone,
        tp.availability_status

      FROM tutor_profiles tp

      JOIN users u
        ON u.user_id = tp.tutor_id

      WHERE tp.tutor_id = ?
        AND tp.is_listed = 1
        AND u.role = 'tutor'
        AND u.account_status = 'active'

      LIMIT 1
      `,
      [tutorId]
    );

    if (!tutors.length) {
      return res.status(404).json({
        success: false,
        message: "Published tutor not found.",
      });
    }

    const [slots] = await db.execute(
      `
      SELECT
        day_of_week,

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
        AND is_active = 1

      ORDER BY day_of_week, start_time
      `,
      [tutorId]
    );

    return res.json({
      success: true,
      tutor_id: tutorId,
      timezone: tutors[0].timezone,
      available:
        tutors[0].availability_status === "available",
      slots,
    });
  } catch (error) {
    console.error("Public availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load working hours.",
    });
  }
});

export default router;
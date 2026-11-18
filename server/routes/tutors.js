// server/routes/tutors.js

import express from "express";
import { createHash } from "node:crypto";
import db from "../db.js";

const router = express.Router();

const DAY_MIN = 1;
const DAY_MAX = 7;

const TIME_PATTERN =
  /^(?:[01]\d|2[0-3]):[0-5]\d$/;

// ==========================================
// SERVER ERROR HANDLER
// ==========================================

const serverError = (res, error) => {
  console.error("Tutor API error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
};

// ==========================================
// GET AVAILABLE SUBJECTS
// GET /api/tutors/subjects
// ==========================================

router.get("/subjects", async (_req, res) => {
  try {
    const [subjects] = await db.execute(
      `SELECT
          subject_id,
          subject_name,
          slug
       FROM subjects
       WHERE is_active = 1
       ORDER BY subject_name`
    );

    return res.json({
      success: true,
      subjects,
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ==========================================
// AUTHENTICATE TUTOR
// ==========================================
// Every route below requires a valid tutor
// session stored in MySQL.
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
        message:
          "Tutor session or profile not found. Confirm Step 9 was completed.",
      });
    }

    res.locals.tutorId = rows[0].user_id;

    return next();

  } catch (error) {
    return serverError(res, error);
  }
});


 // ==========================================
 // ADD A CUSTOM SUBJECT
 // POST /api/tutors/me/subjects/custom
 // ==========================================

router.post("/me/subjects/custom", async (req, res) => {
  const rawName = req.body?.subject_name;

  const subjectName =
    typeof rawName === "string"
      ? rawName.trim().replace(/\s+/g, " ")
      : "";

  if (subjectName.length < 2 || subjectName.length > 150) {
    return res.status(400).json({
      success: false,
      message: "Subject name must contain 2 to 150 characters.",
    });
  }

  try {
    // Reuse an existing subject instead of creating a duplicate.
    const [existingSubjects] = await db.execute(
      `SELECT subject_id, subject_name, slug
       FROM subjects
       WHERE subject_name = ?
       LIMIT 1`,
      [subjectName]
    );

    if (existingSubjects.length > 0) {
      return res.json({
        success: true,
        created: false,
        subject: existingSubjects[0],
        message: "This subject already exists and is now available to select.",
      });
    }

    // Generate a URL-friendly, unique slug.
    const slugBase =
      subjectName
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 150) || "subject";

    let slug = slugBase;
    let suffix = 2;

    while (true) {
      const [slugRows] = await db.execute(
        `SELECT subject_id
         FROM subjects
         WHERE slug = ?
         LIMIT 1`,
        [slug]
      );

      if (slugRows.length === 0) {
        break;
      }

      const suffixText = `-${suffix++}`;
      slug = `${slugBase.slice(0, 160 - suffixText.length)}${suffixText}`;
    }

    const [result] = await db.execute(
      `INSERT INTO subjects
        (subject_name, slug, is_active)
       VALUES (?, ?, 1)`,
      [subjectName, slug]
    );

    return res.status(201).json({
      success: true,
      created: true,
      subject: {
        subject_id: result.insertId,
        subject_name: subjectName,
        slug,
      },
      message: "Subject added. Set its hourly rate and save your subjects to offer it.",
    });
  } catch (error) {
    // Handle a duplicate created by another request at the same time.
    if (error.code === "ER_DUP_ENTRY") {
      try {
        const [existingSubjects] = await db.execute(
          `SELECT subject_id, subject_name, slug
           FROM subjects
           WHERE subject_name = ?
           LIMIT 1`,
          [subjectName]
        );

        if (existingSubjects.length > 0) {
          return res.json({
            success: true,
            created: false,
            subject: existingSubjects[0],
            message: "This subject already exists and is now available to select.",
          });
        }
      } catch (lookupError) {
        console.error("Duplicate subject lookup error:", lookupError);
      }
    }

    return serverError(res, error);
  }
});


// ==========================================
// GET CURRENT TUTOR PROFILE
// GET /api/tutors/me
// ==========================================

router.get("/me", async (_req, res) => {
  const tutorId = res.locals.tutorId;

  try {
    const [
      [profileRows],
      [offerings],
      [availability],
    ] = await Promise.all([

      // Tutor information
      db.execute(
        `SELECT
            u.user_id AS tutor_id,
            u.full_name,
            u.username,
            u.email,
            u.bio,
            u.avatar_url,
            tp.headline,
            tp.years_experience,
            tp.availability_status,
            tp.timezone,
            tp.is_listed

         FROM users u

         JOIN tutor_profiles tp
           ON tp.tutor_id = u.user_id

         WHERE u.user_id = ?`,
        [tutorId]
      ),

      // Tutor subjects
      db.execute(
        `SELECT
            ts.offering_id,
            ts.subject_id,
            s.subject_name,
            ts.hourly_rate

         FROM tutor_subjects ts

         JOIN subjects s
           ON s.subject_id = ts.subject_id

         WHERE ts.tutor_id = ?
           AND ts.is_active = 1

         ORDER BY s.subject_name`,
        [tutorId]
      ),

      // Weekly working hours
      db.execute(
        `SELECT
            availability_id,
            day_of_week,
            TIME_FORMAT(
              start_time, '%H:%i'
            ) AS start_time,
            TIME_FORMAT(
              end_time, '%H:%i'
            ) AS end_time

         FROM tutor_availability

         WHERE tutor_id = ?
           AND is_active = 1

         ORDER BY day_of_week, start_time`,
        [tutorId]
      ),
    ]);

    return res.json({
      success: true,
      profile: profileRows[0],
      offerings,
      availability,
    });

  } catch (error) {
    return serverError(res, error);
  }
});

// ==========================================
// UPDATE TUTOR PROFILE
// PUT /api/tutors/me/profile
// ==========================================

router.put("/me/profile", async (req, res) => {
  const {
    headline,
    bio,
    years_experience: experience,
  } = req.body ?? {};

  if (
    typeof headline !== "string" ||
    headline.length > 160 ||
    typeof bio !== "string" ||
    bio.length > 2000 ||
    !(
      experience === null ||
      (
        Number.isInteger(experience) &&
        experience >= 0 &&
        experience <= 80
      )
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Provide headline (max 160 chars), bio (max 2000 chars), and years_experience (0-80 or null).",
    });
  }

  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    // Update general user profile
    await connection.execute(
      `UPDATE users
       SET bio = ?
       WHERE user_id = ?`,
      [
        bio.trim(),
        res.locals.tutorId,
      ]
    );

    // Update tutor-specific profile
    await connection.execute(
      `UPDATE tutor_profiles
       SET
         headline = ?,
         years_experience = ?
       WHERE tutor_id = ?`,
      [
        headline.trim(),
        experience,
        res.locals.tutorId,
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Tutor profile saved in MySQL.",
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return serverError(res, error);

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ==========================================
// UPDATE AVAILABILITY STATUS
// PUT /api/tutors/me/status
// ==========================================

router.put("/me/status", async (req, res) => {
  const {
    availability_status: status,
  } = req.body ?? {};

  if (
    status !== "available" &&
    status !== "unavailable"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "availability_status must be available or unavailable.",
    });
  }

  try {
    await db.execute(
      `UPDATE tutor_profiles
       SET availability_status = ?
       WHERE tutor_id = ?`,
      [
        status,
        res.locals.tutorId,
      ]
    );

    return res.json({
      success: true,
      message: "Tutor status saved in MySQL.",
      availability_status: status,
    });

  } catch (error) {
    return serverError(res, error);
  }
});

// ==========================================
// UPDATE WEEKLY AVAILABILITY
// PUT /api/tutors/me/availability
// ==========================================
// Replaces the tutor's saved weekly slots.
// ==========================================

router.put("/me/availability", async (req, res) => {
  const slots = req.body?.slots;

  if (
    !Array.isArray(slots) ||
    slots.length > 35
  ) {
    return res.status(400).json({
      success: false,
      message:
        "slots must be an array with at most 35 items.",
    });
  }

  // ========================================
  // VALIDATE TIME SLOTS
  // ========================================

  for (const slot of slots) {
    if (
      !slot ||
      !Number.isInteger(slot.day_of_week) ||
      slot.day_of_week < DAY_MIN ||
      slot.day_of_week > DAY_MAX ||
      typeof slot.start_time !== "string" ||
      typeof slot.end_time !== "string" ||
      !TIME_PATTERN.test(slot.start_time) ||
      !TIME_PATTERN.test(slot.end_time) ||
      slot.start_time >= slot.end_time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Each slot needs day_of_week (1-7), start_time and end_time (HH:MM).",
      });
    }
  }

  // ========================================
  // SORT TIME SLOTS
  // ========================================

  const ordered = [...slots].sort(
    (a, b) =>
      a.day_of_week - b.day_of_week ||
      a.start_time.localeCompare(
        b.start_time
      )
  );

  // ========================================
  // PREVENT OVERLAPPING SLOTS
  // ========================================

  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1];
    const current = ordered[i];

    if (
      previous.day_of_week ===
        current.day_of_week &&
      current.start_time <
        previous.end_time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Time slots cannot overlap on the same day.",
      });
    }
  }

  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    // Lock this tutor's profile during update
    await connection.execute(
      `SELECT tutor_id
       FROM tutor_profiles
       WHERE tutor_id = ?
       FOR UPDATE`,
      [res.locals.tutorId]
    );

    // Remove previous weekly slots
    await connection.execute(
      `DELETE FROM tutor_availability
       WHERE tutor_id = ?`,
      [res.locals.tutorId]
    );

    // Save new time slots
    for (const slot of ordered) {
      await connection.execute(
        `INSERT INTO tutor_availability
          (
            tutor_id,
            day_of_week,
            start_time,
            end_time
          )
         VALUES (?, ?, ?, ?)`,
        [
          res.locals.tutorId,
          slot.day_of_week,
          slot.start_time,
          slot.end_time,
        ]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message:
        "Weekly availability saved in MySQL.",
      slots_saved: ordered.length,
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return serverError(res, error);

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ==========================================
// UPDATE TUTOR SUBJECTS AND RATES
// PUT /api/tutors/me/subjects
// ==========================================

router.put("/me/subjects", async (req, res) => {
  const offerings = req.body?.offerings;

  if (
    !Array.isArray(offerings) ||
    offerings.length > 50
  ) {
    return res.status(400).json({
      success: false,
      message:
        "offerings must be an array with at most 50 items.",
    });
  }

  const seen = new Set();
  const cleaned = [];

  // ========================================
  // VALIDATE SUBJECTS AND PRICES
  // ========================================

  for (const offering of offerings) {
    const id = offering?.subject_id;

    const priceText = String(
      offering?.hourly_rate ?? ""
    );

    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      seen.has(id) ||
      !/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(
        priceText
      ) ||
      Number(priceText) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Each offering needs a unique subject_id and a positive rate with at most two decimals.",
      });
    }

    seen.add(id);

    cleaned.push({
      subject_id: id,
      hourly_rate: priceText,
    });
  }

  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    await connection.execute(
      `SELECT tutor_id
       FROM tutor_profiles
       WHERE tutor_id = ?
       FOR UPDATE`,
      [res.locals.tutorId]
    );

    // ======================================
    // CHECK SUBJECTS EXIST IN MYSQL
    // ======================================

    if (cleaned.length) {
      const placeholders = cleaned
        .map(() => "?")
        .join(", ");

      const [validSubjects] =
        await connection.execute(
          `SELECT subject_id
           FROM subjects
           WHERE is_active = 1
             AND subject_id IN (${placeholders})`,
          cleaned.map(
            (item) => item.subject_id
          )
        );

      if (
        validSubjects.length !==
        cleaned.length
      ) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            "One or more subject IDs are invalid or inactive.",
        });
      }
    }

    // ======================================
    // DISABLE PREVIOUS OFFERINGS
    // ======================================
    // Keep existing offering IDs for future
    // booking history.
    // ======================================

    await connection.execute(
      `UPDATE tutor_subjects
       SET is_active = 0
       WHERE tutor_id = ?`,
      [res.locals.tutorId]
    );

    // ======================================
    // INSERT OR UPDATE SELECTED SUBJECTS
    // ======================================

    for (const item of cleaned) {
      await connection.execute(
        `INSERT INTO tutor_subjects
          (
            tutor_id,
            subject_id,
            hourly_rate,
            is_active
          )
         VALUES (?, ?, ?, 1)

         ON DUPLICATE KEY UPDATE
           hourly_rate = VALUES(hourly_rate),
           is_active = 1`,
        [
          res.locals.tutorId,
          item.subject_id,
          item.hourly_rate,
        ]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message:
        "Tutor subjects and rates saved in MySQL.",
      offerings_saved: cleaned.length,
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return serverError(res, error);

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;
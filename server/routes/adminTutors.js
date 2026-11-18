
// server/routes/adminTutors.js
// Admin-only tutor account creation and catalog configuration.

import express from "express";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import db from "../db.js";

const router = express.Router();
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function serverError(res, error) {
  console.error("Admin tutor API error:", error);
  return fail(res, 500, "An unexpected server error occurred.");
}

// All endpoints require a valid, active administrator session.
router.use(async (req, res, next) => {
  const token = req.cookies?.tf_session;

  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return fail(res, 401, "Please log in as an administrator.");
  }

  try {
    const hash = createHash("sha256").update(token).digest("hex");
    const [rows] = await db.execute(
      `SELECT u.user_id, u.role
       FROM user_sessions us
       JOIN users u ON u.user_id = us.user_id
       WHERE us.session_hash = ?
         AND us.expires_at > UTC_TIMESTAMP()
         AND u.account_status = 'active'
       LIMIT 1`,
      [hash]
    );

    if (!rows.length) {
      return fail(res, 401, "Your session has expired. Please log in again.");
    }

    if (rows[0].role !== "admin") {
      return fail(res, 403, "Administrator access required.");
    }

    return next();
  } catch (error) {
    console.error("Admin tutor session error:", error);
    return fail(res, 500, "Unable to verify administrator session.");
  }
});

function parseCatalogDetails(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Provide valid tutor details." };
  }

  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const headline = typeof body.headline === "string" ? body.headline.trim() : "";
  const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url.trim() : "";
  const timezone = typeof body.timezone === "string" && body.timezone.trim()
    ? body.timezone.trim()
    : "Asia/Manila";
  const status = body.availability_status ?? "unavailable";
  const years = body.years_experience === null || body.years_experience === "" || body.years_experience === undefined
    ? null
    : Number(body.years_experience);
  const isListed = body.is_listed;

  if (bio.length > 2000) return { error: "Bio must not exceed 2,000 characters." };
  if (headline.length > 160) return { error: "Headline must not exceed 160 characters." };
  if (avatarUrl.length > 500) return { error: "Avatar URL must not exceed 500 characters." };

  if (avatarUrl && !avatarUrl.startsWith("https://") && !avatarUrl.startsWith("pics/")) {
    return { error: "Avatar must be an HTTPS image URL or a path beginning with pics/." };
  }

  if (timezone.length > 64) return { error: "Timezone must not exceed 64 characters." };

  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 80)) {
    return { error: "Years of experience must be from 0 to 80, or left blank." };
  }

  if (status !== "available" && status !== "unavailable") {
    return { error: "Availability status must be available or unavailable." };
  }

  if (typeof isListed !== "boolean") {
    return { error: "Choose whether this tutor should be listed in the catalog." };
  }

  if (!Array.isArray(body.offerings) || body.offerings.length > 20) {
    return { error: "Provide a valid subject list with no more than 20 subjects." };
  }

  const offerings = [];
  const seenSubjects = new Set();

  for (const item of body.offerings) {
    const subjectId = Number(item?.subject_id);
    const rate = Number(item?.hourly_rate);

    if (!Number.isSafeInteger(subjectId) || subjectId <= 0) {
      return { error: "Each selected subject must have a valid subject ID." };
    }

    if (!Number.isFinite(rate) || rate <= 0 || rate > 100000 || Math.round(rate * 100) !== rate * 100) {
      return { error: "Each hourly rate must be from ₱0.01 to ₱100,000.00, with up to two decimal places." };
    }

    if (seenSubjects.has(subjectId)) {
      return { error: "A subject can only be selected once per tutor." };
    }

    seenSubjects.add(subjectId);
    offerings.push({ subject_id: subjectId, hourly_rate: rate });
  }

  if (!Array.isArray(body.availability) || body.availability.length > 21) {
    return { error: "Provide a valid weekly availability list with no more than 21 time slots." };
  }

  const availability = [];
  const seenSlots = new Set();

  const toMinutes = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };

  for (const item of body.availability) {
    const day = Number(item?.day_of_week);
    const start = typeof item?.start_time === "string" ? item.start_time.trim() : "";
    const end = typeof item?.end_time === "string" ? item.end_time.trim() : "";

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return { error: "Each availability slot must use a day from Monday (1) to Sunday (7)." };
    }

    if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
      return { error: "Availability times must use 24-hour HH:MM format." };
    }

    if (toMinutes(start) >= toMinutes(end)) {
      return { error: "Each availability slot must end after it starts on the same day." };
    }

    const key = `${day}|${start}|${end}`;

    if (seenSlots.has(key)) {
      return { error: "Duplicate weekly availability slots are not allowed." };
    }

    seenSlots.add(key);
    availability.push({ day_of_week: day, start_time: start, end_time: end });
  }

  // A listed tutor must have subjects and weekly hours to be bookable.
  if (isListed && offerings.length === 0) {
    return { error: "Add at least one subject and hourly rate before listing this tutor." };
  }

  if (isListed && availability.length === 0) {
    return { error: "Add at least one weekly availability slot before listing this tutor." };
  }

  const sorted = [...availability].sort((a, b) =>
    a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  );

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];

    if (
      previous.day_of_week === current.day_of_week &&
      toMinutes(current.start_time) < toMinutes(previous.end_time)
    ) {
      return { error: "Weekly availability slots on the same day must not overlap." };
    }
  }

  return {
    value: {
      bio,
      headline: headline || null,
      avatar_url: avatarUrl || null,
      timezone,
      availability_status: status,
      years_experience: years,
      is_listed: isListed,
      offerings,
      availability,
    },
  };
}

async function saveCatalogDetails(connection, tutorId, details) {
  if (details.offerings.length) {
    const ids = details.offerings.map((item) => item.subject_id);
    const placeholders = ids.map(() => "?").join(", ");

    const [subjects] = await connection.execute(
      `SELECT subject_id
       FROM subjects
       WHERE is_active = 1
         AND subject_id IN (${placeholders})`,
      ids
    );

    if (subjects.length !== ids.length) {
      const error = new Error("One or more selected subjects are inactive or do not exist.");
      error.statusCode = 400;
      throw error;
    }
  }

  await connection.execute(
    `UPDATE users
     SET bio = ?, avatar_url = ?
     WHERE user_id = ? AND role = 'tutor'`,
    [details.bio || null, details.avatar_url, tutorId]
  );

  await connection.execute(
    `UPDATE tutor_profiles
     SET headline = ?,
         years_experience = ?,
         availability_status = ?,
         timezone = ?,
         is_listed = ?
     WHERE tutor_id = ?`,
    [
      details.headline,
      details.years_experience,
      details.availability_status,
      details.timezone,
      details.is_listed ? 1 : 0,
      tutorId,
    ]
  );

  // Deactivate old subject offerings before saving the selected ones.
  await connection.execute(
    `UPDATE tutor_subjects SET is_active = 0 WHERE tutor_id = ?`,
    [tutorId]
  );

  for (const item of details.offerings) {
    await connection.execute(
      `INSERT INTO tutor_subjects
         (tutor_id, subject_id, hourly_rate, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         hourly_rate = VALUES(hourly_rate),
         is_active = 1`,
      [tutorId, item.subject_id, item.hourly_rate]
    );
  }

  // Deactivate old weekly hours and reactivate matching slots when possible.
  await connection.execute(
    `UPDATE tutor_availability SET is_active = 0 WHERE tutor_id = ?`,
    [tutorId]
  );

  for (const slot of details.availability) {
    await connection.execute(
      `INSERT INTO tutor_availability
         (tutor_id, day_of_week, start_time, end_time, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE is_active = 1`,
      [tutorId, slot.day_of_week, slot.start_time, slot.end_time]
    );
  }
}

// GET /api/admin-tutors/subjects
router.get("/subjects", async (_req, res) => {
  try {
    const [subjects] = await db.execute(
      `SELECT subject_id, subject_name, slug
       FROM subjects
       WHERE is_active = 1
       ORDER BY subject_name`
    );

    return res.json({ success: true, subjects });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET /api/admin-tutors — list tutor accounts and catalog configuration.
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         u.user_id AS tutor_id,
         u.full_name, u.username, u.email, u.bio,
         u.avatar_url, u.account_status,
         tp.headline, tp.years_experience,
         tp.availability_status, tp.timezone, tp.is_listed,
         ts.offering_id, ts.subject_id, s.subject_name, ts.hourly_rate,
         ta.availability_id, ta.day_of_week,
         TIME_FORMAT(ta.start_time, '%H:%i') AS start_time,
         TIME_FORMAT(ta.end_time, '%H:%i') AS end_time
       FROM users u
       JOIN tutor_profiles tp ON tp.tutor_id = u.user_id
       LEFT JOIN tutor_subjects ts
         ON ts.tutor_id = u.user_id AND ts.is_active = 1
       LEFT JOIN subjects s
         ON s.subject_id = ts.subject_id AND s.is_active = 1
       LEFT JOIN tutor_availability ta
         ON ta.tutor_id = u.user_id AND ta.is_active = 1
       WHERE u.role = 'tutor'
       ORDER BY u.full_name, s.subject_name, ta.day_of_week, ta.start_time`
    );

    const tutors = new Map();

    for (const row of rows) {
      if (!tutors.has(row.tutor_id)) {
        tutors.set(row.tutor_id, {
          tutor_id: row.tutor_id,
          full_name: row.full_name,
          username: row.username,
          email: row.email,
          bio: row.bio,
          avatar_url: row.avatar_url,
          account_status: row.account_status,
          headline: row.headline,
          years_experience: row.years_experience,
          availability_status: row.availability_status,
          timezone: row.timezone,
          is_listed: Number(row.is_listed) === 1,
          offerings: [],
          availability: [],
          _offerings: new Set(),
          _slots: new Set(),
        });
      }

      const tutor = tutors.get(row.tutor_id);

      if (
        row.offering_id !== null &&
        row.subject_id !== null &&
        row.subject_name !== null &&
        !tutor._offerings.has(row.offering_id)
      ) {
        tutor._offerings.add(row.offering_id);
        tutor.offerings.push({
          offering_id: row.offering_id,
          subject_id: row.subject_id,
          subject_name: row.subject_name,
          hourly_rate: Number(row.hourly_rate),
        });
      }

      if (row.availability_id !== null && !tutor._slots.has(row.availability_id)) {
        tutor._slots.add(row.availability_id);
        tutor.availability.push({
          availability_id: row.availability_id,
          day_of_week: Number(row.day_of_week),
          start_time: row.start_time,
          end_time: row.end_time,
        });
      }
    }

    const result = [...tutors.values()].map((tutor) => {
      delete tutor._offerings;
      delete tutor._slots;
      return tutor;
    });

    return res.json({ success: true, tutors: result });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST /api/admin-tutors — create an account and tutor profile.
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (fullName.length < 2 || fullName.length > 150) {
    return fail(res, 400, "Full name must contain 2 to 150 characters.");
  }

  if (!USERNAME_PATTERN.test(username)) {
    return fail(res, 400, "Username must be 3 to 50 characters and use only letters, numbers, dots, underscores, or hyphens.");
  }

  if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    return fail(res, 400, "Enter a valid email address.");
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return fail(res, 400, "Password must be at least 8 characters and no more than 72 bytes.");
  }

  const parsed = parseCatalogDetails(body);
  if (parsed.error) return fail(res, 400, parsed.error);

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await connection.execute(
      `INSERT INTO users
         (full_name, username, email, password_hash, role, bio, avatar_url, account_status)
       VALUES (?, ?, ?, ?, 'tutor', ?, ?, 'active')`,
      [
        fullName,
        username,
        email,
        passwordHash,
        parsed.value.bio || null,
        parsed.value.avatar_url,
      ]
    );

    const tutorId = result.insertId;

    await connection.execute(
      `INSERT INTO tutor_profiles
         (tutor_id, headline, years_experience, availability_status, timezone, is_listed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tutorId,
        parsed.value.headline,
        parsed.value.years_experience,
        parsed.value.availability_status,
        parsed.value.timezone,
        parsed.value.is_listed ? 1 : 0,
      ]
    );

    await saveCatalogDetails(connection, tutorId, parsed.value);
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Tutor account created successfully.",
      tutor: {
        tutor_id: tutorId,
        full_name: fullName,
        username,
        email,
        account_status: "active",
        is_listed: parsed.value.is_listed,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Tutor account rollback error:", rollbackError);
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      return fail(res, 409, "That username or email is already registered.");
    }

    if (error.statusCode === 400) return fail(res, 400, error.message);
    return serverError(res, error);
  } finally {
    if (connection) connection.release();
  }
});

// PUT /api/admin-tutors/:tutorId/catalog — configure an existing tutor.
router.put("/:tutorId/catalog", async (req, res) => {
  const tutorId = Number(req.params.tutorId);

  if (!Number.isSafeInteger(tutorId) || tutorId <= 0) {
    return fail(res, 400, "Invalid tutor ID.");
  }

  const parsed = parseCatalogDetails(req.body ?? {});
  if (parsed.error) return fail(res, 400, parsed.error);

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT u.user_id
       FROM users u
       JOIN tutor_profiles tp ON tp.tutor_id = u.user_id
       WHERE u.user_id = ? AND u.role = 'tutor'
       LIMIT 1`,
      [tutorId]
    );

    if (!rows.length) {
      await connection.rollback();
      return fail(res, 404, "Tutor account not found.");
    }

    await saveCatalogDetails(connection, tutorId, parsed.value);
    await connection.commit();

    return res.json({
      success: true,
      message: "Tutor catalog profile updated successfully.",
      tutor_id: tutorId,
      is_listed: parsed.value.is_listed,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Tutor catalog rollback error:", rollbackError);
      }
    }

    if (error.statusCode === 400) return fail(res, 400, error.message);
    return serverError(res, error);
  } finally {
    if (connection) connection.release();
  }
});

export default router;

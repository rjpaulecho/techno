
import express from "express";
import db from "../db.js";

const router = express.Router();

function serverError(res, error) {
  console.error("Homepage statistics API error:", error);

  return res.status(500).json({
    success: false,
    message: "Unable to load homepage statistics.",
  });
}

const formatSubjects = (rows) =>
  rows.map((subject) => ({
    subject_id: Number(subject.subject_id),
    label: subject.subject_name,
    count: Number(subject.session_count),
  }));

const formatPeople = (rows) =>
  rows.map((person) => ({
    user_id: Number(person.user_id),
    full_name: person.full_name,
    avatar_url: person.avatar_url || null,
    completed_sessions: Number(person.completed_sessions),
  }));

// GET /api/homepage-stats
router.get("/", async (_req, res) => {
  try {
    const [
      [completedRows],
      [tutorRows],
      [paymentRows],
      [studentRows],
      [weeklySubjectRows],
      [allTimeSubjectRows],
      [activeTutorRows],
      [activeUserRows],
    ] = await Promise.all([
      // Total completed sessions.
      db.execute(`
        SELECT COUNT(*) AS total
        FROM bookings
        WHERE booking_status = 'completed'
      `),

      // Active tutors listed in the catalog.
      db.execute(`
        SELECT COUNT(*) AS total
        FROM users u
        INNER JOIN tutor_profiles tp
          ON tp.tutor_id = u.user_id
        WHERE u.role = 'tutor'
          AND u.account_status = 'active'
          AND tp.is_listed = 1
      `),

      // Verified payments.
      db.execute(`
        SELECT COUNT(*) AS total
        FROM booking_payments
        WHERE payment_status = 'paid'
      `),

      // Active registered students.
      db.execute(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE role = 'student'
          AND account_status = 'active'
      `),

      // Trending subjects: last seven days.
      db.execute(`
        SELECT
          s.subject_id,
          s.subject_name,
          COUNT(DISTINCT b.booking_id) AS session_count
        FROM bookings b
        INNER JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id
        INNER JOIN subjects s
          ON s.subject_id = ts.subject_id
        WHERE b.booking_status = 'completed'
          AND b.session_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
          AND b.session_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
          AND ts.is_active = 1
          AND s.is_active = 1
        GROUP BY s.subject_id, s.subject_name
        ORDER BY session_count DESC, s.subject_name ASC
        LIMIT 6
      `),

      // Trending subjects: all time.
      db.execute(`
        SELECT
          s.subject_id,
          s.subject_name,
          COUNT(DISTINCT b.booking_id) AS session_count
        FROM bookings b
        INNER JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id
        INNER JOIN subjects s
          ON s.subject_id = ts.subject_id
        WHERE b.booking_status = 'completed'
          AND ts.is_active = 1
          AND s.is_active = 1
        GROUP BY s.subject_id, s.subject_name
        ORDER BY session_count DESC, s.subject_name ASC
        LIMIT 6
      `),

      // Most active tutors.
      db.execute(`
        SELECT
          u.user_id,
          u.full_name,
          u.avatar_url,
          COUNT(DISTINCT b.booking_id) AS completed_sessions
        FROM bookings b
        INNER JOIN tutor_subjects ts
          ON ts.offering_id = b.offering_id
        INNER JOIN users u
          ON u.user_id = ts.tutor_id
        INNER JOIN tutor_profiles tp
          ON tp.tutor_id = u.user_id
        WHERE b.booking_status = 'completed'
          AND u.role = 'tutor'
          AND u.account_status = 'active'
          AND tp.is_listed = 1
          AND ts.is_active = 1
        GROUP BY u.user_id, u.full_name, u.avatar_url
        ORDER BY completed_sessions DESC, u.full_name ASC
        LIMIT 5
      `),

      // Most active students.
      db.execute(`
        SELECT
          u.user_id,
          u.full_name,
          u.avatar_url,
          COUNT(DISTINCT b.booking_id) AS completed_sessions
        FROM bookings b
        INNER JOIN users u
          ON u.user_id = b.student_id
        WHERE b.booking_status = 'completed'
          AND u.role = 'student'
          AND u.account_status = 'active'
        GROUP BY u.user_id, u.full_name, u.avatar_url
        ORDER BY completed_sessions DESC, u.full_name ASC
        LIMIT 5
      `),
    ]);

    return res.json({
      success: true,

      stats: {
        completed_sessions: Number(completedRows[0].total),
        active_tutors: Number(tutorRows[0].total),
        verified_payments: Number(paymentRows[0].total),
        registered_students: Number(studentRows[0].total),
      },

      trending_subjects_week: formatSubjects(weeklySubjectRows),
      trending_subjects_all: formatSubjects(allTimeSubjectRows),

      most_active_tutors: formatPeople(activeTutorRows),
      most_active_users: formatPeople(activeUserRows),
    });
  } catch (error) {
    return serverError(res, error);
  }
});

export default router;

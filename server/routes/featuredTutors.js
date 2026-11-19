
import express from "express";
import { createHash } from "node:crypto";
import db from "../db.js";

const router = express.Router();

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function serverError(res, error) {
  console.error("Featured tutors API error:", error);
  return fail(res, 500, "Unable to process featured tutors request.");
}

// ==========================================
// ADMIN AUTHENTICATION
// Only /admin endpoints require admin access.
// ==========================================

async function requireAdmin(req, res, next) {
  const token = req.cookies?.tf_session;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return fail(res, 401, "Please log in as an administrator.");
  }

  try {
    const hash = createHash("sha256")
      .update(token)
      .digest("hex");

    const [rows] = await db.execute(
      `
      SELECT u.user_id, u.role
      FROM user_sessions us
      JOIN users u ON u.user_id = us.user_id
      WHERE us.session_hash = ?
        AND us.expires_at > UTC_TIMESTAMP()
        AND u.account_status = 'active'
      LIMIT 1
      `,
      [hash]
    );

    if (!rows.length) {
      return fail(res, 401, "Your session has expired.");
    }

    if (rows[0].role !== "admin") {
      return fail(res, 403, "Administrator access required.");
    }

    res.locals.auth = rows[0];
    return next();
  } catch (error) {
    console.error("Featured tutors authentication error:", error);
    return fail(res, 500, "Unable to verify administrator session.");
  }
}

router.use("/admin", requireAdmin);

// ==========================================
// SHARED TUTOR STATISTICS
// ==========================================

const TUTOR_STATS_SELECT = `
  SELECT
    u.user_id AS tutor_id,
    u.full_name,
    u.username,
    u.bio,
    u.avatar_url,
    u.account_status,

    tp.headline,
    tp.years_experience,
    tp.availability_status,
    tp.is_listed,

    (
      SELECT COUNT(*)
      FROM bookings b
      JOIN tutor_subjects ts
        ON ts.offering_id = b.offering_id
      WHERE ts.tutor_id = u.user_id
        AND b.booking_status = 'completed'
    ) AS completed_sessions,

    (
      SELECT COALESCE(SUM(b.duration_minutes), 0)
      FROM bookings b
      JOIN tutor_subjects ts
        ON ts.offering_id = b.offering_id
      WHERE ts.tutor_id = u.user_id
        AND b.booking_status = 'completed'
    ) AS completed_minutes,

    (
      SELECT COUNT(DISTINCT bp.payment_id)
      FROM booking_payments bp
      JOIN bookings b
        ON b.booking_id = bp.booking_id
      JOIN tutor_subjects ts
        ON ts.offering_id = b.offering_id
      WHERE ts.tutor_id = u.user_id
        AND bp.payment_status = 'paid'
    ) AS verified_payments,

    (
      SELECT COALESCE(SUM(bp.amount_paid), 0)
      FROM booking_payments bp
      JOIN bookings b
        ON b.booking_id = bp.booking_id
      JOIN tutor_subjects ts
        ON ts.offering_id = b.offering_id
      WHERE ts.tutor_id = u.user_id
        AND bp.payment_status = 'paid'
    ) AS total_paid,

    (
      SELECT GROUP_CONCAT(
        DISTINCT s.subject_name
        ORDER BY s.subject_name
        SEPARATOR ', '
      )
      FROM tutor_subjects ts
      JOIN subjects s
        ON s.subject_id = ts.subject_id
      WHERE ts.tutor_id = u.user_id
        AND ts.is_active = 1
        AND s.is_active = 1
    ) AS subjects,

    EXISTS (
      SELECT 1
      FROM homepage_featured_tutors hft
      WHERE hft.tutor_id = u.user_id
    ) AS is_featured

  FROM users u
  JOIN tutor_profiles tp
    ON tp.tutor_id = u.user_id
`;

// ==========================================
// PUBLIC: GET PUBLISHED FEATURED TUTORS
// GET /api/featured-tutors
// ==========================================

router.get("/", async (_req, res) => {
  try {
    const [tutors] = await db.execute(
      `
      SELECT
        hft.display_order,
        u.user_id AS tutor_id,
        u.full_name,
        u.bio,
        u.avatar_url,
        tp.headline,
        tp.years_experience
      FROM homepage_featured_tutors hft
      JOIN users u
        ON u.user_id = hft.tutor_id
      JOIN tutor_profiles tp
        ON tp.tutor_id = u.user_id
      WHERE u.role = 'tutor'
        AND u.account_status = 'active'
        AND tp.is_listed = 1
      ORDER BY hft.display_order ASC
      `
    );

    return res.json({
      success: true,
      tutors,
    });
  } catch (error) {
    return serverError(res, error);
  }
});


// ==========================================
// ADMIN: GET ALL TUTORS WITH THEIR STATS
// GET /api/featured-tutors/admin/tutors
// ==========================================

router.get("/admin/tutors", async (_req, res) => {
  try {
    const [tutors] = await db.execute(
      `
      ${TUTOR_STATS_SELECT}
      WHERE u.role = 'tutor'
      ORDER BY
        CASE WHEN u.account_status = 'active'
          AND tp.is_listed = 1 THEN 0 ELSE 1 END,
        u.full_name ASC
      `
    );

    const formattedTutors = tutors.map((tutor) => ({
      ...tutor,
      tutor_id: Number(tutor.tutor_id),
      completed_sessions: Number(tutor.completed_sessions),
      completed_minutes: Number(tutor.completed_minutes),
      completed_hours: Number(tutor.completed_minutes) / 60,
      verified_payments: Number(tutor.verified_payments),
      total_paid: Number(tutor.total_paid),
      years_experience:
        tutor.years_experience === null
          ? null
          : Number(tutor.years_experience),
      is_listed: Number(tutor.is_listed) === 1,
      is_featured: Number(tutor.is_featured) === 1,
      eligible:
        tutor.account_status === "active" &&
        Number(tutor.is_listed) === 1,
    }));

    return res.json({
      success: true,
      tutors: formattedTutors,
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ==========================================
// ADMIN: SAVE FEATURED TUTOR SELECTION
// PUT /api/featured-tutors/admin/selection
// ==========================================

router.put("/admin/selection", async (req, res) => {
  const ids = req.body?.tutor_ids;

  if (
    !Array.isArray(ids) ||
    ![5, 6].includes(ids.length)
  ) {
    return fail(
      res,
      400,
      "Select exactly five or six tutors."
    );
  }

  const tutorIds = ids.map(Number);

  if (
    tutorIds.some(
      (id) => !Number.isSafeInteger(id) || id <= 0
    ) ||
    new Set(tutorIds).size !== tutorIds.length
  ) {
    return fail(
      res,
      400,
      "The tutor selection contains invalid or duplicate IDs."
    );
  }

  let connection;

  try {
    const placeholders = tutorIds.map(() => "?").join(", ");

    const [eligibleTutors] = await db.execute(
      `
      SELECT u.user_id
      FROM users u
      JOIN tutor_profiles tp
        ON tp.tutor_id = u.user_id
      WHERE u.role = 'tutor'
        AND u.account_status = 'active'
        AND tp.is_listed = 1
        AND u.user_id IN (${placeholders})
      `,
      tutorIds
    );

    if (eligibleTutors.length !== tutorIds.length) {
      return fail(
        res,
        400,
        "One or more selected tutors are inactive or not listed in the catalog."
      );
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      "DELETE FROM homepage_featured_tutors"
    );

    for (let index = 0; index < tutorIds.length; index += 1) {
      await connection.execute(
        `
        INSERT INTO homepage_featured_tutors
          (tutor_id, display_order, selected_by)
        VALUES (?, ?, ?)
        `,
        [
          tutorIds[index],
          index + 1,
          res.locals.auth.user_id,
        ]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Homepage featured tutors updated successfully.",
      tutor_ids: tutorIds,
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

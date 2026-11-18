
 // Database-only simulated tutor wallet withdrawals.
 // This route never sends real money or contacts a payout provider.

import express from "express";
import { createHash, randomUUID } from "node:crypto";
import db from "../db.js";

const router = express.Router();
const PAYOUT_METHODS = new Set(["gcash", "maya", "bank_transfer"]);

function money(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function parseAmountToCents(input) {
  if (typeof input !== "string" && typeof input !== "number") return null;

  const value = String(input).trim();
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) return null;

  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function formatWithdrawal(row) {
  return {
    withdrawal_id: Number(row.withdrawal_id),
    withdrawal_reference: row.withdrawal_reference,
    account_email: row.account_email,
    payout_method: row.payout_method,
    masked_destination: `•••• ${String(row.destination_last4 || "").slice(-4)}`,
    amount: money(row.amount_cents),
    balance_before: money(row.balance_before_cents),
    balance_after: money(row.balance_after_cents),
    status: row.withdrawal_status,
    created_at: row.created_at,
  };
}

async function requireTutor(req, res, next) {
  const token = req.cookies?.tf_session;

  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(401).json({
      success: false,
      message: "Please log in with a tutor account first.",
    });
  }

  try {
    const hash = createHash("sha256").update(token).digest("hex");

    const [rows] = await db.execute(
      `
      SELECT u.user_id, u.email, u.role
      FROM user_sessions us
      JOIN users u ON u.user_id = us.user_id
      WHERE us.session_hash = ?
        AND us.expires_at > UTC_TIMESTAMP()
        AND u.account_status = 'active'
        AND u.role = 'tutor'
      LIMIT 1
      `,
      [hash]
    );

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message: "An active tutor account is required to use this wallet.",
      });
    }

    res.locals.tutor = rows[0];
    return next();
  } catch (error) {
    console.error("Demo withdrawal authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not verify your tutor account.",
    });
  }
}

async function getWalletTotals(connection, tutorId) {
  const [earningRows] = await connection.execute(
    `
    SELECT COALESCE(SUM(l.amount_delta_cents), 0) AS earnings_cents
    FROM demo_earnings_ledger l
    JOIN demo_payment_receipts r ON r.receipt_id = l.receipt_id
    WHERE l.beneficiary_type = 'tutor'
      AND l.beneficiary_user_id = ?
      AND r.receipt_status = 'paid'
    `,
    [tutorId]
  );

  const [withdrawalRows] = await connection.execute(
    `SELECT COALESCE(SUM(amount_cents), 0) AS withdrawn_cents
     FROM demo_tutor_withdrawals WHERE tutor_id = ?`,
    [tutorId]
  );

  const earningsCents = Number(earningRows[0]?.earnings_cents || 0);
  const withdrawnCents = Number(withdrawalRows[0]?.withdrawn_cents || 0);

  return {
    earningsCents,
    withdrawnCents,
    availableCents: Math.max(0, earningsCents - withdrawnCents),
  };
}

router.use((_req, res, next) => {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_DEMO_PAYMENTS !== "true"
  ) {
    return res.status(503).json({
      success: false,
      message: "Demo withdrawals are disabled.",
    });
  }

  return next();
});

router.use(requireTutor);

// GET /api/demo-withdrawals
// Returns this tutor's account email, balance, and withdrawal history.
router.get("/", async (_req, res) => {
  const tutor = res.locals.tutor;

  try {
    const totals = await getWalletTotals(db, tutor.user_id);

    const [rows] = await db.execute(
      `
      SELECT withdrawal_id, withdrawal_reference, account_email,
        payout_method, destination_last4, amount_cents,
        balance_before_cents, balance_after_cents, withdrawal_status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM demo_tutor_withdrawals
      WHERE tutor_id = ?
      ORDER BY withdrawal_id DESC
      LIMIT 100
      `,
      [tutor.user_id]
    );

    return res.json({
      success: true,
      environment: "SIMULATION ONLY — NO REAL MONEY",
      account: {
        tutor_id: tutor.user_id,
        email: tutor.email,
      },
      summary: {
        total_earnings: money(totals.earningsCents),
        total_withdrawn: money(totals.withdrawnCents),
        available_balance: money(totals.availableCents),
        currency: "PHP",
      },
      withdrawals: rows.map(formatWithdrawal),
    });
  } catch (error) {
    console.error("Could not load demo tutor wallet:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load your demo wallet.",
    });
  }
});

// POST /api/demo-withdrawals
// Body: { amount: "100.00", payout_method: "gcash", destination_last4: "1234" }
router.post("/", async (req, res) => {
  const tutor = res.locals.tutor;
  const amountCents = parseAmountToCents(req.body?.amount);
  const payoutMethod = req.body?.payout_method;
  const destinationLast4 = String(req.body?.destination_last4 ?? "").trim();

  if (amountCents === null) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid positive amount with no more than two decimal places.",
    });
  }

  if (!PAYOUT_METHODS.has(payoutMethod)) {
    return res.status(400).json({
      success: false,
      message: "Choose GCash, Maya, or bank transfer.",
    });
  }

  if (!/^\d{4}$/.test(destinationLast4)) {
    return res.status(400).json({
      success: false,
      message: "Enter exactly four fictional destination digits.",
    });
  }

  let connection;
  let transactionStarted = false;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Lock this tutor's account row to prevent simultaneous withdrawals
    // from spending the same balance.
    const [accountRows] = await connection.execute(
      `SELECT user_id, email FROM users
       WHERE user_id = ? AND role = 'tutor' AND account_status = 'active'
       LIMIT 1 FOR UPDATE`,
      [tutor.user_id]
    );

    if (!accountRows.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(403).json({
        success: false,
        message: "Your tutor account is not active.",
      });
    }

    const account = accountRows[0];
    const totals = await getWalletTotals(connection, account.user_id);

    if (amountCents > totals.availableCents) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Insufficient demo wallet balance.",
        available_balance: money(totals.availableCents),
        requested_amount: money(amountCents),
        currency: "PHP",
      });
    }

    const balanceAfterCents = totals.availableCents - amountCents;
    const reference = `TF-WD-${randomUUID().toUpperCase()}`;

    const [insertResult] = await connection.execute(
      `
      INSERT INTO demo_tutor_withdrawals (
        tutor_id, account_email, withdrawal_reference, payout_method,
        destination_last4, amount_cents, balance_before_cents,
        balance_after_cents, withdrawal_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'simulated')
      `,
      [
        account.user_id,
        account.email,
        reference,
        payoutMethod,
        destinationLast4,
        amountCents,
        totals.availableCents,
        balanceAfterCents,
      ]
    );

    const [createdRows] = await connection.execute(
      `
      SELECT withdrawal_id, withdrawal_reference, account_email,
        payout_method, destination_last4, amount_cents,
        balance_before_cents, balance_after_cents, withdrawal_status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM demo_tutor_withdrawals
      WHERE withdrawal_id = ? AND tutor_id = ?
      LIMIT 1
      `,
      [insertResult.insertId, account.user_id]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Test withdrawal recorded. No real money was transferred.",
      environment: "SIMULATION ONLY — NO REAL MONEY",
      withdrawal: formatWithdrawal(createdRows[0]),
      summary: {
        total_earnings: money(totals.earningsCents),
        total_withdrawn: money(totals.withdrawnCents + amountCents),
        available_balance: money(balanceAfterCents),
        currency: "PHP",
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Demo withdrawal rollback error:", rollbackError);
      }
    }

    console.error("Could not create demo withdrawal:", error);
    return res.status(500).json({
      success: false,
      message: "Could not record the test withdrawal.",
    });
  } finally {
    if (connection) connection.release();
  }
});

export default router;

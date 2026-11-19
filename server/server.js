
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import db from "./db.js";

// Existing routes
import authRoutes from "./routes/auth.js";
import tutorRoutes from "./routes/tutors.js";
import catalogRoutes from "./routes/catalog.js";
import bookingRoutes from "./routes/bookings.js";
import paymentRoutes from "./routes/payments.js";
import demoPaymentRoutes from "./routes/demoPayments.js";
import transactionTicketRoutes from "./routes/transactionTickets.js";
import adminDemoReviews from "./routes/adminDemoReviews.js";
import contactMessageRoutes from "./routes/contactMessages.js";
import featuredTutorsRoutes from "./routes/featuredTutors.js";
import homepageStatsRoutes from "./routes/homepageStats.js";

// Development login
import devLoginRoutes from "./routes/devLogin.js";

// Wallet
import walletRoutes from "./routes/wallet.js";

// Demo tutor withdrawals
import demoWithdrawalRoutes from "./routes/demoWithdrawals.js";

// Admin routes
import adminTutorsRoutes from "./routes/adminTutors.js";

// Tutor self-publication
import tutorListingRoutes from "./routes/tutorListing.js";

// Demo earnings
import demoEarningsRoutes from "./routes/demoEarnings.js";

// ==========================================
// ENVIRONMENT
// ==========================================

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

// ==========================================
// MIDDLEWARE
// ==========================================

app.disable("x-powered-by");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

// Existing tutor routes first, preserving
// the existing public subjects endpoint.
app.use("/api/tutors", tutorRoutes);

// Tutor publication endpoint
app.use("/api/tutors", tutorListingRoutes);

app.use("/api/catalog", catalogRoutes);
app.use("/api/bookings", bookingRoutes);

app.use("/api/featured-tutors", featuredTutorsRoutes);

// Homepage statistics
app.use("/api/homepage-stats", homepageStatsRoutes);

// ==========================================
// MANUAL PAYMENT MIGRATION
// ==========================================

app.post("/api/payments/:bookingId/submit", (_req, res) => {
  return res.status(410).json({
    success: false,
    message:
      "Manual payment claims are disabled. " +
      "Use the payment options in My Bookings.",
  });
});

// ==========================================
// PAYMENTS AND WALLET
// ==========================================

app.use("/api/payments", adminDemoReviews);
app.use("/api/payments", paymentRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/demo-earnings", demoEarningsRoutes);
app.use("/api/demo-payments", demoPaymentRoutes);
app.use("/api/transaction-tickets", transactionTicketRoutes);

// Demo tutor withdrawals
app.use("/api/demo-withdrawals", demoWithdrawalRoutes);

// ==========================================
// ADMIN
// ==========================================

app.use("/api/admin-tutors", adminTutorsRoutes);

// ==========================================
// DEVELOPMENT LOGIN
// ==========================================

app.use("/api/dev-login", devLoginRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS database_name"
    );

    return res.json({
      success: true,
      database: rows[0].database_name,
    });
  } catch (error) {
    console.error("Database health error:", error);

    return res.status(500).json({
      success: false,
      message: "Database unavailable.",
    });
  }
});

// ==========================================
// SERVER STATUS
// ==========================================

app.get("/", (_req, res) => {
  return res.json({
    success: true,
    message: "TutoFriends API running",
  });
});

app.get("/api", (_req, res) => {
  return res.json({
    success: true,
    message: "TutoFriends API running",
  });
});

// ==========================================
// CONTACT MESSAGES
// ==========================================

app.use("/api/contact-messages", contactMessageRoutes);

// ==========================================
// INVALID JSON
// ==========================================

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body.",
    });
  }

  next(error);
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "127.0.0.1", () => {
  console.log(`TutoFriends backend: http://localhost:${PORT}`);
});

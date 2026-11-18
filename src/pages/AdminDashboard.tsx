// src/pages/AdminDashboard.tsx
// TutoFriends Administrator Dashboard
// Uses real pending payment claims from MySQL.

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";
import { userService } from "../data/userService";

import "../css/adminDashboard.css";

// ==========================================
// TYPES
// ==========================================

type PendingPayment = {
  payment_id: number;
  booking_id: number;
  amount_due: string | number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_status: string;
  booking_status: string;
  student_name: string;
  tutor_name: string;
};

type PendingResponse = {
  success: boolean;
  message?: string;
  payments?: PendingPayment[];
};

// ==========================================
// HELPERS
// ==========================================

function money(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function methodName(value: string | null): string {
  if (value === "gcash") return "GCash";
  if (value === "maya") return "Maya";
  if (value === "bank_transfer") return "Bank Transfer";

  return "Not specified";
}

// ==========================================
// ADMIN DASHBOARD
// ==========================================

export default function AdminDashboard() {
  const [payments, setPayments] =
    useState<PendingPayment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [loggingOut, setLoggingOut] =
    useState(false);

  // ========================================
  // LOAD PAYMENT QUEUE
  // ========================================

  const loadDashboard = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/payments/admin/pending",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal,
          }
        );

        const data =
          (await response.json()) as PendingResponse;

        if (
          !response.ok ||
          !data.success ||
          !Array.isArray(data.payments)
        ) {
          throw new Error(
            data.message ||
              "Unable to load administrator data."
          );
        }

        if (!signal?.aborted) {
          setPayments(data.payments);
        }
      } catch (cause) {
        if (!signal?.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Failed to load dashboard."
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  // ========================================
  // LOAD ON MOUNT
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    void loadDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadDashboard]);

  // ========================================
  // DASHBOARD STATISTICS
  // ========================================

  // The current API returns up to 100 claims.
  // These metrics represent the returned
  // pending queue, not platform-wide totals.

  const pendingCount = payments.length;

  const pendingAmount = payments.reduce(
    (total, payment) =>
      total + Number(payment.amount_due || 0),
    0
  );

  const recentPayments = payments.slice(0, 5);

  // ========================================
  // LOGOUT
  // ========================================

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      await userService.logout();

      window.location.replace("/login");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Logout failed. Please try again."
      );

      setLoggingOut(false);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="ad-layout">

      {/* ===================================
          SIDEBAR
      =================================== */}

      <aside className="ad-sidebar">
        <div className="ad-brand">
          <div className="ad-brand-icon">
            TF
          </div>

          <div>
            <strong>TutoFriends</strong>
            <span>Administration</span>
          </div>
        </div>

        <div className="ad-menu-label">
          MAIN MENU
        </div>

        <nav className="ad-navigation">
          <Link
            to="/admin/dashboard"
            className="ad-nav-link active"
          >
            <span>▦</span>
            Dashboard
          </Link>

          <Link
            to="/admin/payments"
            className="ad-nav-link"
          >
            <span>▤</span>
            Payment Verification

            {pendingCount > 0 && (
              <span className="ad-nav-count">
                {pendingCount}
              </span>
            )}
          </Link>
          <Link
            to="/admin/earnings"
            className="ad-nav-link"
          >
            <span aria-hidden="true">₱</span>
            Platform Earnings
          </Link>
        </nav>

        <div className="ad-sidebar-bottom">
          <div className="ad-admin-profile">
            <div className="ad-admin-avatar">
              A
            </div>

            <div>
              <strong>Administrator</strong>
              <span>Admin Account</span>
            </div>
          </div>

          <button
            type="button"
            className="ad-logout"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            {loggingOut
              ? "Logging out..."
              : "Log Out"}
          </button>
        </div>
      </aside>

      {/* ===================================
          MAIN CONTENT
      =================================== */}

      <main className="ad-main">

        {/* HEADER */}

        <header className="ad-header">
          <div>
            <div className="ad-eyebrow">
              TUTOFRIENDS ADMIN PANEL
            </div>

            <h1>Admin Dashboard</h1>

            <p>
              Monitor reported payments and manage
              verification requests.
            </p>
          </div>

          <button
            type="button"
            className="ad-refresh"
            disabled={loading}
            onClick={() => void loadDashboard()}
          >
            {loading
              ? "Loading..."
              : "↻ Refresh"}
          </button>
        </header>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            className="ad-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ===================================
            STATISTICS
        =================================== */}

        <section className="ad-stats">
          <div className="ad-stat-card">
            <div className="ad-stat-icon">
              ▤
            </div>

            <span>
              Pending Payment Claims
            </span>

            <strong>
              {loading ? "—" : pendingCount}
            </strong>

            <small>
              Awaiting administrator review
            </small>
          </div>

          <div className="ad-stat-card">
            <div className="ad-stat-icon">
              ₱
            </div>

            <span>
              Unverified Amount
            </span>

            <strong>
              {loading
                ? "—"
                : money(pendingAmount)}
            </strong>

            <small>
              Claimed amount, not collected revenue
            </small>
          </div>

          <div className="ad-stat-card">
            <div className="ad-stat-icon">
              ✓
            </div>

            <span>
              Verification System
            </span>

            <strong className="ad-system-status">
              {error
                ? "Error"
                : loading
                  ? "Checking"
                  : "Connected"}
            </strong>

            <small>
              Payment verification API
            </small>
          </div>
        </section>

        {/* ===================================
            PAYMENT QUEUE PREVIEW
        =================================== */}

        <section className="ad-panel">
          <div className="ad-panel-header">
            <div>
              <span className="ad-section-label">
                PAYMENT MANAGEMENT
              </span>

              <h2>
                Pending Verification
              </h2>

              <p>
                Recent reported payments requiring
                independent verification.
              </p>
            </div>

            <Link
              to="/admin/payments"
              className="ad-view-button"
            >
              Open Verification
            </Link>
          </div>

          {loading ? (
            <div
              className="ad-empty"
              role="status"
            >
              Loading payment records...
            </div>
          ) : recentPayments.length === 0 ? (
            <div className="ad-empty">
              No pending payment claims were returned.
            </div>
          ) : (
            <div className="ad-table-scroll">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Student</th>
                    <th>Tutor</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentPayments.map(
                    (payment) => (
                      <tr
                        key={payment.payment_id}
                      >
                        <td>
                          #{payment.booking_id}
                        </td>

                        <td>
                          {payment.student_name}
                        </td>

                        <td>
                          {payment.tutor_name}
                        </td>

                        <td>
                          {methodName(
                            payment.payment_method
                          )}
                        </td>

                        <td>
                          {money(
                            Number(
                              payment.amount_due
                            )
                          )}
                        </td>

                        <td>
                          <span className="ad-status">
                            Pending Verification
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ===================================
            QUICK ACTION
        =================================== */}

        <section className="ad-panel">
          <div className="ad-panel-header">
            <div>
              <span className="ad-section-label">
                QUICK ACCESS
              </span>

              <h2>
                Payment Management
              </h2>

              <p>
                Review payment claims, reject
                invalid references, and verify
                independently confirmed payments.
              </p>
            </div>
          </div>

          <Link
            to="/admin/payments"
            className="ad-action-card"
          >
            <div className="ad-action-icon">
              ✓
            </div>

            <div>
              <strong>
                Payment Verification
              </strong>

              <span>
                Open the administrator
                payment review page
              </span>
            </div>

            <span className="ad-action-arrow">
              →
            </span>
          </Link>
        </section>

        <footer className="ad-footer">
          TutoFriends Administration ·
          Payment verification is manual and
          requires independent confirmation.
        </footer>

      </main>
    </div>
  );
}
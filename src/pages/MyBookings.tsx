// src/pages/MyBookings.tsx
// TutoFriends student bookings with database-only demo checkout.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DemoCheckoutModal from "../components/DemoCheckoutModal";

import ralphImage from "../../pics/ral.jpg";
import rjImage from "../../pics/chon.png";
import shaneImage from "../../pics/acal.png";
import lgImage from "../../pics/lg.png";
import emnilImage from "../../pics/emi.png";
import defaultImage from "../../pics/logo.jpg";

import "../css/myBookings.css";
import "../css/services.css";

// ==========================================
// TYPES
// ==========================================

type BookingStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "cancelled"
  | "declined"
  | "expired";

type PaymentStatus =
  | "unpaid"
  | "pending_verification"
  | "paid"
  | "refund_pending"
  | "refunded";

type BookingFilter =
  | "all"
  | "pending"
  | "accepted"
  | "completed"
  | "closed";

type Booking = {
  booking_id: number;
  tutor_name: string;
  subject_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_amount: string | number;
  student_message: string | null;
  booking_status: BookingStatus;

  payment_id: number | null;
  payment_status: PaymentStatus | null;
  amount_due: string | number | null;
  amount_paid: string | number | null;
  amount_refunded: string | number | null;
  payment_method: string | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  bookings?: Booking[];
};

// ==========================================
// TUTOR IMAGES
// ==========================================

const images: Record<string, string> = {
  ralph: ralphImage,
  rj: rjImage,
  shane: shaneImage,
  lg: lgImage,
  emnil: emnilImage,
};

// ==========================================
// BOOKING STATUS LABELS
// ==========================================

const bookingLabels: Record<
  BookingStatus,
  { label: string; color: string }
> = {
  pending: {
    label: "Pending",
    color: "#b45309",
  },
  accepted: {
    label: "Accepted",
    color: "#15803d",
  },
  completed: {
    label: "Completed",
    color: "#1d4ed8",
  },
  cancelled: {
    label: "Cancelled",
    color: "#b91c1c",
  },
  declined: {
    label: "Declined",
    color: "#b91c1c",
  },
  expired: {
    label: "Expired",
    color: "#64748b",
  },
};

// ==========================================
// PAYMENT STATUS LABELS
// ==========================================

const paymentLabels: Record<
  PaymentStatus,
  {
    label: string;
    color: string;
    bg: string;
  }
> = {
  unpaid: {
    label: "Unpaid",
    color: "#92400e",
    bg: "#fffbeb",
  },
  pending_verification: {
    label: "Pending Verification",
    color: "#6d28d9",
    bg: "#f5f3ff",
  },
  paid: {
    label: "Paid",
    color: "#166534",
    bg: "#f0fdf4",
  },
  refund_pending: {
    label: "Refund Pending",
    color: "#9a3412",
    bg: "#fff7ed",
  },
  refunded: {
    label: "Refunded",
    color: "#475569",
    bg: "#f1f5f9",
  },
};

// ==========================================
// FILTERS
// ==========================================

const filters: {
  value: BookingFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

// ==========================================
// HELPERS
// ==========================================

function peso(
  value: string | number | null | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

function prettyDate(value: string): string {
  const datePart = value.slice(0, 10);
  const date = new Date(
    `${datePart}T00:00:00+08:00`
  );

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeZone: "Asia/Manila",
      }).format(date);
}

function prettyTime(value: string): string {
  const [hours, minutes] = value
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return value;
  }

  return (
    `${hours % 12 || 12}:` +
    `${String(minutes).padStart(2, "0")} ` +
    `${hours >= 12 ? "PM" : "AM"}`
  );
}

function isClosed(
  status: BookingStatus
): boolean {
  return (
    status === "cancelled" ||
    status === "declined" ||
    status === "expired"
  );
}

function photoFor(name: string): string {
  return (
    images[name.trim().toLowerCase()] ||
    defaultImage
  );
}

// ==========================================
// API RESPONSE HELPER
// ==========================================

async function readApi(
  response: Response
): Promise<ApiResponse> {
  const body = (await response
    .json()
    .catch(() => null)) as ApiResponse | null;

  if (!response.ok || !body?.success) {
    throw new Error(
      body?.message ||
        `Request failed (HTTP ${response.status}).`
    );
  }

  return body;
}

// ==========================================
// MY BOOKINGS
// ==========================================

export default function MyBookings() {
  // ========================================
  // STATES
  // ========================================

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [filter, setFilter] =
    useState<BookingFilter>("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [cancellingId, setCancellingId] =
    useState<number | null>(null);

  // NEW: currently selected demo booking
  const [demoBooking, setDemoBooking] =
    useState<Booking | null>(null);

  // ========================================
  // LOAD BOOKINGS
  // ========================================

  const loadBookings = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/bookings/student",
          {
            credentials: "same-origin",
            cache: "no-store",
            signal,
          }
        );

        const data = await readApi(response);

        if (!Array.isArray(data.bookings)) {
          throw new Error(
            "Booking list was not returned by the server."
          );
        }

        if (!signal?.aborted) {
          setBookings(data.bookings);
        }
      } catch (cause) {
        if (!signal?.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Cannot load bookings."
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
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    void loadBookings(controller.signal);

    return () => controller.abort();
  }, [loadBookings]);

  // ========================================
  // CANCEL BOOKING
  // ========================================

  async function cancelBooking(
    booking: Booking
  ) {
    if (
      cancellingId !== null ||
      demoBooking !== null
    ) {
      return;
    }

    // Only unpaid bookings can be
    // cancelled directly.

    if (
      booking.payment_id == null ||
      booking.payment_status !== "unpaid"
    ) {
      setError(
        "This booking cannot be cancelled here because its payment needs review."
      );
      return;
    }

    if (
      !window.confirm(
        `Cancel booking #${booking.booking_id} with ${booking.tutor_name}?`
      )
    ) {
      return;
    }

    setCancellingId(booking.booking_id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/bookings/${booking.booking_id}/status`,
        {
          method: "PATCH",
          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            action: "cancel",
          }),
        }
      );

      await readApi(response);
      await loadBookings();

      setNotice(
        `Booking #${booking.booking_id} cancelled.`
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Cancellation failed."
      );
    } finally {
      setCancellingId(null);
    }
  }

  // ========================================
  // BOOKING COUNTS
  // ========================================

  const counts = useMemo<
    Record<BookingFilter, number>
  >(
    () => ({
      all: bookings.length,

      pending: bookings.filter(
        (b) => b.booking_status === "pending"
      ).length,

      accepted: bookings.filter(
        (b) => b.booking_status === "accepted"
      ).length,

      completed: bookings.filter(
        (b) => b.booking_status === "completed"
      ).length,

      closed: bookings.filter(
        (b) => isClosed(b.booking_status)
      ).length,
    }),
    [bookings]
  );

  // ========================================
  // FILTERED BOOKINGS
  // ========================================

  const visible = bookings.filter(
    (b) =>
      filter === "all" ||
      (filter === "closed"
        ? isClosed(b.booking_status)
        : b.booking_status === filter)
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="mybk-page">

      {/* ==================================
          HEADER
      ================================== */}

      <div className="mybk-header">
        <h1>My Bookings</h1>

        <p>
          Track tutor approval, booking
          schedules, and demo payments.
        </p>
      </div>

      {/* ==================================
          STATISTICS
      ================================== */}

      <div className="mybk-stats">
        {(
          ["pending", "accepted", "all"] as const
        ).map((key, index) => (
          <div
            key={key}
            style={{ display: "contents" }}
          >
            {index > 0 && (
              <div className="mybk-stat-divider" />
            )}

            <div className="mybk-stat">
              <span className="mybk-stat-num">
                {counts[key]}
              </span>

              <span className="mybk-stat-label">
                {key === "all" ? "Total" : key}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================
          FILTER BUTTONS
      ================================== */}

      <div className="mybk-filters">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`filter-btn ${
              filter === item.value
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(item.value)
            }
          >
            {item.label}

            <span className="mybk-filter-count">
              {counts[item.value]}
            </span>
          </button>
        ))}

        <button
          type="button"
          className="filter-btn"
          disabled={
            loading ||
            cancellingId !== null
          }
          onClick={() =>
            void loadBookings()
          }
        >
          {loading
            ? "Loading..."
            : "Refresh"}
        </button>
      </div>

      {/* ==================================
          DEMO PAYMENT NOTICE
      ================================== */}

      <p
        style={{
          fontSize: 13,
          color: "#64748b",
          maxWidth: 800,
          textAlign: "center",
          margin: 0,
        }}
      >
        Demo checkout uses fictional details
        only. No real payments or OTPs are sent.
        Do not enter real banking or card
        credentials.
      </p>

      {/* ERRORS */}

      {error && (
        <p
          role="alert"
          style={{
            color: "#b91c1c",
            maxWidth: 800,
          }}
        >
          {error}
        </p>
      )}

      {/* SUCCESS */}

      {notice && (
        <p
          role="status"
          style={{
            color: "#166534",
            maxWidth: 800,
          }}
        >
          {notice}
        </p>
      )}

      {/* ==================================
          BOOKING LIST
      ================================== */}

      {loading ? (
        <div
          className="mybk-empty"
          role="status"
        >
          Loading bookings...
        </div>
      ) : visible.length === 0 ? (
        <div className="mybk-empty">
          <div className="mybk-empty-icon">
            📭
          </div>

          <p>
            {filter === "all"
              ? "You have no bookings yet."
              : `No ${filter} bookings.`}
          </p>

          {filter === "all" && (
            <p className="mybk-empty-sub">
              Browse the{" "}
              <Link to="/catalog">
                Tutor Catalog
              </Link>{" "}
              to request a session.
            </p>
          )}
        </div>
      ) : (
        <div className="mybk-list">

          {visible.map((booking) => {
            const status =
              bookingLabels[booking.booking_status];

            const payment =
              booking.payment_status
                ? paymentLabels[
                    booking.payment_status
                  ]
                : null;

            const missingPayment =
              booking.payment_id == null ||
              !payment;

            // Detect a successful fictional payment.
            const isDemoPaid =
              booking.payment_status === "paid" &&
              Boolean(
                booking.payment_method?.startsWith(
                  "demo_"
                )
              );

            // Only accepted and unpaid bookings
            // can attempt a simulated payment.
            const canPay =
              booking.booking_status === "accepted" &&
              booking.payment_status === "unpaid" &&
              !missingPayment;

            // Preserve cancellation behavior.
            const canCancel =
              (
                booking.booking_status === "pending" ||
                booking.booking_status === "accepted"
              ) &&
              booking.payment_status === "unpaid" &&
              !missingPayment;

            const cardClass =
              booking.booking_status === "completed"
                ? "mybk-card--completed"
                : isClosed(booking.booking_status)
                  ? "mybk-card--cancelled"
                  : "mybk-card--upcoming";

            return (
              <article
                key={booking.booking_id}
                className={`mybk-card ${cardClass}`}
              >

                {/* TUTOR IMAGE */}

                <img
                  className="mybk-avatar"
                  src={photoFor(booking.tutor_name)}
                  alt={booking.tutor_name}
                />

                <div className="mybk-info">

                  {/* BOOKING TITLE */}

                  <div className="mybk-top-row">
                    <div>
                      <h3 className="mybk-tutor-name">
                        {booking.tutor_name}
                      </h3>

                      <p className="mybk-subject">
                        {booking.subject_name}
                      </p>

                      <small
                        style={{ color: "#64748b" }}
                      >
                        Booking #{booking.booking_id}
                      </small>
                    </div>

                    <span
                      className="mybk-status-badge"
                      style={{
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* SESSION DETAILS */}

                  <div className="mybk-details">

                    <span className="mybk-detail">
                      📅{" "}
                      {prettyDate(
                        booking.session_date
                      )}
                    </span>

                    <span className="mybk-detail">
                      🕐{" "}
                      {prettyTime(
                        booking.start_time
                      )}
                      {" – "}
                      {prettyTime(
                        booking.end_time
                      )}
                    </span>

                    <span className="mybk-detail">
                      ⏱ {booking.duration_minutes} minutes
                    </span>

                    <span className="mybk-detail mybk-cost">
                      Session{" "}
                      {peso(booking.total_amount)}
                    </span>
                  </div>

                  {/* ==================================
                      PAYMENT DETAILS
                  ================================== */}

                  <section
                    aria-label={`Payment for booking ${booking.booking_id}`}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "13px 14px",
                      display: "grid",
                      gap: 10,
                    }}
                  >

                    {/* PAYMENT STATUS */}

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 13,
                          color: "#334155",
                        }}
                      >
                        Payment Details
                      </strong>

                      <span
                        className="mybk-payment-badge"
                        style={{
                          color:
                            payment?.color ||
                            "#b91c1c",

                          background:
                            payment?.bg ||
                            "#fef2f2",
                        }}
                      >
                        {missingPayment
                          ? "Payment record missing"
                          : isDemoPaid
                            ? "Demo Paid"
                            : payment.label}
                      </span>
                    </div>

                    {/* AMOUNTS */}

                    <div
                      style={{
                        display: "flex",
                        gap: "8px 22px",
                        flexWrap: "wrap",
                        fontSize: 13,
                        color: "#475569",
                      }}
                    >
                      <span>
                        Amount Due:{" "}
                        <strong>
                          {peso(
                            booking.amount_due ??
                              booking.total_amount
                          )}
                        </strong>
                      </span>

                      <span>
                        Amount Paid:{" "}
                        <strong>
                          {peso(
                            booking.amount_paid
                          )}
                        </strong>
                      </span>

                      <span>
                        Refunded:{" "}
                        <strong>
                          {peso(
                            booking.amount_refunded
                          )}
                        </strong>
                      </span>
                    </div>

                    {/* MISSING PAYMENT */}

                    {missingPayment && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#b91c1c",
                          margin: 0,
                        }}
                      >
                        This booking has no payment
                        record. Contact the administrator.
                      </p>
                    )}

                    {/* OLD MANUAL CLAIM */}

                    {booking.payment_status ===
                      "pending_verification" && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#6d28d9",
                          margin: 0,
                        }}
                      >
                        {booking.payment_method?.startsWith("demo_")
                          ? "Demo payment awaiting admin approval. No money was charged."
                          : "Manual payment claim awaiting admin verification."}
                      </p>
                    )}

                    {/* PAID */}

                    {booking.payment_status ===
                      "paid" && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#166534",
                          margin: 0,
                        }}
                      >
                        {isDemoPaid
                          ? "Simulated payment complete — no real funds charged."
                          : "Payment recorded through the existing payment process."}
                      </p>
                    )}

                    {/* UNPAID */}

                    {booking.payment_status ===
                      "unpaid" && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#92400e",
                          margin: 0,
                        }}
                      >
                        No payment recorded.
                        Accepted bookings can
                        use Demo Checkout.
                      </p>
                    )}

                    {/* REFUNDS */}

                    {(booking.payment_status ===
                      "refund_pending" ||
                      booking.payment_status ===
                        "refunded") && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#475569",
                          margin: 0,
                        }}
                      >
                        Refund status:{" "}
                        {payment?.label}.
                        Contact the administrator
                        for details.
                      </p>
                    )}
                  </section>

                  {/* ==================================
                      NEW DEMO CHECKOUT BUTTON
                  ================================== */}

                  {canPay && (
                    <button
                      type="button"
                      disabled={
                        cancellingId !== null
                      }
                      onClick={() => {
                        setDemoBooking(booking);
                        setError("");
                        setNotice("");
                      }}
                      style={{
                        alignSelf: "flex-start",
                        background: "#2563eb",
                        color: "white",
                        border: 0,
                        borderRadius: 10,
                        padding: "11px 16px",
                        fontWeight: 750,
                        cursor:
                          cancellingId !== null
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      Pay with Demo Checkout
                    </button>
                  )}

                  {/* STUDENT MESSAGE */}

                  {booking.student_message && (
                    <p className="mybk-message">
                      “{booking.student_message}”
                    </p>
                  )}

                  {/* PENDING MESSAGE */}

                  {booking.booking_status ===
                    "pending" && (
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: 12,
                        margin: 0,
                      }}
                    >
                      Waiting for tutor approval.
                      Pending booking requests
                      expire after 24 hours.
                    </p>
                  )}

                </div>

                {/* ==================================
                    BOOKING ACTIONS
                ================================== */}

                <div className="mybk-actions">
                  {canCancel && (
                    <button
                      className="mybk-cancel-btn"
                      type="button"
                      disabled={
                        cancellingId !== null ||
                        demoBooking !== null
                      }
                      onClick={() =>
                        void cancelBooking(
                          booking
                        )
                      }
                    >
                      {cancellingId ===
                      booking.booking_id
                        ? "Cancelling..."
                        : "Cancel Booking"}
                    </button>
                  )}

                  {(booking.booking_status ===
                    "accepted" ||
                    booking.booking_status ===
                      "pending") &&
                    !canCancel && (
                    <span
                      style={{
                        fontSize: 12,
                        maxWidth: 145,
                        textAlign: "right",
                        color: "#64748b",
                      }}
                    >
                      Cancellation requires
                      administrator review.
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ==================================
          WORKING DEMO CHECKOUT MODAL
      ================================== */}

      {demoBooking && (
        <DemoCheckoutModal
          key={demoBooking.booking_id}
          bookingId={demoBooking.booking_id}
          tutorName={demoBooking.tutor_name}
          subjectName={demoBooking.subject_name}
          onClose={() =>
            setDemoBooking(null)
          }
          onPaid={async () => {
            await loadBookings();

            setNotice(
              `Booking #${demoBooking.booking_id}: ` +
                "demo payment awaiting admin approval. " +
                "No real money was charged."
            );
          }}
        />
      )}
    </div>
  );
}
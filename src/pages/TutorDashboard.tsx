
// Tutor profile, schedule and REAL MySQL booking requests.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TutorWallet from "./TutorWallet";
import Transactions from "./Transactions";
import TutorPublishControl from "../components/TutorPublishControl";
import { userService } from "../data/userService";
import logoImage from "../../pics/logo.jpg";
import ralphImage from "../../pics/ral.jpg";
import rjImage from "../../pics/chon.png";
import shaneImage from "../../pics/acal.png";
import lgImage from "../../pics/lg.png";
import emnilImage from "../../pics/emi.png";
import "../css/tutorDashboard.css";

type Section =
  | "overview"
  | "requests"
  | "schedule"
  | "availability"
  | "profile"
  | "settings"
  | "wallet"
  | "transactions";

type Status = "available" | "unavailable";

type BookingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed"
  | "expired";

type BookingAction = "accept" | "decline" | "complete";

type TutorProfile = {
  tutor_id: number;
  full_name: string;
  username: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  headline: string | null;
  years_experience: number | null;
  availability_status: Status;
  timezone: string;
  is_listed: number;
};

type Offering = {
  offering_id: number;
  subject_id: number;
  subject_name: string;
  hourly_rate: string;
};

type Subject = {
  subject_id: number;
  subject_name: string;
  slug: string;
};

type Slot = {
  availability_id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type PaymentStatus =
  | "unpaid"
  | "pending_verification"
  | "paid"
  | "refund_pending"
  | "refunded";

type Booking = {
  booking_id: number;
  student_id: number;
  student_name: string;
  student_email?: string | null;
  tutor_id: number;
  tutor_name: string;
  subject_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_amount: string | number;
  student_message: string | null;
  booking_status: BookingStatus;

  // Payment information from the database
  payment_id?: number | null;
  payment_status: PaymentStatus | null;
  amount_due?: string | number | null;
  amount_paid?: string | number | null;
  amount_refunded?: string | number | null;
  payment_method?: string | null;
};

type ApiResult = {
  success: boolean;
  message?: string;
};

type TutorResult = ApiResult & {
  profile: TutorProfile;
  offerings: Offering[];
  availability: Slot[];
};

type SubjectsResult = ApiResult & {
  subjects: Subject[];
};

type CustomSubjectResult = ApiResult & {
  created?: boolean;
  subject: Subject;
};

type BookingsResult = ApiResult & {
  bookings: Booking[];
};

// ==========================================
// CONSTANTS
// ==========================================

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const pictures: Record<string, string> = {
  "ral.jpg": ralphImage,
  "chon.png": rjImage,
  "acal.png": shaneImage,
  "lg.png": lgImage,
  "emi.png": emnilImage,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--panel-bg)",
  color: "var(--text-primary)",
  font: "inherit",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "var(--text-primary)",
};

// ==========================================
// HELPERS
// ==========================================

function photo(url: string | null | undefined) {
  const file =
    url?.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";

  return pictures[file] || (url?.startsWith("https://") ? url : logoImage);
}

function money(value: number | string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

function paymentStatusLabel(
  status: PaymentStatus | null | undefined
) {
  switch (status) {
    case "paid":
      return "Paid";

    case "pending_verification":
      return "Pending Verification";

    case "refund_pending":
      return "Refund Pending";

    case "refunded":
      return "Refunded";

    case "unpaid":
    default:
      return "Unpaid";
  }
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function timeLabel(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return `${hours % 12 || 12}:${String(minutes).padStart(
    2,
    "0"
  )} ${hours >= 12 ? "PM" : "AM"}`;
}

function sessionHasEnded(b: Booking) {
  return (
    Date.now() >=
    new Date(`${b.session_date}T${b.end_time}:00+08:00`).getTime()
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

async function request<T extends ApiResult>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
  });

  const body = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !body?.success) {
    throw new Error(
      body?.message || `Server returned HTTP ${response.status}.`
    );
  }

  return body;
}

function put<T extends ApiResult>(url: string, body: unknown) {
  return request<T>(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Request failed. Please try again.";
}

// ==========================================
// TUTOR DASHBOARD COMPONENT
// ==========================================

export default function TutorDashboard() {
  const account = userService.get();
  const location = useLocation();
  const navigate = useNavigate();

  // ========================================
  // STATES
  // ========================================

  const [activeSection, setSection] = useState<Section>("overview");

  const section: Section =
    location.pathname === "/tutor/wallet"
      ? "wallet"
      : location.pathname === "/tutor/transactions"
        ? "transactions"
        : activeSection;

  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState("");

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  // Tutor dashboard theme
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  const [selectedDay, setSelectedDay] = useState(1);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedRates, setSelectedRates] =
    useState<Record<number, string>>({});

  const [newSubjectName, setNewSubjectName] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ========================================
  // DARK MODE
  // ========================================

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );

    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Close the booking modal when Escape is pressed.
  useEffect(() => {
    if (!selectedBooking) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedBooking(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedBooking]);

  // ========================================
  // LOAD TUTOR PROFILE FROM MYSQL
  // ========================================

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const [data, subjectData] = await Promise.all([
        request<TutorResult>("/api/tutors/me"),
        request<SubjectsResult>("/api/tutors/subjects"),
      ]);

      setProfile(data.profile);
      setOfferings(data.offerings);
      setSlots(data.availability);
      setSubjects(subjectData.subjects);

      setHeadline(data.profile.headline ?? "");
      setBio(data.profile.bio ?? "");

      setExperience(
        data.profile.years_experience?.toString() ?? ""
      );

      setSelectedRates(
        Object.fromEntries(
          data.offerings.map((o) => [
            o.subject_id,
            o.hourly_rate,
          ])
        )
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // LOAD REAL BOOKING REQUESTS
  // ========================================

  const loadBookings = useCallback(async () => {
    setBookingLoading(true);
    setBookingError("");

    try {
      const data = await request<BookingsResult>(
        "/api/bookings/tutor"
      );

      setBookings(data.bookings);
    } catch (e) {
      setBookingError(errorText(e));
    } finally {
      setBookingLoading(false);
    }
  }, []);

  // ========================================
  // INITIAL DATA LOADING
  // ========================================

  useEffect(() => {
    void loadProfile();
    void loadBookings();
  }, [loadProfile, loadBookings]);

  // ========================================
  // REUSABLE SAVE HANDLER
  // ========================================

  async function save(
    key: string,
    operation: () => Promise<string>
  ) {
    if (busy) return;

    setBusy(key);
    setError("");
    setMessage("");

    try {
      setMessage(await operation());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  // ========================================
  // UPDATE TUTOR STATUS
  // ========================================

  function changeStatus(value: Status) {
    void save("status", async () => {
      const data = await put<ApiResult>(
        "/api/tutors/me/status",
        {
          availability_status: value,
        }
      );

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              availability_status: value,
            }
          : prev
      );

      return data.message || "Availability saved.";
    });
  }

  // ========================================
  // UPDATE PROFILE
  // ========================================

  function saveProfile() {
    void save("profile", async () => {
      const years =
        experience.trim() === "" ? null : Number(experience);

      if (
        headline.length > 160 ||
        bio.length > 2000 ||
        (years !== null &&
          (!Number.isInteger(years) ||
            years < 0 ||
            years > 80))
      ) {
        throw new Error(
          "Use a headline up to 160 characters, bio up to 2000, and experience 0–80 years."
        );
      }

      const result = await put<ApiResult>(
        "/api/tutors/me/profile",
        {
          headline: headline.trim(),
          bio: bio.trim(),
          years_experience: years,
        }
      );

      setProfile((p) =>
        p
          ? {
              ...p,
              headline: headline.trim(),
              bio: bio.trim(),
              years_experience: years,
            }
          : p
      );

      return result.message || "Profile saved.";
    });
  }

  // ========================================
  // ADD A CUSTOM SUBJECT
  // ========================================

  function addCustomSubject() {
    void save("custom-subject", async () => {
      const subjectName = newSubjectName
        .trim()
        .replace(/\s+/g, " ");

      if (subjectName.length < 2 || subjectName.length > 150) {
        throw new Error(
          "Subject name must contain 2 to 150 characters."
        );
      }

      const result = await request<CustomSubjectResult>(
        "/api/tutors/me/subjects/custom",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject_name: subjectName,
          }),
        }
      );

      const addedSubject = result.subject;

      setSubjects((current) => {
        const alreadyExists = current.some(
          (subject) =>
            subject.subject_id === addedSubject.subject_id
        );

        if (alreadyExists) {
          return current;
        }

        return [...current, addedSubject].sort((a, b) =>
          a.subject_name.localeCompare(b.subject_name)
        );
      });

      setSelectedRates((current) => ({
        ...current,
        [addedSubject.subject_id]:
          current[addedSubject.subject_id] ?? "300.00",
      }));

      setNewSubjectName("");

      return (
        result.message ||
        "Subject added. Set its hourly rate and save your subjects."
      );
    });
  }

  // ========================================
  // UPDATE SUBJECTS AND RATES
  // ========================================

  function saveSubjects() {
    void save("subjects", async () => {
      const selected = Object.entries(selectedRates).map(
        ([id, rate]) => ({
          subject_id: Number(id),
          hourly_rate: rate.trim(),
        })
      );

      for (const s of selected) {
        if (
          !/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(
            s.hourly_rate
          ) ||
          Number(s.hourly_rate) <= 0
        ) {
          throw new Error(
            "Choose a positive hourly rate with at most two decimal places."
          );
        }
      }

      if (
        selected.length === 0 &&
        offerings.length &&
        !window.confirm("Remove all subject offerings?")
      ) {
        return "No changes made.";
      }

      const result = await put<ApiResult>(
        "/api/tutors/me/subjects",
        {
          offerings: selected,
        }
      );

      const fresh = await request<TutorResult>(
        "/api/tutors/me"
      );

      setOfferings(fresh.offerings);

      return result.message || "Subject offerings saved.";
    });
  }

  // ========================================
  // SAVE WEEKLY SCHEDULE
  // ========================================

  function saveSchedule() {
    void save("schedule", async () => {
      const payload = slots.map(
        ({ day_of_week, start_time, end_time }) => ({
          day_of_week,
          start_time,
          end_time,
        })
      );

      if (
        payload.some(
          (s) =>
            !s.start_time ||
            !s.end_time ||
            s.start_time >= s.end_time
        )
      ) {
        throw new Error(
          "Every time slot must end after it starts."
        );
      }

      const result = await put<ApiResult>(
        "/api/tutors/me/availability",
        {
          slots: payload,
        }
      );

      const fresh = await request<TutorResult>(
        "/api/tutors/me"
      );

      setSlots(fresh.availability);

      return result.message || "Weekly schedule saved.";
    });
  }

  // ========================================
  // ACCEPT / DECLINE / COMPLETE BOOKING
  // ========================================

  function performBookingAction(
    booking: Booking,
    action: BookingAction
  ) {
    const verb =
      action === "accept"
        ? "accept"
        : action === "decline"
          ? "decline"
          : "complete";

    if (
      !window.confirm(
        `Do you want to ${verb} booking #${booking.booking_id} for ${booking.student_name}?`
      )
    ) {
      return;
    }

    void save(
      `booking-${booking.booking_id}`,
      async () => {
        const result = await request<ApiResult>(
          `/api/bookings/${booking.booking_id}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action,
            }),
          }
        );

        await loadBookings();

        // Close the details modal after an action.
        setSelectedBooking(null);

        return (
          result.message ||
          `Booking action completed: ${verb}.`
        );
      }
    );
  }

  // ========================================
  // MYSQL LOGOUT
  // ========================================

  function logout() {
    void save("logout", async () => {
      await userService.logout();
      window.location.replace("/login");
      return "Logged out.";
    });
  }

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const status: Status =
    profile?.availability_status ?? "unavailable";

  const displayName =
    profile?.full_name || account?.name || "Tutor";

  const displayImage = photo(
    profile?.avatar_url || account?.avatar
  );

  const editingDisabled = !!busy || loading || !profile;

  const pending = bookings.filter(
    (b) => b.booking_status === "pending"
  );

  const accepted = bookings.filter(
    (b) => b.booking_status === "accepted"
  );

  const upcoming = accepted.filter(
    (b) => !sessionHasEnded(b)
  );

  const history = bookings.filter(
    (b) =>
      !["pending", "accepted"].includes(b.booking_status)
  );

  const daySlots = slots
    .map((slot, index) => ({
      slot,
      index,
    }))
    .filter((i) => i.slot.day_of_week === selectedDay);

  // ========================================
  // SIDEBAR NAVIGATION
  // ========================================

  const nav: {
    id: Section;
    icon: string;
    label: string;
  }[] = [
    { id: "overview", icon: "⌂", label: "Overview" },
    { id: "requests", icon: "▣", label: "Booking Requests" },
    { id: "schedule", icon: "◷", label: "My Schedule" },
    { id: "availability", icon: "●", label: "Availability" },
    { id: "profile", icon: "◎", label: "My Profile" },
    { id: "wallet", icon: "◈", label: "My Wallet" },
    { id: "transactions", icon: "▤", label: "Transaction History" },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];

  // ========================================
  // PAGE HEADING
  // ========================================

  function sectionTitle(
    label: string,
    title: string,
    description: string
  ) {
    return (
      <div className="tutor-page-title">
        <span className="tutor-panel-label">{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    );
  }

  // ========================================
  // REUSABLE BOOKING LIST
  // ========================================

  function bookingList(items: Booking[], emptyText: string) {
    if (!items.length) {
      return <p>{emptyText}</p>;
    }

    return (
      <div className="tutor-request-list">
        {items.map((b) => (
          <div className="tutor-request-item" key={b.booking_id}>
            {/* STUDENT AVATAR */}
            <div
              className="tutor-request-avatar"
              aria-hidden="true"
            >
              {initials(b.student_name)}
            </div>

            {/* BOOKING INFORMATION */}
            <div className="tutor-request-info">
              <strong>{b.student_name}</strong>
              <span>
                {b.subject_name} · {money(b.total_amount)}
              </span>

              {b.booking_status === "accepted" && (
  <span
    className={`tutor-payment-status ${
      b.payment_status || "unpaid"
    }`}
  >
    Payment: {paymentStatusLabel(b.payment_status)}
  </span>
)}

              <small>
                #{b.booking_id} · {dateLabel(b.session_date)} ·{" "}
                {timeLabel(b.start_time)}–{timeLabel(b.end_time)}
              </small>

              {b.student_message && (
                <small>Message: {b.student_message}</small>
              )}
            </div>

            {/* BOOKING STATUS */}
            <span
              className={`tutor-request-status ${b.booking_status}`}
            >
              {b.booking_status}
            </span>

            {/* ACTION BUTTONS */}
            <div className="tutor-request-actions">
              <button
                className="tutor-details-button"
                type="button"
                onClick={() => setSelectedBooking(b)}
              >
                View Details
              </button>

              {b.booking_status === "pending" && (
                <>
                  <button
                    className="tutor-accept-button"
                    type="button"
                    disabled={!!busy}
                    onClick={() =>
                      performBookingAction(b, "accept")
                    }
                  >
                    {busy === `booking-${b.booking_id}`
                      ? "Saving..."
                      : "Accept"}
                  </button>

                  <button
                    className="tutor-decline-button"
                    type="button"
                    disabled={!!busy}
                    onClick={() =>
                      performBookingAction(b, "decline")
                    }
                  >
                    Decline
                  </button>
                </>
              )}

              {b.booking_status === "accepted" &&
                sessionHasEnded(b) && (
                  <button
                    className="tutor-accept-button"
                    type="button"
                    disabled={!!busy}
                    onClick={() =>
                      performBookingAction(b, "complete")
                    }
                  >
                    Mark Complete
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ========================================
  // MAIN DASHBOARD INTERFACE
  // ========================================

  return (
    <div className="tutor-dashboard">
      <aside className="tutor-sidebar">
        <div className="tutor-sidebar-brand">
          <img src={logoImage} alt="TutoFriends" />
          <div>
            <strong>TutoFriends</strong>
            <span>Tutor Panel</span>
          </div>
        </div>

        <div className="tutor-sidebar-profile">
          <img
            src={displayImage}
            alt={displayName}
            className="tutor-sidebar-avatar"
          />
          <div>
            <strong>{displayName}</strong>
            <span>Tutor</span>
          </div>
        </div>

        <nav className="tutor-sidebar-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? "active" : ""}
              onClick={() => {
                if (item.id === "wallet") {
                  navigate("/tutor/wallet");
                } else if (item.id === "transactions") {
                  navigate("/tutor/transactions");
                } else {
                  setSection(item.id);

                  if (
                    location.pathname === "/tutor/wallet" ||
                    location.pathname === "/tutor/transactions"
                  ) {
                    navigate("/tutor-dashboard");
                  }
                }

                setError("");
                setMessage("");
              }}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.id === "requests" && pending.length > 0
                ? ` (${pending.length})`
                : ""}
            </button>
          ))}
        </nav>



        <button
          type="button"
          className="tutor-logout"
          disabled={!!busy}
          onClick={logout}
        >
          <span>↪</span>
          {busy === "logout" ? "Logging out..." : "Logout"}
        </button>
      </aside>

      <main className="tutor-dashboard-main">
        {/* HEADER */}
        <header className="tutor-dashboard-header">
          <div>
            <span className="tutor-eyebrow">
              TUTOR DASHBOARD
            </span>
            <h1>
              Welcome back, {displayName}
              <span>.</span>
            </h1>
            <p>
              Manage student requests, confirmed sessions, subjects,
              and weekly availability.
            </p>
          </div>

<div className="tutor-header-actions">
  <div className="tutor-header-status">
    <span className={`status-dot ${status}`} />
    <span>
      {status === "available"
        ? "Currently available"
        : "Currently unavailable"}
    </span>
  </div>

  <button
    type="button"
    className="dark-toggle"
    onClick={() => setIsDark((current) => !current)}
    aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    aria-pressed={isDark}
    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
  >
    {isDark ? "☀" : "☾"}
  </button>
</div>

        </header>

        {/* LOADING */}
        {loading && (
          <div className="tutor-panel" role="status">
            Loading tutor profile from MySQL...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div
            className="tutor-panel"
            role="alert"
            style={{
              borderColor: "#dc2626",
              marginBottom: 16,
            }}
          >
            <p style={{ color: "#dc2626" }}>{error}</p>

            {!profile && (
              <button
                type="button"
                onClick={() => void loadProfile()}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {message && (
          <div
            className="tutor-panel"
            role="status"
            style={{ marginBottom: 16 }}
          >
            <p>{message}</p>
          </div>
        )}

        {/* BOOKING ERROR */}
        {bookingError && (
          <div
            className="tutor-panel"
            role="alert"
            style={{ marginBottom: 16 }}
          >
            <p>Could not load bookings: {bookingError}</p>

            <button
              type="button"
              className="tutor-text-button"
              onClick={() => void loadBookings()}
            >
              Retry bookings
            </button>
          </div>
        )}

        {!loading && profile && section === "overview" && (
          <section className="tutor-section">
            {/* STATISTICS */}
            <div className="tutor-stats-grid">
              {[
                {
                  icon: "▣",
                  label: "Pending Requests",
                  value: bookingLoading ? "…" : String(pending.length),
                },
                {
                  icon: "✓",
                  label: "Accepted Bookings",
                  value: bookingLoading ? "…" : String(accepted.length),
                },
                {
                  icon: "◷",
                  label: "Weekly Slots",
                  value: String(slots.length),
                },
                {
                  icon: "▤",
                  label: "Subjects Offered",
                  value: String(offerings.length),
                },
              ].map((s) => (
                <div className="tutor-stat-card" key={s.label}>
                  <div className="tutor-stat-icon">{s.icon}</div>
                  <div>
                    <span>{s.label}</span>
                    <strong>{s.value}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* REQUESTS AND AVAILABILITY */}
            <div className="tutor-content-grid">
              {/* PENDING REQUESTS */}
              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">
                      MYSQL BOOKINGS
                    </span>
                    <h2>Pending requests</h2>
                  </div>

                  <button
                    type="button"
                    className="tutor-text-button"
                    onClick={() => setSection("requests")}
                  >
                    View all
                  </button>
                </div>

                {bookingLoading ? (
                  <p>Loading requests...</p>
                ) : (
                  bookingList(
                    pending.slice(0, 3),
                    "No pending requests."
                  )
                )}
              </div>

              {/* AVAILABILITY */}
              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">
                      AVAILABILITY
                    </span>
                    <h2>Your status</h2>
                  </div>
                </div>

                <div className="tutor-availability-card">
                  <div
                    className={`tutor-availability-indicator ${status}`}
                  >
                    <span />
                  </div>
                  <div>
                    <strong>
                      {status === "available"
                        ? "You are available"
                        : "You are unavailable"}
                    </strong>
                    <p>Saved in MySQL.</p>
                  </div>
                </div>

                <div className="tutor-availability-actions">
                  <button
                    type="button"
                    disabled={editingDisabled}
                    className={
                      status === "available" ? "selected" : ""
                    }
                    onClick={() => changeStatus("available")}
                  >
                    Available
                  </button>

                  <button
                    type="button"
                    disabled={editingDisabled}
                    className={
                      status === "unavailable" ? "selected" : ""
                    }
                    onClick={() => changeStatus("unavailable")}
                  >
                    Unavailable
                  </button>
                </div>
              </div>
            </div>

            {/* UPCOMING SESSIONS */}
            <div className="tutor-panel">
              <div className="tutor-panel-heading">
                <div>
                  <span className="tutor-panel-label">
                    CONFIRMED SESSIONS
                  </span>
                  <h2>Upcoming bookings</h2>
                </div>

                <button
                  type="button"
                  className="tutor-text-button"
                  onClick={() => setSection("schedule")}
                >
                  My Schedule
                </button>
              </div>

              {bookingLoading ? (
                <p>Loading...</p>
              ) : (
                bookingList(
                  upcoming,
                  "No upcoming accepted bookings."
                )
              )}
            </div>
          </section>
        )}

        {!loading && profile && section === "requests" && (
          <section className="tutor-section">
            {sectionTitle(
              "BOOKINGS",
              "Booking Requests",
              "Accept or decline pending student requests. Changes are saved in MySQL."
            )}

            {/* PENDING */}
            <div className="tutor-panel">
              <div className="tutor-panel-heading">
                <div>
                  <span className="tutor-panel-label">PENDING</span>
                  <h2>Requests ({pending.length})</h2>
                </div>

                <button
                  type="button"
                  className="tutor-text-button"
                  disabled={bookingLoading}
                  onClick={() => void loadBookings()}
                >
                  Refresh
                </button>
              </div>

              {bookingLoading ? (
                <p>Loading requests...</p>
              ) : (
                bookingList(
                  pending,
                  "No pending requests. A request may have expired after 24 hours."
                )
              )}
            </div>

            {/* ACCEPTED */}
            <div className="tutor-panel">
              <span className="tutor-panel-label">ACCEPTED</span>
              <h2>Confirmed sessions</h2>

              {bookingLoading ? (
                <p>Loading...</p>
              ) : (
                bookingList(accepted, "No accepted bookings.")
              )}
            </div>

            {/* HISTORY */}
            <div className="tutor-panel">
              <span className="tutor-panel-label">HISTORY</span>
              <h2>
                Completed / declined / cancelled / expired
              </h2>

              {bookingLoading ? (
                <p>Loading...</p>
              ) : (
                bookingList(history, "No history yet.")
              )}
            </div>
          </section>
        )}

        {!loading && profile && section === "schedule" && (
          <section className="tutor-section">
            {sectionTitle(
              "SCHEDULE",
              "My Schedule",
              `Working hours are in ${profile.timezone}. Student bookings are shown separately below.`
            )}

            <div className="tutor-content-grid">
              {/* DAY SELECTION */}
              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">
                      WEEKLY HOURS
                    </span>
                    <h2>Select a day</h2>
                  </div>
                </div>

                <div className="tutor-week-list">
                  {DAYS.map((day, index) => (
                    <button
                      type="button"
                      key={day}
                      className={
                        selectedDay === index + 1 ? "enabled" : ""
                      }
                      onClick={() => setSelectedDay(index + 1)}
                    >
                      <span>{day}</span>
                      <span>
                        {
                          slots.filter(
                            (s) => s.day_of_week === index + 1
                          ).length
                        }{" "}
                        slot(s)
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* EDIT TIME SLOTS */}
              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">
                      TIME SLOTS
                    </span>
                    <h2>{DAYS[selectedDay - 1]}</h2>
                  </div>
                </div>

                {!daySlots.length && (
                  <p>No working hours for this day.</p>
                )}

                {daySlots.map(({ slot, index }) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "end",
                      gap: 8,
                      marginBottom: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={{ flex: "1 1 100px" }}>
                      <span style={labelStyle}>From</span>
                      <input
                        style={inputStyle}
                        type="time"
                        value={slot.start_time}
                        disabled={editingDisabled}
                        onChange={(e) =>
                          setSlots((old) =>
                            old.map((s, i) =>
                              i === index
                                ? {
                                    ...s,
                                    start_time: e.target.value,
                                  }
                                : s
                            )
                          )
                        }
                      />
                    </label>

                    <label style={{ flex: "1 1 100px" }}>
                      <span style={labelStyle}>To</span>
                      <input
                        style={inputStyle}
                        type="time"
                        value={slot.end_time}
                        disabled={editingDisabled}
                        onChange={(e) =>
                          setSlots((old) =>
                            old.map((s, i) =>
                              i === index
                                ? {
                                    ...s,
                                    end_time: e.target.value,
                                  }
                                : s
                            )
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="tutor-text-button"
                      disabled={editingDisabled}
                      onClick={() =>
                        setSlots((old) =>
                          old.filter((_, i) => i !== index)
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="tutor-text-button"
                    disabled={editingDisabled || slots.length >= 35}
                    onClick={() =>
                      setSlots((old) => [
                        ...old,
                        {
                          day_of_week: selectedDay,
                          start_time: "09:00",
                          end_time: "12:00",
                        },
                      ])
                    }
                  >
                    + Add time slot
                  </button>

                  <button
                    type="button"
                    className="tutor-text-button"
                    disabled={editingDisabled}
                    onClick={saveSchedule}
                  >
                    {busy === "schedule"
                      ? "Saving..."
                      : "Save weekly schedule"}
                  </button>
                </div>

                <p style={{ fontSize: 12 }}>
                  Saved times must not overlap. These are working
                  hours, not booked sessions.
                </p>
              </div>
            </div>

            {/* REAL ACCEPTED SESSIONS */}
            <div className="tutor-panel">
              <div className="tutor-panel-heading">
                <div>
                  <span className="tutor-panel-label">
                    BOOKED SESSIONS
                  </span>
                  <h2>Accepted sessions</h2>
                </div>

                <button
                  type="button"
                  className="tutor-text-button"
                  onClick={() => void loadBookings()}
                >
                  Refresh
                </button>
              </div>

              {bookingLoading ? (
                <p>Loading bookings...</p>
              ) : (
                bookingList(
                  accepted,
                  "No accepted sessions yet."
                )
              )}
            </div>
          </section>
        )}

        {!loading && profile && section === "availability" && (
          <section className="tutor-section">
            {sectionTitle(
              "AVAILABILITY",
              "Manage Availability",
              "Changes take effect immediately in MySQL."
            )}

            <div className="tutor-panel tutor-availability-main">
              <div className={`tutor-large-status ${status}`}>
                <div className="tutor-large-status-icon">
                  <span />
                </div>

                <div>
                  <span className="tutor-panel-label">
                    CURRENT STATUS
                  </span>
                  <h2>
                    {status === "available"
                      ? "Available"
                      : "Unavailable"}
                  </h2>
                  <p>
                    Availability is a general preference. It does
                    not confirm that a particular appointment is open.
                  </p>
                </div>
              </div>

              <div className="tutor-status-buttons">
                <button
                  type="button"
                  className={
                    status === "available" ? "active" : ""
                  }
                  disabled={editingDisabled}
                  onClick={() => changeStatus("available")}
                >
                  Set as Available
                </button>

                <button
                  type="button"
                  className={
                    status === "unavailable" ? "active" : ""
                  }
                  disabled={editingDisabled}
                  onClick={() => changeStatus("unavailable")}
                >
                  Set as Unavailable
                </button>
              </div>
            </div>
          </section>
        )}

        {!loading && profile && section === "profile" && (
          <section className="tutor-section">
            {sectionTitle(
              "PROFILE",
              "My Profile",
              "Edit information, subjects, and hourly rates stored in MySQL."
            )}

            <div className="tutor-profile-card">
              <img
                src={displayImage}
                alt={displayName}
                className="tutor-profile-large-image"
              />

              <div className="tutor-profile-information">
                <span className="tutor-panel-label">TUTOR</span>
                <h2>{displayName}</h2>
                <strong>
                  {profile.headline || "TutoFriends Tutor"}
                </strong>
                <p>{profile.bio || "No biography yet."}</p>

                <div className="tutor-expertise-list">
                  {offerings.map((o) => (
                    <span key={o.subject_id}>
                      {o.subject_name} · {money(o.hourly_rate)}/hr
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="tutor-content-grid"
              style={{ marginTop: 20 }}
            >
              {/* EDIT PROFILE */}
              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">
                      EDIT PROFILE
                    </span>
                    <h2>Profile details</h2>
                  </div>
                </div>

                <label
                  style={{
                    display: "block",
                    marginBottom: 14,
                  }}
                >
                  <span style={labelStyle}>Headline</span>
                  <input
                    style={inputStyle}
                    maxLength={160}
                    value={headline}
                    disabled={editingDisabled}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                </label>

                <label
                  style={{
                    display: "block",
                    marginBottom: 14,
                  }}
                >
                  <span style={labelStyle}>About you</span>
                  <textarea
                    style={inputStyle}
                    rows={5}
                    maxLength={2000}
                    value={bio}
                    disabled={editingDisabled}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </label>

                <label
                  style={{
                    display: "block",
                    marginBottom: 14,
                  }}
                >
                  <span style={labelStyle}>
                    Years of experience
                  </span>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    max="80"
                    step="1"
                    value={experience}
                    disabled={editingDisabled}
                    onChange={(e) =>
                      setExperience(e.target.value)
                    }
                  />
                </label>

                <button
                  type="button"
                  className="tutor-text-button"
                  disabled={editingDisabled}
                  onClick={saveProfile}
                >
                  {busy === "profile" ? "Saving..." : "Save profile"}
                </button>
              </div>

              {/* SUBJECTS */}
              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">
                      SUBJECTS
                    </span>
                    <h2>Subjects & hourly rates</h2>
                  </div>
                </div>

                {subjects.map((subject) => {
                  const selected =
                    Object.prototype.hasOwnProperty.call(
                      selectedRates,
                      subject.subject_id
                    );

                  return (
                    <div
                      key={subject.subject_id}
                      style={{ marginBottom: 14 }}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={editingDisabled}
                          onChange={(e) =>
                            setSelectedRates((old) => {
                              const next = { ...old };

                              if (e.target.checked) {
                                next[subject.subject_id] = "300.00";
                              } else {
                                delete next[subject.subject_id];
                              }

                              return next;
                            })
                          }
                        />{" "}
                        {subject.subject_name}
                      </label>

                      {selected && (
                        <input
                          style={{
                            ...inputStyle,
                            marginTop: 6,
                          }}
                          aria-label={`${subject.subject_name} hourly rate`}
                          type="number"
                          min="0.01"
                          max="999999.99"
                          step="0.01"
                          value={selectedRates[subject.subject_id]}
                          disabled={editingDisabled}
                          onChange={(e) =>
                            setSelectedRates((old) => ({
                              ...old,
                              [subject.subject_id]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  );
                })}

                {/* ADD CUSTOM SUBJECT */}
                <div
                  style={{
                    marginTop: 20,
                    marginBottom: 16,
                    padding: 16,
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Can't find your subject?
                  </strong>

                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginTop: 0,
                    }}
                  >
                    Add a new subject to the list. After adding it,
                    set your hourly rate and save your subject offerings.
                  </p>

                  <label
                    htmlFor="custom-subject-name"
                    style={labelStyle}
                  >
                    New subject name
                  </label>

                  <input
                    id="custom-subject-name"
                    type="text"
                    value={newSubjectName}
                    maxLength={150}
                    placeholder="e.g. Data Structures or Graphic Design"
                    style={inputStyle}
                    disabled={editingDisabled || Boolean(busy)}
                    onChange={(event) =>
                      setNewSubjectName(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();

                        if (
                          newSubjectName.trim().length >= 2 &&
                          !editingDisabled &&
                          !busy
                        ) {
                          addCustomSubject();
                        }
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="tutor-text-button"
                    style={{ marginTop: 12 }}
                    disabled={
                      editingDisabled ||
                      Boolean(busy) ||
                      newSubjectName.trim().length < 2
                    }
                    onClick={addCustomSubject}
                  >
                    {busy === "custom-subject"
                      ? "Adding subject..."
                      : "Add custom subject"}
                  </button>
                </div>

                <button
                  type="button"
                  className="tutor-text-button"
                  disabled={editingDisabled}
                  onClick={saveSubjects}
                >
                  {busy === "subjects"
                    ? "Saving..."
                    : "Save subjects & rates"}
                </button>
              </div>
            </div>
          </section>
        )}

        {!loading && profile && section === "settings" && (
          <section className="tutor-section">
            {sectionTitle(
              "SETTINGS",
              "Account Settings",
              "Account details from MySQL."
            )}

            <div className="tutor-panel">
              <div className="tutor-setting-row">
                <div>
                  <strong>Account type</strong>
                  <span>Tutor account</span>
                </div>
                <span className="tutor-setting-value">Tutor</span>
              </div>

              <div className="tutor-setting-row">
                <div>
                  <strong>Username</strong>
                  <span>{profile.username || "Not set"}</span>
                </div>
              </div>

              <div className="tutor-setting-row">
                <div>
                  <strong>Email</strong>
                  <span>{profile.email}</span>
                </div>
              </div>

              <div className="tutor-setting-row">
                <div>
                  <strong>Timezone</strong>
                  <span>{profile.timezone}</span>
                </div>
              </div>

              <div className="tutor-setting-row">
                <div>
                  <strong>Catalog status</strong>
                  <span>
                    {profile.is_listed
                      ? "Published"
                      : "Not published"}
                  </span>
                </div>
              </div>

              <TutorPublishControl
                isListed={Boolean(profile.is_listed)}
                hasSubjects={offerings.some(
                  (offering) =>
                    Number(offering.hourly_rate) > 0
                )}
                hasAvailability={slots.some(
                  (slot) =>
                    slot.start_time < slot.end_time
                )}
                onChange={(isListed) => {
                  setProfile((current) =>
                    current
                      ? {
                          ...current,
                          is_listed: isListed ? 1 : 0,
                        }
                      : current
                  );
                }}
              />
            </div>
          </section>
        )}

        {/* WALLET INSIDE TUTOR DASHBOARD */}
        {section === "wallet" && <TutorWallet />}

        {section === "transactions" && <Transactions />}

        {/* ========================================
            BOOKING DETAILS MODAL
        ======================================== */}
        {selectedBooking && (
          <div
            className="tutor-booking-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedBooking(null);
              }
            }}
          >
            <section
              className="tutor-booking-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tutor-booking-modal-title"
            >
              <div className="tutor-booking-modal-header">
                <div>
                  <span>BOOKING DETAILS</span>
                  <h2 id="tutor-booking-modal-title">
                    Booking #{selectedBooking.booking_id}
                  </h2>
                </div>

                <button
                  type="button"
                  className="tutor-booking-modal-close"
                  onClick={() => setSelectedBooking(null)}
                  aria-label="Close booking details"
                >
                  ×
                </button>
              </div>

              {/* CLIENT INFORMATION */}
              <div className="tutor-booking-client">
                <div className="tutor-request-avatar">
                  {initials(selectedBooking.student_name)}
                </div>

                <div className="tutor-booking-client-info">
                  <strong>{selectedBooking.student_name}</strong>
                  <span>Client / Student</span>

                  {selectedBooking.student_email ? (
                    <a
                      href={`mailto:${selectedBooking.student_email}`}
                    >
                      {selectedBooking.student_email}
                    </a>
                  ) : (
                    <span>Email not available</span>
                  )}

                  <small>
                    Student ID: {selectedBooking.student_id}
                  </small>
                </div>
              </div>

              {/* BOOKING INFORMATION */}
              <div className="tutor-booking-detail-grid">
                <div>
                  <small>Subject</small>
                  <strong>{selectedBooking.subject_name}</strong>
                </div>

                <div>
                  <small>Status</small>
                  <strong
                    className={`tutor-booking-status ${selectedBooking.booking_status}`}
                  >
                    {selectedBooking.booking_status}
                  </strong>
                </div>

                <div>
                  <small>Session date</small>
                  <strong>
                    {dateLabel(selectedBooking.session_date)}
                  </strong>
                </div>

                <div>
                  <small>Time</small>
                  <strong>
                    {timeLabel(selectedBooking.start_time)} –{" "}
                    {timeLabel(selectedBooking.end_time)}
                  </strong>
                </div>

                <div>
                  <small>Duration</small>
                  <strong>
                    {selectedBooking.duration_minutes} minutes
                  </strong>
                </div>

                <div>
                  <small>Total amount</small>
                  <strong>
                    {money(selectedBooking.total_amount)}
                  </strong>
                </div>
              </div>

              
{/* PAYMENT INFORMATION CARD */}
<div className="tutor-payment-card">
  <div className="tutor-payment-card-header">
    <div>
      <span className="tutor-payment-eyebrow">
        TRANSACTION DETAILS
      </span>
      <h3>Payment Information</h3>
    </div>

    <span
      className={`tutor-payment-status ${
        selectedBooking.payment_status || "unpaid"
      }`}
    >
      {paymentStatusLabel(selectedBooking.payment_status)}
    </span>
  </div>

  <div className="tutor-payment-card-body">
    <div className="tutor-payment-item">
      <span>Amount Due</span>
      <strong>
        {money(
          Number(
            selectedBooking.amount_due ??
            selectedBooking.total_amount ??
            0
          )
        )}
      </strong>
    </div>

    <div className="tutor-payment-item">
      <span>Amount Paid</span>
      <strong className="tutor-payment-amount-paid">
        {money(Number(selectedBooking.amount_paid || 0))}
      </strong>
    </div>

    <div className="tutor-payment-item">
      <span>Payment Method</span>
      <strong>
        {selectedBooking.payment_method || "Not submitted"}
      </strong>
    </div>

    <div className="tutor-payment-item">
      <span>Payment Reference</span>
      <strong>
        {selectedBooking.payment_id
          ? `#${selectedBooking.payment_id}`
          : "Not available"}
      </strong>
    </div>
  </div>

  <div className="tutor-payment-card-footer">
    <span>Booking #{selectedBooking.booking_id}</span>
    <span>
      {selectedBooking.payment_status === "paid"
        ? "Payment received"
        : selectedBooking.payment_status === "pending_verification"
          ? "Awaiting payment verification"
          : selectedBooking.payment_status === "refunded"
            ? "Payment refunded"
            : selectedBooking.payment_status === "refund_pending"
              ? "Refund processing"
              : "Awaiting student payment"}
    </span>
  </div>
</div>


<div className="tutor-booking-detail">
  <span>Amount Paid</span>
  <strong>
    {money(
      Number(selectedBooking.amount_paid || 0)
    )}
  </strong>
</div>

<div className="tutor-booking-detail">
  <span>Payment Method</span>
  <strong>
    {selectedBooking.payment_method || "Not submitted"}
  </strong>
</div>

              {/* CLIENT MESSAGE */}
              <div className="tutor-booking-message">
                <small>Message from client</small>
                <p>
                  {selectedBooking.student_message?.trim() ||
                    "The client did not leave a message."}
                </p>
              </div>

              {/* MODAL ACTIONS */}
              <div className="tutor-booking-modal-footer">
                {selectedBooking.booking_status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="tutor-modal-accept"
                      disabled={!!busy}
                      onClick={() =>
                        performBookingAction(
                          selectedBooking,
                          "accept"
                        )
                      }
                    >
                      Accept Booking
                    </button>

                    <button
                      type="button"
                      className="tutor-modal-decline"
                      disabled={!!busy}
                      onClick={() =>
                        performBookingAction(
                          selectedBooking,
                          "decline"
                        )
                      }
                    >
                      Decline
                    </button>
                  </>
                )}

                {selectedBooking.booking_status === "accepted" &&
                  sessionHasEnded(selectedBooking) && (
                    <button
                      type="button"
                      className="tutor-modal-accept"
                      disabled={!!busy}
                      onClick={() =>
                        performBookingAction(
                          selectedBooking,
                          "complete"
                        )
                      }
                    >
                      Mark Complete
                    </button>
                  )}

                <button
                  type="button"
                  className="tutor-modal-close-button"
                  onClick={() => setSelectedBooking(null)}
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

// src/navbar/catalog.tsx
// Public MySQL tutor catalog and student booking form.
// Time buttons are generated from each tutor's saved weekly schedule.

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { Link, useLocation } from "react-router-dom";

import ralphImage from "../../pics/ral.jpg";
import rjImage from "../../pics/chon.png";
import shaneImage from "../../pics/acal.png";
import lgImage from "../../pics/lg.png";
import emnilImage from "../../pics/emi.png";
import defaultImage from "../../pics/logo.jpg";

import "../css/catalog.css";
import "../css/services.css";

// ==========================================
// TYPES
// ==========================================

type Subject = {
  offering_id: number;
  subject_id: number;
  subject_name: string;
  hourly_rate: number;
};

type Tutor = {
  tutor_id: number;
  name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  years_experience: number | null;
  timezone: string;
  available: boolean;
  subjects: Subject[];
};

type WeeklySlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
};

type CatalogResponse = ApiResponse & {
  tutors?: Tutor[];
};

type HoursResponse = ApiResponse & {
  available?: boolean;
  slots?: WeeklySlot[];
};

type BookingResponse = ApiResponse & {
  booking_id?: number;
};

type ModalView = "profile" | "booking" | "confirmed";

type BookingForm = {
  offering_id: number;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  student_message: string;
};

// ==========================================
// CONSTANTS
// ==========================================

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DURATIONS = [
  30, 60, 90, 120, 150, 180, 210, 240,
];

const DAY_MS = 86400000;

const imageMap: Record<string, string> = {
  "ral.jpg": ralphImage,
  "chon.png": rjImage,
  "acal.png": shaneImage,
  "lg.png": lgImage,
  "emi.png": emnilImage,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  marginTop: 6,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  font: "inherit",
  boxSizing: "border-box",
};

// ==========================================
// TUTOR IMAGE
// ==========================================

function tutorImage(
  source: string | null
): string {
  const file =
    source
      ?.replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.toLowerCase() ?? "";

  return (
    imageMap[file] ??
    (source?.startsWith("https://")
      ? source
      : defaultImage)
  );
}

// ==========================================
// CURRENCY
// ==========================================

function price(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

// ==========================================
// PHILIPPINE DATE
// ==========================================

function manilaToday(): string {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const part = (kind: string) =>
    parts.find((x) => x.type === kind)?.value ?? "";

  return (
    `${part("year")}-${part("month")}-${part("day")}`
  );
}

function datePlusDays(
  value: string,
  days: number
): string {
  const [year, month, day] =
    value.split("-").map(Number);

  return new Date(
    Date.UTC(year, month - 1, day + days)
  )
    .toISOString()
    .slice(0, 10);
}

// Monday = 1, Sunday = 7

function weekday(value: string): number {
  const [year, month, day] =
    value.split("-").map(Number);

  const number = new Date(
    Date.UTC(year, month - 1, day)
  ).getUTCDay();

  return number === 0 ? 7 : number;
}

// ==========================================
// TIME HELPERS
// ==========================================

function minutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function clock(value: number): string {
  return (
    `${String(
      Math.floor(value / 60)
    ).padStart(2, "0")}:` +
    `${String(
      value % 60
    ).padStart(2, "0")}`
  );
}

function readableTime(
  value: string
): string {
  const [h, m] = value.split(":").map(Number);

  return (
    `${h % 12 || 12}:` +
    `${String(m).padStart(2, "0")} ` +
    `${h >= 12 ? "PM" : "AM"}`
  );
}

function readableDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }
  ).format(
    new Date(`${value}T00:00:00Z`)
  );
}

// ==========================================
// NORMALIZE MYSQL WEEKLY SLOTS
// ==========================================
// MySQL can return TIME values as HH:MM:SS.
// We normalize them to HH:MM.
// We also normalize day_of_week to a number.
// ==========================================

function cleanSlots(
  raw: WeeklySlot[]
): WeeklySlot[] {
  return raw
    .map((slot) => ({
      day_of_week: Number(
        slot.day_of_week
      ),

      start_time: String(
        slot.start_time ?? ""
      ).slice(0, 5),

      end_time: String(
        slot.end_time ?? ""
      ).slice(0, 5),
    }))
    .filter(
      (slot) =>
        Number.isInteger(
          slot.day_of_week
        ) &&
        slot.day_of_week >= 1 &&
        slot.day_of_week <= 7 &&
        /^\d{2}:\d{2}$/.test(
          slot.start_time
        ) &&
        /^\d{2}:\d{2}$/.test(
          slot.end_time
        ) &&
        minutes(slot.start_time) <
          minutes(slot.end_time)
    );
}

// ==========================================
// GET POSSIBLE START TIMES
// ==========================================
// Generate clickable slots every 30 minutes.
// The backend is responsible for preventing
// conflicting student/tutor bookings.
// ==========================================

function availableTimes(
  date: string,
  duration: number,
  slots: WeeklySlot[]
): string[] {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return [];
  }

  const day = weekday(date);

  const earliest =
    Date.now() + 30 * 60 * 1000;

  const latest =
    Date.now() + 90 * DAY_MS;

  const possible = new Set<string>();

  for (const slot of slots) {
    if (
      slot.day_of_week !== day
    ) {
      continue;
    }

    const start =
      Math.ceil(
        minutes(slot.start_time) / 30
      ) * 30;

    const end = minutes(
      slot.end_time
    );

    for (
      let at = start;
      at + duration <= end &&
      at + duration < 1440;
      at += 30
    ) {
      const value = clock(at);

      const appointment =
        new Date(
          `${date}T${value}:00+08:00`
        ).getTime();

      if (
        appointment >= earliest &&
        appointment <= latest
      ) {
        possible.add(value);
      }
    }
  }

  return Array.from(
    possible
  ).sort();
}

// ==========================================
// MAIN CATALOG COMPONENT
// ==========================================

function Catalog() {
  const location = useLocation();

  // ========================================
  // CATALOG STATES
  // ========================================

  const [tutors, setTutors] =
    useState<Tutor[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [reload, setReload] =
    useState(0);

  const [filter, setFilter] =
    useState("All");

  const [search, setSearch] =
    useState("");

  // ========================================
  // MODAL STATES
  // ========================================

  const [tutor, setTutor] =
    useState<Tutor | null>(null);

  const [modal, setModal] =
    useState<ModalView>("profile");

  const [hours, setHours] =
    useState<WeeklySlot[]>([]);

  const [hoursLoading, setHoursLoading] =
    useState(false);

  const [hoursError, setHoursError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [bookingError, setBookingError] =
    useState("");

  const [bookingId, setBookingId] =
    useState<number | null>(null);

  const [requestId, setRequestId] =
    useState("");

  // ========================================
  // BOOKING FORM
  // ========================================

  const [form, setForm] =
    useState<BookingForm>({
      offering_id: 0,
      session_date: "",
      start_time: "",
      duration_minutes: 60,
      student_message: "",
    });

  const today = manilaToday();

  const maxDate = datePlusDays(
    today,
    90
  );

  // ========================================
  // READ URL FILTER
  // ========================================

  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search
      );

    setFilter(
      params.get("filter") || "All"
    );

    setSearch(
      params.get("search") || ""
    );
  }, [location.search]);

  // ========================================
  // LOAD TUTORS FROM MYSQL
  // ========================================

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadCatalog() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/catalog",
          {
            signal: controller.signal,
          }
        );

        const body =
          (await response.json()) as CatalogResponse;

        if (
          !response.ok ||
          !body.success ||
          !Array.isArray(body.tutors)
        ) {
          throw new Error(
            body.message ||
              "Could not load tutors."
          );
        }

        if (
          !controller.signal.aborted
        ) {
          setTutors(body.tutors);
        }
      } catch (e) {
        if (
          !controller.signal.aborted
        ) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not load tutors."
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () =>
      controller.abort();
  }, [reload]);

  // ========================================
  // LOAD TUTOR WORKING HOURS
  // ========================================

  useEffect(() => {
    if (
      !tutor ||
      modal !== "booking"
    ) {
      return;
    }

    const controller =
      new AbortController();

    async function loadHours(
      id: number
    ) {
      setHoursLoading(true);
      setHoursError("");
      setHours([]);

      try {
        const response = await fetch(
          `/api/catalog/${id}/availability`,
          {
            signal: controller.signal,
          }
        );

        const body =
          (await response.json()) as HoursResponse;

        if (
          !response.ok ||
          !body.success ||
          !Array.isArray(body.slots)
        ) {
          throw new Error(
            body.message ||
              "Could not load working hours."
          );
        }

        if (
          body.available !== true
        ) {
          throw new Error(
            "This tutor is currently unavailable."
          );
        }

        if (
          !controller.signal.aborted
        ) {
          setHours(
            cleanSlots(body.slots)
          );
        }
      } catch (e) {
        if (
          !controller.signal.aborted
        ) {
          setHoursError(
            e instanceof Error
              ? e.message
              : "Could not load working hours."
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setHoursLoading(false);
        }
      }
    }

    void loadHours(
      tutor.tutor_id
    );

    return () =>
      controller.abort();
  }, [tutor, modal]);

  // ========================================
  // FILTER SUBJECTS
  // ========================================

  const subjects = useMemo(
    () => [
      "All",

      ...Array.from(
        new Set(
          tutors.flatMap(
            (t) =>
              t.subjects.map(
                (s) => s.subject_name
              )
          )
        )
      ),
    ],
    [tutors]
  );

  const effectiveFilter =
    subjects.includes(filter)
      ? filter
      : "All";

  const shown = tutors.filter(
    (t) => {
      const q =
        search.trim().toLowerCase();

      return (
        (
          effectiveFilter === "All" ||
          t.subjects.some(
            (s) =>
              s.subject_name ===
              effectiveFilter
          )
        ) &&
        (
          !q ||
          t.name
            .toLowerCase()
            .includes(q) ||
          (t.headline ?? "")
            .toLowerCase()
            .includes(q) ||
          t.subjects.some(
            (s) =>
              s.subject_name
                .toLowerCase()
                .includes(q)
          )
        )
      );
    }
  );

  // ========================================
  // SELECTED SUBJECT
  // ========================================

  const chosenSubject =
    tutor?.subjects.find(
      (s) =>
        s.offering_id ===
        form.offering_id
    );

  // ========================================
  // AVAILABLE TIMES
  // ========================================

  const times = useMemo(
    () =>
      availableTimes(
        form.session_date,
        form.duration_minutes,
        hours
      ),
    [
      form.session_date,
      form.duration_minutes,
      hours,
    ]
  );

  // ========================================
  // NEXT AVAILABLE DATES
  // ========================================

  const nextDates = useMemo(
    () => {
      if (!hours.length) {
        return [];
      }

      const values: string[] = [];

      for (
        let day = 0;
        day <= 30 &&
        values.length < 5;
        day++
      ) {
        const date = datePlusDays(
          today,
          day
        );

        if (
          availableTimes(
            date,
            form.duration_minutes,
            hours
          ).length
        ) {
          values.push(date);
        }
      }

      return values;
    },
    [
      hours,
      form.duration_minutes,
      today,
    ]
  );

  // ========================================
  // CALCULATE AMOUNT
  // ========================================

  const total = chosenSubject
    ? Math.round(
        chosenSubject.hourly_rate *
          form.duration_minutes /
          60 *
          100
      ) / 100
    : 0;

  // ========================================
  // OPEN TUTOR PROFILE
  // ========================================

  function openTutor(
    value: Tutor
  ) {
    setTutor(value);
    setModal("profile");
    setBookingId(null);
    setBookingError("");
  }

  // ========================================
  // OPEN BOOKING FORM
  // ========================================

  function startBooking() {
    if (!tutor?.available) {
      return;
    }

    setRequestId(
      crypto.randomUUID()
    );

    setBookingError("");
    setHours([]);

    setForm({
      offering_id:
        tutor.subjects[0]
          ?.offering_id ?? 0,

      session_date: "",
      start_time: "",
      duration_minutes: 60,
      student_message: "",
    });

    setModal("booking");
  }

  // ========================================
  // CHANGE BOOKING FORM
  // ========================================

  function changeForm(
    change: Partial<BookingForm>
  ) {
    setForm(
      (old) => ({
        ...old,
        ...change,
      })
    );

    setBookingError("");

    setRequestId(
      crypto.randomUUID()
    );
  }

  // ========================================
  // SUBMIT BOOKING
  // ========================================

  async function sendBooking(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      submitting ||
      !tutor ||
      !chosenSubject
    ) {
      return;
    }

    if (
      !times.includes(
        form.start_time
      )
    ) {
      setBookingError(
        "Select one of the available start times."
      );
      return;
    }

    setSubmitting(true);
    setBookingError("");

    try {
      const response = await fetch(
        "/api/bookings",
        {
          method: "POST",
          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            client_request_id:
              requestId,

            offering_id:
              form.offering_id,

            session_date:
              form.session_date,

            start_time:
              form.start_time,

            duration_minutes:
              form.duration_minutes,

            student_message:
              form.student_message.trim(),
          }),
        }
      );

      const body =
        (await response.json()) as BookingResponse;

      if (
        !response.ok ||
        !body.success ||
        !body.booking_id
      ) {
        throw new Error(
          body.message ||
            "Booking request failed."
        );
      }

      setBookingId(
        body.booking_id
      );

      setModal("confirmed");
    } catch (e) {
      setBookingError(
        e instanceof Error
          ? e.message
          : "Booking request failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="catalog-page">

      {/* HEADER */}

      <div className="catalog-header">
        <h1>Find a Tutor</h1>

        <p>
          Choose a subject, date, and
          available time to request a session.
        </p>
      </div>

      {/* SEARCH */}

      <input
        className="catalog-search"
        type="search"
        aria-label="Search tutors"
        placeholder="Search by tutor or subject..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
      />

      {/* SUBJECT FILTERS */}

      <div className="catalog-filters">
        {subjects.map((name) => (
          <button
            type="button"
            key={name}
            className={`filter-btn ${
              effectiveFilter === name
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(name)
            }
          >
            {name}
          </button>
        ))}
      </div>

      {/* LOADING / ERROR / CARDS */}

      {loading ? (
        <p role="status">
          Loading tutors...
        </p>
      ) : error ? (
        <div
          className="catalog-empty"
          role="alert"
        >
          <p>{error}</p>

          <button
            className="tutor-btn"
            type="button"
            onClick={() =>
              setReload(
                (n) => n + 1
              )
            }
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <p className="catalog-count">
            {shown.length} tutor
            {shown.length !== 1
              ? "s"
              : ""}{" "}
            found
          </p>

          <div className="catalog-grid">
            {shown.length === 0 && (
              <p className="catalog-empty">
                No matching tutors.
              </p>
            )}

            {shown.map((item) => (
              <div
                key={item.tutor_id}
                className="tutor-card tutor-card--clickable"
                role="button"
                tabIndex={0}
                onClick={() =>
                  openTutor(item)
                }
                onKeyDown={(e) => {
                  if (
                    e.currentTarget ===
                      e.target &&
                    (
                      e.key === "Enter" ||
                      e.key === " "
                    )
                  ) {
                    e.preventDefault();
                    openTutor(item);
                  }
                }}
              >
                {/* STATUS */}

                <span
                  className={`tutor-badge ${
                    item.available
                      ? "available"
                      : "unavailable"
                  }`}
                >
                  {item.available
                    ? "Available"
                    : "Unavailable"}
                </span>

                {/* IMAGE */}

                <div className="tutor-photo-wrap">
                  <img
                    className="tutor-photo"
                    src={tutorImage(
                      item.avatar_url
                    )}
                    alt={item.name}
                  />
                </div>

                {/* INFORMATION */}

                <div className="tutor-info">
                  <h3 className="tutor-name">
                    {item.name}
                  </h3>

                  <p className="tutor-subject">
                    {item.headline ||
                      "TutoFriends Tutor"}
                  </p>
                </div>

                {/* SUBJECT TAGS */}

                <div className="tutor-tags">
                  {item.subjects.map(
                    (s) => (
                      <span
                        key={s.offering_id}
                        className="tutor-tag"
                      >
                        {s.subject_name}
                      </span>
                    )
                  )}
                </div>

                {/* FOOTER */}

                <div className="tutor-footer">
                  <span className="tutor-rate">
                    From{" "}
                    {price(
                      Math.min(
                        ...item.subjects.map(
                          (s) =>
                            s.hourly_rate
                        )
                      )
                    )}
                    /hr
                  </span>

                  <button
                    className="tutor-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTutor(item);
                    }}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* =====================================
          TUTOR PROFILE AND BOOKING MODAL
      ===================================== */}

      {tutor && (
        <div
          className="tp-overlay"
          onMouseDown={(e) => {
            if (
              e.currentTarget ===
                e.target &&
              !submitting
            ) {
              setTutor(null);
            }
          }}
        >
          <div
            className="tp-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${tutor.name} profile and booking`}
          >

            {/* CLOSE BUTTON */}

            <button
              className="tp-close"
              type="button"
              aria-label="Close dialog"
              disabled={submitting}
              onClick={() =>
                setTutor(null)
              }
            >
              ✕
            </button>

            {/* TUTOR BANNER */}

            <div className="tp-banner">
              <div className="tp-banner-glow" />

              <img
                className="tp-avatar"
                src={tutorImage(
                  tutor.avatar_url
                )}
                alt={tutor.name}
              />

              <span
                className={`tp-status ${
                  tutor.available
                    ? "available"
                    : "unavailable"
                }`}
              >
                {tutor.available
                  ? "● Available"
                  : "● Unavailable"}
              </span>
            </div>

            <div className="tp-body">

              {/* TUTOR IDENTITY */}

              <div className="tp-identity">
                <h2 className="tp-name">
                  {tutor.name}
                </h2>

                <p className="tp-subject">
                  {tutor.headline ||
                    "TutoFriends Tutor"}
                </p>
              </div>

              {/* ==================================
                  PROFILE VIEW
              ================================== */}

              {modal === "profile" && (
                <>
                  {tutor.bio && (
                    <p>{tutor.bio}</p>
                  )}

                  {tutor.years_experience !==
                    null && (
                    <p className="tp-reviews">
                      {tutor.years_experience}{" "}
                      years experience
                    </p>
                  )}

                  <div className="tp-divider" />

                  <h3>
                    Subjects and rates
                  </h3>

                  {tutor.subjects.map(
                    (s) => (
                      <div
                        className="tp-rate-row"
                        key={s.offering_id}
                      >
                        <span className="tp-rate-label">
                          {s.subject_name}
                        </span>

                        <span className="tp-rate-value">
                          {price(
                            s.hourly_rate
                          )}
                          /hr
                        </span>
                      </div>
                    )
                  )}

                  <button
                    className="tp-book-btn"
                    type="button"
                    onClick={startBooking}
                    disabled={
                      !tutor.available
                    }
                  >
                    Book Now
                  </button>

                  <p className="tp-reviews">
                    Requests require tutor
                    approval. No payment is
                    collected here.
                  </p>
                </>
              )}

              {/* ==================================
                  BOOKING VIEW
              ================================== */}

              {modal === "booking" && (
                <>
                  <h3>
                    Request a Session
                  </h3>

                  <p className="tp-reviews">
                    All times are Philippine time
                    (Asia/Manila).
                  </p>

                  {/* HOURS LOADING */}

                  {hoursLoading && (
                    <p role="status">
                      Loading tutor hours...
                    </p>
                  )}

                  {/* HOURS ERROR */}

                  {hoursError && (
                    <p
                      role="alert"
                      style={{
                        color: "#b91c1c",
                      }}
                    >
                      {hoursError}
                    </p>
                  )}

                  {/* BOOKING FORM */}

                  {!hoursLoading &&
                    !hoursError && (
                    <>
                      {/* DISPLAY WORKING HOURS */}

                      <p className="tp-reviews">
                        <strong>
                          Working days:
                        </strong>{" "}
                        {hours.length
                          ? hours
                              .map(
                                (s) =>
                                  `${
                                    DAY_NAMES[
                                      s.day_of_week -
                                        1
                                    ]
                                  } ${
                                    readableTime(
                                      s.start_time
                                    )
                                  }–${
                                    readableTime(
                                      s.end_time
                                    )
                                  }`
                              )
                              .join("; ")
                          : "Tutor has not set weekly hours."}
                      </p>

                      <form
                        onSubmit={(e) =>
                          void sendBooking(e)
                        }
                        style={{
                          display: "grid",
                          gap: 16,
                        }}
                      >

                        {/* SUBJECT */}

                        <label
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          Subject

                          <select
                            required
                            style={fieldStyle}
                            value={
                              form.offering_id
                            }
                            disabled={submitting}
                            onChange={(e) =>
                              changeForm({
                                offering_id:
                                  Number(
                                    e.target.value
                                  ),
                              })
                            }
                          >
                            {tutor.subjects.map(
                              (s) => (
                                <option
                                  key={s.offering_id}
                                  value={s.offering_id}
                                >
                                  {s.subject_name}
                                  {" — "}
                                  {price(
                                    s.hourly_rate
                                  )}
                                  /hr
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        {/* DATE */}

                        <label
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          Date

                          <input
                            required
                            type="date"
                            style={fieldStyle}
                            min={today}
                            max={maxDate}
                            value={
                              form.session_date
                            }
                            disabled={submitting}
                            onChange={(e) =>
                              changeForm({
                                session_date:
                                  e.target.value,
                                start_time: "",
                              })
                            }
                          />
                        </label>

                        {/* SUGGESTED DATES */}

                        {nextDates.length > 0 && (
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                marginBottom: 8,
                              }}
                            >
                              Suggested available dates
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 7,
                                flexWrap: "wrap",
                              }}
                            >
                              {nextDates.map(
                                (date) => (
                                  <button
                                    key={date}
                                    type="button"
                                    disabled={submitting}
                                    onClick={() =>
                                      changeForm({
                                        session_date:
                                          date,
                                        start_time: "",
                                      })
                                    }
                                    style={{
                                      padding:
                                        "8px 10px",

                                      borderRadius: 8,

                                      cursor:
                                        "pointer",

                                      border:
                                        "1px solid #93c5fd",

                                      background:
                                        form.session_date ===
                                        date
                                          ? "#1d4ed8"
                                          : "#eff6ff",

                                      color:
                                        form.session_date ===
                                        date
                                          ? "white"
                                          : "#1d4ed8",

                                      fontWeight: 600,
                                    }}
                                  >
                                    {readableDate(
                                      date
                                    )}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* DURATION */}

                        <label
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          Duration

                          <select
                            style={fieldStyle}
                            value={
                              form.duration_minutes
                            }
                            disabled={submitting}
                            onChange={(e) =>
                              changeForm({
                                duration_minutes:
                                  Number(
                                    e.target.value
                                  ),
                                start_time: "",
                              })
                            }
                          >
                            {DURATIONS.map(
                              (m) => (
                                <option
                                  key={m}
                                  value={m}
                                >
                                  {m} minutes
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        {/* ==================================
                            CLICKABLE TIME BUTTONS
                        ================================== */}

                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: 8,
                            }}
                          >
                            Choose time
                          </div>

                          {/* NO DATE */}

                          {!form.session_date ? (
                            <p className="tp-reviews">
                              Select a date first,
                              or click a suggested
                              date above.
                            </p>
                          ) : times.length === 0 ? (
                            /* NO AVAILABLE TIMES */

                            <p
                              role="status"
                              style={{
                                color: "#b45309",
                                fontSize: 13,
                              }}
                            >
                              No times for{" "}
                              {readableDate(
                                form.session_date
                              )}{" "}
                              with a{" "}
                              {form.duration_minutes}
                              -minute session.
                              Choose a working day
                              or a shorter duration.
                            </p>
                          ) : (
                            /* TIME BUTTONS */

                            <div
                              style={{
                                display: "grid",

                                gridTemplateColumns:
                                  "repeat(3, minmax(0, 1fr))",

                                gap: 8,
                              }}
                            >
                              {times.map(
                                (time) => (
                                  <button
                                    key={time}
                                    type="button"
                                    disabled={submitting}
                                    aria-pressed={
                                      form.start_time ===
                                      time
                                    }
                                    onClick={() =>
                                      changeForm({
                                        start_time:
                                          time,
                                      })
                                    }
                                    style={{
                                      padding:
                                        "11px 5px",

                                      borderRadius: 10,

                                      fontWeight: 700,

                                      cursor:
                                        "pointer",

                                      fontSize: 12,

                                      border:
                                        form.start_time ===
                                        time
                                          ? "2px solid #1d4ed8"
                                          : "1px solid #bfdbfe",

                                      background:
                                        form.start_time ===
                                        time
                                          ? "#1d4ed8"
                                          : "#eff6ff",

                                      color:
                                        form.start_time ===
                                        time
                                          ? "white"
                                          : "#1e40af",
                                    }}
                                  >
                                    {readableTime(
                                      time
                                    )}
                                  </button>
                                )
                              )}
                            </div>
                          )}

                          {/* SELECTED TIME */}

                          {form.start_time && (
                            <p
                              style={{
                                color: "#15803d",
                                fontSize: 13,
                                marginTop: 8,
                              }}
                            >
                              Selected:{" "}
                              <strong>
                                {readableDate(
                                  form.session_date
                                )}{" "}
                                at{" "}
                                {readableTime(
                                  form.start_time
                                )}
                              </strong>
                            </p>
                          )}

                          <p className="tp-reviews">
                            Displayed times are
                            based on working hours.
                            The server also checks
                            existing bookings.
                          </p>
                        </div>

                        {/* STUDENT MESSAGE */}

                        <label
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          Message (optional)

                          <textarea
                            style={fieldStyle}
                            rows={3}
                            maxLength={1000}
                            value={
                              form.student_message
                            }
                            placeholder="What would you like help with?"
                            disabled={submitting}
                            onChange={(e) =>
                              changeForm({
                                student_message:
                                  e.target.value,
                              })
                            }
                          />
                        </label>

                        {/* TOTAL AMOUNT */}

                        <div className="tp-rate-row">
                          <span className="tp-rate-label">
                            Estimated session amount
                          </span>

                          <span className="tp-rate-value">
                            {price(total)}
                          </span>
                        </div>

                        <p className="tp-reviews">
                          No payment will be
                          collected. Tutor approval
                          is required.
                        </p>

                        {/* ERROR */}

                        {bookingError && (
                          <p
                            role="alert"
                            style={{
                              color: "#b91c1c",
                            }}
                          >
                            {bookingError}
                          </p>
                        )}

                        {/* SUBMIT */}

                        <button
                          className="tp-book-btn"
                          type="submit"
                          disabled={
                            submitting ||
                            !chosenSubject ||
                            !times.includes(
                              form.start_time
                            )
                          }
                        >
                          {submitting
                            ? "Sending..."
                            : "Send Booking Request"}
                        </button>

                        {/* BACK */}

                        <button
                          className="tp-action-btn"
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            setModal("profile")
                          }
                        >
                          Back to Profile
                        </button>
                      </form>
                    </>
                  )}

                  {/* BACK IF HOURS FAILED */}

                  {hoursError && (
                    <button
                      className="tp-action-btn"
                      type="button"
                      onClick={() =>
                        setModal("profile")
                      }
                    >
                      Back to Profile
                    </button>
                  )}
                </>
              )}

              {/* ==================================
                  SUCCESS VIEW
              ================================== */}

              {modal === "confirmed" && (
                <>
                  <h3>
                    Booking request sent!
                  </h3>

                  <p>
                    Booking{" "}
                    <strong>
                      #{bookingId}
                    </strong>{" "}
                    is pending tutor approval.
                  </p>

                  <p className="tp-reviews">
                    No payment was collected.
                  </p>

                  <Link
                    className="tp-book-btn"
                    to="/bookings"
                    style={{
                      display: "block",
                      textAlign: "center",
                      textDecoration: "none",
                    }}
                  >
                    View My Bookings
                  </Link>

                  <button
                    type="button"
                    className="tp-action-btn"
                    onClick={() =>
                      setTutor(null)
                    }
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Catalog;
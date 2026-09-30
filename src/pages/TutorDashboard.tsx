import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tutorsData } from "../data/devs";

import "../css/tutorDashboard.css";

type AvailabilityStatus = "available" | "unavailable";

interface BookingRequest {
  id: number;
  student: string;
  subject: string;
  date: string;
  time: string;
  status: "pending" | "accepted" | "declined";
}

interface ScheduleItem {
  day: string;
  time: string;
  subject: string;
  student: string;
}

const AVAILABILITY_KEY = "tutofriends_tutor_availability";
const BOOKING_REQUESTS_KEY = "tutofriends_tutor_requests";

const defaultRequests: BookingRequest[] = [
  {
    id: 1,
    student: "Alex Santos",
    subject: "React & TypeScript",
    date: "September 30, 2026",
    time: "10:00 AM - 11:00 AM",
    status: "pending",
  },
  {
    id: 2,
    student: "Maria Cruz",
    subject: "JavaScript",
    date: "October 1, 2026",
    time: "2:00 PM - 3:00 PM",
    status: "pending",
  },
  {
    id: 3,
    student: "John Reyes",
    subject: "Web Development",
    date: "October 2, 2026",
    time: "4:00 PM - 5:00 PM",
    status: "pending",
  },
];

const defaultSchedule: ScheduleItem[] = [
  {
    day: "Monday",
    time: "10:00 AM - 11:00 AM",
    subject: "React & TypeScript",
    student: "Alex Santos",
  },
  {
    day: "Tuesday",
    time: "2:00 PM - 3:00 PM",
    subject: "JavaScript",
    student: "Maria Cruz",
  },
  {
    day: "Wednesday",
    time: "4:00 PM - 5:00 PM",
    subject: "Web Development",
    student: "John Reyes",
  },
];

const defaultDays = [
  { day: "Monday", enabled: true },
  { day: "Tuesday", enabled: true },
  { day: "Wednesday", enabled: true },
  { day: "Thursday", enabled: false },
  { day: "Friday", enabled: false },
  { day: "Saturday", enabled: false },
  { day: "Sunday", enabled: false },
];

function TutorDashboard() {
  const navigate = useNavigate();

  const [availability, setAvailability] =
    useState<AvailabilityStatus>("available");

  const [requests, setRequests] =
    useState<BookingRequest[]>(defaultRequests);

  const [scheduleDays, setScheduleDays] = useState(defaultDays);

  const [activeSection, setActiveSection] = useState("overview");

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("tutofriends_user");

      if (raw) {
        const parsed = JSON.parse(raw);

        if (parsed?.role === "tutor") {
          return parsed;
        }
      }
    } catch {
      // Use default tutor when local data is unavailable.
    }

    return null;
  }, []);

  const tutor = useMemo(() => {
    if (currentUser?.name) {
      const foundTutor = tutorsData.find(
        (item) =>
          item.name.toLowerCase() ===
          String(currentUser.name).toLowerCase()
      );

      if (foundTutor) {
        return foundTutor;
      }
    }

    return tutorsData[0];
  }, [currentUser]);

  useEffect(() => {
    const savedAvailability = localStorage.getItem(AVAILABILITY_KEY);

    if (
      savedAvailability === "available" ||
      savedAvailability === "unavailable"
    ) {
      setAvailability(savedAvailability);
    }

    const savedRequests = localStorage.getItem(BOOKING_REQUESTS_KEY);

    if (savedRequests) {
      try {
        const parsed = JSON.parse(savedRequests);

        if (Array.isArray(parsed)) {
          setRequests(parsed);
        }
      } catch {
        setRequests(defaultRequests);
      }
    }
  }, []);

  const changeAvailability = (status: AvailabilityStatus) => {
    setAvailability(status);
    localStorage.setItem(AVAILABILITY_KEY, status);
  };

  const updateRequest = (
    id: number,
    status: "accepted" | "declined"
  ) => {
    const updated = requests.map((request) =>
      request.id === id
        ? {
            ...request,
            status,
          }
        : request
    );

    setRequests(updated);
    localStorage.setItem(BOOKING_REQUESTS_KEY, JSON.stringify(updated));
  };

  const toggleDay = (day: string) => {
    setScheduleDays((current) =>
      current.map((item) =>
        item.day === day
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item
      )
    );
  };

  const logout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("tutofriends_user");

    navigate("/login");
    window.location.reload();
  };

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const acceptedRequests = requests.filter(
    (request) => request.status === "accepted"
  ).length;

  return (
    <div className="tutor-dashboard">
      <aside className="tutor-sidebar">
        <div className="tutor-sidebar-brand">
          <img src="pics/logo.jpg" alt="TutoFriends" />
          <div>
            <strong>TutoFriends</strong>
            <span>Tutor Panel</span>
          </div>
        </div>

        <div className="tutor-sidebar-profile">
          <img
            src={tutor.image}
            alt={tutor.name}
            className="tutor-sidebar-avatar"
          />

          <div>
            <strong>{tutor.name}</strong>
            <span>Tutor</span>
          </div>
        </div>

        <nav className="tutor-sidebar-nav">
          <button
            className={activeSection === "overview" ? "active" : ""}
            onClick={() => setActiveSection("overview")}
          >
            <span>⌂</span>
            Overview
          </button>

          <button
            className={activeSection === "requests" ? "active" : ""}
            onClick={() => setActiveSection("requests")}
          >
            <span>▣</span>
            Booking Requests
            {pendingRequests > 0 && (
              <b className="tutor-nav-badge">{pendingRequests}</b>
            )}
          </button>

          <button
            className={activeSection === "schedule" ? "active" : ""}
            onClick={() => setActiveSection("schedule")}
          >
            <span>◷</span>
            My Schedule
          </button>

          <button
            className={activeSection === "availability" ? "active" : ""}
            onClick={() => setActiveSection("availability")}
          >
            <span>●</span>
            Availability
          </button>

          <button
            className={activeSection === "profile" ? "active" : ""}
            onClick={() => setActiveSection("profile")}
          >
            <span>◎</span>
            My Profile
          </button>

          <button
            className={activeSection === "settings" ? "active" : ""}
            onClick={() => setActiveSection("settings")}
          >
            <span>⚙</span>
            Settings
          </button>
        </nav>

        <button className="tutor-logout" onClick={logout}>
          <span>↪</span>
          Logout
        </button>
      </aside>

      <main className="tutor-dashboard-main">
        <header className="tutor-dashboard-header">
          <div>
            <span className="tutor-eyebrow">TUTOR DASHBOARD</span>
            <h1>
              Welcome back, {tutor.name}
              <span>.</span>
            </h1>
            <p>
              Manage your bookings, schedule, and availability from one place.
            </p>
          </div>

          <div className="tutor-header-status">
            <span
              className={
                availability === "available"
                  ? "status-dot available"
                  : "status-dot unavailable"
              }
            />

            <span>
              {availability === "available"
                ? "Currently available"
                : "Currently unavailable"}
            </span>
          </div>
        </header>

        {activeSection === "overview" && (
          <section className="tutor-section">
            <div className="tutor-stats-grid">
              <div className="tutor-stat-card">
                <div className="tutor-stat-icon">▣</div>
                <div>
                  <span>Pending Requests</span>
                  <strong>{pendingRequests}</strong>
                </div>
              </div>

              <div className="tutor-stat-card">
                <div className="tutor-stat-icon">✓</div>
                <div>
                  <span>Accepted Bookings</span>
                  <strong>{acceptedRequests}</strong>
                </div>
              </div>

              <div className="tutor-stat-card">
                <div className="tutor-stat-icon">◷</div>
                <div>
                  <span>Weekly Sessions</span>
                  <strong>{defaultSchedule.length}</strong>
                </div>
              </div>

              <div className="tutor-stat-card">
                <div className="tutor-stat-icon">★</div>
                <div>
                  <span>Rating</span>
                  <strong>4.9</strong>
                </div>
              </div>
            </div>

            <div className="tutor-content-grid">
              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">BOOKING REQUESTS</span>
                    <h2>Recent requests</h2>
                  </div>

                  <button
                    className="tutor-text-button"
                    onClick={() => setActiveSection("requests")}
                  >
                    View all
                  </button>
                </div>

                <div className="tutor-request-list">
                  {requests.slice(0, 3).map((request) => (
                    <div
                      className="tutor-request-item"
                      key={request.id}
                    >
                      <div className="tutor-request-avatar">
                        {request.student
                          .split(" ")
                          .map((name) => name[0])
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div className="tutor-request-info">
                        <strong>{request.student}</strong>
                        <span>{request.subject}</span>
                        <small>
                          {request.date} · {request.time}
                        </small>
                      </div>

                      <span
                        className={`tutor-request-status ${request.status}`}
                      >
                        {request.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">AVAILABILITY</span>
                    <h2>Your status</h2>
                  </div>
                </div>

                <div className="tutor-availability-card">
                  <div
                    className={`tutor-availability-indicator ${
                      availability === "available"
                        ? "available"
                        : "unavailable"
                    }`}
                  >
                    <span />
                  </div>

                  <div>
                    <strong>
                      {availability === "available"
                        ? "You are available"
                        : "You are unavailable"}
                    </strong>

                    <p>
                      {availability === "available"
                        ? "Students can currently send you booking requests."
                        : "Students can still view your profile, but new bookings should be unavailable."}
                    </p>
                  </div>
                </div>

                <div className="tutor-availability-actions">
                  <button
                    className={
                      availability === "available" ? "selected" : ""
                    }
                    onClick={() => changeAvailability("available")}
                  >
                    Available
                  </button>

                  <button
                    className={
                      availability === "unavailable" ? "selected" : ""
                    }
                    onClick={() => changeAvailability("unavailable")}
                  >
                    Unavailable
                  </button>
                </div>
              </div>
            </div>

            <div className="tutor-panel">
              <div className="tutor-panel-heading">
                <div>
                  <span className="tutor-panel-label">UPCOMING</span>
                  <h2>My schedule</h2>
                </div>

                <button
                  className="tutor-text-button"
                  onClick={() => setActiveSection("schedule")}
                >
                  Manage schedule
                </button>
              </div>

              <div className="tutor-schedule-list">
                {defaultSchedule.map((item, index) => (
                  <div className="tutor-schedule-item" key={index}>
                    <div className="tutor-schedule-day">
                      <strong>{item.day.slice(0, 3)}</strong>
                    </div>

                    <div className="tutor-schedule-details">
                      <strong>{item.subject}</strong>
                      <span>{item.student}</span>
                    </div>

                    <span className="tutor-schedule-time">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeSection === "requests" && (
          <section className="tutor-section">
            <div className="tutor-page-title">
              <span className="tutor-panel-label">BOOKINGS</span>
              <h2>Booking Requests</h2>
              <p>
                Review incoming booking requests and decide which sessions
                you want to accept.
              </p>
            </div>

            <div className="tutor-panel">
              <div className="tutor-request-list tutor-request-list-large">
                {requests.map((request) => (
                  <div
                    className="tutor-request-item"
                    key={request.id}
                  >
                    <div className="tutor-request-avatar">
                      {request.student
                        .split(" ")
                        .map((name) => name[0])
                        .join("")
                        .slice(0, 2)}
                    </div>

                    <div className="tutor-request-info">
                      <strong>{request.student}</strong>
                      <span>{request.subject}</span>
                      <small>
                        {request.date} · {request.time}
                      </small>
                    </div>

                    <span
                      className={`tutor-request-status ${request.status}`}
                    >
                      {request.status}
                    </span>

                    {request.status === "pending" && (
                      <div className="tutor-request-actions">
                        <button
                          className="tutor-accept-button"
                          onClick={() =>
                            updateRequest(request.id, "accepted")
                          }
                        >
                          Accept
                        </button>

                        <button
                          className="tutor-decline-button"
                          onClick={() =>
                            updateRequest(request.id, "declined")
                          }
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeSection === "schedule" && (
          <section className="tutor-section">
            <div className="tutor-page-title">
              <span className="tutor-panel-label">SCHEDULE</span>
              <h2>My Schedule</h2>
              <p>
                Your upcoming tutoring sessions and weekly availability.
              </p>
            </div>

            <div className="tutor-content-grid">
              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">UPCOMING SESSIONS</span>
                    <h2>Sessions</h2>
                  </div>
                </div>

                <div className="tutor-schedule-list">
                  {defaultSchedule.map((item, index) => (
                    <div className="tutor-schedule-item" key={index}>
                      <div className="tutor-schedule-day">
                        <strong>{item.day.slice(0, 3)}</strong>
                      </div>

                      <div className="tutor-schedule-details">
                        <strong>{item.subject}</strong>
                        <span>{item.student}</span>
                      </div>

                      <span className="tutor-schedule-time">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tutor-panel">
                <div className="tutor-panel-heading">
                  <div>
                    <span className="tutor-panel-label">
                      WEEKLY AVAILABILITY
                    </span>
                    <h2>Available days</h2>
                  </div>
                </div>

                <div className="tutor-week-list">
                  {scheduleDays.map((item) => (
                    <button
                      key={item.day}
                      className={item.enabled ? "enabled" : ""}
                      onClick={() => toggleDay(item.day)}
                    >
                      <span>{item.day}</span>
                      <span>
                        {item.enabled ? "Available" : "Unavailable"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === "availability" && (
          <section className="tutor-section">
            <div className="tutor-page-title">
              <span className="tutor-panel-label">AVAILABILITY</span>
              <h2>Manage Availability</h2>
              <p>
                Control whether students can request a tutoring session with
                you.
              </p>
            </div>

            <div className="tutor-panel tutor-availability-main">
              <div
                className={`tutor-large-status ${
                  availability === "available"
                    ? "available"
                    : "unavailable"
                }`}
              >
                <div className="tutor-large-status-icon">
                  <span />
                </div>

                <div>
                  <span className="tutor-panel-label">
                    CURRENT STATUS
                  </span>

                  <h2>
                    {availability === "available"
                      ? "Available for bookings"
                      : "Currently unavailable"}
                  </h2>

                  <p>
                    {availability === "available"
                      ? "Students can send booking requests to you."
                      : "Your profile remains visible, but you are not accepting new booking requests."}
                  </p>
                </div>
              </div>

              <div className="tutor-status-buttons">
                <button
                  className={
                    availability === "available" ? "active" : ""
                  }
                  onClick={() => changeAvailability("available")}
                >
                  Set as Available
                </button>

                <button
                  className={
                    availability === "unavailable" ? "active" : ""
                  }
                  onClick={() => changeAvailability("unavailable")}
                >
                  Set as Unavailable
                </button>
              </div>
            </div>
          </section>
        )}

        {activeSection === "profile" && (
          <section className="tutor-section">
            <div className="tutor-page-title">
              <span className="tutor-panel-label">PROFILE</span>
              <h2>My Profile</h2>
              <p>
                Preview the tutor information students see when browsing
                TutoFriends.
              </p>
            </div>

            <div className="tutor-profile-card">
              <img
                src={tutor.image}
                alt={tutor.name}
                className="tutor-profile-large-image"
              />

              <div className="tutor-profile-information">
                <span className="tutor-panel-label">TUTOR</span>
                <h2>{tutor.name}</h2>
                <strong>{tutor.role}</strong>

                <p>{tutor.bio}</p>

                <div className="tutor-expertise-list">
                  {tutor.expertise.map((subject) => (
                    <span key={subject}>{subject}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === "settings" && (
          <section className="tutor-section">
            <div className="tutor-page-title">
              <span className="tutor-panel-label">SETTINGS</span>
              <h2>Settings</h2>
              <p>Manage your tutor account preferences.</p>
            </div>

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
                  <span>
                    {currentUser?.username || "tutor1"}
                  </span>
                </div>

                <span className="tutor-setting-value">
                  Local Account
                </span>
              </div>

              <div className="tutor-setting-row">
                <div>
                  <strong>Email</strong>
                  <span>
                    {currentUser?.email || tutor.contact?.email}
                  </span>
                </div>
              </div>

              <div className="tutor-setting-row">
                <div>
                  <strong>Theme</strong>
                  <span>
                    Use the TutoFriends theme control from the main UI.
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default TutorDashboard;
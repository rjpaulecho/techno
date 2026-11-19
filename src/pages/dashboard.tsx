
import { useEffect, useState } from "react";
import Cylinder from "../components/Cylinder";
import "../css/style.css";

interface HomepageStats {
  completed_sessions: number;
  active_tutors: number;
  verified_payments: number;
  registered_students: number;
}

interface TrendingSubject {
  subject_id: number;
  label: string;
  count: number;
}

interface ActivePerson {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  completed_sessions: number;
}

interface HomepageStatsResponse {
  success: boolean;
  stats: HomepageStats;
  trending_subjects_week: TrendingSubject[];
  trending_subjects_all: TrendingSubject[];
  most_active_tutors: ActivePerson[];
  most_active_users: ActivePerson[];
  message?: string;
}

type TrendingPeriod = "week" | "all";

const defaultStats: HomepageStats = {
  completed_sessions: 0,
  active_tutors: 0,
  verified_payments: 0,
  registered_students: 0,
};

const statConfig = [
  {
    key: "completed_sessions" as const,
    label: "Completed Sessions",
    icon: "📅",
  },
  {
    key: "active_tutors" as const,
    label: "Active Tutors",
    icon: "🎓",
  },
  {
    key: "verified_payments" as const,
    label: "Verified Payments",
    icon: "💳",
  },
  {
    key: "registered_students" as const,
    label: "Registered Students",
    icon: "🙌",
  },
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function ActivePeopleSection({
  title,
  eyebrow,
  people,
  loading,
  emptyMessage,
}: {
  title: string;
  eyebrow: string;
  people: ActivePerson[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <section className="db-active-section">
      <div className="db-active-header">
        <p className="db-eyebrow">{eyebrow}</p>
        <h2 className="db-active-title">{title}</h2>
      </div>

      <div className="db-active-list">
        {loading ? (
          <p className="db-active-empty">Loading rankings...</p>
        ) : people.length > 0 ? (
          people.map((person, index) => (
            <div className="db-active-card" key={person.user_id}>
              <span className="db-active-rank">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="db-active-avatar">
                {person.avatar_url ? (
                  <img
                    src={person.avatar_url}
                    alt={person.full_name}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}

                <span>{getInitials(person.full_name || "User")}</span>
              </div>

              <div className="db-active-info">
                <span className="db-active-name">
                  {person.full_name}
                </span>
                <span className="db-active-description">
                  {title === "Most Active Tutors"
                    ? "Active tutor"
                    : "Active student"}
                </span>
              </div>

              <div className="db-active-count">
                <strong>
                  {person.completed_sessions.toLocaleString("en-PH")}
                </strong>
                <span>Sessions</span>
              </div>
            </div>
          ))
        ) : (
          <p className="db-active-empty">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}

function Dashboard() {
  const [stats, setStats] = useState<HomepageStats>(defaultStats);
  const [weeklySubjects, setWeeklySubjects] = useState<TrendingSubject[]>([]);
  const [allTimeSubjects, setAllTimeSubjects] = useState<TrendingSubject[]>([]);
  const [activeTutors, setActiveTutors] = useState<ActivePerson[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActivePerson[]>([]);
  const [period, setPeriod] = useState<TrendingPeriod>("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadHomepageStats = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/homepage-stats", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        const data: HomepageStatsResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load homepage statistics."
          );
        }

        setStats(data.stats || defaultStats);
        setWeeklySubjects(data.trending_subjects_week || []);
        setAllTimeSubjects(data.trending_subjects_all || []);
        setActiveTutors(data.most_active_tutors || []);
        setActiveUsers(data.most_active_users || []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Homepage statistics error:", err);
        setError("Homepage statistics are temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadHomepageStats();

    return () => controller.abort();
  }, []);

  const subjects =
    period === "week" ? weeklySubjects : allTimeSubjects;

  const maxCount = Math.max(
    ...subjects.map((subject) => subject.count),
    1
  );

  return (
    <div className="dashboard-wrapper">

      {/* HOMEPAGE WELCOME INTRODUCTION */}
      <section className="db-welcome">
        <div className="db-welcome-content">
          <span className="db-welcome-eyebrow">
            WELCOME TO TUTOFRIENDS
          </span>

          <h1 className="db-welcome-title">
            Learning is better when you have the{" "}
            <span>right guide.</span>
          </h1>

          <p className="db-welcome-description">
            Discover your potential with tutors who are ready
            to help you learn, grow, and achieve more. Your next
            learning experience starts here.
          </p>

          <div className="db-welcome-actions">
            <a
              href="#featured-tutors"
              className="db-welcome-primary"
            >
              Explore Tutors
              <span>→</span>
            </a>

            <a
              href="#trending-subjects"
              className="db-welcome-secondary"
            >
              Learn More
            </a>
          </div>
        </div>

        <div className="db-welcome-decoration" aria-hidden="true">
          <div className="db-welcome-orbit db-welcome-orbit-one" />
          <div className="db-welcome-orbit db-welcome-orbit-two" />
          <div className="db-welcome-circle">
            <span>TF</span>
          </div>
          <div className="db-welcome-floating db-welcome-floating-one">
            <span>✦</span>
          </div>
          <div className="db-welcome-floating db-welcome-floating-two">
            <span>+</span>
          </div>
        </div>
      </section>

{/* FEATURED TUTORS */}
<section id="featured-tutors" className="db-featured-section">
  <div className="db-cylinder-shell">
    <div className="db-featured-heading">
      <h2 className="todays">MEET YOUR FEATURED TUTORS</h2>
      <p>Find the right people to guide your learning journey.</p>
    </div>

    <Cylinder />
  </div>
</section>

      {/* DATABASE-DRIVEN STATISTICS */}
      <div className="db-stats-strip">
        {statConfig.map((config, index) => (
          <div
            className="db-stat-card"
            key={config.key}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <span className="db-stat-icon">{config.icon}</span>

            <div className="db-stat-body">
              <span className="db-stat-value">
                {loading
                  ? "..."
                  : stats[config.key].toLocaleString("en-PH")}
              </span>

              <span className="db-stat-label">
                {config.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p
          role="status"
          style={{
            textAlign: "center",
            marginTop: "12px",
            color: "#7daeff",
          }}
        >
          {error}
        </p>
      )}

      {/* DATABASE-DRIVEN TRENDING SUBJECTS */}
      <div className="db-trending" id="trending-subjects">
        <div className="db-trending-header">
          <p className="db-eyebrow">
            {period === "week" ? "Last 7 Days" : "All Time"}
          </p>

          <h2 className="db-trending-title">
            Trending Subjects
          </h2>

          <div
            className="db-trending-controls"
            role="group"
            aria-label="Trending subjects time period"
          >
            <button
              type="button"
              className={`db-period-button ${
                period === "week" ? "active" : ""
              }`}
              onClick={() => setPeriod("week")}
              aria-pressed={period === "week"}
            >
              Last 7 Days
            </button>

            <button
              type="button"
              className={`db-period-button ${
                period === "all" ? "active" : ""
              }`}
              onClick={() => setPeriod("all")}
              aria-pressed={period === "all"}
            >
              All Time
            </button>
          </div>
        </div>

        <div className="db-subject-list">
          {loading ? (
            <p>Loading trending subjects...</p>
          ) : subjects.length > 0 ? (
            subjects.map((subject, index) => (
              <div
                className="db-subject-row"
                key={subject.subject_id}
                style={{
                  animationDelay: `${index * 0.08}s`,
                }}
              >
                <span className="db-subject-rank">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="db-subject-name">
                  {subject.label}
                </span>

                <div className="db-subject-bar-track">
                  <div
                    className="db-subject-bar-fill"
                    style={{
                      width: `${(subject.count / maxCount) * 100}%`,
                      background:
                        "linear-gradient(90deg, #0074e4, #45a4ff)",
                    }}
                  />
                </div>

                <span className="db-subject-count">
                  {subject.count} sessions
                </span>
              </div>
            ))
          ) : (
            <p>
              {period === "week"
                ? "No completed subject sessions recorded in the last seven days."
                : "No completed subject sessions have been recorded yet."}
            </p>
          )}
        </div>
      </div>

      {/* MOST ACTIVE PEOPLE */}
      <div className="db-active-grid">
        <ActivePeopleSection
          title="Most Active Tutors"
          eyebrow="TOP PERFORMERS"
          people={activeTutors}
          loading={loading}
          emptyMessage="No completed teaching sessions recorded yet."
        />

        <ActivePeopleSection
          title="Most Active Users"
          eyebrow="TOP LEARNERS"
          people={activeUsers}
          loading={loading}
          emptyMessage="No completed learning sessions recorded yet."
        />
      </div>
    </div>
  );
}

export default Dashboard;


// src/pages/AdminTutors.tsx

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

// ==========================================
// TYPES
// ==========================================

type Offering = {
  offering_id?: number;
  subject_id: number;
  subject_name?: string;
  hourly_rate: number | string;
};

type Availability = {
  availability_id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type Tutor = {
  tutor_id: number;
  full_name: string;
  username: string | null;
  email: string;
  account_status: string;
  is_listed: boolean | number;
  availability_status: "available" | "unavailable";
  offerings: Offering[];
  availability: Availability[];
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  tutors?: Tutor[];
};

type AccountForm = {
  full_name: string;
  username: string;
  email: string;
  password: string;
};

const EMPTY_FORM: AccountForm = {
  full_name: "",
  username: "",
  email: "",
  password: "",
};

// ==========================================
// STYLES
// ==========================================

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  marginTop: 6,
  border: "1px solid #d6e0ea",
  borderRadius: 9,
  background: "#fff",
  color: "#203047",
  font: "inherit",
  fontSize: 13,
};

const labelStyle: CSSProperties = {
  display: "block",
  color: "#43566b",
  fontSize: 12,
  fontWeight: 700,
};

const primaryButton: CSSProperties = {
  padding: "11px 15px",
  border: "1px solid #176da8",
  borderRadius: 9,
  background: "#176da8",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: CSSProperties = {
  padding: "10px 13px",
  border: "1px solid #d7e2ed",
  borderRadius: 9,
  background: "#fff",
  color: "#285878",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const fieldGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

// ==========================================
// HELPERS
// ==========================================

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "T"
  );
}

// ==========================================
// ADMIN TUTOR ACCOUNTS
// ==========================================

export default function AdminTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);

  // ========================================
  // LOAD TUTOR DIRECTORY
  // ========================================

  const loadTutors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin-tutors", {
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success ||
        !Array.isArray(result.tutors)
      ) {
        throw new Error(
          result.message || "Unable to load tutor accounts."
        );
      }

      setTutors(result.tutors);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load tutor accounts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTutors();
  }, [loadTutors]);

  // ========================================
  // DIRECTORY SEARCH
  // ========================================

  const filteredTutors = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return tutors;

    return tutors.filter((tutor) =>
      [
        tutor.full_name,
        tutor.username ?? "",
        tutor.email,
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [tutors, search]);

  const listedCount = tutors.filter(
    (tutor) => Boolean(tutor.is_listed)
  ).length;

  const setupCount = tutors.filter(
    (tutor) =>
      tutor.offerings.length > 0 &&
      tutor.availability.length > 0
  ).length;

  // ========================================
  // CREATE ACCOUNT FORM
  // ========================================

  function updateField(
    key: keyof AccountForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateForm() {
    setError("");
    setNotice("");
    setForm(EMPTY_FORM);
    setShowCreate(true);
  }

  function closeCreateForm() {
    if (saving) return;

    setShowCreate(false);
    setForm(EMPTY_FORM);
    setError("");
  }

  // ========================================
  // CREATE TUTOR ACCOUNT
  // ========================================

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin-tutors", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Required account details
          full_name: form.full_name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,

          // Default profile settings.
          // The tutor can complete these after signing in.
          bio: "",
          headline: "",
          avatar_url: "",
          years_experience: null,
          availability_status: "unavailable",
          timezone: "Asia/Manila",
          is_listed: false,
          offerings: [],
          availability: [],
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to create the tutor account."
        );
      }

      setNotice(
        result.message ||
          "Tutor account created. The tutor can now sign in and complete their profile."
      );

      setForm(EMPTY_FORM);
      setShowCreate(false);

      await loadTutors();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create the tutor account."
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div style={{ maxWidth: 1350, margin: "0 auto" }}>
      <header className="ad-header">
        <div>
          <div className="ad-eyebrow">
            TUTOFRIENDS · ADMIN
          </div>

          <h1>Tutor Management</h1>

          <p>
            Create tutor login accounts and monitor their setup progress.
            Tutors manage their own profiles, subjects, rates, and schedules.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 9,
          }}
        >
          <button
            type="button"
            style={secondaryButton}
            disabled={loading}
            onClick={() => void loadTutors()}
          >
            Refresh
          </button>

          {!showCreate && (
            <button
              type="button"
              style={primaryButton}
              onClick={openCreateForm}
            >
              + Create Tutor Account
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div
          role="status"
          style={{
            padding: 13,
            marginBottom: 18,
            border: "1px solid #b9e4cb",
            borderRadius: 9,
            background: "#effaf3",
            color: "#17663a",
            fontSize: 13,
          }}
        >
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="ad-error">
          {error}
        </div>
      )}

      {/* ==================================
          CREATE ACCOUNT
      ================================== */}

      {showCreate && (
        <section
          className="ad-panel"
          style={{ marginBottom: 20 }}
        >
          <div className="ad-panel-header">
            <div>
              <h2>Create Tutor Account</h2>
              <p>
                Only login details are required. The tutor will configure
                their profile after signing in.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: 13,
              marginBottom: 20,
              border: "1px solid #dce8f3",
              borderRadius: 9,
              background: "#f7fbff",
              color: "#38566f",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            <strong>What happens after account creation?</strong>
            <br />
            The account starts with no subjects or weekly availability and
            is not listed in the student catalog. The tutor can sign in to
            add their teaching subjects, hourly rates, profile details, and
            schedule.
          </div>

          <form
            onSubmit={(event) => void handleCreate(event)}
            style={{ display: "grid", gap: 18 }}
          >
            <div style={fieldGrid}>
              <label style={labelStyle}>
                Full name *
                <input
                  style={inputStyle}
                  value={form.full_name}
                  onChange={(event) =>
                    updateField("full_name", event.target.value)
                  }
                  minLength={2}
                  maxLength={150}
                  autoComplete="name"
                  required
                />
              </label>

              <label style={labelStyle}>
                Username *
                <input
                  style={inputStyle}
                  value={form.username}
                  onChange={(event) =>
                    updateField("username", event.target.value)
                  }
                  minLength={3}
                  maxLength={50}
                  pattern="[A-Za-z0-9._-]{3,50}"
                  title="Use 3–50 letters, numbers, dots, underscores, or hyphens."
                  autoComplete="off"
                  required
                />
              </label>

              <label style={labelStyle}>
                Email address *
                <input
                  style={inputStyle}
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                  maxLength={255}
                  autoComplete="email"
                  required
                />
              </label>

              <label style={labelStyle}>
                Temporary password *
                <input
                  style={inputStyle}
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  required
                />
                <small
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "#77879a",
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  At least 8 characters. Share it securely with the tutor.
                </small>
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <button
                type="button"
                style={secondaryButton}
                onClick={closeCreateForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  ...primaryButton,
                  opacity: saving ? 0.65 : 1,
                }}
                disabled={saving}
              >
                {saving ? "Creating account…" : "Create Tutor Account"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ==================================
          DIRECTORY SUMMARY
      ================================== */}

      <section
        className="ad-stats"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        }}
      >
        <div className="ad-stat-card">
          <div className="ad-stat-icon">♙</div>
          <span>Total Tutor Accounts</span>
          <strong>{tutors.length}</strong>
          <small>Registered tutor accounts</small>
        </div>

        <div className="ad-stat-card">
          <div className="ad-stat-icon">◎</div>
          <span>Listed in Catalog</span>
          <strong>{listedCount}</strong>
          <small>Published tutor profiles</small>
        </div>

        <div className="ad-stat-card">
          <div className="ad-stat-icon">◷</div>
          <span>Setup Completed</span>
          <strong>{setupCount}</strong>
          <small>Have subjects and weekly hours</small>
        </div>
      </section>

      {/* ==================================
          TUTOR DIRECTORY
      ================================== */}

      <section className="ad-panel">
        <div className="ad-panel-header">
          <div>
            <h2>Tutor Accounts</h2>
            <p>
              Review account status and check whether each tutor has configured
              their teaching details.
            </p>
          </div>
        </div>

        <label style={labelStyle}>
          Search tutor accounts
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, username, or email"
            style={{
              ...inputStyle,
              maxWidth: 460,
              marginBottom: 20,
            }}
          />
        </label>

        {loading ? (
          <div className="ad-empty">
            Loading tutor accounts…
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="ad-empty">
            {tutors.length === 0
              ? "No tutor accounts were returned."
              : "No tutors match your search."}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
              gap: 14,
            }}
          >
            {filteredTutors.map((tutor) => {
              const hasSubjects = tutor.offerings.length > 0;
              const hasHours = tutor.availability.length > 0;
              const isListed = Boolean(tutor.is_listed);

              return (
                <article
                  key={tutor.tutor_id}
                  style={{
                    padding: 17,
                    border: "1px solid #e2eaf2",
                    borderRadius: 13,
                    background: "#fff",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "50%",
                        background: "#e5f2fc",
                        color: "#176da8",
                        fontWeight: 800,
                      }}
                    >
                      {initials(tutor.full_name)}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong
                        style={{
                          display: "block",
                          color: "#203047",
                          fontSize: 14,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {tutor.full_name}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          color: "#75869a",
                          fontSize: 11,
                          marginTop: 3,
                          overflowWrap: "anywhere",
                        }}
                      >
                        @{tutor.username || "no-username"}
                      </span>
                    </div>
                  </div>

                  <p
                    style={{
                      color: "#607186",
                      fontSize: 12,
                      margin: "0 0 12px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {tutor.email}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        padding: "5px 8px",
                        borderRadius: 6,
                        background:
                          tutor.account_status === "active"
                            ? "#eaf4ff"
                            : "#fff0f0",
                        color:
                          tutor.account_status === "active"
                            ? "#176da8"
                            : "#b32626",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {tutor.account_status.toUpperCase()}
                    </span>

                    <span
                      style={{
                        padding: "5px 8px",
                        borderRadius: 6,
                        background: isListed ? "#e9f8ef" : "#f1f4f7",
                        color: isListed ? "#17663a" : "#667789",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {isListed ? "LISTED" : "NOT LISTED"}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: "12px 0",
                      borderTop: "1px solid #edf1f5",
                      borderBottom: "1px solid #edf1f5",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 8,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "#6d7f92" }}>
                        Subjects configured
                      </span>
                      <strong>{tutor.offerings.length}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 8,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "#6d7f92" }}>
                        Weekly time slots
                      </span>
                      <strong>{tutor.availability.length}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "#6d7f92" }}>
                        Availability status
                      </span>
                      <strong>
                        {tutor.availability_status}
                      </strong>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: hasSubjects && hasHours ? "#17663a" : "#8a6500",
                      fontSize: 11,
                      lineHeight: 1.5,
                    }}
                  >
                    {hasSubjects && hasHours
                      ? "The tutor has added subjects and weekly hours."
                      : "Waiting for the tutor to finish their setup."}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

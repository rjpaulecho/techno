
import { useEffect, useMemo, useState } from "react";
import "../css/adminFeaturedTutors.css";

type Tutor = {
  tutor_id: number;
  full_name: string;
  username: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  account_status: string;
  completed_sessions: number;
  completed_hours: number;
  verified_payments: number;
  total_paid: number;
  subjects?: string | null;
  is_featured: boolean;
  eligible: boolean;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  tutors?: Tutor[];
  tutor_ids?: number[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function AdminFeaturedTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadTutors() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/featured-tutors/admin/tutors",
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success || !result.tutors) {
        throw new Error(
          result.message || "Unable to load tutor statistics."
        );
      }

      setTutors(result.tutors);

      setSelected(
        result.tutors
          .filter((tutor) => tutor.is_featured)
          .sort((a, b) => a.tutor_id - b.tutor_id)
          .map((tutor) => tutor.tutor_id)
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load tutors."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTutors();
  }, []);

  const filteredTutors = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return tutors;

    return tutors.filter((tutor) =>
      [
        tutor.full_name,
        tutor.username || "",
        tutor.headline || "",
        tutor.subjects || "",
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [tutors, search]);

  function toggleTutor(tutor: Tutor) {
    if (!tutor.eligible) return;

    setNotice("");
    setError("");

    setSelected((current) => {
      if (current.includes(tutor.tutor_id)) {
        return current.filter((id) => id !== tutor.tutor_id);
      }

      if (current.length >= 6) {
        setError("You can feature a maximum of six tutors.");
        return current;
      }

      return [...current, tutor.tutor_id];
    });
  }

  const selectedTutors = selected
    .map((id) => tutors.find((tutor) => tutor.tutor_id === id))
    .filter((tutor): tutor is Tutor => Boolean(tutor));

  async function saveSelection() {
    if (selected.length !== 5 && selected.length !== 6) {
      setError("Please select exactly five or six tutors.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/featured-tutors/admin/selection",
        {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tutor_ids: selected,
          }),
        }
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to save featured tutors."
        );
      }

      setNotice("Homepage featured tutors updated successfully.");
      await loadTutors();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save featured tutors."
      );
    } finally {
      setSaving(false);
    }
  }

  function moveTutor(index: number, direction: -1 | 1) {
    const next = [...selected];
    const target = index + direction;

    if (target < 0 || target >= next.length) return;

    [next[index], next[target]] = [
      next[target],
      next[index],
    ];

    setSelected(next);
  }

  return (
    <div className="af-page">
      <header className="ad-header">
        <div>
          <div className="ad-eyebrow">
            TUTOFRIENDS · HOMEPAGE
          </div>
          <h1>Featured Tutors</h1>
          <p>
            Choose five or six tutors to appear in the homepage
            rotating cylinder. Compare their actual performance
            before publishing.
          </p>
        </div>

        <button
          className="af-refresh"
          type="button"
          onClick={() => void loadTutors()}
          disabled={loading || saving}
        >
          Refresh Statistics
        </button>
      </header>

      <section className="af-summary">
        <div>
          <span>Available tutors</span>
          <strong>{tutors.length}</strong>
        </div>
        <div>
          <span>Selected tutors</span>
          <strong>{selected.length}/6</strong>
        </div>
        <div>
          <span>Selection status</span>
          <strong>
            {selected.length >= 5 ? "Ready" : "Incomplete"}
          </strong>
        </div>
      </section>

      {error && (
        <div className="af-message af-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="af-message af-success" role="status">
          {notice}
        </div>
      )}

      <section className="af-selected">
        <div className="af-section-heading">
          <div>
            <h2>Homepage Cylinder Preview</h2>
            <p>
              Arrange the selected tutors in the order they
              should appear.
            </p>
          </div>
          <span>{selected.length} selected</span>
        </div>

        <div className="af-order-list">
          {selectedTutors.map((tutor, index) => (
            <div className="af-order-item" key={tutor.tutor_id}>
              <span className="af-order-number">
                {index + 1}
              </span>

              <strong>{tutor.full_name}</strong>

              <div className="af-order-actions">
                <button
                  type="button"
                  aria-label={`Move ${tutor.full_name} up`}
                  disabled={index === 0}
                  onClick={() => moveTutor(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${tutor.full_name} down`}
                  disabled={index === selected.length - 1}
                  onClick={() => moveTutor(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="af-remove"
                  onClick={() =>
                    setSelected((current) =>
                      current.filter((id) => id !== tutor.tutor_id)
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {selected.length === 0 && (
            <p className="af-empty">
              Select tutors below to build the homepage cylinder.
            </p>
          )}
        </div>

        <button
          type="button"
          className="af-save"
          disabled={
            saving ||
            loading ||
            (selected.length !== 5 && selected.length !== 6)
          }
          onClick={() => void saveSelection()}
        >
          {saving ? "Publishing..." : "Save Homepage Selection"}
        </button>
      </section>

      <section className="af-directory">
        <div className="af-section-heading">
          <div>
            <h2>All Tutors</h2>
            <p>
              Compare performance and select the tutors you
              want to feature.
            </p>
          </div>
        </div>

        <input
          className="af-search"
          placeholder="Search tutor name, username, or subject..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loading ? (
          <p className="af-empty">Loading tutor statistics...</p>
        ) : filteredTutors.length === 0 ? (
          <p className="af-empty">No tutors found.</p>
        ) : (
          <div className="af-grid">
            {filteredTutors.map((tutor) => {
              const checked = selected.includes(tutor.tutor_id);

              return (
                <article
                  className={`af-card ${checked ? "is-selected" : ""}`}
                  key={tutor.tutor_id}
                >
                  <div className="af-card-top">
                    <div className="af-avatar">
                      {tutor.avatar_url ? (
                        <img
                          src={tutor.avatar_url}
                          alt={tutor.full_name}
                        />
                      ) : (
                        tutor.full_name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()
                      )}
                    </div>

                    <div className="af-tutor-identity">
                      <h3>{tutor.full_name}</h3>
                      <p>{tutor.headline || "Tutor profile"}</p>
                      <span
                        className={
                          tutor.eligible
                            ? "af-status active"
                            : "af-status inactive"
                        }
                      >
                        {tutor.eligible
                          ? "Eligible"
                          : "Not eligible"}
                      </span>
                    </div>
                  </div>

                  <div className="af-metrics">
                    <div>
                      <span>Completed sessions</span>
                      <strong>{tutor.completed_sessions}</strong>
                    </div>
                    <div>
                      <span>Hours completed</span>
                      <strong>
                        {Number(tutor.completed_hours).toFixed(1)} hrs
                      </strong>
                    </div>
                    <div>
                      <span>Verified payments</span>
                      <strong>{tutor.verified_payments}</strong>
                    </div>
                    <div>
                      <span>Total paid</span>
                      <strong>{money(tutor.total_paid)}</strong>
                    </div>
                  </div>

                  {tutor.subjects && (
                    <p className="af-subjects">
                      {tutor.subjects}
                    </p>
                  )}

                  <button
                    type="button"
                    className={
                      checked ? "af-selected-button" : "af-select-button"
                    }
                    disabled={
                      !tutor.eligible ||
                      (!checked && selected.length >= 6)
                    }
                    onClick={() => toggleTutor(tutor)}
                  >
                    {checked ? "✓ Selected" : "+ Select Tutor"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

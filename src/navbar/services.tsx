
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
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
  available: boolean;
  subjects: Subject[];
};

type CatalogResponse = {
  success: boolean;
  message?: string;
  tutors?: Tutor[];
};

type ServiceOffering = {
  name: string;
  tutorCount: number;
  availableTutorCount: number;
  startingRate: number;
};

// ==========================================
// CURRENCY
// ==========================================

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

// ==========================================
// SUBJECT ICONS
// ==========================================

function getSubjectIcon(subject: string): string {
  const value = subject.toLowerCase();

  if (
    value.includes("math") ||
    value.includes("algebra") ||
    value.includes("geometry") ||
    value.includes("statistics")
  ) {
    return "📐";
  }

  if (
    value.includes("program") ||
    value.includes("coding") ||
    value.includes("computer") ||
    value.includes("software") ||
    value.includes("web")
  ) {
    return "💻";
  }

  if (
    value.includes("english") ||
    value.includes("writing") ||
    value.includes("language")
  ) {
    return "📝";
  }

  if (
    value.includes("science") ||
    value.includes("biology") ||
    value.includes("chemistry") ||
    value.includes("physics")
  ) {
    return "🔬";
  }

  if (
    value.includes("business") ||
    value.includes("accounting") ||
    value.includes("finance")
  ) {
    return "📊";
  }

  if (
    value.includes("design") ||
    value.includes("art") ||
    value.includes("drawing")
  ) {
    return "🎨";
  }

  if (
    value.includes("history") ||
    value.includes("social") ||
    value.includes("political")
  ) {
    return "🌍";
  }

  return "📚";
}

// ==========================================
// MAIN SERVICES PAGE
// ==========================================

function Services() {
  const navigate = useNavigate();

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);

  // ========================================
  // LOAD REAL TUTOR OFFERINGS
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadServices() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/catalog", {
          signal: controller.signal,
        });

        const body =
          (await response.json()) as CatalogResponse;

        if (
          !response.ok ||
          !body.success ||
          !Array.isArray(body.tutors)
        ) {
          throw new Error(
            body.message || "Could not load available services."
          );
        }

        if (!controller.signal.aborted) {
          setTutors(body.tutors);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load available services."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadServices();

    return () => controller.abort();
  }, [reload]);

  // ========================================
  // GROUP TUTORS BY THEIR SUBJECT OFFERINGS
  // ========================================

  const services = useMemo(() => {
    const grouped = new Map<
      string,
      {
        tutorIds: Set<number>;
        availableTutorIds: Set<number>;
        rates: number[];
      }
    >();

    for (const tutor of tutors) {
      if (!Array.isArray(tutor.subjects)) {
        continue;
      }

      for (const subject of tutor.subjects) {
        const name = subject.subject_name?.trim();

        const rate = Number(subject.hourly_rate);

        if (!name || !Number.isFinite(rate) || rate < 0) {
          continue;
        }

        if (!grouped.has(name)) {
          grouped.set(name, {
            tutorIds: new Set<number>(),
            availableTutorIds: new Set<number>(),
            rates: [],
          });
        }

        const entry = grouped.get(name)!;

        entry.tutorIds.add(tutor.tutor_id);

        if (tutor.available) {
          entry.availableTutorIds.add(tutor.tutor_id);
        }

        entry.rates.push(rate);
      }
    }

    const result: ServiceOffering[] = [];

    for (const [name, entry] of grouped) {
      if (entry.rates.length === 0) {
        continue;
      }

      result.push({
        name,
        tutorCount: entry.tutorIds.size,
        availableTutorCount: entry.availableTutorIds.size,
        startingRate: Math.min(...entry.rates),
      });
    }

    return result.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [tutors]);

  // ========================================
  // SEARCH
  // ========================================

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return services;
    }

    return services.filter((service) =>
      service.name.toLowerCase().includes(query)
    );
  }, [services, search]);

  // ========================================
  // NAVIGATE TO MATCHING CATALOG SUBJECT
  // ========================================

  function findTutors(subject: string) {
    navigate(
      `/catalog?filter=${encodeURIComponent(subject)}`
    );
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <main className="services-page">
      {/* HERO */}

      <section className="services-hero">
        <span className="services-eyebrow">
          LEARN YOUR WAY
        </span>

        <h1>
          What would you like
          <br />
          <span>to learn?</span>
        </h1>

        <p>
          Explore subjects currently offered by our tutors.
          Find the right learning support, compare rates,
          and choose a tutor who fits your goals.
        </p>

        <div className="services-hero-stats">
          <div>
            <strong>{services.length}</strong>
            <span>Subjects offered</span>
          </div>

          <div>
            <strong>{tutors.length}</strong>
            <span>Listed tutors</span>
          </div>
        </div>
      </section>

      {/* SUBJECT LIST */}

      <section className="services-content">
        <div className="services-section-heading">
          <div>
            <span className="services-section-label">
              TUTOR OFFERINGS
            </span>

            <h2>Explore learning options</h2>

            <p>
              These subjects come directly from tutor profiles.
            </p>
          </div>

          {!loading && !error && (
            <span className="services-count">
              {filteredServices.length}{" "}
              {filteredServices.length === 1
                ? "subject"
                : "subjects"}
            </span>
          )}
        </div>

        {/* SEARCH */}

        <div className="services-search-wrap">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            className="services-search"
            placeholder="Search subjects..."
            aria-label="Search available subjects"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search && (
            <button
              type="button"
              className="services-clear-search"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* LOADING */}

        {loading && (
          <div className="services-state" role="status">
            <div className="services-loader" />
            <p>Loading subjects from our tutors...</p>
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="services-state services-error" role="alert">
            <span className="services-state-icon">!</span>

            <h3>Unable to load services</h3>

            <p>{error}</p>

            <button
              type="button"
              className="services-retry-btn"
              onClick={() => setReload((value) => value + 1)}
            >
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY CATALOG */}

        {!loading && !error && services.length === 0 && (
          <div className="services-state">
            <span className="services-state-icon">📚</span>

            <h3>No subjects available yet</h3>

            <p>
              Our tutors haven't published any subject offerings.
              Please check again later.
            </p>
          </div>
        )}

        {/* NO SEARCH RESULTS */}

        {!loading &&
          !error &&
          services.length > 0 &&
          filteredServices.length === 0 && (
            <div className="services-state">
              <span className="services-state-icon">⌕</span>

              <h3>No matching subjects</h3>

              <p>
                Try searching for another subject.
              </p>

              <button
                type="button"
                className="services-retry-btn"
                onClick={() => setSearch("")}
              >
                Clear Search
              </button>
            </div>
          )}

        {/* DYNAMIC SUBJECT CARDS */}

        {!loading &&
          !error &&
          filteredServices.length > 0 && (
            <div className="services-grid">
              {filteredServices.map((service) => (
                <article
                  className="service-card"
                  key={service.name}
                >
                  <div className="service-card-top">
                    <div className="service-icon">
                      {getSubjectIcon(service.name)}
                    </div>

                    <span className="service-tag">
                      {service.availableTutorCount > 0
                        ? "Available"
                        : "Currently unavailable"}
                    </span>
                  </div>

                  <div className="service-card-content">
                    <h3 className="service-title">
                      {service.name}
                    </h3>

                    <p className="service-desc">
                      Learn {service.name} with a tutor
                      offering personalized sessions
                      based on your learning goals.
                    </p>
                  </div>

                  <div className="service-details">
                    <div>
                      <strong>{service.tutorCount}</strong>
                      <span>
                        {service.tutorCount === 1
                          ? "Tutor offering"
                          : "Tutors offering"}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {formatPrice(service.startingRate)}
                      </strong>
                      <span>Starting rate / hour</span>
                    </div>
                  </div>

                  <div className="service-footer">
                    <span className="service-availability">
                      {service.availableTutorCount > 0
                        ? `${service.availableTutorCount} available now`
                        : "No tutors currently available"}
                    </span>

                    <button
                      type="button"
                      className="service-btn"
                      onClick={() => findTutors(service.name)}
                    >
                      Find Tutors
                      <span aria-hidden="true"> →</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
      </section>

      {/* BOTTOM INFORMATION */}

      <section className="services-bottom">
        <div className="services-bottom-icon">
          ✦
        </div>

        <div>
          <h3>Find the tutor who fits your goals.</h3>

          <p>
            Browse tutor profiles, compare subject rates,
            check their schedules, and send a booking request.
          </p>
        </div>

        <button
          type="button"
          className="services-bottom-btn"
          onClick={() => navigate("/catalog")}
        >
          Browse All Tutors
        </button>
      </section>
    </main>
  );
}

export default Services;

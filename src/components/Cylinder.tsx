
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Tutor {
  tutor_id: number;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  headline: string | null;
  years_experience: number | null;
  display_order: number;
}

interface FeaturedTutorsResponse {
  success: boolean;
  tutors: Tutor[];
  message?: string;
}

// Load images directly from the root-level pics folder.
const localImages = import.meta.glob(
  "../../pics/*.{png,jpg,jpeg,webp,avif,gif}",
  {
    eager: true,
    query: "?url",
    import: "default",
  }
) as Record<string, string>;

function resolveTutorImage(imagePath: string | null): string {
  if (!imagePath) return "";

  const normalizedPath = imagePath
    .replace(/\\/g, "/")
    .split("?")[0]
    .replace(/^\/+/, "");

  const fileName = normalizedPath.split("/").pop()?.toLowerCase();

  if (!fileName) return "";

  const matchedImage = Object.entries(localImages).find(([path]) => {
    return path.split("/").pop()?.toLowerCase() === fileName;
  });

  return matchedImage?.[1] ?? "";
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

const Cylinder = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cylinderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const totalFaces = tutors.length;
  const activeData = tutors[currentIndex];

  // Fetch the administrator's published tutor selection.
  useEffect(() => {
    const controller = new AbortController();

    const loadFeaturedTutors = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/featured-tutors", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        const data: FeaturedTutorsResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load featured tutors."
          );
        }

        const orderedTutors = [...(data.tutors || [])].sort(
          (a, b) => a.display_order - b.display_order
        );

        setTutors(orderedTutors);
        setCurrentIndex(0);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Featured tutors loading error:", err);
        setError("Unable to load featured tutors right now.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadFeaturedTutors();

    return () => controller.abort();
  }, []);

  // Rotate the cylinder based on the actual number of selected tutors.
  const updateRotation = useCallback(
    (index: number) => {
      if (!cylinderRef.current || totalFaces === 0) return;

      const angle = index * (360 / totalFaces);

      cylinderRef.current.style.transform = `rotateY(${-angle}deg)`;
    },
    [totalFaces]
  );

  const changeTutor = useCallback((index: number) => {
    setAnimating(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCurrentIndex(index);
        setAnimating(true);
      });
    });
  }, []);

  const rotate = useCallback(
    (direction: number) => {
      if (totalFaces <= 1) return;

      const newIndex =
        (currentIndex + direction + totalFaces) % totalFaces;

      changeTutor(newIndex);
    },
    [currentIndex, totalFaces, changeTutor]
  );

  useEffect(() => {
    updateRotation(currentIndex);
  }, [currentIndex, updateRotation]);

  useEffect(() => {
    if (totalFaces <= 1) return;

    const interval = window.setInterval(() => {
      rotate(1);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [currentIndex, totalFaces, rotate]);

  // Close the image modal using Escape.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleViewProfile = () => {
    if (!activeData) return;

    navigate(
      `/catalog?search=${encodeURIComponent(
        activeData.full_name.toLowerCase()
      )}`
    );
  };

  // Loading state.
  if (loading) {
    return (
      <div className="dual-panel">
        <div className="panel panel-left">
          <div className="container">
            <div className="scene">
              <p>Loading featured tutors...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state.
  if (error) {
    return (
      <div className="dual-panel">
        <div className="panel panel-left">
          <div className="container">
            <div className="scene">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state.
  if (!activeData) {
    return (
      <div className="dual-panel">
        <div className="panel panel-left">
          <div className="container">
            <div className="scene">
              <p>No featured tutors have been selected yet.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dual-panel">
        {/* PANEL 1: CYLINDER */}
        <div className="panel panel-left">
          <div className="container">
            <div className="scene">
              <div className="cylinder" ref={cylinderRef}>
                {tutors.map((tutor, index) => {
                  const image = resolveTutorImage(tutor.avatar_url);

                  const faceAngle = (360 / totalFaces) * index;

                  return (
                    <div
                      key={tutor.tutor_id}
                      className={`face ${
                        index === currentIndex ? "face--active" : ""
                      }`}
                      style={{
                        transform: `rotateY(${faceAngle}deg) translateZ(400px)`,
                      }}
                      onClick={() => changeTutor(index)}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={tutor.full_name}
                        />
                      ) : (
                        <div className="tutor-image-fallback">
                          {getInitials(tutor.full_name)}
                        </div>
                      )}

                      <div className="overlay">
                        <div className="overlay-content">
                          <div className="overlay-title">
                            {tutor.full_name}
                          </div>

                          <div className="overlay-line"></div>

                          <div className="overlay-sub">
                            {tutor.headline || "FEATURED TUTOR"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="controls">
                <button
                  onClick={() => rotate(-1)}
                  disabled={totalFaces <= 1}
                  aria-label="Previous tutor"
                >
                  ◀
                </button>

                <button
                  onClick={() => rotate(1)}
                  disabled={totalFaces <= 1}
                  aria-label="Next tutor"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          {/* DOT NAVIGATION */}
          <div className="dot-nav">
            {tutors.map((tutor, index) => (
              <button
                key={tutor.tutor_id}
                className={`dot ${
                  index === currentIndex ? "dot--active" : ""
                }`}
                onClick={() => changeTutor(index)}
                aria-label={`Show ${tutor.full_name}`}
              />
            ))}
          </div>
        </div>

        {/* PANEL 2: TUTOR INFORMATION */}
        <div className="panel panel-right">
          <div
            className={`info-card ${
              animating ? "info-card--enter" : ""
            }`}
            key={activeData.tutor_id}
          >
            <div className="info-avatar-wrap">
              {resolveTutorImage(activeData.avatar_url) ? (
                <img
                  src={resolveTutorImage(activeData.avatar_url)}
                  alt={activeData.full_name}
                  className="info-avatar info-avatar--clickable"
                  onClick={() => setModalOpen(true)}
                  title="Click to zoom"
                />
              ) : (
                <div
                  className="info-avatar info-avatar-fallback"
                  onClick={() => setModalOpen(true)}
                  title="Click to zoom"
                >
                  {getInitials(activeData.full_name)}
                </div>
              )}

              <div className="info-avatar-glow" />
              <span className="info-avatar-hint">🔍</span>
            </div>

            <span className="info-badge">
              {activeData.headline || "FEATURED TUTOR"}
            </span>

            <h2 className="info-name">
              {activeData.full_name}
            </h2>

            <div className="info-divider" />

            <p className="info-desc">
              {activeData.bio || "Discover this tutor's profile and available lessons."}
            </p>

            <button
              className="info-cta"
              onClick={handleViewProfile}
            >
              View In Catalog
            </button>

            <span className="info-counter">
              {String(currentIndex + 1).padStart(2, "0")} /{" "}
              {String(totalFaces).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* IMAGE MODAL */}
      {modalOpen && (
        <div
          className="tutor-modal-overlay"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="tutor-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="tutor-modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="tutor-modal-img-wrap">
              {resolveTutorImage(activeData.avatar_url) ? (
                <img
                  src={resolveTutorImage(activeData.avatar_url)}
                  alt={activeData.full_name}
                  className="tutor-modal-img"
                />
              ) : (
                <div className="tutor-modal-img tutor-image-fallback">
                  {getInitials(activeData.full_name)}
                </div>
              )}

              <div className="tutor-modal-img-glow" />
            </div>

            <div className="tutor-modal-body">
              <span className="tutor-modal-badge">
                {activeData.headline || "FEATURED TUTOR"}
              </span>

              <h2 className="tutor-modal-name">
                {activeData.full_name}
              </h2>

              <div className="tutor-modal-divider" />

              <p className="tutor-modal-desc">
                {activeData.bio || "Discover this tutor's profile and available lessons."}
              </p>

              <button
                className="tutor-modal-cta"
                onClick={() => {
                  setModalOpen(false);
                  handleViewProfile();
                }}
              >
                View Full Profile →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Cylinder;

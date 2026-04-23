import type { TutorListing } from "../data/catalogData";
import "../css/catalog.css";

type TutorCardProps = {
  tutor: TutorListing;
};

const TutorCard = ({ tutor }: TutorCardProps) => {
  const stars = "★".repeat(Math.floor(tutor.rating)) + (tutor.rating % 1 >= 0.5 ? "½" : "");

  return (
    <div className="tutor-card">
      {/* Availability badge */}
      <span className={`tutor-badge ${tutor.available ? "available" : "unavailable"}`}>
        {tutor.available ? "Available" : "Unavailable"}
      </span>

      {/* Photo */}
      <img src={tutor.image} alt={tutor.name} className="tutor-photo" />

      {/* Info */}
      <div className="tutor-info">
        <h3 className="tutor-name">{tutor.name}</h3>
        <p className="tutor-subject">{tutor.subject}</p>

        {/* Rating */}
        <div className="tutor-rating">
          <span className="tutor-stars">{stars}</span>
          <span className="tutor-reviews">{tutor.rating} · {tutor.reviews} reviews</span>
        </div>

        {/* Service tags */}
        <div className="tutor-tags">
          {tutor.services.map((s) => (
            <span key={s} className="tutor-tag">{s}</span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="tutor-footer">
        <span className="tutor-rate">{tutor.rate}</span>
        <button
          className="tutor-btn"
          disabled={!tutor.available}
        >
          {tutor.available ? "Book Now" : "Unavailable"}
        </button>
      </div>
    </div>
  );
};

export default TutorCard;
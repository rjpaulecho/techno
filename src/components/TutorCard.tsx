import type { TutorListing } from "../data/catalogData";
import "../css/catalog.css";

type Props = {
  tutor: TutorListing;
  onOpen: (tutor: TutorListing) => void;
};

const TutorCard = ({ tutor, onOpen }: Props) => {
  const stars = "★".repeat(Math.round(tutor.rating)) + "☆".repeat(5 - Math.round(tutor.rating));

  return (
    <div className="tutor-card tutor-card--clickable" onClick={() => onOpen(tutor)}>
      <span className={`tutor-badge ${tutor.available ? "available" : "unavailable"}`}>
        {tutor.available ? "Available" : "Unavailable"}
      </span>

      <div className="tutor-photo-wrap">
        <img src={tutor.image} alt={tutor.name} className="tutor-photo" draggable={false} />
      </div>

      <div className="tutor-info">
        <h3 className="tutor-name">{tutor.name}</h3>
        <p className="tutor-subject">{tutor.subject}</p>
        <div className="tutor-rating">
          <span className="tutor-stars">{stars}</span>
          <span className="tutor-reviews">{tutor.rating} ({tutor.reviews} reviews)</span>
        </div>
      </div>

      <div className="tutor-tags">
        {tutor.services.map((s) => (
          <span key={s} className="tutor-tag">{s}</span>
        ))}
      </div>

      <div className="tutor-footer">
        <span className="tutor-rate">{tutor.rate}</span>
        <button
          className="tutor-btn"
          disabled={!tutor.available}
          onClick={(e) => {
            e.stopPropagation(); // prevent double-open from card click
            onOpen(tutor);
          }}
        >
          {tutor.available ? "View Profile" : "Unavailable"}
        </button>
      </div>
    </div>
  );
};

export default TutorCard;
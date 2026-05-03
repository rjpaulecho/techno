import { useState } from "react";
import type { TutorListing } from "../data/catalogData";
import BookingModal from "./BookingModal";
import "../css/catalog.css";

type Props = {
  tutor: TutorListing;
  onClose: () => void;
};

const TutorProfileModal = ({ tutor, onClose }: Props) => {
  const [showBooking, setShowBooking] = useState(false);
  const stars = "★".repeat(Math.round(tutor.rating)) + "☆".repeat(5 - Math.round(tutor.rating));

  if (showBooking) {
    return <BookingModal tutor={tutor} onClose={() => { setShowBooking(false); onClose(); }} />;
  }

  return (
    <div className="tp-overlay" onClick={onClose}>
      <div className="tp-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button className="tp-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header banner */}
        <div className="tp-banner">
          <div className="tp-banner-glow" />
          <img src={tutor.image} alt={tutor.name} className="tp-avatar" draggable={false} />
          <span className={`tp-status ${tutor.available ? "available" : "unavailable"}`}>
            {tutor.available ? "● Available" : "● Unavailable"}
          </span>
        </div>

        {/* Body */}
        <div className="tp-body">

          {/* Name & subject */}
          <div className="tp-identity">
            <h2 className="tp-name">{tutor.name}</h2>
            <p className="tp-subject">{tutor.subject}</p>
            <div className="tp-rating">
              <span className="tp-stars">{stars}</span>
              <span className="tp-reviews">{tutor.rating} · {tutor.reviews} reviews</span>
            </div>
          </div>

          {/* Tags */}
          <div className="tp-tags">
            {tutor.services.map((s) => (
              <span key={s} className="tutor-tag">{s}</span>
            ))}
          </div>

          <div className="tp-divider" />

          {/* Contact info */}
          <div className="tp-contact-list">
            <div className="tp-contact-row">
              <span className="tp-contact-icon">📞</span>
              <div className="tp-contact-detail">
                <span className="tp-contact-label">Phone</span>
                <span className="tp-contact-value">{tutor.phone ?? "Not provided"}</span>
              </div>
              {tutor.phone && (
                <a href={`tel:${tutor.phone}`} className="tp-contact-action">Call</a>
              )}
            </div>

            <div className="tp-contact-row">
              <span className="tp-contact-icon">✉️</span>
              <div className="tp-contact-detail">
                <span className="tp-contact-label">Email</span>
                <span className="tp-contact-value">{tutor.email ?? "Not provided"}</span>
              </div>
              {tutor.email && (
                <a href={`mailto:${tutor.email}`} className="tp-contact-action">Send</a>
              )}
            </div>
          </div>

          <div className="tp-divider" />

          {/* Rate */}
          <div className="tp-rate-row">
            <span className="tp-rate-label">Session Rate</span>
            <span className="tp-rate-value">{tutor.rate}</span>
          </div>

          {/* Action buttons */}
          <div className="tp-actions">
            <button
              className="tp-action-btn tp-chat"
              onClick={() => alert(`Opening chat with ${tutor.name}…`)}
            >
              💬 Chat
            </button>

            <button
              className="tp-action-btn tp-appt"
              onClick={() => alert(`Set appointment with ${tutor.name}…`)}
            >
              📅 Set Appointment
            </button>
          </div>

          <button
            className="tp-book-btn"
            disabled={!tutor.available}
            onClick={() => setShowBooking(true)}
          >
            {tutor.available ? "Book a Session →" : "Currently Unavailable"}
          </button>

        </div>
      </div>
    </div>
  );
};

export default TutorProfileModal;
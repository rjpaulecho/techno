import React from "react";
import { useNavigate } from "react-router-dom";
import type { Tutor } from "../data/devs";
import { tutorsData } from "../data/devs";
import "../css/devmodal.css";

interface DevModalProps {
  isOpen: boolean;
  onClose: () => void;
  dev: Tutor | null;
}

const DevModal: React.FC<DevModalProps> = ({ isOpen, onClose, dev }) => {
  const navigate = useNavigate();

  if (!isOpen || !dev) return null;

  const handleContact = () => {
    onClose();
    // Find this dev's position in the carousel array
    const tutorIndex = tutorsData.findIndex((t) => t.id === dev.id);
    navigate("/contact", { state: { tutorIndex } });
    setTimeout(() => {
      const el = document.getElementById("team-carousel");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }, 80);
  };

  return (
    <div className="dm-overlay" onClick={onClose}>
      <div className="dm-card" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button className="dm-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Avatar + identity */}
        <div className="dm-top">
          <div className="dm-avatar-wrap">
            <img src={dev.image} alt={dev.name} className="dm-avatar" />
            <div className="dm-avatar-ring" />
          </div>
          <div className="dm-identity">
            <h2 className="dm-name">{dev.name}</h2>
            <span className="dm-role">{dev.role}</span>
          </div>
        </div>

        {/* Short bio */}
        <p className="dm-bio">{dev.shortDesc}</p>

        {/* Top 3 tags */}
        <div className="dm-tags">
          {dev.expertise.slice(0, 3).map((tag) => (
            <span className="dm-tag" key={tag}>{tag}</span>
          ))}
        </div>

        {/* Quick contact links if available */}
        {dev.contact && (
          <div className="dm-quick-links">
            {dev.contact.email && (
              <a href={`mailto:${dev.contact.email}`} className="dm-link" title="Email">
                📧 {dev.contact.email}
              </a>
            )}
            {dev.contact.facebook && (
              <a href={dev.contact.facebook} target="_blank" rel="noopener noreferrer" className="dm-link" title="Facebook">
                🔵 Facebook
              </a>
            )}
            {dev.contact.twitter && (
              <a href={dev.contact.twitter} target="_blank" rel="noopener noreferrer" className="dm-link" title="Twitter / X">
                🐦 Twitter / X
              </a>
            )}
            {dev.contact.phone && (
              <a href={`tel:${dev.contact.phone}`} className="dm-link" title="Phone">
                📞 {dev.contact.phone}
              </a>
            )}
            {dev.contact.cell && (
              <a href={`tel:${dev.contact.cell}`} className="dm-link" title="Cell">
                📱 {dev.contact.cell}
              </a>
            )}
          </div>
        )}

        {/* CTA */}
        <button className="dm-cta" onClick={handleContact}>
          View Full Profile on Contact Page →
        </button>
      </div>
    </div>
  );
};

export default DevModal;
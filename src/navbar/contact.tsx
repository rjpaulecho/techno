import { useLocation } from "react-router-dom";
import AdvancedCarousel from "../components/AdvancedCarousel";
import "../css/style.css";
import "../css/carousel.css";

function Contact() {
  // tutorIndex is set by DevModal when the user clicks "View Full Profile"
  const { state } = useLocation();
  const initialIndex: number = state?.tutorIndex ?? 0;

  return (
    <div className="contact-page">

      {/* ── Hero ─────────────────────────────────── */}
      <section className="contact-hero">
        <p className="contact-eyebrow">Get to Know Us</p>
        <h1 className="contact-hero-title">
          Meet the <span className="contact-gradient">Team</span>
        </h1>
        <p className="contact-hero-sub">
          We're a group of students who built TutoFriends to make learning
          more accessible, friendly, and fun. Drag or click any card to learn more.
        </p>
      </section>

      {/* ── Carousel ─────────────────────────────── */}
      <div className="contact-carousel-wrap" id="team-carousel">
        <AdvancedCarousel initialIndex={initialIndex} />
      </div>

      {/* ── Reach Out ────────────────────────────── */}
      <section className="contact-reach">
        <div className="contact-reach-inner">
          <p className="contact-eyebrow" style={{ textAlign: "center" }}>Reach Out</p>
          <h2 className="contact-reach-title">Have a question or suggestion?</h2>
          <p className="contact-reach-sub">
            We'd love to hear from you. Drop us a message and we'll get back to you as soon as we can.
          </p>
          <div className="contact-cards">
            <div className="contact-card">
              <span className="contact-card-icon">📧</span>
              <h3>Email Us</h3>
              <p>tutofriends@school.edu.ph</p>
            </div>
            <div className="contact-card">
              <span className="contact-card-icon">💬</span>
              <h3>Message</h3>
              <p>Send us a message through the app</p>
            </div>
            <div className="contact-card">
              <span className="contact-card-icon">📍</span>
              <h3>Location</h3>
              <p>Philippines 🇵🇭</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Contact;
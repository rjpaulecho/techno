
import { useState, type FormEvent, type MouseEvent } from "react";
import { useLocation } from "react-router-dom";

import AdvancedCarousel from "../components/AdvancedCarousel";

import "../css/style.css";
import "../css/carousel.css";
import "../css/contact.css";

/* ==========================================
   TUTOfRIENDS CONTACT CONFIGURATION

   EDIT THESE VALUES WHENEVER NEEDED.
========================================== */

const TF_CONTACT = {
  email: "tutofriends@example.com",

  // SAMPLE ADDRESS ONLY — replace with your actual address.
  address:
    "TutoFriends Learning Hub, 123 Learning Avenue, Pateros, Metro Manila, Philippines",
};

type ModalType = "message" | "location" | null;

type MessageCategory = "feedback" | "general" | "technical" | "other";

type SubmitResponse = {
  success?: boolean;
  message?: string;
};

function Contact() {
  const { state } = useLocation();
  const initialIndex: number = state?.tutorIndex ?? 0;

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const [category, setCategory] = useState<MessageCategory>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function closeModal() {
    if (isSubmitting) return;

    setActiveModal(null);
    setSuccessMessage("");
    setErrorMessage("");
  }

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (cleanSubject.length < 3 || cleanSubject.length > 160) {
      setErrorMessage("Subject must contain 3 to 160 characters.");
      return;
    }

    if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
      setErrorMessage("Message must contain 10 to 5,000 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          subject: cleanSubject,
          message: cleanMessage,
        }),
      });

      const data = (await response.json()) as SubmitResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to send your message. Please try again."
        );
      }

      setSuccessMessage(
        data.message || "Your message has been sent successfully!"
      );

      setCategory("general");
      setSubject("");
      setMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    TF_CONTACT.address
  )}&output=embed`;

  return (
    <div className="contact-page">
      {/* HERO */}
      <section className="contact-hero">
        <p className="contact-eyebrow">Get to Know Us</p>

        <h1 className="contact-hero-title">
          Meet the <span className="contact-gradient">Team</span>
        </h1>

        <p className="contact-hero-sub">
          We're a group of students who built TutoFriends to make learning
          more accessible, friendly, and fun. Drag or click any card to learn
          more.
        </p>
      </section>

      {/* TEAM CAROUSEL */}
      <div className="contact-carousel-wrap" id="team-carousel">
        <AdvancedCarousel initialIndex={initialIndex} />
      </div>

      {/* REACH OUT */}
      <section className="contact-reach">
        <div className="contact-reach-inner">
          <p className="contact-eyebrow contact-center">
            Reach Out
          </p>

          <h2 className="contact-reach-title">
            We'd Love to Hear From You
          </h2>

          <p className="contact-reach-sub">
            Have a question, suggestion, or concern? Choose how you'd
            like to get in touch with us.
          </p>

          <div className="contact-cards">
            {/* EMAIL CARD */}
            <a
              className="contact-card contact-action-card"
              href={`mailto:${TF_CONTACT.email}`}
            >
              <span className="contact-card-icon">📧</span>
              <h3>Email Us</h3>
              <p>{TF_CONTACT.email}</p>
              <span className="contact-card-action">
                Open email <span aria-hidden="true">↗</span>
              </span>
            </a>

            {/* MESSAGE CARD */}
            <button
              type="button"
              className="contact-card contact-action-card"
              onClick={() => setActiveModal("message")}
            >
              <span className="contact-card-icon">💬</span>
              <h3>Message Us</h3>
              <p>Send feedback, questions, or report an issue.</p>
              <span className="contact-card-action">
                Send a message <span aria-hidden="true">→</span>
              </span>
            </button>

            {/* LOCATION CARD */}
            <button
              type="button"
              className="contact-card contact-action-card"
              onClick={() => setActiveModal("location")}
            >
              <span className="contact-card-icon">📍</span>
              <h3>Our Location</h3>
              <p>Find us and view our location on the map.</p>
              <span className="contact-card-action">
                View location <span aria-hidden="true">→</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* MESSAGE MODAL */}
      {activeModal === "message" && (
        <div
          className="contact-modal-overlay"
          onClick={handleOverlayClick}
        >
          <section
            className="contact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-message-title"
          >
            <button
              type="button"
              className="contact-modal-close"
              onClick={closeModal}
              aria-label="Close message form"
              disabled={isSubmitting}
            >
              ×
            </button>

            <div className="contact-modal-heading">
              <span className="contact-modal-icon">✉</span>

              <div>
                <p className="contact-eyebrow">GET IN TOUCH</p>
                <h2 id="contact-message-title">Send us a message</h2>
                <p>
                  Your message will be sent directly to the
                  TutoFriends administration team.
                </p>
              </div>
            </div>

            <form
              className="contact-message-form"
              onSubmit={handleSubmit}
            >
              <div className="contact-form-field">
                <label htmlFor="contact-category">
                  Message type
                </label>

                <select
                  id="contact-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as MessageCategory)
                  }
                  disabled={isSubmitting}
                >
                  <option value="general">General inquiry</option>
                  <option value="feedback">Feedback or suggestion</option>
                  <option value="technical">Technical issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="contact-form-field">
                <label htmlFor="contact-subject">Subject</label>

                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="What is your message about?"
                  minLength={3}
                  maxLength={160}
                  required
                  disabled={isSubmitting}
                />

                <span className="contact-field-hint">
                  {subject.length}/160 characters
                </span>
              </div>

              <div className="contact-form-field">
                <label htmlFor="contact-message">Your message</label>

                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write your message here..."
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  required
                  disabled={isSubmitting}
                />

                <span className="contact-field-hint">
                  {message.length}/5000 characters
                </span>
              </div>

              {errorMessage && (
                <div className="contact-form-alert contact-form-error" role="alert">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="contact-form-alert contact-form-success" role="status">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                className="contact-submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
                {!isSubmitting && <span aria-hidden="true">→</span>}
              </button>

              <p className="contact-form-note">
                🔒 Your message is visible to authorized TutoFriends
                administrators.
              </p>
            </form>
          </section>
        </div>
      )}

      {/* LOCATION MODAL */}
      {activeModal === "location" && (
        <div
          className="contact-modal-overlay"
          onClick={handleOverlayClick}
        >
          <section
            className="contact-modal contact-location-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-location-title"
          >
            <button
              type="button"
              className="contact-modal-close"
              onClick={closeModal}
              aria-label="Close location"
            >
              ×
            </button>

            <div className="contact-modal-heading">
              <span className="contact-modal-icon">📍</span>

              <div>
                <p className="contact-eyebrow">FIND US</p>
                <h2 id="contact-location-title">Our Location</h2>
                <p>Here's where you can find TutoFriends.</p>
              </div>
            </div>

            <div className="contact-location-address">
              <strong>Address</strong>
              <p>{TF_CONTACT.address}</p>
              <span className="contact-location-placeholder">
                Sample address — edit TF_CONTACT.address in contact.tsx
                when your official location is available.
              </span>
            </div>

            <div className="contact-map-container">
              <iframe
                title="TutoFriends sample location map"
                src={mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <a
              className="contact-submit-button contact-map-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                TF_CONTACT.address
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps <span aria-hidden="true">↗</span>
            </a>
          </section>
        </div>
      )}
    </div>
  );
}

export default Contact;

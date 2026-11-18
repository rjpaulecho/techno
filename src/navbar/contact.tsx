import { useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import AdvancedCarousel from "../components/AdvancedCarousel";

import "../css/style.css";
import "../css/carousel.css";
import "../css/contact.css";

// EDIT THESE DETAILS WHENEVER NEEDED.
const TF_CONTACT = {
  email: "tutofriends@school.edu.ph",
  // SAMPLE ADDRESS ONLY — replace with your actual address.
  address:
    "TutoFriends Learning Hub, 123 Learning Avenue, Pateros, Metro Manila, Philippines",
};

type ModalType = "message" | "location" | null;

type ApiResponse = {
  success?: boolean;
  message?: string;
};

export default function Contact() {
  const { state } = useLocation();
  const initialIndex: number = state?.tutorIndex ?? 0;

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error">(
    "success"
  );

  function closeModal() {
    if (sending) return;
    setActiveModal(null);
    setFeedback("");
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    if (subject.trim().length < 3) {
      setFeedbackType("error");
      setFeedback("Subject must contain at least 3 characters.");
      return;
    }

    if (message.trim().length < 10) {
      setFeedbackType("error");
      setFeedback("Message must contain at least 10 characters.");
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || `Unable to send message (HTTP ${response.status}).`
        );
      }

      setFeedbackType("success");
      setFeedback(data.message || "Your message has been sent successfully.");
      setSubject("");
      setMessage("");
      setCategory("general");
    } catch (error) {
      setFeedbackType("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    TF_CONTACT.address
  )}&output=embed`;

  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    TF_CONTACT.address
  )}`;

  return (
    <div className="contact-page">
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

      <div className="contact-carousel-wrap" id="team-carousel">
        <AdvancedCarousel initialIndex={initialIndex} />
      </div>

      <section className="contact-reach">
        <div className="contact-reach-inner">
          <p className="contact-eyebrow contact-centered">Reach Out</p>

          <h2 className="contact-reach-title">
            Have a question or suggestion?
          </h2>

          <p className="contact-reach-sub">
            We'd love to hear from you. Drop us a message and we'll get back
            to you as soon as we can.
          </p>

          <div className="contact-cards">
            <a
              className="contact-card contact-action-card"
              href={`mailto:${TF_CONTACT.email}`}
            >
              <span className="contact-card-icon">📧</span>
              <h3>Email Us</h3>
              <p>{TF_CONTACT.email}</p>
              <span className="contact-card-action">Open email →</span>
            </a>

            <button
              type="button"
              className="contact-card contact-action-card"
              onClick={() => {
                setFeedback("");
                setActiveModal("message");
              }}
            >
              <span className="contact-card-icon">💬</span>
              <h3>Message</h3>
              <p>Send us a message through the app</p>
              <span className="contact-card-action">Send a message →</span>
            </button>

            <button
              type="button"
              className="contact-card contact-action-card"
              onClick={() => setActiveModal("location")}
            >
              <span className="contact-card-icon">📍</span>
              <h3>Location</h3>
              <p>View our location on the map</p>
              <span className="contact-card-action">View location →</span>
            </button>
          </div>
        </div>
      </section>

      {activeModal && (
        <div
          className="contact-modal-overlay"
          onClick={closeModal}
          role="presentation"
        >
          <section
            className="contact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="contact-modal-close"
              onClick={closeModal}
              aria-label="Close modal"
              disabled={sending}
            >
              ×
            </button>

            {activeModal === "message" ? (
              <>
                <p className="contact-eyebrow">CONTACT SUPPORT</p>
                <h2 id="contact-modal-title">Send us a message</h2>
                <p className="contact-modal-description">
                  Tell us what's on your mind. Your message will be sent to
                  the TutoFriends admin inbox.
                </p>

                <form
                  className="contact-message-form"
                  onSubmit={submitMessage}
                >
                  <label htmlFor="contact-category">Message category</label>
                  <select
                    id="contact-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={sending}
                  >
                    <option value="general">General Inquiry</option>
                    <option value="feedback">Feedback</option>
                    <option value="technical">Technical Issue</option>
                    <option value="other">Other</option>
                  </select>

                  <label htmlFor="contact-subject">Subject</label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="What is this about?"
                    minLength={3}
                    maxLength={160}
                    required
                    disabled={sending}
                  />

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
                    disabled={sending}
                  />

                  {feedback && (
                    <p
                      className={`contact-form-feedback ${
                        feedbackType === "success"
                          ? "is-success"
                          : "is-error"
                      }`}
                      role="status"
                    >
                      {feedback}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="contact-submit-button"
                    disabled={sending}
                  >
                    {sending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="contact-eyebrow">FIND US</p>
                <h2 id="contact-modal-title">Our Location</h2>
                <p className="contact-modal-description">
                  {TF_CONTACT.address}
                </p>

                <iframe
                  className="contact-map"
                  title="TutoFriends location map"
                  src={mapUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />

                <a
                  className="contact-submit-button contact-map-link"
                  href={mapLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps ↗
                </a>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
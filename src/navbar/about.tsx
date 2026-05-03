import { useState } from "react";
import { tutorsData, leadershipData } from "../data/devs";
import type { Tutor } from "../data/devs";
import DevModal from "../components/DevModal";
import "../css/about.css";
import { Link } from "react-router-dom";

const values = [
  { icon: "🤝", title: "Peer-to-Peer", desc: "Learn from fellow students who genuinely understand the struggle." },
  { icon: "💡", title: "No Pressure",  desc: "Chill, friendly sessions built to grow confidence, not stress." },
  { icon: "📍", title: "Local First",  desc: "Made for Filipino students, with tutors who speak your language." },
  { icon: "⚡", title: "Flexible",     desc: "Book on your own schedule — quick help or deep-dives, your call." },
];

const stats = [
  { value: "6+",   label: "Expert Tutors"    },
  { value: "6",    label: "Subjects Covered" },
  { value: "₱150", label: "Starting Rate"    },
  { value: "100%", label: "Student-Focused"  },
];

function About() {
  const [selectedDev, setSelectedDev] = useState<Tutor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllContributors, setShowAllContributors] = useState(false);

  const openModal = (dev: Tutor) => {
    setSelectedDev(dev);
    setIsModalOpen(true);
  };

  return (
    <div className="about-page-light">

      {/* ── Dev Modal ────────────────────────────── */}
      <DevModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dev={selectedDev}
      />

      {/* ── Hero ─────────────────────────────────── */}
      <section className="abl-hero">
        <p className="abl-eyebrow">Who We Are</p>
        <h1 className="abl-hero-title">
          Learning is better<br />
          <span className="abl-gradient-text">with a friend.</span>
        </h1>
        <p className="abl-hero-sub">
          TutoFriends connects students with peer tutors who make learning
          feel less like work — and more like a conversation.
        </p>
      </section>

      {/* ── Stats ────────────────────────────────── */}
      <section className="abl-stats">
        {stats.map((s) => (
          <div className="abl-stat-card" key={s.label}>
            <span className="abl-stat-value">{s.value}</span>
            <span className="abl-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Mission ──────────────────────────────── */}
      <section className="abl-mission">
        <div className="abl-mission-text">
          <p className="abl-eyebrow">Our Mission</p>
          <h2>Making quality tutoring <span className="abl-gradient-text">accessible</span> to every student.</h2>
          <p>
            We started TutoFriends because asking for help can feel intimidating.
            Traditional tutoring is often expensive and stiff. Our platform brings
            together passionate peer tutors for affordable, relaxed, and effective
            learning sessions — no judgment, just support.
          </p>
          <p>
            Whether you need a quick homework assist or a full exam-prep deep-dive,
            there's a TutoFriend ready for you.
          </p>
        </div>
        <div className="abl-mission-card abl-panel">
          <span className="abl-mission-icon">📚</span>
          <p>"We learn best when we feel safe to ask questions."</p>
          <span className="abl-mission-attr">— The TutoFriends Team</span>
        </div>
      </section>

      {/* ── Values ───────────────────────────────── */}
      <section className="abl-section">
        <p className="abl-eyebrow" style={{ textAlign: "center" }}>What We Stand For</p>
        <h2 className="abl-section-title">Our Values</h2>
        <div className="abl-values-grid">
          {values.map((v) => (
            <div className="abl-value-card abl-panel" key={v.title}>
              <span className="abl-value-icon">{v.icon}</span>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Team ─────────────────────────────────── */}
      <section className="abl-section">
        <p className="abl-eyebrow" style={{ textAlign: "center" }}>The People Behind It</p>
        <h2 className="abl-section-title">Meet the Devs</h2>
        <p className="abl-section-sub">
          Click any card to see quick info and contact details.
        </p>
        <div className="abl-team-grid">
          {tutorsData.map((dev) => (
            <div
              className="abl-team-card abl-panel abl-team-card--clickable"
              key={dev.id}
              onClick={() => openModal(dev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openModal(dev)}
            >
              <div className="abl-team-img-wrap">
                <img src={dev.image} alt={dev.name} className="abl-team-img" />
                <div className="abl-team-img-glow" />
              </div>
              <h3 className="abl-team-name">{dev.name}</h3>
              <span className="abl-team-role">{dev.role}</span>
              <p className="abl-team-desc">{dev.shortDesc}</p>
              <div className="abl-team-tags">
                {dev.expertise.slice(0, 3).map((tag) => (
                  <span className="abl-team-tag" key={tag}>{tag}</span>
                ))}
              </div>
              <span className="abl-team-hint">Click to view profile</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Leadership ───────────────────────────── */}
      <section className="abl-section">
        <p className="abl-eyebrow" style={{ textAlign: "center" }}>The Ones Who Started It</p>
        <h2 className="abl-section-title">Leadership</h2>
        <p className="abl-section-sub">
          The two who had the crazy idea and refused to let it die.
        </p>

        {/* Founder + Co-Founder cards */}
        <div className="abl-leadership-grid">
          {leadershipData.map((leader) => (
            <div className="abl-leader-card abl-panel" key={leader.id}>
              {/* Badge */}
              <span className="abl-leader-badge">
                {leader.leadershipRole === "Founder" ? "👑" : "🌟"} {leader.leadershipRole}
              </span>

              {/* Avatar */}
              <div className="abl-leader-avatar-wrap">
                <img src={leader.image} alt={leader.name} className="abl-leader-avatar" />
                <div className="abl-leader-avatar-ring" />
              </div>

              <h3 className="abl-leader-name">{leader.name}</h3>
              <span className="abl-leader-role">{leader.role}</span>

              {/* Quote */}
              <blockquote className="abl-leader-quote">
                "{leader.quote}"
              </blockquote>

              <p className="abl-leader-bio">{leader.bio}</p>

              {/* Contact links */}
              {leader.contact && (
                <div className="abl-leader-links">
                  {leader.contact.email && (
                    <a href={`mailto:${leader.contact.email}`} className="abl-leader-link" title="Email">📧</a>
                  )}
                  {leader.contact.facebook && (
                    <a href={leader.contact.facebook} target="_blank" rel="noopener noreferrer" className="abl-leader-link" title="Facebook">🔵</a>
                  )}
                  {leader.contact.twitter && (
                    <a href={leader.contact.twitter} target="_blank" rel="noopener noreferrer" className="abl-leader-link" title="Twitter / X">🐦</a>
                  )}
                  {leader.contact.phone && (
                    <a href={`tel:${leader.contact.phone}`} className="abl-leader-link" title="Phone">📞</a>
                  )}
                  {leader.contact.cell && (
                    <a href={`tel:${leader.contact.cell}`} className="abl-leader-link" title="Cell">📱</a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── See All Contributors ─────────────── */}
        <div className="abl-contributors-wrap">
          <button
            className="abl-contributors-toggle"
            onClick={() => setShowAllContributors((v) => !v)}
            aria-expanded={showAllContributors}
          >
            <span>{showAllContributors ? "Hide" : "See All"} Contributors</span>
            <span className="abl-contributors-toggle-arrow" style={{ transform: showAllContributors ? "rotate(180deg)" : "rotate(0deg)" }}>
              ↓
            </span>
          </button>

          {showAllContributors && (
            <div className="abl-contributors-list">
              <p className="abl-contributors-note">
                Everyone below contributed to building TutoFriends. To add yourself, see the instructions in <code>src/data/devs.ts</code>.
              </p>
              <div className="abl-contributors-grid">
                {tutorsData.map((dev) => (
                  <div
                    className="abl-contributor-chip"
                    key={dev.id}
                    onClick={() => openModal(dev)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && openModal(dev)}
                  >
                    <img src={dev.image} alt={dev.name} className="abl-contributor-avatar" />
                    <div>
                      <span className="abl-contributor-name">{dev.name}</span>
                      <span className="abl-contributor-role">{dev.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="abl-cta">
        <div className="abl-cta-inner abl-panel">
          <h2>Ready to find your TutoFriend?</h2>
          <p>Browse our catalog and book a session that fits your schedule.</p>
          <Link to="/catalog" className="abl-cta-btn">Browse Tutors →</Link>
        </div>
      </section>

    </div>
  );
}

export default About;
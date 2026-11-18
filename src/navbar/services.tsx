
import { useState } from "react";
import ServiceCard from "../components/ServiceCard";
import { servicesData, filterTags } from "../data/servicesData";
import "../css/services.css";

function Services() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered =
    activeFilter === "All"
      ? servicesData
      : servicesData.filter(
          (service) => service.tag === activeFilter
        );

  return (
    <main className="services-page">
      {/* Page Introduction */}
      <section className="services-hero">
        <span className="services-eyebrow">
          LEARN YOUR WAY
        </span>

        <h1>
          Find the right way
          <br />
          <span>to learn.</span>
        </h1>

        <p>
          Whether you need a little help or want to master
          something new, there's a learning experience
          waiting for you.
        </p>
      </section>

      {/* Service Categories */}
      <section className="services-content">
        <div className="services-section-heading">
          <div>
            <span className="services-section-label">
              EXPLORE
            </span>
            <h2>Our Services</h2>
            <p>
              Choose a learning experience that fits your goals.
            </p>
          </div>

          <span className="services-count">
            {filtered.length}{" "}
            {filtered.length === 1 ? "service" : "services"}
          </span>
        </div>

        <div className="services-filters">
          {filterTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`filter-btn ${
                activeFilter === tag ? "active" : ""
              }`}
              aria-pressed={activeFilter === tag}
              onClick={() => setActiveFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Service Cards */}
        <div className="services-grid">
          {filtered.length > 0 ? (
            filtered.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
              />
            ))
          ) : (
            <p className="services-empty">
              No services found. Try another category.
            </p>
          )}
        </div>
      </section>

      {/* Bottom Information */}
      <section className="services-bottom">
        <div className="services-bottom-icon">
          <span>✦</span>
        </div>

        <div>
          <h3>Learning starts with one step.</h3>
          <p>
            Explore our available services and find a tutor
            who can help you reach your goals.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Services;

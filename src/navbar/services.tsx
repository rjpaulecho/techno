import { useState } from "react";
import ServiceCard from "../components/ServiceCard";
import { servicesData, filterTags } from "../data/servicesData";
import "../css/services.css";

function Services() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered =
    activeFilter === "All"
      ? servicesData
      : servicesData.filter((s) => s.tag === activeFilter);

  return (
    <div className="services-page">
      {/* Header */}
      <div className="services-header">
        <h1>Our Services</h1>
        <p>Choose how you want to learn — flexible, friendly, and pressure-free.</p>
      </div>

      {/* Filter Buttons */}
      <div className="services-filters">
        {filterTags.map((tag) => (
          <button
            key={tag}
            className={`filter-btn ${activeFilter === tag ? "active" : ""}`}
            onClick={() => setActiveFilter(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="services-grid">
        {filtered.length > 0 ? (
          filtered.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))
        ) : (
          <p className="services-empty">No services found.</p>
        )}
      </div>
    </div>
  );
}

export default Services;
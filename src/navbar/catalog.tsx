import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import TutorCard from "../components/TutorCard";
import TutorProfileModal from "../components/TutorProfileModal";
import { catalogData } from "../data/catalogData";
import type { TutorListing } from "../data/catalogData";
import { filterTags } from "../data/servicesData";
import "../css/catalog.css";

function Catalog() {
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedTutor, setSelectedTutor] = useState<TutorListing | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tag = params.get("filter");
    const searchParam = params.get("search");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tag) setActiveFilter(tag);
    if (searchParam) setSearch(searchParam);
  }, [location.search]);

  const filtered = catalogData.filter((tutor) => {
    const matchesFilter =
      activeFilter === "All" || tutor.services.includes(activeFilter);
    const matchesSearch =
      tutor.name.toLowerCase().includes(search.toLowerCase()) ||
      tutor.subject.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <h1>Find a Tutor</h1>
        <p>Browse tutors by subject or service type and book a session.</p>
      </div>

      <input
        type="text"
        className="catalog-search"
        placeholder="Search by name or subject..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="catalog-filters">
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

      <p className="catalog-count">
        {filtered.length} tutor{filtered.length !== 1 ? "s" : ""} found
        {activeFilter !== "All" ? ` for "${activeFilter}"` : ""}
      </p>

      <div className="catalog-grid">
        {filtered.length > 0 ? (
          filtered.map((tutor) => (
            <TutorCard key={tutor.id} tutor={tutor} onOpen={setSelectedTutor} />
          ))
        ) : (
          <p className="catalog-empty">No tutors match your search.</p>
        )}
      </div>

      {selectedTutor && (
        <TutorProfileModal
          tutor={selectedTutor}
          onClose={() => setSelectedTutor(null)}
        />
      )}
    </div>
  );
}

export default Catalog;
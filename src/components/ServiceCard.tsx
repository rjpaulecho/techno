import { useNavigate } from "react-router-dom";
import type { Service } from "../data/servicesData";
import "../css/services.css";

type ServiceCardProps = {
  service: Service;
};

const ServiceCard = ({ service }: ServiceCardProps) => {
  const navigate = useNavigate();

  const handleBook = () => {
    navigate(`/catalog?filter=${encodeURIComponent(service.tag)}`);
  };

  return (
    <div className="service-card">
      <div className="service-card-top">
        <span className="service-icon">{service.icon}</span>
        <span className="service-tag">{service.tag}</span>
      </div>

      <h3 className="service-title">{service.title}</h3>
      <p className="service-desc">{service.desc}</p>

      <div className="service-footer">
        <span className="service-price">{service.price}</span>
        <button className="service-btn" onClick={handleBook}>
          Book Now
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;
import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

type NavbarProps = {
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
};

const Navbar = ({ onLogout, isDark, onToggleDark }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef  = useRef<HTMLDivElement>(null);

  const handleNavigate = (path: string) => {
    navigate(path);
    closeMenu();
  };

  const handleLogout = () => {
    onLogout();
    navigate("/login");
    closeMenu();
  };

  const toggleMenu = () => {
    const menu = document.getElementById("menu");
    if (menu) {
      menu.style.display =
        menu.style.display === "flex" ? "none" : "flex";
    }
  };

  const closeMenu = () => {
    const menu = document.getElementById("menu");
    if (menu) menu.style.display = "none";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navClass = (path: string) =>
    `nav-item${location.pathname === path ? " nav-item--active" : ""}`;

  return (
    <nav className="navbar">
      <div className="logo">
        <img src="pics/logo.jpg" alt="Logo" />
        <span className="logo-text">TuToFriends</span>
      </div>

      <div className="center">
        <div className="nav-box">
          <div className={navClass("/dashboard")} onClick={() => handleNavigate("/dashboard")}>HOME</div>
          <div className={navClass("/services")}  onClick={() => handleNavigate("/services")}>SERVICES</div>
          <div className={navClass("/about")}     onClick={() => handleNavigate("/about")}>ABOUT</div>
          <div className={navClass("/contact")}   onClick={() => handleNavigate("/contact")}>CONTACT</div>
          <div className={navClass("/catalog")}   onClick={() => handleNavigate("/catalog")}>CATALOG</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* ── Dark / Light toggle ── */}
        <button
          className="dark-toggle"
          onClick={onToggleDark}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        <div className="burger-menu-container" ref={menuRef}>
          <div className="burger" onClick={toggleMenu}>☰</div>
          <div className="menu" id="menu">
            <div className="menu-item" onClick={() => handleNavigate("/profile")}>PROFILE</div>
            <div className="menu-item" onClick={() => handleNavigate("/bookings")}>BOOKINGS</div>
            <div className="menu-item logout" onClick={handleLogout}>LOGOUT</div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
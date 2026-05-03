import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Services from "./navbar/services";
import About from "./navbar/about";
import Contact from "./navbar/contact";
import Catalog from "./navbar/catalog";
import Intro from "./components/Intro";
import MyBookings from "./pages/MyBookings";
import Profile from "./components/profile";

import "./css/style.css";
import "./css/intro.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("loggedIn") === "true"
  );
  const [showIntro, setShowIntro] = useState(true);

  // ── Dark mode — persisted in localStorage ──
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleDark = () => setIsDark((v) => !v);

  const handleLogin = () => {
    localStorage.setItem("loggedIn", "true");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    setIsLoggedIn(false);
  };

  const handleIntroFinish = () => setShowIntro(false);

  if (showIntro) {
    return <Intro onFinish={handleIntroFinish} />;
  }

  return (
    <BrowserRouter>
      {isLoggedIn && <Navbar onLogout={handleLogout} isDark={isDark} onToggleDark={toggleDark} />}

      <Routes>
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/services" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/services" /> : <Login onLogin={handleLogin} />}
        />
        <Route path="/services"   element={isLoggedIn ? <Services />   : <Navigate to="/" />} />
        <Route path="/dashboard"  element={isLoggedIn ? <Dashboard />  : <Navigate to="/" />} />
        <Route path="/about"      element={isLoggedIn ? <About />      : <Navigate to="/" />} />
        <Route path="/contact"    element={isLoggedIn ? <Contact />    : <Navigate to="/" />} />
        <Route path="/catalog"    element={isLoggedIn ? <Catalog />    : <Navigate to="/" />} />
        <Route path="/bookings"   element={isLoggedIn ? <MyBookings /> : <Navigate to="/" />} />
        <Route path="/profile"    element={isLoggedIn ? <Profile />    : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
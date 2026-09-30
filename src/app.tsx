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
import TutorDashboard from "./pages/TutorDashboard";

import "./css/style.css";
import "./css/intro.css";
import "./css/tutorDashboard.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("loggedIn") === "true"
  );

  const [showIntro, setShowIntro] = useState(true);

  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  const [isTutor, setIsTutor] = useState(() => {
    try {
      const raw = localStorage.getItem("tutofriends_user");

      if (!raw) return false;

      const user = JSON.parse(raw);

      return user?.role === "tutor";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );

    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleDark = () => {
    setIsDark((value) => !value);
  };

  const handleLogin = () => {
    localStorage.setItem("loggedIn", "true");

    let tutor = false;

    try {
      const raw = localStorage.getItem("tutofriends_user");

      if (raw) {
        const user = JSON.parse(raw);
        tutor = user?.role === "tutor";
      }
    } catch {
      tutor = false;
    }

    setIsTutor(tutor);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("tutofriends_user");

    setIsTutor(false);
    setIsLoggedIn(false);
  };

  const handleIntroFinish = () => {
    setShowIntro(false);
  };

  if (showIntro) {
    return <Intro onFinish={handleIntroFinish} />;
  }

  return (
    <BrowserRouter>
      {isLoggedIn && !isTutor && (
        <Navbar
          onLogout={handleLogout}
          isDark={isDark}
          onToggleDark={toggleDark}
        />
      )}

      <Routes>
        {/* LOGIN */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/services"} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/services"} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        {/* TUTOR DASHBOARD */}
        <Route
          path="/tutor-dashboard"
          element={
            isLoggedIn && isTutor ? (
              <TutorDashboard />
            ) : (
              <Navigate to={isLoggedIn ? "/services" : "/"} />
            )
          }
        />

        {/* STUDENT PAGES */}
        <Route
          path="/services"
          element={
            isLoggedIn && !isTutor ? (
              <Services />
            ) : (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/"} />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            isLoggedIn && !isTutor ? (
              <Dashboard />
            ) : (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/"} />
            )
          }
        />

        <Route
          path="/about"
          element={
            isLoggedIn && !isTutor ? (
              <About />
            ) : (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/"} />
            )
          }
        />

        <Route
          path="/contact"
          element={
            isLoggedIn && !isTutor ? (
              <Contact />
            ) : (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/"} />
            )
          }
        />

        <Route
          path="/catalog"
          element={
            isLoggedIn && !isTutor ? (
              <Catalog />
            ) : (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/"} />
            )
          }
        />

        <Route
          path="/bookings"
          element={
            isLoggedIn && !isTutor ? (
              <MyBookings />
            ) : (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/"} />
            )
          }
        />

        <Route
          path="/profile"
          element={
            isLoggedIn && !isTutor ? (
              <Profile />
            ) : (
              <Navigate to={isTutor ? "/tutor-dashboard" : "/"} />
            )
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={
                isLoggedIn
                  ? isTutor
                    ? "/tutor-dashboard"
                    : "/services"
                  : "/"
              }
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
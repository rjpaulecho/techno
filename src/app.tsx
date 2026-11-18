
// src/app.tsx
// TutoFriends role-based routes.
// Admin pages share AdminLayout.
// Tutor Wallet shares TutorDashboard.

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Navbar from "./components/Navbar";

import Dashboard from "./pages/dashboard";
import Login from "./pages/login";

import Services from "./navbar/services";
import About from "./navbar/about";
import Contact from "./navbar/contact";
import Catalog from "./navbar/catalog";

import MyBookings from "./pages/MyBookings";

import Profile from "./components/profile";
import StudentTransactions from "./pages/StudentTransactions";

import TutorDashboard from "./pages/TutorDashboard";

import AdminDashboard from "./pages/AdminDashboard";
import AdminPayments from "./pages/AdminPayments";
import AdminEarnings from "./pages/AdminEarnings";
import AdminTutors from "./pages/AdminTutors";
import AdminLayout from "./components/AdminLayout";
import AdminMessages from "./pages/AdminMessages";

import { userService } from "./data/userService";

import "./css/style.css";
import "./css/tutorDashboard.css";

// ==========================================
// USER TYPES
// ==========================================

type Role =
  | "student"
  | "tutor"
  | "admin"
  | null;

type SessionResponse = {
  success?: boolean;
  role?: string;

  user?: {
    role?: string;
  };

  data?: {
    role?: string;

    user?: {
      role?: string;
    };
  };
};

// ==========================================
// ROLE HELPERS
// ==========================================

function normalizeRole(value: unknown): Role {
  const role =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  return (
    role === "student" ||
    role === "tutor" ||
    role === "admin"
  )
    ? role
    : null;
}

function homeFor(role: Role) {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "tutor") {
    return "/tutor-dashboard";
  }

  if (role === "student") {
    return "/dashboard";
  }

  return "/login";
}

// ==========================================
// MAIN APP
// ==========================================

export default function App() {
  const [role, setRole] = useState<Role>(null);

  const [checking, setChecking] = useState(true);

  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  // ========================================
  // VERIFY SERVER SESSION
  // ========================================

  const refreshSession = useCallback(async () => {
    setChecking(true);

    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        setRole(null);
        return;
      }

      const data = (await response.json()) as SessionResponse;

      const nextRole = normalizeRole(
        data.user?.role ??
          data.data?.user?.role ??
          data.data?.role ??
          data.role
      );

      setRole(nextRole);

      // Restore display information.
      // The server remains authoritative.

      if (nextRole && nextRole !== "admin") {
        try {
          await userService.restore();
        } catch {
          // Display cache only.
        }
      }
    } catch (error) {
      console.error("Session verification failed:", error);
      setRole(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // ========================================
  // THEME
  // ========================================

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );

    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // ========================================
  // LOGOUT
  // ========================================

  function logout() {
    void (async () => {
      try {
        await userService.logout();

        setRole(null);

        window.location.replace("/login");
      } catch (error) {
        console.error("Logout failed:", error);
      }
    })();
  }

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (checking) {
    return (
      <div
        role="status"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Checking TutoFriends session…
      </div>
    );
  }

  // ========================================
  // ROLE DESTINATION
  // ========================================

  const redirect = (
    <Navigate to={homeFor(role)} replace />
  );

  // ========================================
  // ROUTES
  // ========================================

  return (
    <BrowserRouter>
      {/* STUDENT NAVBAR */}

      {role === "student" && (
        <Navbar
          onLogout={logout}
          isDark={isDark}
          onToggleDark={() =>
            setIsDark((old) => !old)
          }
        />
      )}

      <Routes>
        {/* HOME - DEFAULT STUDENT PAGE */}

        <Route
          path="/"
          element={redirect}
        />

        {/* LOGIN */}

        <Route
          path="/login"
          element={
            role
              ? redirect
              : (
                <Login
                  onLogin={() => void refreshSession()}
                />
              )
          }
        />

        {/* ==================================
            ADMINISTRATOR
            SHARED SIDEBAR
        ================================== */}

        <Route
          path="/admin"
          element={
            role === "admin"
              ? <AdminLayout />
              : redirect
          }
        >
          <Route
            index
            element={
              <Navigate to="dashboard" replace />
            }
          />

          <Route
            path="dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="payments"
            element={<AdminPayments />}
          />

          <Route
            path="earnings"
            element={<AdminEarnings />}
          />

          <Route
            path="tutors"
            element={<AdminTutors />}
          />

                  <Route
          path="messages"
          element={<AdminMessages />}
        />

        </Route>
        {/* ==================================
            TUTOR
            PERMANENT SIDEBAR
        ================================== */}

        <Route
          path="/tutor-dashboard"
          element={
            role === "tutor"
              ? <TutorDashboard />
              : redirect
          }
        />

        <Route
          path="/tutor/wallet"
          element={
            role === "tutor"
              ? <TutorDashboard />
              : redirect
          }
        />

        <Route
          path="/tutor/transactions"
          element={
            role === "tutor"
              ? <TutorDashboard />
              : redirect
          }
        />

        {/* ==================================
            STUDENT
        ================================== */}

        {/* HOME */}

        <Route
          path="/dashboard"
          element={
            role === "student"
              ? <Dashboard />
              : redirect
          }
        />

        {/* SERVICES */}

        <Route
          path="/services"
          element={
            role === "student"
              ? <Services />
              : redirect
          }
        />

        {/* ABOUT */}

        <Route
          path="/about"
          element={
            role === "student"
              ? <About />
              : redirect
          }
        />

        {/* CONTACT */}

        <Route
          path="/contact"
          element={
            role === "student"
              ? <Contact />
              : redirect
          }
        />

        {/* CATALOG */}

        <Route
          path="/catalog"
          element={
            role === "student"
              ? <Catalog />
              : redirect
          }
        />

        {/* BOOKINGS */}

        <Route
          path="/bookings"
          element={
            role === "student"
              ? <MyBookings />
              : redirect
          }
        />

        {/* TRANSACTIONS */}

        <Route
          path="/transactions"
          element={
            role === "student"
              ? <StudentTransactions />
              : redirect
          }
        />

        {/* PROFILE */}

        <Route
          path="/profile"
          element={
            role === "student"
              ? <Profile />
              : redirect
          }
        />

        {/* UNKNOWN ROUTE */}

        <Route
          path="*"
          element={redirect}
        />
      </Routes>
    </BrowserRouter>
  );
}

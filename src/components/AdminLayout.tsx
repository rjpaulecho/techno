
 // src/components/AdminLayout.tsx
// One permanent sidebar for all administrator pages.

import { useState } from "react";

import {
  NavLink,
  Outlet,
} from "react-router-dom";

import { userService } from "../data/userService";

import "../css/adminDashboard.css";
import "../css/adminEmbedded.css";

export default function AdminLayout() {
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  // ========================================
  // LOGOUT
  // ========================================

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await userService.logout();
      window.location.replace("/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Logout failed."
      );

      setLoggingOut(false);
    }
  }

  // ========================================
  // ACTIVE MENU STYLE
  // ========================================

  const navClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    `ad-nav-link${isActive ? " active" : ""}`;

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="ad-layout tf-admin-shell">
      {/* SIDEBAR */}

      <aside
        className="ad-sidebar"
        aria-label="Administrator navigation"
      >
        {/* BRAND */}

        <div className="ad-brand">
          <div
            className="ad-brand-icon"
            aria-hidden="true"
          >
            TF
          </div>

          <div>
            <strong>TutoFriends</strong>
            <span>Administration</span>
          </div>
        </div>

        {/* MENU LABEL */}

        <div className="ad-menu-label">
          MAIN MENU
        </div>

        {/* NAVIGATION */}

        <nav
          className="ad-navigation"
          aria-label="Admin sections"
        >
          {/* DASHBOARD */}

          <NavLink
            to="/admin/dashboard"
            end
            className={navClass}
          >
            <span aria-hidden="true">▦</span>
            Dashboard
          </NavLink>


          <NavLink
            to="/admin/messages"
            end
            className={navClass}
          >
            <span aria-hidden="true">✉</span>
            Messages
          </NavLink>

          {/* TUTOR MANAGEMENT */}

          <NavLink
            to="/admin/tutors"
            end
            className={navClass}
          >
            <span aria-hidden="true">♙</span>
            Tutor Management
          </NavLink>


          <NavLink
            to="/admin/featured-tutors"
            end
            className={navClass}
          >
            <span aria-hidden="true">✦</span>
            Featured Tutors
          </NavLink>

          {/* PAYMENT VERIFICATION */}

          <NavLink
            to="/admin/payments"
            end
            className={navClass}
          >
            <span aria-hidden="true">▤</span>
            Payment Verification
          </NavLink>

          {/* PLATFORM EARNINGS */}

          <NavLink
            to="/admin/earnings"
            end
            className={navClass}
          >
            <span aria-hidden="true">₱</span>
            Platform Earnings
          </NavLink>
        </nav>

        {/* ADMIN PROFILE AND LOGOUT */}

        <div className="ad-sidebar-bottom">
          <div className="ad-admin-profile">
            <div
              className="ad-admin-avatar"
              aria-hidden="true"
            >
              A
            </div>

            <div>
              <strong>Administrator</strong>
              <span>Admin Account</span>
            </div>
          </div>

          <button
            type="button"
            className="ad-logout"
            disabled={loggingOut}
            onClick={() => void logout()}
          >
            {loggingOut
              ? "Logging out…"
              : "Log Out"}
          </button>

          {logoutError && (
            <p
              role="alert"
              className="tf-admin-logout-error"
            >
              {logoutError}
            </p>
          )}
        </div>
      </aside>

      {/* PAGE CONTENT */}

      <main
        className="ad-main tf-admin-content"
        id="admin-main-content"
      >
        <Outlet />
      </main>
    </div>
  );
}

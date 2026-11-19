// src/pages/login.tsx

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { userService } from "../data/userService";
import "../css/login.css";

// ==========================================
// TYPES
// ==========================================

type Props = {
  onLogin: () => void;
};

type DevAccount =
  | "student"
  | "ralph"
  | "admin";

type DevStatus = {
  success?: boolean;
  enabled?: boolean;
  adminEnabled?: boolean;
};

type DevLoginResult = {
  success?: boolean;
  message?: string;
};

// ==========================================
// LOGIN COMPONENT
// ==========================================

export default function Login({ onLogin }: Props) {
  // ========================================
  // NORMAL LOGIN STATES
  // ========================================

  const [isLogin, setIsLogin] =
    useState(true);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [name, setName] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  // ========================================
  // DEVELOPMENT LOGIN STATES
  // ========================================

  const [devEnabled, setDevEnabled] =
    useState(false);

  const [
    devAdminEnabled,
    setDevAdminEnabled,
  ] = useState(false);

  const [devBusy, setDevBusy] =
    useState<DevAccount | null>(null);

  // ========================================
  // CHECK DEVELOPMENT LOGIN STATUS
  // ========================================

  useEffect(() => {
    const controller =
      new AbortController();

    async function checkDevMode() {
      try {
        const response = await fetch(
          "/api/dev-login/enabled",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          return;
        }

        const result =
          (await response.json()) as DevStatus;

        if (controller.signal.aborted) {
          return;
        }

        setDevEnabled(
          result.enabled === true
        );

        setDevAdminEnabled(
          result.enabled === true &&
          result.adminEnabled === true
        );
      } catch {
        // Development buttons stay hidden
        // if the development API is unavailable.
      }
    }

    void checkDevMode();

    return () => controller.abort();
  }, []);

  // ========================================
  // NORMAL LOGIN / REGISTRATION
  // ========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy || devBusy) {
      return;
    }

    setError("");

    if (
      !email.trim() ||
      !password ||
      (!isLogin && !name.trim())
    ) {
      setError("Please fill in all fields.");
      return;
    }

    setBusy(true);

    try {
      if (isLogin) {
        await userService.login(
          email.trim(),
          password
        );

        // app.tsx restores the server session
        // and redirects according to role.
        onLogin();
      } else {
        if (password.length < 8) {
          throw new Error(
            "Password must be at least 8 characters."
          );
        }

        await userService.register(
          name.trim(),
          email.trim(),
          password
        );

        setIsLogin(true);
        setName("");
        setPassword("");

        window.alert(
          "Account created successfully. Please log in."
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // INSTANT TEST ACCOUNT LOGIN
  // ========================================

  async function quickLogin(
    account: DevAccount
  ) {
    if (
      !devEnabled ||
      busy ||
      devBusy ||
      (account === "admin" &&
        !devAdminEnabled)
    ) {
      return;
    }

    setDevBusy(account);
    setError("");

    try {
      const response = await fetch(
        "/api/dev-login",
        {
          method: "POST",
          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            account,
          }),
        }
      );

      const result =
        (await response.json()) as DevLoginResult;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Instant login failed."
        );
      }

      // Force app.tsx to check the new
      // authenticated cookie on /api/auth/me.
      // Role is verified by the server.

      window.location.replace("/");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Instant login failed."
      );

      setDevBusy(null);
    }
  }

  // ========================================
  // LOGIN / REGISTER SWITCH
  // ========================================

  function switchMode() {
    if (busy || devBusy) return;

    setIsLogin((current) => !current);
    setPassword("");
    setShowPassword(false);
    setError("");
  }

  const disabled =
    busy || devBusy !== null;

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="login-container cinematic-fade-in">
      <div className="login-glow" />

      {/* TITLE */}

      <h1 className="login-title">
        {isLogin ? (
          <>
            <span className="small-text">
              welcome to
            </span>

            <span className="brand-name">
              TutoFriends
            </span>
          </>
        ) : (
          <span className="create-account">
            Create Account
          </span>
        )}
      </h1>

      {/* LOGIN FORM */}

      <form
        className="login-form glass-card"
        onSubmit={(event) =>
          void handleSubmit(event)
        }
      >
        <p className="login-info">
          {isLogin
            ? "Welcome back. Continue your journey."
            : "Create your account to get started."}
        </p>

        {/* GOOGLE AND FACEBOOK BUTTONS */}

        <div className="social-buttons">
          <button
            type="button"
            className="social-btn social-btn--google"
            onClick={() =>
              setError(
                "Google login is not configured yet."
              )
            }
          >
            <svg
              className="social-icon"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />

              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />

              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />

              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>

            Continue with Google
          </button>

          <button
            type="button"
            className="social-btn social-btn--facebook"
            onClick={() =>
              setError(
                "Facebook login is not configured yet."
              )
            }
          >
            <svg
              className="social-icon"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#fff"
                d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
              />
            </svg>

            Continue with Facebook
          </button>
        </div>

        <div className="divider">
          <span className="divider-line" />
          <span className="divider-text">
            or
          </span>
          <span className="divider-line" />
        </div>

        {/* REGISTRATION NAME */}

        {!isLogin && (
          <input
            type="text"
            className="login-input"
            placeholder="Full Name"
            value={name}
            disabled={disabled}
            required
            onChange={(event) =>
              setName(event.target.value)
            }
          />
        )}

        {/* EMAIL OR USERNAME */}

        <input
          type={isLogin ? "text" : "email"}
          className="login-input"
          placeholder={
            isLogin
              ? "Email or Username"
              : "Email"
          }
          value={email}
          disabled={disabled}
          required
          autoComplete={
            isLogin
              ? "username"
              : "email"
          }
          onChange={(event) =>
            setEmail(event.target.value)
          }
        />

        {/* PASSWORD */}

        <div className="password-wrapper">
          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            className="login-input password-input"
            placeholder="Password"
            value={password}
            disabled={disabled}
            required
            autoComplete={
              isLogin
                ? "current-password"
                : "new-password"
            }
            onChange={(event) =>
              setPassword(event.target.value)
            }
          />

          <button
            type="button"
            className="eye-btn"
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            onClick={() =>
              setShowPassword(
                (current) => !current
              )
            }
          >
            {showPassword ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            ⚠ {error}
          </p>
        )}

        {/* NORMAL SUBMIT */}

        <button
          type="submit"
          className="login-button"
          disabled={disabled}
        >
          {busy
            ? "Please wait..."
            : isLogin
              ? "Login"
              : "Create Account"}
        </button>

        {/* REGISTER LINK */}

        <button
          type="button"
          className="register-button"
          disabled={disabled}
          onClick={switchMode}
        >
          {isLogin
            ? "Don't have an account? Register"
            : "Back to Login"}
        </button>

        {/* ==================================
            DEVELOPMENT INSTANT LOGIN
        ================================== */}

        {devEnabled && isLogin && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop:
                "1px solid rgba(255,255,255,0.15)",
              display: "grid",
              gap: 9,
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                color: "#fbbf24",
              }}
            >
              DEVELOPMENT TEST ACCOUNTS
            </div>

            {/* TEST STUDENT */}

            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                void quickLogin("student")
              }
              style={{
                padding: 12,
                border: "none",
                borderRadius: 9,
                background: "#2563eb",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {devBusy === "student"
                ? "Signing in..."
                : "Login as Test Student"}
            </button>

            {/* RALPH */}

            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                void quickLogin("ralph")
              }
              style={{
                padding: 12,
                border: "none",
                borderRadius: 9,
                background: "#059669",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {devBusy === "ralph"
                ? "Signing in..."
                : "Login as Ralph (Tutor)"}
            </button>

            {/* ADMIN */}

            {devAdminEnabled && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  void quickLogin("admin")
                }
                style={{
                  padding: 12,
                  border: "none",
                  borderRadius: 9,
                  background: "#7c3aed",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {devBusy === "admin"
                  ? "Signing in..."
                  : "Login as Admin"}
              </button>
            )}


          </div>
        )}
      </form>
    </div>
  );
}
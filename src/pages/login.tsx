import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "../data/userService";
import "../css/login.css";

type Props = {
  onLogin: () => void;
};

// ─────────────────────────────────────────────
// ✏️  PASSWORD RULES
// ─────────────────────────────────────────────
const MIN_PASSWORD_LENGTH = 6;   // ← change this to require a longer password

const Login = ({ onLogin }: Props) => {
  const navigate = useNavigate();

  const [isLogin, setIsLogin]           = useState(true);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [name, setName]                 = useState("");
  const [error, setError]               = useState("");
  const [showPassword, setShowPassword] = useState(false);  // 👁 eye toggle

  // ── form submit ──────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (isLogin) {
      if (!userService.login(email, password)) {
        setError("Incorrect email or password.");
        return;
      }
      onLogin();
      navigate("/");
    } else {
      userService.register(name.trim(), email.trim(), password);
      setError("");
      alert("Account created! You can now log in.");
      setIsLogin(true);
      setName("");
      setEmail("");
      setPassword("");
    }
  };

  // ── social login placeholders ─────────────────
  // ✏️  Replace alert() with your real OAuth / Firebase calls
  const handleGoogleLogin   = () => alert("Google login — wire up your OAuth provider here.");
  const handleFacebookLogin = () => alert("Facebook login — wire up your OAuth provider here.");

  // ── switch between login / register ──────────
  const switchMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setPassword("");
    setShowPassword(false);
  };

  // ── live password hint state ──────────────────
  const pwTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  return (
    <div className="login-container cinematic-fade-in">
      <div className="login-glow" />

      {/* ── Page heading ── */}
      <h1 className="login-title">
        {isLogin ? (
          <>
            <span className="small-text">welcome to</span>
            <span className="brand-name">TutoFriends</span>
          </>
        ) : (
          <span className="create-account">Create Account</span>
        )}
      </h1>

      <form onSubmit={handleSubmit} className="login-form glass-card">

        <p className="login-info">
          {isLogin ? "Welcome back. Continue your journey." : "Create your account to begin."}
        </p>

        {/* ══ SOCIAL BUTTONS ══════════════════════════ */}
        <div className="social-buttons">

          {/* Google */}
          <button type="button" className="social-btn social-btn--google" onClick={handleGoogleLogin}>
            <svg className="social-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          {/* Facebook */}
          <button type="button" className="social-btn social-btn--facebook" onClick={handleFacebookLogin}>
            <svg className="social-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#fff" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>

        </div>

        {/* ── Divider ── */}
        <div className="divider">
          <span className="divider-line" />
          <span className="divider-text">or</span>
          <span className="divider-line" />
        </div>

        {/* ══ EMAIL FIELDS ═════════════════════════════ */}

        {/* Name — register only */}
        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name"
            className="login-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* ── Password + eye toggle ── */}
        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="login-input password-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              /* Eye-slash (password visible) */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              /* Eye (password hidden) */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {/* ── Live password length hint ── */}
        <p className={`password-hint ${pwTooShort ? "password-hint--warn" : ""}`}>
          {pwTooShort
            ? `⚠ ${MIN_PASSWORD_LENGTH - password.length} more character${MIN_PASSWORD_LENGTH - password.length > 1 ? "s" : ""} needed`
            : `Minimum ${MIN_PASSWORD_LENGTH} characters`}
        </p>

        {/* ── Form-level error ── */}
        {error && <p className="form-error">⚠ {error}</p>}

        {/* ── Submit ── */}
        <button type="submit" className="login-button">
          {isLogin ? "Login" : "Create Account"}
        </button>

        {/* ── Switch mode ── */}
        <button type="button" className="register-button" onClick={switchMode}>
          {isLogin ? "Don't have an account? Register" : "Back to Login"}
        </button>

      </form>
    </div>
  );
};

export default Login;
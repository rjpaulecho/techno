import { useState } from "react";
import "../css/style.css";
import { useNavigate } from "react-router-dom";

type Props = {
  onLogin: () => void;
};

const Login = ({ onLogin }: Props) => {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || (!isLogin && !name)) {
      alert("Please fill in all fields");
      return;
    }

    if (isLogin) {
      onLogin();
      navigate("/");
    } else {
      alert("Account created (mock) — switch to login now!");
      setIsLogin(true);
    }
  };

  return (
    <div className="login-container cinematic-fade-in">
      {/* soft glow background */}
      <div className="login-glow" />

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
        <h2>{isLogin ? "Login" : "Register"}</h2>

        <p className="login-info">
          {isLogin
            ? "Welcome back. Continue your journey."
            : "Create your account to begin."}
        </p>

        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name"
            className="login-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="login-button">
          {isLogin ? "Login" : "Create Account"}
        </button>

        <button
          type="button"
          className="register-button"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Don't have an account? Register"
            : "Back to Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
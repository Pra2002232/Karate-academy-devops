import { useState } from "react";
import "./AdminLoginLayout.css";
import academyLogo from "../assets/nextgen-academy-logo.jpg";
import academyWordmark from "../assets/nextgen-academy-wordmark.png";
import karateHero from "../assets/karate-login-hero.jpg";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {hidden ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A11.5 11.5 0 0 1 12 5c5.2 0 8.7 4.4 10 7-0.5 1-1.4 2.1-2.6 3.2" />
          <path d="M6.2 6.2C3.9 7.5 2.5 9.7 2 12c1.3 2.6 4.8 7 10 7 1.3 0 2.5-.3 3.5-.8" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ValueItem({ number, children }) {
  return (
    <li className="ng-value-item">
      <span className="ng-value-number">{number}</span>
      <span>{children}</span>
    </li>
  );
}

function FeatureIcon({ type }) {
  const paths = {
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1Z" /><path d="M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1h-3" /></>,
    trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 12v5m-4 3h8m-7-3h6" /></>,
    heart: <><path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z" /><path d="M6.5 12h3l1.5-3 2.2 6 1.5-3h2.8" /></>,
    nation: <><path d="m12 2 2.3 5 5.5.8-4 3.9.9 5.5-4.7-2.6-4.7 2.6.9-5.5-4-3.9 5.5-.8Z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

/**
 * Presentation-only admin login layout.
 * Keep your existing authentication/API logic in the parent component and
 * pass it through onLogin. onLogin receives { username, password, rememberMe }.
 */
export default function AdminLoginLayout({
  onLogin,
  onForgotPassword,
  loading = false,
  error = "",
  initialUsername = "",
}) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");

    if (!username.trim() || !password) {
      setLocalError("Please enter your username and password.");
      return;
    }

    if (typeof onLogin !== "function") {
      setLocalError("Connect this form to your existing login handler before using it.");
      return;
    }

    await onLogin({
      username: username.trim(),
      password,
      rememberMe,
    });
  }

  function handleForgotPassword(event) {
    event.preventDefault();
    if (typeof onForgotPassword === "function") onForgotPassword(username.trim());
  }

  return (
    <main className="ng-login-page">
      <section className="ng-hero-panel" aria-label="NextGen Combat and Fitness Academy">
        <div className="ng-hero-glow" />
        <div className="ng-hero-brand">
          <img className="ng-hero-logo" src={academyLogo} alt="NextGen Combat and Fitness Academy logo" />
          <img
            className="ng-hero-wordmark"
            src={academyWordmark}
            alt="NextGen Combat and Fitness Academy — a member of United Shotokan Karate Association India"
          />
        </div>

        <div className="ng-hero-content">
          <div className="ng-hero-art-wrap">
            <img className="ng-hero-art" src={karateHero} alt="Karate practitioner in a training stance" />
          </div>
          <div className="ng-hero-message">
            <p className="ng-hero-kicker">TRAIN WITH PURPOSE</p>
            <h1>
              Stronger<br />
              Mind.<br />
              Stronger<br />
              <span>Tomorrow.</span>
            </h1>
            <ol className="ng-values-list">
              <ValueItem number="01">RESPECT</ValueItem>
              <ValueItem number="02">EFFORT</ValueItem>
              <ValueItem number="03">PATIENCE</ValueItem>
              <ValueItem number="04">SELF IMPROVEMENT</ValueItem>
            </ol>
          </div>
        </div>

        <div className="ng-hero-features">
          <div className="ng-feature"><FeatureIcon type="people" /><span>BUILD<br />BETTER PEOPLE</span></div>
          <div className="ng-feature"><FeatureIcon type="trophy" /><span>CREATE<br />CHAMPIONS</span></div>
          <div className="ng-feature"><FeatureIcon type="heart" /><span>HEALTHY<br />COMMUNITIES</span></div>
          <div className="ng-feature"><FeatureIcon type="nation" /><span>STRONGER<br />NATION</span></div>
        </div>
      </section>

      <section className="ng-login-panel" aria-label="Administrator login">
        <div className="ng-login-card">
          <div className="ng-card-brand">
            <img className="ng-card-logo" src={academyLogo} alt="NextGen academy crest" />
            <div className="ng-card-academy-name">NEXT<span>GEN</span></div>
            <div className="ng-card-academy-subtitle">COMBAT &amp; FITNESS ACADEMY</div>
            <div className="ng-card-affiliation">MEMBER OF UNITED SHOTOKAN KARATE ASSOCIATION INDIA</div>
          </div>

          <div className="ng-admin-label"><span />ADMIN LOGIN<span /></div>
          <h2>Welcome Back</h2>
          <p className="ng-login-intro">Sign in to manage your academy,<br className="ng-desktop-break" /> students and training activities.</p>

          <form className="ng-login-form" onSubmit={handleSubmit} noValidate>
            <label className="ng-field-label" htmlFor="ng-username">Username</label>
            <div className="ng-input-wrap">
              <span className="ng-input-icon ng-user-icon"><UserIcon /></span>
              <input
                id="ng-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>

            <label className="ng-field-label" htmlFor="ng-password">Password</label>
            <div className="ng-input-wrap">
              <span className="ng-input-icon ng-lock-icon"><LockIcon /></span>
              <input
                id="ng-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="ng-password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>

            <div className="ng-form-options">
              <label className="ng-remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span className="ng-custom-checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#forgot-password" onClick={handleForgotPassword} className="ng-forgot-link">Forgot password?</a>
            </div>

            {(localError || error) && (
              <div className="ng-login-error" role="alert">{localError || error}</div>
            )}

            <button className="ng-signin-button" type="submit" disabled={loading}>
              <span>{loading ? "Signing in..." : "Sign In"}</span>
              {!loading && <span className="ng-signin-arrow" aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="ng-secure-access">
            <span className="ng-secure-divider" />
            <div><ShieldIcon /><span>SECURE ADMIN ACCESS</span></div>
          </div>
          <footer className="ng-login-footer">TRADITION&nbsp; | &nbsp;CHARACTER&nbsp; | &nbsp;EXCELLENCE<br /><span>© {new Date().getFullYear()} NextGen Combat &amp; Fitness Academy</span></footer>
        </div>
      </section>
    </main>
  );
}

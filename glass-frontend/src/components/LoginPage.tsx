import { ArrowLeft, ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

interface LoginPageProps {
  onBack: () => void;
  onLogin: () => void;
}

function LoginPage({ onBack, onLogin }: LoginPageProps) {
  return (
    <main className="glass-app login-shell">
      <div className="glass-background" />

      <header className="glass-header">
        <button type="button" className="glass-logo glass-logo-button" onClick={onBack} aria-label="Back to map">
          G.<span className="logo-l">L</span>.A.S.S
        </button>

        <nav className="glass-navigation" aria-label="Main navigation">
          <button type="button" className="nav-button nav-active">
            <ShieldCheck size={16} />
            Login
          </button>
          <button type="button" className="nav-button">
            <Leaf size={16} />
            City map
          </button>
          <button type="button" className="nav-button">
            <Mail size={16} />
            Updates
          </button>
        </nav>

        <div className="header-controls">
          <div className="language-selector" aria-label="Language selector">
            <select defaultValue="EN">
              <option value="EN">EN</option>
              <option value="DE">DE</option>
            </select>
            <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true">
              <path
                d="M5 7.5L10 12.5L15 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <button type="button" className="profile-button" aria-label="Profile settings" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
        </div>
      </header>

      <div className="login-layout">
        <section className="login-intro" aria-label="Login intro">
          <div className="login-eyebrow">Community recycling dashboard</div>
          <h1>Track live glass collection status across the city.</h1>
          <p>
            Sign in to access recycling insights, monitor fill rates, and find the
            nearest collection point in minutes.
          </p>

          <div className="login-metrics">
            <div className="metric-card">
              <strong>214</strong>
              <span>live bins</span>
            </div>
            <div className="metric-card">
              <strong>+18%</strong>
              <span>this week</span>
            </div>
            <div className="metric-card">
              <strong>4.9/5</strong>
              <span>citizen score</span>
            </div>
          </div>
        </section>

        <section className="login-card" aria-label="Login form">
          <div className="login-card-header">
            <span className="login-pill">Secure sign in</span>
            <h2>Welcome back</h2>
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              onLogin();
            }}
          >
            <label className="input-group">
              <span>Email address</span>
              <div className="input-shell">
                <Mail size={16} />
                <input type="email" placeholder="name@example.com" defaultValue="hello@glass.local" />
              </div>
            </label>

            <label className="input-group">
              <span>Password</span>
              <div className="input-shell">
                <LockKeyhole size={16} />
                <input type="password" placeholder="Enter password" defaultValue="glass-demo" />
                <button type="button" className="password-toggle" aria-label="Toggle password visibility">
                  <EyeOff size={15} />
                  <Eye size={15} className="password-toggle-hidden" />
                </button>
              </div>
            </label>

            <div className="login-row">
              <label className="remember-me">
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>

              <button type="button" className="text-button">
                Forgot password?
              </button>
            </div>

            <button type="submit" className="login-submit">
              Sign in
              <ArrowRight size={16} />
            </button>

            <div className="divider">
              <span>or continue with</span>
            </div>

            <div className="social-row">
              <button type="button" className="social-button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.95h5.39a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.88-1.73 2.98-4.28 2.98-7.38Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.22-2.5c-.9.6-2.06.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H.78v2.61A10 10 0 0 0 12 22Z"
                    fill="#34A853"
                  />
                  <path
                    d="M6.39 19.9c-.39-.76-.6-1.58-.6-2.5V14.8H2.2a9.97 9.97 0 0 1 0-8.8L5.8 8.8A6.14 6.14 0 0 0 6.39 12c0 .92.21 1.8.6 2.5v5.4Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 3.98c1.47 0 2.8.5 3.84 1.48l2.87-2.87C16.96.9 14.7 0 12 0A10 10 0 0 0 2.2 6.02l3.59 2.8A6.12 6.12 0 0 1 12 3.98Z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>

              <button type="button" className="social-button demo-button">
                <Leaf size={15} />
                Demo
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;

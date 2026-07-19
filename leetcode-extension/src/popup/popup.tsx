import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Zap, BarChart3, ExternalLink, Settings, RefreshCw,
  Mail, Lock, Eye, EyeOff, LogOut, User, AlertCircle, Loader
} from "lucide-react";
import type { Stats } from "../services/analytics";
import { computeStats } from "../services/analytics";
import { getDueRevisions } from "../services/revision";
import { authApi } from "../services/api-client";
import { getToken, getStoredUser, setToken, setStoredUser, logout } from "../services/storage-adapter";
import type { StoredUser } from "../services/storage-adapter";
import "../index.css";

// ─── Mini Login Form ──────────────────────────────────────────
function MiniAuth({ onSuccess }: { onSuccess: (u: StoredUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await authApi.login(email, password)
          : await authApi.signup(email, password);
      await setToken(result.token);
      await setStoredUser(result.user);
      onSuccess(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: 340, padding: "1.25rem", background: "var(--bg-base)", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
        <Zap size={20} color="var(--accent)" fill="var(--accent)" />
        <span className="gradient-text" style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
          LeetSync
        </span>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", padding: 3, marginBottom: "1rem", border: "1px solid var(--border)" }}>
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            style={{
              flex: 1, padding: "0.35rem", borderRadius: 6, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 12,
              background: mode === m ? "var(--accent)" : "transparent",
              color: mode === m ? "#000" : "var(--text-muted)",
              transition: "all 0.15s",
            }}
          >
            {m === "login" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <MiniInput icon={<Mail size={13} />} type="email" placeholder="Email" value={email} onChange={setEmail} />
        <MiniInput
          icon={<Lock size={13} />}
          type={showPw ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={setPassword}
          suffix={
            <button type="button" onClick={() => setShowPw(s => !s)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
              {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          }
        />

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--hard)", background: "rgba(239,68,68,.08)", borderRadius: 6, padding: "0.4rem 0.6rem", border: "1px solid rgba(239,68,68,.2)" }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width: "100%", justifyContent: "center", fontSize: 13, padding: "0.5rem", marginTop: 2 }}>
          {loading
            ? <><Loader size={13} style={{ animation: "spin 0.8s linear infinite" }} /> {mode === "login" ? "Signing in…" : "Creating…"}</>
            : mode === "login" ? "Sign In" : "Create Account"
          }
        </button>
      </form>

      <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 10, marginTop: "0.75rem" }}>
        One account for extension + dashboard
      </p>
    </div>
  );
}

function MiniInput({ icon, type, placeholder, value, onChange, suffix }: {
  icon: React.ReactNode; type: string; placeholder: string; value: string;
  onChange: (v: string) => void; suffix?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0 0.65rem" }}>
      <span style={{ color: "var(--text-muted)", display: "flex" }}>{icon}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required
        style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 12, padding: "0.5rem 0", fontFamily: "inherit" }} />
      {suffix}
    </div>
  );
}

// ─── Authenticated Popup ──────────────────────────────────────
function AuthenticatedPopup({ user, onLogout }: { user: StoredUser; onLogout: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    computeStats().then(setStats);
    getDueRevisions().then((r) => setDueCount(r.length));
  }, []);

  function openDashboard() {
    chrome.tabs.create({ url: "https://leetcode-extension.vercel.app" });
  }

  return (
    <div style={{ width: 360, minHeight: 420, background: "var(--bg-base)", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Zap size={18} color="var(--accent)" fill="var(--accent)" />
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>LeetSync</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.username || user.email.split("@")[0]}</span>
          <button onClick={openDashboard} className="btn btn-ghost" style={{ padding: "0.3rem 0.55rem", fontSize: 11 }}>
            <BarChart3 size={12} /> Dashboard
          </button>
          <button onClick={onLogout} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {stats ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.5rem" }}>
              {[
                { label: "Total", value: stats.totalSolved, color: "var(--accent)" },
                { label: "Easy",  value: stats.easy,        color: "var(--easy)" },
                { label: "Med",   value: stats.medium,      color: "var(--medium)" },
                { label: "Hard",  value: stats.hard,        color: "var(--hard)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem", textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Streak */}
            <div style={{ background: "var(--accent-glow)", border: "1px solid rgba(245,158,11,.2)", borderRadius: "var(--radius-sm)", padding: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Current Streak</div>
                <div style={{ fontWeight: 800, fontSize: 22, color: "var(--accent)" }}>
                  {stats.currentStreak} <span style={{ fontSize: 14 }}>days 🔥</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Longest</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{stats.longestStreak}</div>
              </div>
            </div>

            {/* Revisions due */}
            {dueCount > 0 && (
              <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: "var(--radius-sm)", padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={13} color="var(--hard)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--hard)" }}>
                    {dueCount} revision{dueCount !== 1 ? "s" : ""} due
                  </span>
                </div>
                <button onClick={openDashboard} className="btn" style={{ fontSize: 11, padding: "0.25rem 0.6rem", background: "rgba(239,68,68,.15)", color: "var(--hard)", border: "1px solid rgba(239,68,68,.3)" }}>
                  Review →
                </button>
              </div>
            )}

            {/* Recent */}
            {stats.recentProblems.length > 0 && (
              <div>
                <div className="section-label" style={{ marginBottom: 6 }}>Recent</div>
                {stats.recentProblems.slice(0, 3).map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, flex: 1 }}>{p.title}</span>
                    <span className={`badge badge-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading stats…</div>
        )}

        <button onClick={openDashboard} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}>
          <BarChart3 size={13} /> Open Full Dashboard <ExternalLink size={11} style={{ marginLeft: "auto" }} />
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────
function Popup() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    (async () => {
      const [token, storedUser] = await Promise.all([getToken(), getStoredUser()]);
      if (token && storedUser) setUser(storedUser);
      setAuthChecked(true);
    })();
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (!authChecked) {
    return (
      <div style={{ width: 340, height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <Zap size={24} color="var(--accent)" />
      </div>
    );
  }

  if (!user) return <MiniAuth onSuccess={(u) => setUser(u)} />;
  return <AuthenticatedPopup user={user} onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, BarChart3,
  Calendar, Settings, Zap,
  RefreshCw, LogOut, User
} from "lucide-react";
import type { Stats } from "../services/analytics";
import { computeStats, formatMs } from "../services/analytics";
import { getDueRevisions } from "../services/revision";
import HeatmapView from "./HeatmapView";
import DifficultyChart from "./DifficultyChart";
import TopicChart from "./TopicChart";
import JournalView from "./JournalView";
import RevisionView from "./RevisionView";
import SettingsView from "./SettingsView";
import AuthPage from "./AuthPage";
import { getToken, getStoredUser, logout } from "../services/storage-adapter";
import type { StoredUser } from "../services/storage-adapter";



type Tab =
  | "overview"
  | "journal"
  | "revision"
  | "topics"
  | "heatmap"
  | "settings";

const NAV = [
  { id: "overview",  label: "Overview",   icon: LayoutDashboard },
  { id: "journal",   label: "Journal",    icon: BookOpen },
  { id: "revision",  label: "Revisions",  icon: RefreshCw },
  { id: "topics",    label: "Topics",     icon: BarChart3 },
  { id: "heatmap",   label: "Heatmap",    icon: Calendar },
  { id: "settings",  label: "Settings",   icon: Settings },
] as const;

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    (async () => {
      const [token, storedUser] = await Promise.all([getToken(), getStoredUser()]);
      if (token && storedUser) setUser(storedUser);
      setAuthChecked(true);
    })();
  }, []);

  // Load stats once authenticated
  useEffect(() => {
    if (!user) return;
    computeStats().then(setStats);
    getDueRevisions().then((r) => setDueCount(r.length));
  }, [user]);

  async function handleLogout() {
    await logout();
    setUser(null);
    setStats(null);
    setDueCount(0);
  }

  // ── Auth gate ──────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
          <Zap size={32} color="var(--accent)" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={(u) => setUser(u)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        style={{
          width: 200,
          minWidth: 200,
          background: "var(--bg-card)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "1rem 0.75rem",
          gap: 4,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "0.5rem 0.75rem 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: 2,
            }}
          >
            <Zap size={20} color="var(--accent)" fill="var(--accent)" />
            <span
              className="gradient-text"
              style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}
            >
              LeetSync
            </span>
          </div>
          <span className="section-label">v1.0</span>
        </div>

        {/* Nav Items */}
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`nav-item ${tab === id ? "active" : ""}`}
            style={{ width: "100%", background: "none" }}
          >
            <Icon size={16} />
            {label}
            {id === "revision" && dueCount > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: "var(--hard)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 99,
                }}
              >
                {dueCount}
              </span>
            )}
          </button>
        ))}

        {/* Bottom streak */}
        {stats && (
          <div
            style={{
              marginTop: "auto",
              background: "var(--accent-glow)",
              border: "1px solid rgba(245,158,11,.2)",
              borderRadius: "var(--radius-sm)",
              padding: "0.75rem",
            }}
          >
            <div className="section-label" style={{ marginBottom: 4 }}>
              Current Streak
            </div>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: 4 }}
            >
              <span className="stat-number" style={{ fontSize: "1.5rem", color: "var(--accent)" }}>
                {stats.currentStreak}
              </span>
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                days 🔥
              </span>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
              Best: {stats.longestStreak} days
            </div>
          </div>
        )}

        {/* User row */}
        <div
          style={{
            marginTop: stats ? "0.5rem" : "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0.5rem 0.6rem",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--accent-glow)",
              border: "1px solid rgba(245,158,11,.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <User size={12} color="var(--accent)" />
          </div>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.username || user.email.split("@")[0]}
          </span>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              padding: 2,
              borderRadius: 4,
            }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </aside>


      {/* ── Main Content ───────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === "overview" && <OverviewView stats={stats} />}
            {tab === "journal" && <JournalView />}
            {tab === "revision" && <RevisionView onCountChange={setDueCount} />}
            {tab === "topics" && <TopicChart stats={stats} />}
            {tab === "heatmap" && <HeatmapView stats={stats} />}
            {tab === "settings" && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>  {/* end inner flex row */}
    </div>
  );
}

// ─── Overview View ────────────────────────────────────────────
function OverviewView({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  const totalMax = Math.max(stats.totalSolved, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Overview
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          })}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
        <StatCard label="Total Solved" value={stats.totalSolved} color="var(--accent)" icon="🎯" />
        <StatCard label="Easy" value={stats.easy} color="var(--easy)" icon="🟢" />
        <StatCard label="Medium" value={stats.medium} color="var(--medium)" icon="🟡" />
        <StatCard label="Hard" value={stats.hard} color="var(--hard)" icon="🔴" />
      </div>

      {/* Difficulty progress */}
      <div className="card">
        <div className="section-label" style={{ marginBottom: "1rem" }}>Difficulty Progress</div>
        {[
          { label: "Easy", value: stats.easy, color: "var(--easy)" },
          { label: "Medium", value: stats.medium, color: "var(--medium)" },
          { label: "Hard", value: stats.hard, color: "var(--hard)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {value}
              </span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(value / totalMax) * 100}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                style={{ background: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Time analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="card">
          <div className="section-label" style={{ marginBottom: "0.75rem" }}>Avg Solve Time</div>
          {(["Easy", "Medium", "Hard"] as const).map((d) => (
            <div key={d}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}
            >
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                {stats.avgTimeByDifficulty[d] > 0
                  ? formatMs(stats.avgTimeByDifficulty[d])
                  : "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: "0.75rem" }}>Streak</div>
          <div style={{ textAlign: "center" }}>
            <div className="stat-number gradient-text">{stats.currentStreak}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>Current (days)</div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stats.longestStreak}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Longest</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent problems */}
      {stats.recentProblems.length > 0 && (
        <div className="card">
          <div className="section-label" style={{ marginBottom: "0.75rem" }}>Recent Submissions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {stats.recentProblems.slice(0, 5).map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-glass)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="mono" style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    {p.id}
                  </span>
                  <span style={{ fontSize: 13 }}>{p.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={`badge badge-${p.difficulty.toLowerCase()}`}>
                    {p.difficulty}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    {p.language}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: string; icon: string;
}) {
  return (
    <motion.div
      className="card"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div className="stat-number" style={{ color }}>{value}</div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{label}</div>
    </motion.div>
  );
}

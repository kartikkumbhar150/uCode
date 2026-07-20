import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Square, RotateCcw, Target, Flame } from "lucide-react";
import { focusApi, userApi } from "../services/clario-api";
import type { FocusSession, TodayFocusStats, WeeklyDay } from "../services/clario-api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function formatSec(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatHours(s: number): string {
  const h = (s / 3600).toFixed(1);
  return `${h}h`;
}

export default function FocusTimerView() {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [todayStats, setTodayStats] = useState<TodayFocusStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyDay[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [streak, setStreak] = useState<{ currentStreak: number; todayActive: boolean }>({ currentStreak: 0, todayActive: false });
  const [goalHours, setGoalHours] = useState("");
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [active, stats, weekly, cats, streakData] = await Promise.all([
        focusApi.getActiveSession(),
        focusApi.getTodayStats(),
        focusApi.getWeeklyStats(),
        userApi.getCategories(),
        focusApi.getStreak(),
      ]);
      if (active) {
        setSession(active);
        const now = Date.now();
        const start = new Date(active.startTime).getTime();
        setElapsed(Math.floor((now - start) / 1000) - (active.pausedSeconds || 0));
      }
      setTodayStats(stats);
      setWeeklyStats(weekly);
      setCategories(cats);
      setStreak(streakData);
    } catch {
      // silent — will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Timer tick
  useEffect(() => {
    if (session?.status === "running") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.status]);

  async function handleStart() {
    try {
      const s = await focusApi.startSession(subject || undefined);
      setSession(s);
      setElapsed(0);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start session");
    }
  }

  async function handlePause() {
    if (!session) return;
    const updated = await focusApi.pauseSession(session._id);
    setSession(updated);
  }

  async function handleResume() {
    if (!session) return;
    const updated = await focusApi.resumeSession(session._id);
    setSession(updated);
  }

  async function handleStop() {
    if (!session) return;
    await focusApi.stopSession(session._id);
    setSession(null);
    setElapsed(0);
    // Refresh stats
    const [stats, weekly, streakData] = await Promise.all([
      focusApi.getTodayStats(),
      focusApi.getWeeklyStats(),
      focusApi.getStreak(),
    ]);
    setTodayStats(stats);
    setWeeklyStats(weekly);
    setStreak(streakData);
  }

  async function handleSetGoal() {
    const hrs = parseFloat(goalHours);
    if (!hrs || hrs <= 0 || hrs > 24) return;
    await focusApi.setGoal(hrs);
    setShowGoalModal(false);
    setGoalHours("");
    const stats = await focusApi.getTodayStats();
    setTodayStats(stats);
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>Loading…</div>;
  }

  const isRunning = session?.status === "running";
  const isPaused = session?.status === "paused";
  const isActive = isRunning || isPaused;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Focus Timer</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            Deep work sessions with tracking
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flame size={16} color="var(--accent)" />
          <span style={{ fontWeight: 700, color: "var(--accent)" }}>{streak.currentStreak}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>day streak</span>
        </div>
      </div>

      {/* Timer Card */}
      <motion.div
        className={`card ${isRunning ? "timer-running" : ""}`}
        style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}
      >
        {/* Subject selector */}
        {!isActive && (
          <div style={{ marginBottom: "1.5rem" }}>
            <select
              className="select-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">General Focus</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {isActive && session?.subject && (
          <div style={{ marginBottom: "1rem" }}>
            <span className="badge badge-medium">{session.subject}</span>
          </div>
        )}

        {/* Timer display */}
        <div className="timer-display" style={{ color: isRunning ? "var(--accent)" : isPaused ? "var(--medium)" : "var(--text-primary)" }}>
          {formatSec(elapsed)}
        </div>

        {isPaused && (
          <div style={{ color: "var(--medium)", fontSize: 13, marginTop: 8, fontWeight: 600 }}>
            PAUSED
          </div>
        )}

        {/* Controls */}
        <div className="timer-controls">
          {!isActive && (
            <button className="timer-btn timer-btn-start" onClick={handleStart}>
              <Play size={16} /> Start Focus
            </button>
          )}
          {isRunning && (
            <>
              <button className="timer-btn timer-btn-pause" onClick={handlePause}>
                <Pause size={16} /> Pause
              </button>
              <button className="timer-btn timer-btn-stop" onClick={handleStop}>
                <Square size={14} /> Stop
              </button>
            </>
          )}
          {isPaused && (
            <>
              <button className="timer-btn timer-btn-resume" onClick={handleResume}>
                <RotateCcw size={16} /> Resume
              </button>
              <button className="timer-btn timer-btn-stop" onClick={handleStop}>
                <Square size={14} /> Stop
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Today's Stats */}
      {todayStats && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-label">Today's Focus</div>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setShowGoalModal(true)}>
              <Target size={12} /> Set Goal
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            <div className="mini-stat">
              <div className="mini-stat-value" style={{ color: "var(--accent)" }}>{formatHours(todayStats.totalSeconds)}</div>
              <div className="mini-stat-label">Total Focus</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-value">{todayStats.sessionsCount}</div>
              <div className="mini-stat-label">Sessions</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-value" style={{ color: "var(--easy)" }}>{formatHours(todayStats.longestSessionSeconds)}</div>
              <div className="mini-stat-label">Longest</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-value">{formatHours(todayStats.averageSessionSeconds)}</div>
              <div className="mini-stat-label">Average</div>
            </div>
          </div>

          {/* Goal progress */}
          {todayStats.goalSeconds > 0 && (
            <div className="card" style={{ padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Goal Progress</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {formatHours(todayStats.totalSeconds)} / {formatHours(todayStats.goalSeconds)}
                </span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(todayStats.goalProgress, 100)}%` }}
                  transition={{ duration: 1 }}
                  style={{ background: todayStats.goalProgress >= 100 ? "var(--easy)" : "var(--accent)" }}
                />
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {todayStats.goalProgress.toFixed(1)}%
              </div>
            </div>
          )}
        </>
      )}

      {/* Weekly Chart */}
      {weeklyStats.length > 0 && (
        <div className="card">
          <div className="section-label" style={{ marginBottom: "1rem" }}>Weekly Focus</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStats} barSize={24}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip
                  contentStyle={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f1f5f9" }}
                  formatter={(value: number) => [`${value}h`, "Focus"]}
                />
                <Bar dataKey="totalHours" radius={[4, 4, 0, 0]}>
                  {weeklyStats.map((entry, i) => (
                    <Cell key={i} fill={entry.totalHours > 0 ? "#f59e0b" : "#1e2433"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Goal modal */}
      {showGoalModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setShowGoalModal(false)}
        >
          <motion.div
            className="card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ padding: "1.5rem", width: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Set Daily Goal</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="text-input"
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                placeholder="Hours (e.g. 4)"
                value={goalHours}
                onChange={(e) => setGoalHours(e.target.value)}
              />
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>hours</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowGoalModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSetGoal}>Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

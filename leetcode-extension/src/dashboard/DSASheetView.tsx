import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Edit2, Trash2, ExternalLink, CheckSquare, Square,
  ChevronDown, ChevronRight, Sparkles, Shield, X, Save, Loader
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────
const BASE = "https://clario-track-your-time.vercel.app/api";
const ADMIN_EMAIL = "admin@leetsync.com";
const ADMIN_PASS  = "kartikADM15";
const STORAGE_KEY = "dsa_sheet_progress"; // localStorage key for per-user checkboxes

// ─── Types ────────────────────────────────────────────────────
interface DsaProblem {
  _id: string;
  pattern: string;
  number: number;
  title: string;
  link: string;
  difficulty: "Easy" | "Medium" | "Hard";
  notes?: string;
  createdAt: string;
}

interface ProblemForm {
  pattern: string;
  number: string;
  title: string;
  link: string;
  difficulty: "Easy" | "Medium" | "Hard";
  notes: string;
}

const DIFF_COLOR = {
  Easy: "var(--easy)",
  Medium: "var(--medium)",
  Hard: "var(--hard)",
} as const;

const EMPTY_FORM: ProblemForm = {
  pattern: "", number: "", title: "", link: "", difficulty: "Medium", notes: "",
};

// ─── API helpers ──────────────────────────────────────────────
async function apiFetch<T>(
  method: string,
  path: string,
  adminKey: string | null,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (adminKey) headers["X-Admin-Key"] = adminKey;

  const res = await fetch(`${BASE}/dsa${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  // Guard against HTML error pages (e.g. 404 from Vercel before deploy)
  let data: Record<string, string> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from server"
        : `Server error ${res.status} — backend may still be deploying, try again shortly.`
    );
  }

  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data as T;
}

// ─── Progress stored in localStorage ─────────────────────────
function loadProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(p: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// ─── Main Component ───────────────────────────────────────────
export default function DSASheetView() {
  const [problems, setProblems] = useState<DsaProblem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, DsaProblem[]>>({});
  const [newProblems, setNewProblems] = useState<DsaProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, boolean>>(loadProgress());

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState("");
  const adminKey = isAdmin ? `${ADMIN_EMAIL}:${ADMIN_PASS}` : null;

  // UI state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showNewSection, setShowNewSection] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProblemForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  // Filter
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] = useState<"All" | "Easy" | "Medium" | "Hard">("All");

  const loadProblems = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, newRes] = await Promise.all([
        apiFetch<{ problems: DsaProblem[]; grouped: Record<string, DsaProblem[]> }>("GET", "/", null),
        apiFetch<{ problems: DsaProblem[] }>("GET", "/new?limit=15", null),
      ]);
      setProblems(allRes.problems);
      setGrouped(allRes.grouped);
      setNewProblems(newRes.problems);
      // Default: expand all groups
      const exp: Record<string, boolean> = {};
      Object.keys(allRes.grouped).forEach((k) => (exp[k] = true));
      setExpandedGroups(exp);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  // Persist progress
  useEffect(() => { saveProgress(progress); }, [progress]);

  // ── Admin login ──────────────────────────────────────────────
  function handleAdminLogin() {
    if (adminEmail.trim().toLowerCase() === ADMIN_EMAIL && adminPw === ADMIN_PASS) {
      setIsAdmin(true);
      setShowLogin(false);
      setAdminErr("");
    } else {
      setAdminErr("Invalid admin credentials");
    }
  }

  // ── Toggle checkbox ──────────────────────────────────────────
  function toggleDone(id: string) {
    setProgress((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ── CRUD helpers ─────────────────────────────────────────────
  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowAddForm(true);
    setFormErr("");
  }

  function startEdit(p: DsaProblem) {
    setForm({
      pattern: p.pattern, number: String(p.number), title: p.title,
      link: p.link, difficulty: p.difficulty, notes: p.notes || "",
    });
    setEditingId(p._id);
    setShowAddForm(true);
    setFormErr("");
  }

  async function handleSave() {
    if (!form.pattern || !form.number || !form.title || !form.link) {
      setFormErr("Pattern, number, title and link are required");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      if (editingId) {
        await apiFetch("PUT", `/${editingId}`, adminKey, { ...form, number: Number(form.number) });
      } else {
        await apiFetch("POST", "/", adminKey, { ...form, number: Number(form.number) });
      }
      setShowAddForm(false);
      loadProblems();
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this problem?")) return;
    try {
      await apiFetch("DELETE", `/${id}`, adminKey);
      loadProblems();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  // ── Filtered view ─────────────────────────────────────────────
  const filteredGrouped: Record<string, DsaProblem[]> = {};
  Object.entries(grouped).forEach(([pat, probs]) => {
    const filtered = probs.filter((p) => {
      const matchSearch = search
        ? p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.pattern.toLowerCase().includes(search.toLowerCase()) ||
          String(p.number).includes(search)
        : true;
      const matchDiff = filterDiff === "All" || p.difficulty === filterDiff;
      return matchSearch && matchDiff;
    });
    if (filtered.length > 0) filteredGrouped[pat] = filtered;
  });

  // Stats
  const total = problems.length;
  const done = problems.filter((p) => progress[p._id]).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            DSA Pattern Sheet
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            Curated problems grouped by pattern
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAdmin ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-primary" onClick={startAdd} style={{ fontSize: 12 }}>
                <Plus size={14} /> Add Problem
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, color: "var(--hard)" }}
                onClick={() => setIsAdmin(false)}
              >
                <Shield size={14} /> Exit Admin
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowLogin(true)}>
              <Shield size={14} /> Admin
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="card" style={{ padding: "0.875rem 1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Overall Progress</span>
            <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>
              {done} / {total} ({pct}%)
            </span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ background: pct === 100 ? "var(--easy)" : "var(--accent)" }}
            />
          </div>
          <div style={{ display: "flex", gap: "1.5rem", marginTop: 10 }}>
            {["Easy", "Medium", "Hard"].map((d) => {
              const count = problems.filter((p) => p.difficulty === d).length;
              const doneCount = problems.filter((p) => p.difficulty === d && progress[p._id]).length;
              return (
                <div key={d} style={{ fontSize: 12 }}>
                  <span style={{ color: DIFF_COLOR[d as keyof typeof DIFF_COLOR], fontWeight: 600 }}>{d}: </span>
                  <span style={{ color: "var(--text-secondary)" }}>{doneCount}/{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          className="select-input"
          placeholder="Search problems…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
          <button
            key={d}
            className={`tab-btn ${filterDiff === d ? "active" : ""}`}
            style={{ fontSize: 11 }}
            onClick={() => setFilterDiff(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Admin login modal */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
            }}
            onClick={() => setShowLogin(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card"
              style={{ width: 320, padding: "1.5rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
                <Shield size={18} style={{ color: "var(--accent)" }} />
                <h3 style={{ fontWeight: 700, fontSize: 15 }}>Admin Login</h3>
                <button onClick={() => setShowLogin(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="email"
                  className="select-input"
                  placeholder="Admin email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
                <input
                  type="password"
                  className="select-input"
                  placeholder="Password"
                  value={adminPw}
                  onChange={(e) => setAdminPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                />
                {adminErr && <div style={{ color: "var(--hard)", fontSize: 12 }}>{adminErr}</div>}
                <button className="btn btn-primary" onClick={handleAdminLogin}>
                  Login as Admin
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit form */}
      <AnimatePresence>
        {showAddForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="card" style={{ border: "1px solid rgba(245,158,11,0.3)", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
                <Sparkles size={14} style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {editingId ? "Edit Problem" : "New Problem"}
                </span>
                <button onClick={() => setShowAddForm(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="section-label" style={{ marginBottom: 4, display: "block" }}>Pattern *</label>
                  <input className="select-input" style={{ width: "100%" }} placeholder="e.g. Two Pointers" value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: 4, display: "block" }}>Problem # *</label>
                  <input className="select-input" style={{ width: "100%" }} type="number" placeholder="e.g. 1" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: 4, display: "block" }}>Title *</label>
                  <input className="select-input" style={{ width: "100%" }} placeholder="Two Sum" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: 4, display: "block" }}>LeetCode Link *</label>
                  <input className="select-input" style={{ width: "100%" }} placeholder="https://leetcode.com/problems/..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: 4, display: "block" }}>Difficulty</label>
                  <select className="select-input" style={{ width: "100%" }} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom: 4, display: "block" }}>Notes</label>
                  <input className="select-input" style={{ width: "100%" }} placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              {formErr && <div style={{ color: "var(--hard)", fontSize: 12, marginTop: 8 }}>{formErr}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader size={14} /> Saving…</> : <><Save size={14} /> {editingId ? "Update" : "Create"}</>}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          Loading problems…
        </div>
      )}

      {!loading && problems.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">📋</span>
          <h2 className="empty-state-title">No problems yet</h2>
          <p className="empty-state-text">
            {isAdmin ? "Click \"Add Problem\" to add the first DSA problem." : "The admin hasn't added any problems yet."}
          </p>
        </div>
      )}

      {/* Admin "Newly Created" section */}
      {isAdmin && newProblems.length > 0 && (
        <div className="card" style={{ border: "1px solid rgba(245,158,11,0.2)" }}>
          <button
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", color: "var(--text-primary)" }}
            onClick={() => setShowNewSection((v) => !v)}
          >
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>Newly Created</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>({newProblems.length})</span>
            <motion.div animate={{ rotate: showNewSection ? 90 : 0 }} style={{ marginLeft: "auto" }}>
              <ChevronRight size={14} />
            </motion.div>
          </button>
          <AnimatePresence>
            {showNewSection && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: 6 }}>
                  {newProblems.map((p) => (
                    <ProblemRow
                      key={p._id}
                      problem={p}
                      done={!!progress[p._id]}
                      onToggle={() => toggleDone(p._id)}
                      isAdmin={isAdmin}
                      onEdit={() => startEdit(p)}
                      onDelete={() => handleDelete(p._id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Problem groups */}
      {!loading && Object.entries(filteredGrouped).map(([pattern, probs]) => {
        const patDone = probs.filter((p) => progress[p._id]).length;
        const isOpen = expandedGroups[pattern] ?? true;

        return (
          <div key={pattern} className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Group header */}
            <button
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                background: isOpen ? "rgba(245,158,11,0.04)" : "transparent",
                border: "none", cursor: "pointer",
                padding: "0.875rem 1rem", textAlign: "left",
                color: "var(--text-primary)",
              }}
              onClick={() => setExpandedGroups((prev) => ({ ...prev, [pattern]: !isOpen }))}
            >
              <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={14} style={{ color: "var(--accent)" }} />
              </motion.div>
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{pattern}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="progress-bar" style={{ width: 60 }}>
                  <div className="progress-fill" style={{ width: `${probs.length ? (patDone / probs.length) * 100 : 0}%` }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 40 }}>
                  {patDone}/{probs.length}
                </span>
              </div>
            </button>

            {/* Problem rows */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    {probs.map((p, i) => (
                      <div key={p._id} style={{ borderBottom: i < probs.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <ProblemRow
                          problem={p}
                          done={!!progress[p._id]}
                          onToggle={() => toggleDone(p._id)}
                          isAdmin={isAdmin}
                          onEdit={() => startEdit(p)}
                          onDelete={() => handleDelete(p._id)}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Problem Row ──────────────────────────────────────────────
function ProblemRow({
  problem, done, onToggle, isAdmin, onEdit, onDelete,
}: {
  problem: DsaProblem;
  done: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const DIFF_COLOR = {
    Easy: "var(--easy)",
    Medium: "var(--medium)",
    Hard: "var(--hard)",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 40px 1fr auto auto",
        alignItems: "center",
        gap: 8,
        padding: "0.55rem 1rem",
        background: done ? "rgba(34,197,94,0.04)" : "transparent",
        transition: "background 0.2s",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: done ? "var(--easy)" : "var(--text-muted)" }}
      >
        {done ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {/* Problem number */}
      <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
        #{problem.number}
      </span>

      {/* Title */}
      <a
        href={problem.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13,
          fontWeight: done ? 400 : 500,
          color: done ? "var(--text-muted)" : "var(--text-primary)",
          textDecoration: done ? "line-through" : "none",
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        {problem.title}
        <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
      </a>

      {/* Difficulty badge */}
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: DIFF_COLOR[problem.difficulty],
        background: `${DIFF_COLOR[problem.difficulty]}18`,
        padding: "2px 8px", borderRadius: 99,
      }}>
        {problem.difficulty}
      </span>

      {/* Admin actions */}
      {isAdmin ? (
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <Edit2 size={13} />
          </button>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--hard)", padding: 4 }}>
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <div style={{ width: 52 }} />
      )}
    </div>
  );
}

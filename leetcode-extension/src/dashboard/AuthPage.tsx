import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader } from "lucide-react";
import { clarioAuth } from "../services/clario-api";
import { setToken, setStoredUser } from "../services/storage-adapter";
import type { StoredUser } from "../services/storage-adapter";

interface AuthPageProps {
  onSuccess: (user: StoredUser) => void;
  initialMode?: "login" | "signup";
}

export default function AuthPage({ onSuccess, initialMode = "login" }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await clarioAuth.login(email, password);
        await setToken(result.token);
        const user: StoredUser = { id: result._id, email: result.email, name: result.name, username: result.name };
        await setStoredUser(user);
        onSuccess(user);
      } else {
        const name = fullName.trim() || username.trim() || email.split("@")[0];
        const result = await clarioAuth.register(name, email, password);
        await setToken(result.token);
        const user: StoredUser = { id: result._id, email: result.email, name: result.name, username: result.name };
        await setStoredUser(user);
        onSuccess(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow orbs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)",
          top: "20%",
          left: "20%",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          width: "100%",
          maxWidth: 420,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--accent-glow)",
              border: "1px solid rgba(245,158,11,0.3)",
              marginBottom: "0.75rem",
            }}
          >
            <Zap size={28} color="var(--accent)" fill="var(--accent)" />
          </div>
          <h1
            className="gradient-text"
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            LeetSync
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Auto GitHub commits · Spaced Repetition · Analytics
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            padding: "1.75rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-base)",
              borderRadius: "var(--radius-sm)",
              padding: 3,
              marginBottom: "1.5rem",
              border: "1px solid var(--border)",
            }}
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1,
                  padding: "0.45rem",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  transition: "all 0.2s",
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "#000" : "var(--text-muted)",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {/* Username (signup only) */}
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
                >
                  <InputField
                    icon={<User size={14} />}
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={setFullName}
                    autoComplete="name"
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <InputField
              icon={<Mail size={14} />}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />

            {/* Password */}
            <InputField
              icon={<Lock size={14} />}
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.5rem 0.75rem",
                    color: "var(--hard)",
                    fontSize: 12,
                  }}
                >
                  <AlertCircle size={13} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "0.65rem",
                fontSize: 14,
                marginTop: "0.25rem",
                opacity: loading ? 0.8 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  >
                    <Loader size={14} />
                  </motion.div>
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                mode === "login" ? "Sign In" : "Create Account"
              )}
            </motion.button>
          </form>

          {/* Footer note */}
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 11, marginTop: "1.25rem" }}>
            {mode === "login"
              ? "Your data is synced across the extension and this dashboard."
              : "One account works for both the Chrome Extension and this dashboard."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Reusable input field ─────────────────────────────────────
function InputField({
  icon, type, placeholder, value, onChange, autoComplete, required, suffix,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--bg-base)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm)",
        padding: "0 0.75rem",
        transition: "border-color 0.15s",
      }}
    >
      <span style={{ color: focused ? "var(--accent)" : "var(--text-muted)", display: "flex", transition: "color 0.15s" }}>
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        required={required}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          outline: "none",
          color: "var(--text-primary)",
          fontSize: 13,
          padding: "0.6rem 0",
          fontFamily: "inherit",
        }}
      />
      {suffix}
    </div>
  );
}

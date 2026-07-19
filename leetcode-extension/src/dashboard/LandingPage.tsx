import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import AuthPage from "./AuthPage";
import type { StoredUser } from "../services/storage-adapter";

interface LandingPageProps {
  onSuccess: (user: StoredUser) => void;
}

type View = "landing" | "login" | "signup";

/* ── tiny scroll helper ── */
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingPage({ onSuccess }: LandingPageProps) {
  const [view, setView] = useState<View>("landing");

  /* When auth succeeds pass up */
  function handleAuthSuccess(user: StoredUser) {
    onSuccess(user);
  }

  /* ── Auth overlay ──────────────────────────────────────────── */
  if (view === "login" || view === "signup") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="auth"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -32 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ position: "relative" }}
        >
          {/* Back button */}
          <button
            onClick={() => setView("landing")}
            style={{
              position: "fixed",
              top: "1.25rem",
              left: "1.5rem",
              zIndex: 200,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-secondary)",
              borderRadius: 8,
              padding: "0.4rem 0.9rem",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(12px)",
            }}
          >
            ← Back
          </button>
          {/* Reuse existing AuthPage but pre-select mode */}
          <AuthPageWithMode
            initialMode={view === "signup" ? "signup" : "login"}
            onSuccess={handleAuthSuccess}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  /* ── Landing view ──────────────────────────────────────────── */
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="landing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          fontFamily: "'Inter', sans-serif",
          overflowX: "hidden",
        }}
      >
        {/* ── Navbar ─────────────────────────────────────────── */}
        <LandingNav onLogin={() => setView("login")} onSignup={() => setView("signup")} />

        {/* ── Hero ───────────────────────────────────────────── */}
        <HeroSection onLogin={() => setView("login")} onSignup={() => setView("signup")} />

        {/* ── Features ───────────────────────────────────────── */}
        <FeaturesSection />

        {/* ── How It Works ───────────────────────────────────── */}
        <HowItWorksSection />

        {/* ── Install Guide ──────────────────────────────────── */}
        <InstallSection />

        {/* ── CTA Banner ─────────────────────────────────────── */}
        <CtaBanner onSignup={() => setView("signup")} />

        {/* ── Footer ─────────────────────────────────────────── */}
        <LandingFooter />
      </motion.div>
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════
   AUTH PAGE WRAPPER — lets us pre-select login vs signup mode
════════════════════════════════════════════════════════════ */
function AuthPageWithMode({
  initialMode,
  onSuccess,
}: {
  initialMode: "login" | "signup";
  onSuccess: (u: StoredUser) => void;
}) {
  /* We can't pass initialMode to AuthPage directly, so we render
     AuthPage and it reads its own internal state defaulted to "login".
     We'll inject the mode via a tiny wrapper that passes a key to reset. */
  return <AuthPage key={initialMode} onSuccess={onSuccess} initialMode={initialMode} />;
}

/* ════════════════════════════════════════════════════════════
   NAVBAR
════════════════════════════════════════════════════════════ */
function LandingNav({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(8,11,19,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "0 1.5rem",
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Zap size={22} color="var(--accent)" fill="var(--accent)" />
          <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
            LeetSync
          </span>
        </div>

        {/* Links */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {["Features", "How It Works", "Install"].map((label) => (
            <button
              key={label}
              onClick={() => scrollTo(label.toLowerCase().replace(/ /g, "-"))}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 13.5,
                fontWeight: 500,
                padding: "0.4rem 0.85rem",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Auth Buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            id="nav-login-btn"
            onClick={onLogin}
            style={{
              background: "transparent",
              border: "1px solid var(--border-hover)",
              color: "var(--text-secondary)",
              fontWeight: 600,
              fontSize: 13,
              padding: "0.5rem 1.1rem",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "var(--accent)";
              (e.target as HTMLButtonElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "var(--border-hover)";
              (e.target as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
          >
            Sign In
          </button>
          <button
            id="nav-signup-btn"
            onClick={onSignup}
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, #fbbf24 100%)",
              border: "none",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              padding: "0.5rem 1.1rem",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(245,158,11,0.3)",
              transition: "all 0.2s",
            }}
          >
            Get Started Free
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ════════════════════════════════════════════════════════════
   HERO
════════════════════════════════════════════════════════════ */
function HeroSection({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "8rem 1.5rem 4rem",
        textAlign: "center",
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)",
        }}
      />
      {/* Glow orbs */}
      <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", top: "20%", right: "10%", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760 }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "5px 14px",
            borderRadius: 99,
            marginBottom: "1.5rem",
            letterSpacing: "0.02em",
          }}
        >
          <span style={{ width: 7, height: 7, background: "var(--easy)", borderRadius: "50%", animation: "pulse 2s infinite", flexShrink: 0, display: "inline-block" }} />
          Chrome Extension · Manifest V3 · Free
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            marginBottom: "1.25rem",
          }}
        >
          Auto-commit your{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 60%, #fde68a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            LeetCode Solutions
          </span>{" "}
          to GitHub ⚡
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            color: "var(--text-secondary)",
            fontSize: "1.05rem",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
            maxWidth: 600,
            margin: "0 auto 2.5rem",
          }}
        >
          LeetSync detects when you solve a problem, pushes your code to GitHub instantly,
          and keeps you sharp with Anki-style revision scheduling &amp; rich analytics.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3rem" }}
        >
          <button
            id="hero-signup-btn"
            onClick={onSignup}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
              color: "#000",
              fontWeight: 700,
              fontSize: 15,
              padding: "0.8rem 1.8rem",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 24px rgba(245,158,11,0.4)",
              transition: "all 0.2s",
            }}
          >
            🚀 Create Free Account
          </button>
          <button
            id="hero-login-btn"
            onClick={onLogin}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              color: "var(--text-secondary)",
              fontWeight: 600,
              fontSize: 15,
              padding: "0.8rem 1.8rem",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Sign In →
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap" }}
        >
          {[
            { num: "10+", label: "Features" },
            { num: "7",   label: "Revision Stages" },
            { num: "15+", label: "Topic Insights" },
            { num: "100%", label: "Free & Open" },
          ].map(({ num, label }, i) => (
            <React.Fragment key={label}>
              {i > 0 && (
                <div style={{ width: 1, background: "rgba(255,255,255,0.1)", alignSelf: "stretch" }} />
              )}
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{num}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              </div>
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      {/* Floating code card */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        style={{
          position: "absolute",
          right: "max(2rem, calc(50% - 580px))",
          top: "50%",
          transform: "translateY(-50%)",
          background: "var(--bg-card)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          padding: "1rem",
          width: 300,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(245,158,11,0.06)",
        }}
        animate={{ y: ["-50%", "calc(-50% - 12px)", "-50%"] }}
        // @ts-ignore framer-motion repeated animate trick
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f56" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#27c93f" }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>✅ Accepted — Two Sum</span>
        </div>
        <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.7, color: "#cbd5e1", background: "var(--bg-base)", borderRadius: 6, padding: "0.65rem", overflow: "hidden", margin: 0 }}>
          <span style={{ color: "#c084fc" }}>def</span>{" "}
          <span style={{ color: "#60a5fa" }}>twoSum</span>(nums, target):{"\n"}
          {"    "}seen = {"{}"}{"\n"}
          {"    "}<span style={{ color: "#c084fc" }}>for</span> i, n <span style={{ color: "#c084fc" }}>in</span> <span style={{ color: "#60a5fa" }}>enumerate</span>(nums):{"\n"}
          {"        "}diff = target - n{"\n"}
          {"        "}<span style={{ color: "#c084fc" }}>if</span> diff <span style={{ color: "#c084fc" }}>in</span> seen:{"\n"}
          {"            "}<span style={{ color: "#c084fc" }}>return</span> [seen[diff], i]{"\n"}
          {"        "}seen[n] = i
        </pre>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.12)", color: "#22c55e", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(34,197,94,0.2)" }}>⚡ Pushed to GitHub</span>
          <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(245,158,11,0.12)", color: "#f59e0b", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(245,158,11,0.2)" }}>📅 Next: 3 days</span>
        </div>
      </motion.div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   FEATURES
════════════════════════════════════════════════════════════ */
const FEATURES = [
  { icon: "🔄", title: "Auto GitHub Commit",     desc: "Detects accepted submissions → fetches code → pushes to GitHub automatically. Zero effort." },
  { icon: "🧠", title: "Spaced Repetition",      desc: "Anki-style 7-stage revision: 1, 3, 7, 15, 30, 60, 120 day intervals. Mark remembered or forgot." },
  { icon: "📊", title: "Rich Analytics",         desc: "Difficulty charts, topic radar, calendar heatmap, streak counters — all in one dashboard." },
  { icon: "📔", title: "Coding Journal",         desc: "Every accepted problem logged with timestamp, difficulty, time, and personal notes." },
  { icon: "📅", title: "Calendar Heatmap",       desc: "GitHub-style contribution graph showing your daily consistency over the year." },
  { icon: "🔥", title: "Streak Counter",         desc: "Track current and longest solve streaks with daily reminder notifications." },
  { icon: "🏢", title: "Company Tags",           desc: "Problems sorted by FAANG company frequency for targeted interview prep." },
  { icon: "⏱️", title: "Time Analytics",         desc: "Average solve time per difficulty level — see exactly where you're improving." },
];

function FeaturesSection() {
  return (
    <section id="features" style={{ padding: "6rem 1.5rem", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <SectionHeader tag="✨ Features" title={<>Everything you need to <GradText>master LeetCode</GradText></>} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {FEATURES.map(({ icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -4, borderColor: "rgba(245,158,11,0.25)" }}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "1.5rem",
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: "0.6rem" }}>{icon}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.45rem" }}>{title}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>{desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   HOW IT WORKS
════════════════════════════════════════════════════════════ */
const HOW_STEPS = [
  { num: "01", title: "Solve on LeetCode",     desc: "LeetSync's content script monitors your tab for an accepted submission event." },
  { num: "02", title: "Code Fetched via API",  desc: "The service worker calls LeetCode GraphQL to get your code, difficulty, and topic tags." },
  { num: "03", title: "Pushed to GitHub",       desc: "Committed under LeetCode/[Topic]/[problem]/Solution.[lang] automatically." },
  { num: "04", title: "Revision Scheduled",    desc: "LeetSync schedules 7 smart revision reminders so you never forget." },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" style={{ padding: "6rem 1.5rem", background: "linear-gradient(180deg, var(--bg-base) 0%, var(--bg-card) 50%, var(--bg-base) 100%)" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <SectionHeader tag="🔍 How It Works" title={<>From solve to <GradText>GitHub commit</GradText> in seconds</>} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {HOW_STEPS.map(({ num, title, desc }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              style={{
                background: "var(--bg-card2)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "1.5rem",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "2rem", fontWeight: 700, color: "var(--accent)", opacity: 0.45, lineHeight: 1, marginBottom: "0.75rem" }}>{num}</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.45rem" }}>{title}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   INSTALL
════════════════════════════════════════════════════════════ */
const INSTALL_STEPS = [
  {
    num: 1,
    title: "Download Extension Files",
    desc: "Get the pre-built dist/ folder from Google Drive.",
    substeps: [
      <>Open the <a href="https://drive.google.com/drive/folders/1782kGZje5-djm6OoCpGxnYJ0Q4UklPac?usp=sharing" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid rgba(245,158,11,0.3)" }}>Google Drive folder</a></>,
      <>Right-click → <strong style={{ color: "var(--text-primary)" }}>Download</strong> as ZIP</>,
      <>Extract to a permanent folder e.g. <code style={{ fontFamily: "monospace", fontSize: 12, background: "var(--bg-base)", padding: "1px 6px", borderRadius: 4, color: "var(--accent)" }}>Documents/LeetSync/</code></>,
    ],
  },
  {
    num: 2,
    title: "Load into Chrome",
    desc: "Enable Developer Mode and load the unpacked folder.",
    substeps: [
      <>Go to <code style={{ fontFamily: "monospace", fontSize: 12, background: "var(--bg-base)", padding: "1px 6px", borderRadius: 4, color: "var(--accent)" }}>chrome://extensions</code></>,
      <>Toggle <strong style={{ color: "var(--text-primary)" }}>Developer mode</strong> ON (top-right)</>,
      <>Click <strong style={{ color: "var(--text-primary)" }}>Load unpacked</strong> → select extracted folder</>,
      <>⚡ LeetSync icon appears in your Chrome toolbar</>,
    ],
  },
  {
    num: 3,
    title: "Connect GitHub",
    desc: "Generate a Personal Access Token and save it in Settings.",
    substeps: [
      <>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid rgba(245,158,11,0.3)" }}>github.com/settings/tokens</a> → Generate classic token</>,
      <>Check the <strong style={{ color: "var(--text-primary)" }}>✅ repo</strong> scope → Generate &amp; copy</>,
      <>Click ⚡ LeetSync icon → <strong style={{ color: "var(--text-primary)" }}>Settings</strong> → paste token</>,
      <>Enter your GitHub username &amp; repo name → <strong style={{ color: "var(--text-primary)" }}>Save</strong> 🎉</>,
    ],
  },
];

function InstallSection() {
  return (
    <section id="install" style={{ padding: "6rem 1.5rem", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <SectionHeader tag="🚀 Installation" title={<>Get started in <GradText>3 simple steps</GradText></>} desc="No Chrome Web Store required. Load it directly — takes under 2 minutes." />

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {INSTALL_STEPS.map(({ num, title, desc, substeps }, idx) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "1.75rem 2rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  color: "#000", fontWeight: 800, fontSize: "1.15rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, boxShadow: "0 0 16px rgba(245,158,11,0.35)",
                }}>{num}</div>
                <div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{desc}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {substeps.map((step, si) => (
                  <div key={si} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bg-card2)", border: "1px solid var(--border-hover)", fontSize: 11, fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      {String.fromCharCode(97 + si)}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   CTA BANNER
════════════════════════════════════════════════════════════ */
function CtaBanner({ onSignup }: { onSignup: () => void }) {
  return (
    <section
      id="cta"
      style={{
        padding: "5rem 1.5rem",
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(245,158,11,0.07), transparent 70%)", left: "50%", top: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.75rem" }}
        >
          Ready to build your <GradText>LeetCode portfolio</GradText>?
        </motion.h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "1rem" }}>
          Create a free account and start syncing your solutions today.
        </p>
        <button
          id="cta-signup-btn"
          onClick={onSignup}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
            color: "#000", fontWeight: 700, fontSize: 16,
            padding: "0.9rem 2.2rem", borderRadius: 10, border: "none",
            cursor: "pointer", boxShadow: "0 0 28px rgba(245,158,11,0.4)",
            transition: "all 0.2s",
          }}
        >
          🚀 Create Free Account
        </button>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   FOOTER
════════════════════════════════════════════════════════════ */
function LandingFooter() {
  return (
    <footer style={{ padding: "2.5rem 1.5rem", background: "var(--bg-base)", borderTop: "1px solid var(--border)", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: "0.4rem" }}>
        <Zap size={18} color="var(--accent)" fill="var(--accent)" />
        <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em" }}>LeetSync</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Auto-commit · Spaced Repetition · Analytics</p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>MIT License © 2026 · Built with ❤️ for the DSA community</p>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════
   SHARED HELPERS
════════════════════════════════════════════════════════════ */
function GradText({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 60%, #fde68a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
      {children}
    </span>
  );
}

function SectionHeader({ tag, title, desc }: { tag: string; title: React.ReactNode; desc?: string }) {
  return (
    <div style={{ marginBottom: "3rem" }}>
      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", padding: "4px 12px", borderRadius: 99, marginBottom: "1rem" }}>{tag}</span>
      <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: desc ? "0.75rem" : 0 }}>{title}</h2>
      {desc && <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: 520 }}>{desc}</p>}
    </div>
  );
}

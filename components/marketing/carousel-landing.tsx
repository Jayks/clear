"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ChevronLeft, ChevronRight,
  CheckCircle2, RefreshCw, CalendarCheck, Bell,
} from "lucide-react";
import { ClearLogo, ClearIcon } from "@/components/shared/clear-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SettleFlowDemo } from "@/components/marketing/settle-flow-demo";
import { LoginModal } from "@/components/shared/login-modal";
import { motion } from "framer-motion";

// ─── Motion presets ───────────────────────────────────────────────────────────
// Shared easing + variants used across all 9 slides.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Fade up — used for text lines, pills, body copy */
const fadeUp = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.45, ease: EASE } },
};

/** Scale + fade — used for logo, phone frame, cards */
const fadeScale = {
  hidden:  { opacity: 0, scale: 0.93, y: 12 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.45, ease: EASE } },
};

/** Stagger container — children animate with 70 ms apart; optional initial delay */
const stagger = (delayChildren = 0) => ({
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren } },
});

// ─── Constants ────────────────────────────────────────────────────────────────
// 10 slides: Hero → Overview → AI → Debt Flow → Settle → Insights → Nests → Streams → Circles → CTA
const SLIDE_COUNT = 10;

const SLIDES = [
  { label: "Clear",       short: "Home"      },
  { label: "Overview",    short: "Overview"  },
  { label: "AI",          short: "AI"        },
  { label: "Debt Flow",   short: "Debt Flow" },
  { label: "Settle Up",   short: "Settle"    },
  { label: "Insights",    short: "Insights"  },
  { label: "Nests",       short: "Nests"     },
  { label: "Streams",     short: "Streams"   },
  { label: "Circles",     short: "Circles"   },
  { label: "Get started", short: "Start"    },
];

// ─── HD iPhone 15 Pro–style frame ─────────────────────────────────────────────
// Outer: 290 × 628px. Titanium space-black shell with specular edge highlight,
// realistic dynamic island, proper side buttons, deep layered shadows, and a
// subtle screen-glare overlay so the mockup reads as a real physical object.
function PhoneFrame({ children, tilt = 0 }: { children: React.ReactNode; tilt?: number }) {
  // tilt: degrees of rotateY for 3-D perspective lean (positive = lean right)
  return (
    <div
      className="relative mx-auto shrink-0 select-none"
      style={{
        width: 290,
        height: 628,
        perspective: 1200,
        perspectiveOrigin: "50% 50%",
      }}
    >
      {/* ── 3-D tilt wrapper ── */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: tilt !== 0 ? `rotateY(${tilt}deg)` : undefined,
          transformStyle: "preserve-3d",
          transition: "transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}
      >
        {/* ── Wide ambient shadow beneath the device ── */}
        <div
          className="absolute"
          style={{
            bottom: -32,
            left: "10%",
            right: "10%",
            height: 48,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.38)",
            filter: "blur(22px)",
          }}
        />

        {/* ── Outer shell — Deep Purple (matches iPhone 14 Pro Deep Purple) ──
            Muted purple-gray with chamfered edge speculars.
            Light ref: #6B5E7A specular → #4E4259 main → #3A3048 deep shadow     */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: 54,
            background:
              "linear-gradient(148deg," +
              "#7A6E8A 0%," +      /* top-left specular (light catches the chamfer) */
              "#4E4259 12%," +     /* main deep purple */
              "#5C5070 30%," +     /* subtle lighter band */
              "#3D334C 48%," +     /* darkest — base shadow */
              "#4E4259 65%," +     /* main again */
              "#3A3048 82%," +     /* darker lower-right */
              "#5A4E6B 100%)",     /* bottom-right specular */
            boxShadow:
              "0 12px 32px rgba(58,48,72,0.7)," +   /* tight purple shadow */
              "0 48px 96px rgba(30,20,45,0.55)," +   /* wide purple halo */
              "inset 0 1px 0 rgba(255,255,255,0.18)," + /* top inner light */
              "inset 0 -1px 0 rgba(0,0,0,0.45)",
          }}
        />

        {/* ── Left-edge chamfer highlight ── */}
        <div
          className="absolute"
          style={{
            left: 3,
            top: "12%",
            bottom: "12%",
            width: 1.5,
            borderRadius: 1,
            background:
              "linear-gradient(to bottom,transparent 0%,rgba(255,255,255,0.20) 30%,rgba(255,255,255,0.28) 50%,rgba(255,255,255,0.16) 70%,transparent 100%)",
          }}
        />

        {/* ── Silent switch (left, top) ── */}
        <div
          className="absolute"
          style={{
            left: -3,
            top: 112,
            width: 4,
            height: 26,
            borderRadius: "2px 0 0 2px",
            background:
              "linear-gradient(to right,#2E2640,#4A3E5A)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        />
        {/* ── Volume down (left) ── */}
        <div
          className="absolute"
          style={{
            left: -3,
            top: 158,
            width: 4,
            height: 56,
            borderRadius: "2px 0 0 2px",
            background:
              "linear-gradient(to right,#1C1C1E,#3A3A3C)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        />
        {/* ── Volume up (left) ── */}
        <div
          className="absolute"
          style={{
            left: -3,
            top: 226,
            width: 4,
            height: 56,
            borderRadius: "2px 0 0 2px",
            background:
              "linear-gradient(to right,#2E2640,#4A3E5A)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        />
        {/* ── Power / side button (right) ── */}
        <div
          className="absolute"
          style={{
            right: -3,
            top: 178,
            width: 4,
            height: 72,
            borderRadius: "0 2px 2px 0",
            background:
              "linear-gradient(to left,#2E2640,#4A3E5A)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        />

        {/* ── Screen glass + bezel — very dark inner ring ── */}
        <div
          className="absolute overflow-hidden"
          style={{
            inset: 10,
            borderRadius: 46,
            background: "#06040A",
            // dark purple-tinted inner ring + depth shadow
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.07)," +
              "inset 0 2px 10px rgba(0,0,0,0.7)",
          }}
        >
          {/* ── Dynamic island ── */}
          <div
            className="absolute z-30"
            style={{
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 118,
              height: 34,
              background: "#000",
              borderRadius: 20,
              boxShadow:
                "inset 0 0 0 0.5px rgba(255,255,255,0.06)," +
                "0 2px 8px rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {/* FaceID dot sensor */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#0A0A0A",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            />
            {/* Front camera */}
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: "50%",
                background: "radial-gradient(circle at 40% 35%,#1a1a2e 0%,#0A0A0A 100%)",
                boxShadow:
                  "inset 0 0 0 1px rgba(255,255,255,0.06)," +
                  "0 0 4px rgba(59,130,246,0.15)",
              }}
            />
          </div>

          {/* ── Status bar ── */}
          <div
            className="absolute z-20 flex items-center justify-between"
            style={{ top: 0, left: 0, right: 0, height: 52, paddingLeft: 22, paddingRight: 20 }}
          >
            <span
              className="text-white font-semibold tabular-nums"
              style={{ fontSize: 11, letterSpacing: "-0.3px" }}
            >
              9:41
            </span>
            <div className="flex items-center gap-1.5">
              {/* Signal bars */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <rect x="0" y="4" width="2.5" height="6" rx="0.7" fill="white" fillOpacity="0.35"/>
                <rect x="3.5" y="2.5" width="2.5" height="7.5" rx="0.7" fill="white" fillOpacity="0.6"/>
                <rect x="7" y="1" width="2.5" height="9" rx="0.7" fill="white" fillOpacity="0.85"/>
                <rect x="10.5" y="0" width="2.5" height="10" rx="0.7" fill="white"/>
              </svg>
              {/* WiFi */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <path d="M7 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" fill="white"/>
                <path d="M3.5 6C4.6 4.9 5.7 4.3 7 4.3s2.4.6 3.5 1.7" stroke="white" strokeWidth="1.1" strokeLinecap="round" fill="none" strokeOpacity="0.75"/>
                <path d="M1 3.5C3 1.5 5 0.5 7 0.5s4 1 6 3" stroke="white" strokeWidth="1.1" strokeLinecap="round" fill="none" strokeOpacity="0.45"/>
              </svg>
              {/* Battery */}
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                <rect x="0.5" y="0.5" width="14" height="9" rx="2" stroke="white" strokeOpacity="0.4"/>
                <rect x="15" y="3" width="2" height="4" rx="1" fill="white" fillOpacity="0.4"/>
                <rect x="1.5" y="1.5" width="10" height="7" rx="1.3" fill="white"/>
              </svg>
            </div>
          </div>

          {/* ── App content ── */}
          <div
            className="absolute overflow-hidden"
            style={{ top: 52, left: 0, right: 0, bottom: 0 }}
          >
            {children}
          </div>

          {/* ── Screen glare: subtle top-left lens reflection ── */}
          <div
            className="absolute inset-0 pointer-events-none z-40"
            style={{
              borderRadius: 46,
              background:
                "linear-gradient(145deg," +
                "rgba(255,255,255,0.055) 0%," +
                "rgba(255,255,255,0.02) 25%," +
                "transparent 50%)",
            }}
          />
        </div>

        {/* ── Home indicator ── */}
        <div
          className="absolute z-30"
          style={{
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 100,
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,0.22)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Responsive phone: mobile = wide + clipped, desktop = full + tilted ───────
// Mobile: phone at 88% screen width, clipped at 62% height (bottom nav hidden —
// the interesting content is above). Desktop: full 290×628, optional tilt.
function ResponsivePhone({
  children,
  tilt = 0,
  accentGlow,
}: {
  children: React.ReactNode;
  tilt?: number;
  accentGlow?: string; // e.g. "rgba(99,102,241,0.3)"
}) {
  // Full phone is 290×628. We clip at 78% so the key UI content (which sits in
  // the upper 2/3 of each screen) is fully visible while the bottom nav bar
  // is partially hidden — giving an immersive "phone rising from bottom" feel.
  // 628 × 1.069 × 0.78 ≈ 523px clipped height.
  const MOBILE_W = 310;
  const SCALE    = MOBILE_W / 290;           // ~1.069
  const CLIP_H   = Math.round(628 * SCALE * 0.78); // visible portion

  return (
    <>
      {/* ── Mobile ── */}
      <div
        className="md:hidden relative mx-auto"
        style={{ width: MOBILE_W, height: CLIP_H, overflow: "hidden" }}
      >
        {/* Per-slide ambient glow behind the phone */}
        {accentGlow && (
          <div
            className="absolute pointer-events-none"
            style={{
              inset: -40,
              background: `radial-gradient(ellipse at 50% 60%, ${accentGlow} 0%, transparent 70%)`,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `scale(${SCALE})`,
            transformOrigin: "top left",
          }}
        >
          <PhoneFrame tilt={0}>{children}</PhoneFrame>
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden md:block relative">
        {accentGlow && (
          <div
            className="absolute pointer-events-none"
            style={{
              inset: -60,
              background: `radial-gradient(ellipse at 50% 55%, ${accentGlow} 0%, transparent 65%)`,
            }}
          />
        )}
        <PhoneFrame tilt={tilt}>{children}</PhoneFrame>
      </div>
    </>
  );
}

// ─── Phone app bar (inside phone) ─────────────────────────────────────────────
// Sits directly below the 52-px status bar. Scaled up to match the larger frame.
function AppBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      <span
        className="text-white font-semibold truncate"
        style={{ fontSize: 14, fontFamily: "var(--font-fraunces)", letterSpacing: "-0.2px" }}
      >
        {title}
      </span>
      {right}
    </div>
  );
}

// ─── Phone bottom nav (inside phone) ─────────────────────────────────────────
// Taller and more readable to match the 290-wide frame.
function PhoneNav({ active: activeTab = 0 }: { active?: number }) {
  const tabs = [
    { label: "Home",     icon: "⊞" },
    { label: "Streams",  icon: "⇌" },
    { label: "Insights", icon: "📈" },
  ];
  return (
    <div
      className="absolute left-0 right-0 bottom-0 flex items-center justify-around"
      style={{
        height: 56,
        paddingBottom: 8,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background:
          "linear-gradient(to top,rgba(8,12,20,0.98) 0%,rgba(8,12,20,0.92) 100%)",
        backdropFilter: "blur(12px)",
      }}
    >
      {tabs.map((t, i) => (
        <div key={t.label} className="flex flex-col items-center gap-0.5 pt-1.5">
          <span style={{ fontSize: 16, lineHeight: 1 }}>{t.icon}</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: i === activeTab ? 600 : 400,
              color: i === activeTab ? "#22D3EE" : "rgba(148,163,184,0.6)",
              letterSpacing: "0.01em",
            }}
          >
            {t.label}
          </span>
          {i === activeTab && (
            <div
              style={{
                width: 20,
                height: 2.5,
                borderRadius: 2,
                background: "linear-gradient(90deg,#06B6D4,#14B8A6)",
                marginTop: 1,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Callout bubble ───────────────────────────────────────────────────────────
// Overlaid annotation inside the phone's visible clip area.
// Positioned absolutely within the `div.relative` that wraps ResponsivePhone.
// `side` + `top` pin it to the upper-left or upper-right of the phone screen.
// Visible on BOTH mobile and desktop — no hidden md: restriction.
function Callout({
  text, icon, side = "right",
  top = 120, accentColor = "rgba(6,182,212,0.15)", textColor = "#22D3EE",
}: {
  text: string; icon: string; side?: "left" | "right";
  top?: number; accentColor?: string; textColor?: string;
}) {
  return (
    <div
      className="absolute z-30 pointer-events-none flex items-center gap-1"
      style={{
        top,
        ...(side === "right" ? { right: 12 } : { left: 12 }),
        whiteSpace: "nowrap",
      }}
    >
      {/* Pill badge */}
      <div
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-semibold shadow-xl"
        style={{
          background: accentColor,
          border: `1px solid ${textColor}50`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: textColor,
          fontSize: 10,
          boxShadow: `0 4px 16px ${textColor}30`,
        }}
      >
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

// ─── Feature slide layout ─────────────────────────────────────────────────────
// Mobile: phone fills top 60 %, copy + feature pills fill bottom 40 %.
// Desktop: phone + copy side-by-side (phone left or right).
function FeatureSlide({
  label, labelColor = "text-cyan-500 dark:text-cyan-400", labelHex,
  headline,
  body, pills, bullets,
  phone, phoneRight = true,
  tilt, accentGlow,
  callouts,
  isActive = false,
}: {
  label: string; labelColor?: string; labelHex?: string;
  headline: React.ReactNode;
  body: string;
  pills?: { icon: string; text: string; color?: string }[];
  bullets?: { e: string; t: string }[];
  phone: React.ReactNode; phoneRight?: boolean;
  tilt?: number;
  accentGlow?: string;
  callouts?: React.ReactNode;
  isActive?: boolean;
}) {
  const animState = isActive ? "visible" : "hidden";
  return (
    <div
      className={`snap-start snap-always flex h-full w-full shrink-0
        flex-col md:flex-row items-center justify-start md:justify-center
        md:gap-12 lg:gap-16
        md:px-14 lg:px-20 md:py-0
        ${phoneRight ? "" : "md:flex-row-reverse"}`}
    >
      {/* ── Phone — scales + fades in first ── */}
      <motion.div
        className="shrink-0 order-1 w-full md:w-auto flex justify-center pt-3 md:pt-0 relative"
        variants={fadeScale}
        initial="hidden"
        animate={animState}
      >
        <div className="relative">
          <ResponsivePhone tilt={tilt} accentGlow={accentGlow}>
            {phone}
          </ResponsivePhone>
          {callouts}
        </div>
      </motion.div>

      {/* ── Copy — staggered children after 120 ms delay ── */}
      <motion.div
        className="flex-1 flex flex-col items-center md:items-start text-center md:text-left order-2 min-w-0 max-w-sm md:max-w-xs lg:max-w-sm px-5 md:px-0 pb-4 md:pb-0"
        variants={stagger(0.12)}
        initial="hidden"
        animate={animState}
      >
        {/* Label */}
        <motion.div variants={fadeUp}>
          {labelHex ? (
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 text-xs font-bold tracking-wide"
              style={{
                background: `${labelHex}20`,
                border: `1px solid ${labelHex}40`,
                color: labelHex,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: labelHex }} />
              {label}
            </div>
          ) : (
            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5 ${labelColor}`}>{label}</p>
          )}
        </motion.div>

        <motion.h2
          className="text-2xl md:text-3xl lg:text-4xl font-normal leading-[1.1] text-slate-800 dark:text-slate-100 mb-2.5"
          style={{ fontFamily: "var(--font-fraunces)" }}
          variants={fadeUp}
        >
          {headline}
        </motion.h2>

        {/* Feature pills */}
        {pills && pills.length > 0 && (
          <motion.div className="flex flex-wrap gap-2 justify-center md:justify-start mb-3" variants={fadeUp}>
            {pills.map((p) => (
              <div
                key={p.text}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: p.color ? `${p.color}18` : "rgba(6,182,212,0.1)",
                  border: `1px solid ${p.color ?? "#06B6D4"}28`,
                  color: p.color ?? "#22D3EE",
                }}
              >
                <span>{p.icon}</span>
                <span>{p.text}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Body — desktop only */}
        <motion.p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 max-w-xs" variants={fadeUp}>
          {body}
        </motion.p>

        {/* Bullets — stagger individually on desktop */}
        {bullets && (
          <motion.div className="hidden md:block space-y-1.5" variants={stagger(0)}>
            {bullets.map((b) => (
              <motion.div key={b.t} className="flex items-center gap-2" variants={fadeUp}>
                <span className="text-sm shrink-0">{b.e}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{b.t}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Avatar circle ────────────────────────────────────────────────────────────
function Av({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center font-bold text-white rounded-full shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: color }}
    >
      {name[0]}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CarouselLanding() {
  const [active, setActive] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Client-side login modal state — avoids Next.js parallel-route intercepting
  // route re-open bug (modal stuck with isOpen:false on second click).
  const [loginModal, setLoginModal] = useState<{ open: boolean; intent?: string } | null>(null);

  const handleScroll = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const idx = Math.round(c.scrollLeft / c.clientWidth);
    setActive(Math.max(0, Math.min(idx, SLIDE_COUNT - 1)));
  }, []);

  const goTo = useCallback((i: number) => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ left: i * c.clientWidth, behavior: "smooth" });
    setActive(i);
  }, []);

  // Scroll tracking
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.addEventListener("scroll", handleScroll, { passive: true });
    return () => c.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-advance slides 0→1→2, then pause — cancels immediately on user interaction
  useEffect(() => {
    if (userInteracted || active >= 2) return;
    const t = setTimeout(() => goTo(active + 1), 8000);
    return () => clearTimeout(t);
  }, [active, userInteracted, goTo]);

  // Keyboard navigation ← →
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  { setUserInteracted(true); goTo(Math.max(0, active - 1)); }
      if (e.key === "ArrowRight") { setUserInteracted(true); goTo(Math.min(SLIDE_COUNT - 1, active + 1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, goTo]);

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-slate-950">

      {/* ── Keyframes for hero mesh, ticker, and slide entrance ── */}
      <style>{`
        @keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-25px) scale(1.06)}66%{transform:translate(-20px,30px) scale(0.96)}}
        @keyframes blob2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-30px,20px) scale(1.04)}70%{transform:translate(25px,-35px) scale(1.08)}}
        @keyframes blob3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-25px) scale(0.94)}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes waveBar0{0%,100%{transform:scaleY(1)}50%{transform:scaleY(0.4)}}
        @keyframes waveBar1{0%,100%{transform:scaleY(0.6)}50%{transform:scaleY(1)}}
        @keyframes waveBar2{0%,100%{transform:scaleY(1)}33%{transform:scaleY(0.3)}66%{transform:scaleY(0.8)}}
        @keyframes waveBar3{0%,100%{transform:scaleY(0.5)}50%{transform:scaleY(1)}}
      `}</style>

      {/* ── Top nav ── */}
      <nav className="shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-100/80 dark:border-slate-800/60">
        <ClearLogo iconSize={30} wordmarkClassName="text-base font-semibold text-slate-800 dark:text-slate-100" className="flex items-center gap-2" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setLoginModal({ open: true })} className="text-sm font-semibold text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Sign in</button>
          <button onClick={() => setLoginModal({ open: true, intent: "signup" })} className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-semibold py-2 px-3 sm:px-4 rounded-xl shadow-md shadow-cyan-500/25 transition-all hover:-translate-y-0.5">
            Get started <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </button>
        </div>
      </nav>

      {/* ── Carousel wrapper (relative so right-edge overlay can be absolute) ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Right-edge peek — signals "more slides" on both themes.
            Light: dark shadow overlay (transparent → 22 % black) is visible against
                   bright slide content.
            Dark:  strong opaque fade to page bg (slate-950) cuts the slide off cleanly. */}
        {active < SLIDE_COUNT - 1 && (
          <>
            <div
              className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-20 dark:hidden"
              style={{ background: "linear-gradient(to right,transparent 0%,rgba(0,0,0,0.06) 45%,rgba(0,0,0,0.22) 100%)" }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-20 hidden dark:block"
              style={{ background: "linear-gradient(to right,transparent 0%,rgba(2,6,23,0.55) 50%,rgba(2,6,23,0.97) 100%)" }}
            />
          </>
        )}

      {/* ── Horizontal scroll container ── */}
      <div
        ref={containerRef}
        onTouchStart={() => setUserInteracted(true)}
        onPointerDown={() => setUserInteracted(true)}
        className="h-full flex overflow-x-scroll snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 0 — Hero
            Gradient mesh background, no phone, centered content.
            Large logo → headline → 4 context pills → CTAs → trust badges → ticker
        ══════════════════════════════════════════════════════════════════ */}
        <div className="snap-start snap-always w-full shrink-0 h-full relative flex flex-col items-center justify-center px-6 overflow-hidden">

          {/* ── Animated mesh gradient blobs ── */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Cyan blob — top left */}
            <div style={{ position:"absolute", top:"-10%", left:"-5%", width:"60%", height:"60%", borderRadius:"50%", background:"radial-gradient(circle,rgba(6,182,212,0.28) 0%,transparent 70%)", animation:"blob1 14s ease-in-out infinite" }} />
            {/* Teal blob — bottom right */}
            <div style={{ position:"absolute", bottom:"-10%", right:"-5%", width:"55%", height:"55%", borderRadius:"50%", background:"radial-gradient(circle,rgba(20,184,166,0.22) 0%,transparent 70%)", animation:"blob2 18s ease-in-out infinite" }} />
            {/* Violet blob — center right */}
            <div style={{ position:"absolute", top:"30%", right:"15%", width:"38%", height:"42%", borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,0.16) 0%,transparent 70%)", animation:"blob3 22s ease-in-out infinite" }} />
            {/* Dark mode intensify */}
            <div className="hidden dark:block absolute inset-0" style={{ background:"radial-gradient(ellipse at 30% 40%,rgba(6,182,212,0.08) 0%,transparent 60%)" }} />
          </div>

          {/* ── Content — staggered Framer Motion entrance, replays on each visit ── */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center max-w-xl"
            variants={stagger(0)}
            initial="hidden"
            animate={active === 0 ? "visible" : "hidden"}
          >

            {/* Logo mark */}
            <motion.div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-cyan-500/20"
              variants={fadeScale}
              style={{
                background: "linear-gradient(140deg,#0EA5E9 0%,#0891B2 50%,#0D9488 100%)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.15) inset, 0 20px 48px rgba(8,145,178,0.35)",
              }}
            >
              <ClearIcon size={52} />
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.06] text-slate-800 dark:text-slate-100 mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
              variants={fadeUp}
            >
              Split it.{" "}
              <span style={{ background:"linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                Clear it.
              </span>
            </motion.h1>

            {/* 4 context pills — 2×2 grid */}
            <motion.div className="grid grid-cols-2 gap-2 mb-4" variants={fadeUp}>
              {[
                { icon:"🏖️", label:"Trips",   bg:"rgba(6,182,212,0.1)",   border:"rgba(6,182,212,0.25)",   text:"#0891B2"  },
                { icon:"🏠", label:"Nests",   bg:"rgba(13,148,136,0.1)",  border:"rgba(13,148,136,0.25)",  text:"#0D9488"  },
                { icon:"⇌",  label:"Streams", bg:"rgba(99,102,241,0.1)",  border:"rgba(99,102,241,0.25)",  text:"#6366F1"  },
                { icon:"🪙", label:"Circles", bg:"rgba(139,92,246,0.1)",  border:"rgba(139,92,246,0.25)",  text:"#8B5CF6"  },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold"
                  style={{ background:p.bg, border:`1px solid ${p.border}`, color:p.text }}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Body */}
            <motion.p
              className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-7 max-w-sm"
              variants={fadeUp}
            >
              Trips, households, shared funds, 1:1 debts — every shared expense logged in seconds, settled in the fewest payments.
            </motion.p>

            {/* CTAs */}
            <motion.div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-6" variants={fadeUp}>
              <button
                onClick={() => setLoginModal({ open: true, intent: "signup" })}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold text-sm py-3 px-8 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
              >
                Start for free <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setUserInteracted(true); goTo(1); }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium text-sm py-3 px-8 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                See how it works <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* Trust badges */}
            <motion.div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-6" variants={fadeUp}>
              {[
                { icon:"🔐", text:"Google sign-in" },
                { icon:"💳", text:"No credit card"  },
                { icon:"📱", text:"iOS & Android"   },
              ].map((b) => (
                <span key={b.text} className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <span>{b.icon}</span>{b.text}
                </span>
              ))}
            </motion.div>

            {/* Social proof ticker */}
            <motion.div className="w-full overflow-hidden rounded-xl" style={{ maxWidth:380 }} variants={fadeUp}>
              <div
                className="flex gap-8 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap"
                style={{ animation:"ticker 20s linear infinite" }}
              >
                {[
                  "🏖️ Goa trip · ₹45,000 split between 8 · settled in 3 payments",
                  "🏠 Mumbai Flat · ₹8,200/mo recurring templates",
                  "⇌ Settled ₹12,400 with Priya in 2 taps",
                  "🪙 Bali Fund · ₹50,000 collected · 6 members · goal reached 🎯",
                  "✈️ Manali · ₹1.2L across 12 people · zero confusion",
                  "🏖️ Goa trip · ₹45,000 split between 8 · settled in 3 payments",
                  "🏠 Mumbai Flat · ₹8,200/mo recurring templates",
                  "⇌ Settled ₹12,400 with Priya in 2 taps",
                  "🪙 Bali Fund · ₹50,000 collected · 6 members · goal reached 🎯",
                  "✈️ Manali · ₹1.2L across 12 people · zero confusion",
                ].map((t, i) => (
                  <span key={i} className="shrink-0">{t}</span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 1 — Overview: Trips · Nests · Streams · Circle (2×2 grid)
            Designed for 4 contexts from day 1 — Circle shown as "coming soon".
        ══════════════════════════════════════════════════════════════════ */}
        <div className="snap-start snap-always w-full shrink-0 h-full flex flex-col items-center justify-center px-5 sm:px-8 py-6 overflow-hidden">
          {/* Headline — stagger in when slide 1 is active */}
          <motion.div
            className="text-center mb-5 sm:mb-6"
            variants={stagger(0)}
            initial="hidden"
            animate={active === 1 ? "visible" : "hidden"}
          >
            <motion.p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2" variants={fadeUp}>One app</motion.p>
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-normal leading-[1.08] text-slate-800 dark:text-slate-100 mb-1.5"
              style={{ fontFamily:"var(--font-fraunces)" }}
              variants={fadeUp}
            >
              Every shared expense,{" "}
              <span style={{ background:"linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                covered.
              </span>
            </motion.h2>
            <motion.p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto" variants={fadeUp}>
              Four contexts for every financial relationship — pick the one that fits.
            </motion.p>
          </motion.div>

          {/* 2×2 context grid — cards stagger in after headline */}
          <motion.div
            className="grid grid-cols-2 gap-3 w-full"
            style={{ maxWidth:560 }}
            variants={stagger(0.18)}
            initial="hidden"
            animate={active === 1 ? "visible" : "hidden"}
          >
            {([
              {
                icon:"🏖️", name:"Trips",
                hex:"#0891B2", gradStart:"#22D3EE", gradEnd:"#14B8A6",
                desc:"Multi-day travel groups",
                features:["Day-by-day timeline", "AI trip narrative"],
                comingSoon: false,
              },
              {
                icon:"🏠", name:"Nests",
                hex:"#0D9488", gradStart:"#2DD4BF", gradEnd:"#059669",
                desc:"Ongoing household bills",
                features:["1-tap recurring templates", "Monthly pace tracker"],
                comingSoon: false,
              },
              {
                icon:"⇌", name:"Streams",
                hex:"#6366F1", gradStart:"#818CF8", gradEnd:"#8B5CF6",
                desc:"1:1 bilateral debt ledger",
                features:["No group needed", "Guest confirmation"],
                comingSoon: false,
              },
              {
                icon:"🪙", name:"Circles",
                hex:"#8B5CF6", gradStart:"#A78BFA", gradEnd:"#7C3AED",
                desc:"Shared fund & contributions",
                features:["Recurring & one-time modes", "Ghost members + reminders"],
                comingSoon: false,
              },
            ] as const).map((ctx) => (
              <motion.div
                key={ctx.name}
                className="relative rounded-2xl p-3 sm:p-4 flex flex-col gap-1.5 transition-all"
                variants={fadeScale}
                style={{
                  background: ctx.comingSoon
                    ? `${ctx.hex}08`
                    : `${ctx.hex}12`,
                  border: ctx.comingSoon
                    ? `1.5px dashed ${ctx.hex}30`
                    : `1px solid ${ctx.hex}30`,
                  opacity: ctx.comingSoon ? 0.75 : 1,
                }}
              >
                {/* Coming soon badge */}
                {ctx.comingSoon && (
                  <div
                    className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold"
                    style={{ background:`${ctx.hex}20`, color:ctx.hex, border:`1px solid ${ctx.hex}30` }}
                  >
                    Soon
                  </div>
                )}

                {/* Icon */}
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0"
                  style={{
                    background:`linear-gradient(135deg,${ctx.gradStart},${ctx.gradEnd})`,
                    boxShadow:`0 4px 12px ${ctx.hex}30`,
                  }}
                >
                  {ctx.icon}
                </div>

                {/* Name + desc */}
                <div>
                  <p
                    className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight"
                    style={{ fontFamily:"var(--font-fraunces)" }}
                  >
                    {ctx.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    {ctx.desc}
                  </p>
                </div>

                {/* Feature bullets — desktop only */}
                <div className="hidden sm:flex flex-col gap-1 mt-0.5">
                  {ctx.features.map((f) => (
                    <div key={f} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ background:ctx.hex }} />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 2 — AI Quick-add
        ══════════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          isActive={active === 2}
          label="AI-powered"
          labelHex="#7C3AED"
          headline={<>Just type — or <span style={{ background:"linear-gradient(135deg,#7C3AED 0%,#0891B2 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>speak.</span></>}
          body="Describe an expense in plain English or say it out loud — AI extracts amount, payer, and split in under a second. Or paste a WhatsApp chat to bulk-import a whole trip."
          pills={[
            { icon:"🎤", text:"Voice input",         color:"#7C3AED" },
            { icon:"✨", text:"Parses in <1 second", color:"#0891B2" },
          ]}
          bullets={[
            { e:"✨", t:"Natural language parsing" },
            { e:"💬", t:"WhatsApp chat bulk import" },
            { e:"🎤", t:"Voice input ready" },
            { e:"🧠", t:"Haiku 4.5 — fast & accurate" },
          ]}
          accentGlow="rgba(124,58,237,0.22)"
          tilt={-5}
          callouts={
            <Callout text="✨ Parses in &lt;1s" icon="⚡" side="right" top={265} accentColor="rgba(124,58,237,0.22)" textColor="#C4B5FD" />
          }
          phone={
            /* Full-screen layout — avoids the bottom-sheet clip problem.
               All key elements sit in the top 60% of the phone. */
            <div className="h-full flex flex-col" style={{ background:"#080C14" }}>
              <AppBar
                title="Add expense · Goa 2025"
                right={
                  <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.3)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span style={{ fontSize:9, color:"#A78BFA", fontWeight:600 }}>AI</span>
                  </div>
                }
              />
              <div className="flex-1 px-3.5 pt-2.5 flex flex-col gap-2.5 overflow-hidden">
                {/* Type / Speak toggle */}
                <div className="flex rounded-xl overflow-hidden" style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex-1 flex items-center justify-center gap-1 py-1.5" style={{ fontSize:10, color:"rgba(148,163,184,0.5)", fontWeight:500 }}>
                    <span>⌨️</span><span>Type</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl" style={{ fontSize:10, color:"#A78BFA", fontWeight:700, background:"rgba(124,58,237,0.25)", border:"1px solid rgba(124,58,237,0.4)" }}>
                    <span>🎤</span><span>Speak</span>
                  </div>
                </div>
                {/* Waveform / voice input area */}
                <div
                  className="rounded-2xl px-3.5 py-3"
                  style={{
                    background:"rgba(124,58,237,0.08)",
                    border:"1.5px solid rgba(124,58,237,0.4)",
                    boxShadow:"0 0 0 4px rgba(124,58,237,0.07)",
                  }}
                >
                  {/* Animated waveform bars — transformOrigin bottom so they pulse from base */}
                  <div className="flex items-end justify-center gap-1 mb-2" style={{ height:32 }}>
                    {[0.3,0.6,1,0.8,0.5,0.9,0.4,0.7,1,0.6,0.3,0.8,0.5].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width:3,
                          height:Math.round(h * 30),
                          borderRadius:2,
                          background:`rgba(167,139,250,${0.45 + h * 0.45})`,
                          transformOrigin:"center bottom",
                          animation:`waveBar${i % 4} 0.75s ease-in-out infinite`,
                          animationDelay:`${i * 0.06}s`,
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize:11, color:"rgba(167,139,250,0.8)", textAlign:"center", fontWeight:500 }}>
                    "Priya paid dinner at Taj…"
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    <span style={{ fontSize:10, color:"#A78BFA", fontWeight:600 }}>Listening…</span>
                  </div>
                </div>

                {/* Parsed result chips — appear "below" the input as AI fills them in */}
                <div>
                  <p style={{ fontSize:9, color:"rgba(148,163,184,0.5)", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:8 }}>Parsed</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label:"₹4,500",      bg:"rgba(16,185,129,0.15)", border:"rgba(16,185,129,0.35)", text:"#10B981" },
                      { label:"Priya paid",  bg:"rgba(6,182,212,0.15)",  border:"rgba(6,182,212,0.35)",  text:"#22D3EE" },
                      { label:"5-way equal", bg:"rgba(139,92,246,0.15)", border:"rgba(139,92,246,0.35)", text:"#A78BFA" },
                      { label:"🍽️ Food",     bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)",  text:"#FCD34D" },
                    ].map((chip) => (
                      <div key={chip.label} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background:chip.bg, border:`1px solid ${chip.border}`, fontSize:10.5, color:chip.text, fontWeight:700 }}>
                        <CheckCircle2 style={{ width:10, height:10, color:chip.text }} />
                        {chip.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <div
                  className="rounded-2xl py-3.5 text-center font-bold"
                  style={{
                    background:"linear-gradient(135deg,#7C3AED,#0891B2)",
                    fontSize:13,
                    color:"white",
                    boxShadow:"0 6px 20px rgba(124,58,237,0.4)",
                  }}
                >
                  Save expense ₹4,500
                </div>

                {/* Ghost preview of existing expenses below */}
                <div className="opacity-20 space-y-2 pt-1">
                  {[
                    { label:"Hotel check-in", amt:"₹5,000" },
                    { label:"Airport cab",    amt:"₹1,500" },
                  ].map((e) => (
                    <div key={e.label} className="flex justify-between rounded-xl px-3 py-2" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize:10, color:"rgba(226,232,240,0.7)" }}>{e.label}</span>
                      <span style={{ fontSize:10, color:"rgba(226,232,240,0.5)", fontWeight:600 }}>{e.amt}</span>
                    </div>
                  ))}
                </div>
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 3 — Debt Flow  (SettleFlowDemo rendered inside phone frame)
        ══════════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          isActive={active === 3}
          label="Debt Flow"
          labelHex="#0891B2"
          headline={<>See every IOU <span style={{ background:"linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>at a glance.</span></>}
          body="The Debt Flow graph maps who owes whom with animated arcs and live particles. Tap any arc and the payment card scrolls into view."
          pills={[
            { icon:"💫", text:"Animated flows",  color:"#0891B2" },
            { icon:"👆", text:"Tap arc → pay",   color:"#14B8A6" },
          ]}
          bullets={[
            { e:"💫", t:"Real-time animated money flows" },
            { e:"👆", t:"Tap arc → jump to payment card" },
            { e:"🖐",  t:"Drag nodes to untangle groups"  },
            { e:"🧮", t:"Minimum payment algorithm"       },
          ]}
          phoneRight={false}
          accentGlow="rgba(6,182,212,0.22)"
          tilt={5}
          phone={
            <div className="h-full flex flex-col" style={{ background:"#080C14" }}>
              <AppBar
                title="Settle Up · Goa 2025"
                right={
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span style={{ fontSize:9, color:"#34D399", fontWeight:600 }}>live</span>
                  </div>
                }
              />
              {/* SettleFlowDemo fills the remaining space above the nav.
                  pb-14 (56px) prevents content going behind PhoneNav. */}
              <div className="flex-1 overflow-hidden flex flex-col justify-center pb-14 px-1 pt-1">
                <SettleFlowDemo dark />
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 3 — Settle Up
        ══════════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          isActive={active === 4}
          label="Settle up"
          labelHex="#059669"
          headline={<>One payment each. <span style={{ background:"linear-gradient(135deg,#059669 0%,#0891B2 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>No math.</span></>}
          body="Clear's algorithm collapses any IOU tangle into the minimum number of transfers — no matter how many people."
          pills={[
            { icon:"🧮", text:"Fewest transfers",  color:"#059669" },
            { icon:"💸", text:"GPay / PhonePe UPI", color:"#0891B2" },
          ]}
          bullets={[
            { e:"🧮", t:"Minimum payment algorithm" },
            { e:"💸", t:"UPI deep links — GPay, PhonePe" },
            { e:"↩️", t:"5-second undo on each settlement" },
            { e:"📊", t:"Personal math at a glance" },
          ]}
          accentGlow="rgba(5,150,105,0.18)"
          tilt={-5}
          callouts={
            <Callout text="GPay / PhonePe" icon="⚡" side="right" top={260} accentColor="rgba(5,150,105,0.25)" textColor="#34D399" />
          }
          phone={
            <div className="h-full flex flex-col" style={{ background:"#080C14" }}>
              <AppBar title="Settle up · Goa 2025" />
              <div className="flex-1 overflow-hidden px-3 pt-3 pb-14 space-y-2.5">
                {/* Hero balance */}
                <div className="rounded-2xl px-4 py-3.5 text-center" style={{ background:"linear-gradient(135deg,rgba(251,191,36,0.14),rgba(217,119,6,0.08))", border:"1px solid rgba(251,191,36,0.25)", boxShadow:"0 0 20px rgba(251,191,36,0.08)" }}>
                  <p style={{ fontSize:10, color:"rgba(148,163,184,0.6)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Your balance</p>
                  <p className="font-bold" style={{ fontSize:26, color:"#FCD34D", fontFamily:"var(--font-fraunces)" }}>₹2,500 owed</p>
                  <p style={{ fontSize:10, color:"rgba(148,163,184,0.55)", marginTop:3 }}>You paid ₹5,000 · fair share ₹2,500</p>
                </div>
                {/* Net balances */}
                <div className="rounded-2xl px-3.5 py-3" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <p className="font-semibold mb-2.5" style={{ fontSize:9, color:"rgba(226,232,240,0.45)", textTransform:"uppercase", letterSpacing:"0.09em" }}>Net balances</p>
                  {[
                    { name:"Priya", net:"+₹4,000", color:"#34D399" },
                    { name:"You",   net:"−₹2,500", color:"#FCD34D" },
                    { name:"Raj",   net:"−₹1,800", color:"#FCD34D" },
                    { name:"Anil",  net:"+₹1,200", color:"#34D399" },
                    { name:"Meera", net:"−₹0,900", color:"#FCD34D" },
                  ].map((b) => (
                    <div key={b.name} className="flex justify-between py-0.5">
                      <span style={{ fontSize:11, color:"rgba(226,232,240,0.7)" }}>{b.name}</span>
                      <span style={{ fontSize:11, color:b.color, fontWeight:700, fontFamily:"var(--font-fraunces)" }}>{b.net}</span>
                    </div>
                  ))}
                </div>
                {/* Minimum payments */}
                <p className="font-semibold" style={{ fontSize:9, color:"rgba(226,232,240,0.4)", textTransform:"uppercase", letterSpacing:"0.09em" }}>Minimum payments</p>
                {[
                  { to:"Priya", amount:"₹2,500", color:"#0891B2" },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)" }}>
                    <Av name={p.to} color={p.color} size={28} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize:11, color:"rgba(226,232,240,0.9)", fontWeight:600 }}>Pay Priya</p>
                      <p style={{ fontSize:9, color:"rgba(148,163,184,0.5)" }}>GPay · PhonePe · UPI</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5" style={{ background:"linear-gradient(135deg,#059669,#0891B2)", boxShadow:"0 4px 12px rgba(5,150,105,0.35)" }}>
                      <span className="text-white font-bold" style={{ fontSize:11 }}>₹2,500</span>
                      <span className="text-white" style={{ fontSize:11 }}>→</span>
                    </div>
                  </div>
                ))}
                {/* Settled banner */}
                <div className="rounded-2xl px-3.5 py-2.5 flex items-center gap-2" style={{ background:"rgba(5,150,105,0.12)", border:"1px solid rgba(5,150,105,0.25)" }}>
                  <span style={{ fontSize:16 }}>🎉</span>
                  <div>
                    <p style={{ fontSize:11, color:"#34D399", fontWeight:600 }}>All settled ✓</p>
                    <p style={{ fontSize:9, color:"rgba(148,163,184,0.5)" }}>Just 1 payment cleared the whole trip</p>
                  </div>
                </div>
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 4 — Insights
        ══════════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          isActive={active === 5}
          label="Insights"
          labelHex="#D97706"
          headline={<>Understand <span style={{ background:"linear-gradient(135deg,#D97706 0%,#0891B2 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>where it went.</span></>}
          body="Per-group analytics, AI narrative, personal finance view. Category charts, daily spend, member contributions — all automatic."
          pills={[
            { icon:"📊", text:"Category charts",    color:"#D97706" },
            { icon:"✨", text:"AI trip narrative",   color:"#6366F1" },
          ]}
          bullets={[
            { e:"📊", t:"Category & daily spend charts" },
            { e:"👥", t:"Member contributions + fair share" },
            { e:"✨", t:"AI-generated trip narrative" },
            { e:"🟣", t:"Personal finance view (You tab)" },
          ]}
          phoneRight={false}
          accentGlow="rgba(217,119,6,0.18)"
          tilt={5}
          phone={
            <div className="h-full flex flex-col" style={{ background:"#080C14" }}>
              <AppBar title="Insights · Goa 2025" right={<span className="rounded-full px-2.5 py-1 text-amber-400 font-bold" style={{ fontSize:10, background:"rgba(217,119,6,0.15)", border:"1px solid rgba(217,119,6,0.3)" }}>Insights</span>} />
              <div className="flex-1 overflow-hidden px-3 pt-3 pb-14 space-y-2.5">
                {/* KPI tiles */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl p-3" style={{ background:"linear-gradient(135deg,rgba(6,182,212,0.18),rgba(20,184,166,0.08))", border:"1px solid rgba(6,182,212,0.25)" }}>
                    <p style={{ fontSize:9, color:"rgba(148,163,184,0.6)" }}>Total spent</p>
                    <p className="font-bold" style={{ fontSize:18, color:"#22D3EE", fontFamily:"var(--font-fraunces)" }}>₹28,500</p>
                    <p style={{ fontSize:8, color:"rgba(148,163,184,0.5)" }}>5 members · 4 days</p>
                  </div>
                  <div className="rounded-2xl p-3" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    <p style={{ fontSize:9, color:"rgba(148,163,184,0.6)" }}>Per person</p>
                    <p className="font-bold" style={{ fontSize:18, color:"rgba(226,232,240,0.9)", fontFamily:"var(--font-fraunces)" }}>₹5,700</p>
                    <p style={{ fontSize:8, color:"rgba(148,163,184,0.5)" }}>fair share</p>
                  </div>
                </div>
                {/* Category bars */}
                <div className="rounded-2xl px-3 py-2.5" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <p className="font-semibold mb-2" style={{ fontSize:9, color:"rgba(226,232,240,0.45)", textTransform:"uppercase", letterSpacing:"0.08em" }}>By category</p>
                  {[
                    { label:"Accommodation", pct:48, color:"linear-gradient(90deg,#0891B2,#06B6D4)", amount:"₹13,680" },
                    { label:"Food & drink",  pct:29, color:"linear-gradient(90deg,#0D9488,#14B8A6)", amount:"₹8,265"  },
                    { label:"Activities",    pct:15, color:"linear-gradient(90deg,#7C3AED,#A78BFA)", amount:"₹4,275"  },
                    { label:"Transport",     pct:8,  color:"linear-gradient(90deg,#D97706,#F59E0B)", amount:"₹2,280"  },
                  ].map((c) => (
                    <div key={c.label} className="mb-2">
                      <div className="flex justify-between mb-1">
                        <span style={{ fontSize:10, color:"rgba(148,163,184,0.7)" }}>{c.label}</span>
                        <span style={{ fontSize:10, color:"rgba(226,232,240,0.8)", fontWeight:600 }}>{c.amount}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background:"rgba(255,255,255,0.07)" }}>
                        <div className="h-2 rounded-full" style={{ width:`${c.pct}%`, background:c.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Contributions */}
                <div className="rounded-2xl px-3 py-2.5" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <p className="font-semibold mb-2" style={{ fontSize:9, color:"rgba(226,232,240,0.45)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Contributions</p>
                  {[
                    { name:"Priya", pct:88, amount:"₹12,000" },
                    { name:"You",   pct:66, amount:"₹9,000"  },
                    { name:"Raj",   pct:44, amount:"₹6,000"  },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center gap-2 mb-1.5">
                      <span style={{ fontSize:10, color:"rgba(148,163,184,0.7)", width:30, flexShrink:0 }}>{m.name}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ background:"rgba(255,255,255,0.07)" }}>
                        <div className="h-2 rounded-full" style={{ width:`${m.pct}%`, background:"linear-gradient(90deg,#0891B2,#14B8A6)" }} />
                      </div>
                      <span style={{ fontSize:10, color:"rgba(226,232,240,0.8)", fontWeight:600, width:48, textAlign:"right", flexShrink:0 }}>{m.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              <PhoneNav active={2} />
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 5 — Nests
        ══════════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          isActive={active === 6}
          label="Nests"
          labelHex="#0D9488"
          headline={<>Household bills, <span style={{ background:"linear-gradient(135deg,#0D9488 0%,#059669 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>one tap a month.</span></>}
          body="Set up recurring templates for rent, electricity, subscriptions. Every month, log with one tap — split exactly as configured."
          pills={[
            { icon:"🔁", text:"1-tap recurring",    color:"#0D9488" },
            { icon:"📈", text:"Monthly pace track",  color:"#059669" },
          ]}
          bullets={[
            { e:"🔁", t:"Recurring templates — 1 tap/month" },
            { e:"📅", t:"Expenses grouped by month" },
            { e:"📈", t:"Monthly pace tracker" },
            { e:"🏠", t:"Household-specific categories" },
          ]}
          phoneRight={false}
          accentGlow="rgba(13,148,136,0.2)"
          tilt={5}
          phone={
            <div className="h-full flex flex-col" style={{ background:"#080C14" }}>
              <AppBar title="Mumbai Flat · May 2026" right={<RefreshCw style={{ width:13, height:13, color:"#2DD4BF" }} />} />
              <div className="flex-1 overflow-hidden px-3 pt-3 pb-14 space-y-2.5">
                {/* Summary */}
                <div className="rounded-2xl px-4 py-3" style={{ background:"linear-gradient(135deg,rgba(13,148,136,0.18),rgba(5,150,105,0.08))", border:"1px solid rgba(13,148,136,0.3)" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p style={{ fontSize:9, color:"rgba(148,163,184,0.6)" }}>Recurring this month</p>
                      <p className="font-bold" style={{ fontSize:22, color:"#2DD4BF", fontFamily:"var(--font-fraunces)" }}>₹35,948</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize:8, color:"rgba(148,163,184,0.5)" }}>2 of 5 logged</p>
                      <div className="w-20 h-1.5 rounded-full mt-1" style={{ background:"rgba(255,255,255,0.08)" }}>
                        <div className="h-1.5 rounded-full" style={{ width:"40%", background:"linear-gradient(90deg,#0D9488,#34D399)" }} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Templates */}
                <p className="font-semibold" style={{ fontSize:9, color:"rgba(226,232,240,0.4)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Recurring templates</p>
                <div className="space-y-2">
                  {[
                    { icon:"🏠", label:"Monthly rent",   amount:"₹30,000", logged:true,  date:"May 1" },
                    { icon:"⚡", label:"Electricity",    amount:"₹1,800",  logged:true,  date:"May 1" },
                    { icon:"📡", label:"WiFi broadband", amount:"₹999",    logged:false, date:null    },
                    { icon:"🎬", label:"Netflix",        amount:"₹649",    logged:false, date:null    },
                    { icon:"🏢", label:"Society maint.", amount:"₹2,500",  logged:false, date:null    },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ fontSize:16 }}>{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize:11, color:"rgba(226,232,240,0.9)", fontWeight:500 }}>{t.label}</p>
                        <p style={{ fontSize:9, color:"rgba(148,163,184,0.5)" }}>{t.amount} · monthly</p>
                      </div>
                      {t.logged ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <CheckCircle2 style={{ width:12, height:12, color:"#10B981" }} />
                          <span style={{ fontSize:9, color:"#10B981", fontWeight:600 }}>{t.date}</span>
                        </div>
                      ) : (
                        <div className="rounded-lg px-2.5 py-1 flex items-center gap-1 shrink-0" style={{ background:"rgba(6,182,212,0.12)", border:"1px solid rgba(6,182,212,0.25)" }}>
                          <CalendarCheck style={{ width:10, height:10, color:"#22D3EE" }} />
                          <span style={{ fontSize:10, color:"#22D3EE", fontWeight:600 }}>Log</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 6 — Streams
        ══════════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          isActive={active === 7}
          label="Streams"
          labelHex="#6366F1"
          headline={<>Track 1:1 money <span style={{ background:"linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>with anyone.</span></>}
          body="No group needed. A bilateral ledger — log, confirm, partially settle, or forgive. Works even for people who don't have Clear yet."
          pills={[
            { icon:"📒", text:"Bilateral spine",       color:"#6366F1" },
            { icon:"✅", text:"Guest confirm link",    color:"#8B5CF6" },
          ]}
          bullets={[
            { e:"📒", t:"Bilateral spine view" },
            { e:"✅", t:"Guest confirmation link" },
            { e:"💚", t:"Partial settle or forgive" },
            { e:"⚡", t:"Swipe left for quick actions" },
          ]}
          accentGlow="rgba(99,102,241,0.2)"
          tilt={-5}
          phone={
            <div className="h-full flex flex-col" style={{ background:"#080C14" }}>
              <AppBar title="With Priya" right={
                <span className="rounded-full px-2.5 py-1 font-bold" style={{ fontSize:10, background:"rgba(251,191,36,0.12)", color:"#FCD34D", border:"1px solid rgba(251,191,36,0.25)" }}>₹1,200 owed</span>
              } />
              <div className="flex-1 overflow-hidden px-3 pt-3 pb-14 space-y-2.5">
                {/* Balance hero */}
                <div className="rounded-2xl px-4 py-3" style={{ background:"linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.08))", border:"1px solid rgba(99,102,241,0.3)" }}>
                  <p style={{ fontSize:9, color:"rgba(148,163,184,0.6)" }}>Net balance</p>
                  <p className="font-bold" style={{ fontSize:22, color:"#FCD34D", fontFamily:"var(--font-fraunces)" }}>₹1,200 owed</p>
                  <div className="flex gap-4 mt-2">
                    {[{ label:"Confirmed", amt:"₹800", color:"#10B981" }, { label:"Pending", amt:"₹400", color:"#FCD34D" }].map((s) => (
                      <div key={s.label}>
                        <p style={{ fontSize:8, color:"rgba(148,163,184,0.5)" }}>{s.label}</p>
                        <p style={{ fontSize:11, color:s.color, fontWeight:700 }}>{s.amt}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Spine */}
                <p className="font-semibold" style={{ fontSize:9, color:"rgba(226,232,240,0.4)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Recent entries</p>
                <div className="relative space-y-2">
                  <div className="absolute" style={{ left:"50%", top:0, bottom:0, width:1, background:"rgba(255,255,255,0.08)", transform:"translateX(-50%)" }} />
                  {[
                    { side:"right", label:"Priya covered cab",    amount:"₹800", status:"confirmed", color:"#0891B2" },
                    { side:"left",  label:"You paid lunch",        amount:"₹400", status:"pending",   color:"#6366F1" },
                    { side:"right", label:"Priya bought coffee",   amount:"₹320", status:"confirmed", color:"#0891B2" },
                    { side:"left",  label:"You covered groceries", amount:"₹680", status:"confirmed", color:"#6366F1" },
                  ].map((e, i) => (
                    <div key={i} className={`flex items-center gap-2 ${e.side === "right" ? "flex-row-reverse" : ""}`}>
                      <div className="flex-1 rounded-xl px-2.5 py-2" style={{
                        background:e.side === "right" ? "rgba(8,145,178,0.1)" : "rgba(99,102,241,0.1)",
                        border:`1px solid ${e.side === "right" ? "rgba(8,145,178,0.22)" : "rgba(99,102,241,0.22)"}`,
                        marginLeft:e.side === "right" ? 8 : 0,
                        marginRight:e.side === "left" ? 8 : 0,
                      }}>
                        <p className="truncate" style={{ fontSize:10, color:"rgba(226,232,240,0.85)", fontWeight:500 }}>{e.label}</p>
                        <div className="flex justify-between items-center mt-0.5">
                          <span style={{ fontSize:11, color:e.color, fontWeight:700, fontFamily:"var(--font-fraunces)" }}>{e.amount}</span>
                          <span style={{ fontSize:8.5, color:e.status === "confirmed" ? "#10B981" : "#FCD34D" }}>
                            {e.status === "confirmed" ? "✓ confirmed" : "⏳ pending"}
                          </span>
                        </div>
                      </div>
                      <div className="w-3 h-3 rounded-full shrink-0 z-10" style={{ background:e.status === "confirmed" ? "#10B981" : "#F59E0B", boxShadow:`0 0 8px ${e.status === "confirmed" ? "rgba(16,185,129,0.6)" : "rgba(245,158,11,0.6)"}` }} />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl py-3 text-center font-bold text-white" style={{ fontSize:13, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", boxShadow:"0 4px 16px rgba(99,102,241,0.3)" }}>
                  Settle with Priya →
                </div>
              </div>
              <PhoneNav active={1} />
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 8 — Circles
        ══════════════════════════════════════════════════════════════════ */}
        <FeatureSlide
          isActive={active === 8}
          label="Circles"
          labelHex="#8B5CF6"
          headline={<>Shared funds, <span style={{ background:"linear-gradient(135deg,#8B5CF6 0%,#F43F5E 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>everyone accountable.</span></>}
          body="Create a shared pool — recurring monthly or collect toward a one-time goal. Every contribution tracked, admin in control, WhatsApp reminders for stragglers."
          pills={[
            { icon:"🪙", text:"Recurring & one-time",  color:"#8B5CF6" },
            { icon:"📲", text:"WhatsApp reminders",    color:"#F43F5E" },
          ]}
          bullets={[
            { e:"🪙", t:"Recurring or one-time contributions" },
            { e:"🏆", t:"Set a target amount + deadline" },
            { e:"📲", t:"WhatsApp group reminder in 1 tap" },
            { e:"👻", t:"Ghost members — no app needed" },
          ]}
          phoneRight={false}
          accentGlow="rgba(139,92,246,0.2)"
          tilt={5}
          callouts={
            <Callout text="₹26k to go" icon="🏆" side="right" top={108} accentColor="rgba(244,63,94,0.2)" textColor="#FB7185" />
          }
          phone={
            <div className="h-full flex flex-col" style={{ background:"#080C14" }}>
              <AppBar
                title="Bali Trip Fund"
                right={
                  <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span style={{ fontSize:9, color:"#A78BFA", fontWeight:600 }}>One-time</span>
                  </div>
                }
              />
              <div className="flex-1 overflow-hidden px-3 pt-3 pb-14 space-y-2.5">
                {/* Progress hero */}
                <div className="rounded-2xl px-4 py-3" style={{ background:"linear-gradient(135deg,rgba(139,92,246,0.18),rgba(244,63,94,0.08))", border:"1px solid rgba(139,92,246,0.3)" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p style={{ fontSize:9, color:"rgba(148,163,184,0.6)" }}>Collected</p>
                      <p className="font-bold" style={{ fontSize:22, color:"#A78BFA", fontFamily:"var(--font-fraunces)" }}>₹24,000</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize:8, color:"rgba(148,163,184,0.5)" }}>of ₹50,000</p>
                      <p style={{ fontSize:10, color:"#FB7185", fontWeight:600 }}>3 of 6 paid</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full mt-2" style={{ background:"rgba(255,255,255,0.07)" }}>
                    <div className="h-2 rounded-full" style={{ width:"48%", background:"linear-gradient(90deg,#8B5CF6,#F43F5E)" }} />
                  </div>
                </div>
                {/* Pending */}
                <p className="font-semibold" style={{ fontSize:9, color:"rgba(226,232,240,0.4)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Pending (2)</p>
                <div className="space-y-1.5">
                  {[
                    { name:"Anil" },
                    { name:"Meera" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ fontSize:10, background:"#334155" }}>{m.name[0]}</div>
                      <span style={{ fontSize:11, color:"rgba(226,232,240,0.55)", flex:1 }}>{m.name}</span>
                      <div className="flex items-center gap-1 rounded-lg px-2 py-1 shrink-0" style={{ background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.25)" }}>
                        <Bell style={{ width:10, height:10, color:"#A78BFA" }} />
                        <span style={{ fontSize:9, color:"#A78BFA", fontWeight:600 }}>Remind</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Paid */}
                <p className="font-semibold" style={{ fontSize:9, color:"rgba(226,232,240,0.4)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Paid (3)</p>
                <div className="space-y-1.5">
                  {[
                    { name:"Priya", amt:"₹8,000", bg:"#0891B2" },
                    { name:"Raj",   amt:"₹8,000", bg:"#16A34A" },
                    { name:"You",   amt:"₹8,000", bg:"#8B5CF6" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.12)" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ fontSize:10, background:m.bg }}>{m.name[0]}</div>
                      <span style={{ fontSize:11, color:"rgba(226,232,240,0.85)", flex:1 }}>{m.name}</span>
                      <CheckCircle2 style={{ width:11, height:11, color:"#10B981" }} />
                      <span style={{ fontSize:11, color:"#10B981", fontWeight:700, fontFamily:"var(--font-fraunces)" }}>{m.amt}</span>
                    </div>
                  ))}
                </div>
                {/* WhatsApp reminder CTA */}
                <div className="rounded-2xl py-3 text-center font-bold text-white" style={{ fontSize:13, background:"linear-gradient(135deg,#8B5CF6,#F43F5E)", boxShadow:"0 4px 16px rgba(139,92,246,0.3)" }}>
                  📲 WhatsApp reminder →
                </div>
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 9 — CTA
        ══════════════════════════════════════════════════════════════════ */}
        <div className="snap-start snap-always w-full shrink-0 h-full flex flex-col items-center justify-center px-6 relative overflow-hidden">
          {/* Ambient blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"60%", height:"60%", borderRadius:"50%", background:"radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%)", animation:"blob1 16s ease-in-out infinite" }} />
            <div style={{ position:"absolute", bottom:"-20%", right:"-10%", width:"55%", height:"55%", borderRadius:"50%", background:"radial-gradient(circle,rgba(5,150,105,0.10) 0%,transparent 70%)", animation:"blob2 20s ease-in-out infinite" }} />
          </div>
          <motion.div
            className="relative z-10 w-full max-w-lg text-center"
            variants={fadeScale}
            initial="hidden"
            animate={active === 9 ? "visible" : "hidden"}
          >
            {/* Glass card */}
            <div
              className="rounded-3xl overflow-hidden px-8 py-12 sm:py-16"
              style={{
                background:"linear-gradient(135deg,rgba(14,116,144,0.95) 0%,rgba(13,148,136,0.95) 50%,rgba(5,150,105,0.95) 100%)",
                boxShadow:"0 40px 80px rgba(6,182,212,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset",
                backdropFilter:"blur(20px)",
              }}
            >
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative z-10">
                {/* Logo */}
                <div className="w-18 h-18 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/30" style={{ width:72, height:72 }}>
                  <ClearIcon size={48} />
                </div>
                <h2 className="text-3xl sm:text-5xl text-white mb-2" style={{ fontFamily:"var(--font-fraunces)" }}>
                  You&apos;ve seen it.
                </h2>
                <h2 className="text-3xl sm:text-5xl text-white/70 mb-6" style={{ fontFamily:"var(--font-fraunces)" }}>
                  Now clear yours.
                </h2>
                <p className="text-teal-100 text-base mb-1">30-day Plus trial. No credit card.</p>
                <p className="text-teal-200/50 text-sm mb-8">Google sign-in · 30 seconds · iOS &amp; Android</p>
                <button
                  onClick={() => setLoginModal({ open: true, intent: "signup" })}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl transition-all hover:-translate-y-0.5"
                >
                  Start for free <ArrowRight className="w-4 h-4" />
                </button>
                <div className="mt-7 flex items-center justify-center gap-5">
                  <Link href="/about"   className="text-teal-200/60 text-sm hover:text-white transition-colors">See all features →</Link>
                  <span className="text-teal-300/30">·</span>
                  <Link href="/pricing" className="text-teal-200/60 text-sm hover:text-white transition-colors">Pricing →</Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      </div>{/* end scroll container */}
      </div>{/* end carousel wrapper */}

      {/* ── Bottom bar ── */}
      <div className="shrink-0 h-13 flex items-center justify-between px-4 sm:px-6 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-t border-slate-100/80 dark:border-slate-800/60 z-50" style={{ height:52 }}>
        {/* Dots + slide label */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <button
                key={i}
                onClick={() => { setUserInteracted(true); goTo(i); }}
                aria-label={`Go to ${SLIDES[i]?.short}`}
                className={`rounded-full transition-all duration-250 ${
                  i === active
                    ? "w-6 h-2.5 bg-gradient-to-r from-cyan-500 to-teal-500"
                    : "w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 hidden sm:inline pl-1">
            {SLIDES[active]?.label}
          </span>
        </div>
        {/* Right side: discovery links only (CTA is in top nav + last slide) */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/about"     className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">About</Link>
          <Link href="/pricing"   className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Pricing</Link>
          <Link href="/changelog" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">What&apos;s New</Link>
        </div>
      </div>

      {/* ── Desktop prev/next arrows ── */}
      {/* ── Client-side login modal (no intercepting route) ── */}
      {loginModal?.open && (
        <LoginModal
          intent={loginModal.intent}
          onClose={() => setLoginModal(null)}
        />
      )}

      <button
        onClick={() => { setUserInteracted(true); goTo(Math.max(0, active - 1)); }}
        className="fixed left-3 top-1/2 -translate-y-1/2 hidden md:flex w-9 h-9 items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-white dark:hover:bg-slate-700 transition-all z-50 disabled:opacity-25"
        disabled={active === 0}
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>
      <button
        onClick={() => { setUserInteracted(true); goTo(Math.min(SLIDE_COUNT - 1, active + 1)); }}
        className="fixed right-3 top-1/2 -translate-y-1/2 hidden md:flex w-9 h-9 items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-white dark:hover:bg-slate-700 transition-all z-50 disabled:opacity-25"
        disabled={active === SLIDE_COUNT - 1}
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      </button>

    </div>
  );
}

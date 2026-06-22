"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight, ChevronLeft, ChevronRight,
  CheckCircle2, RefreshCw, CalendarCheck, Bell,
} from "lucide-react";
import { ClearLogo, ClearIcon } from "@/components/shared/clear-logo";
import { GLYPH_GRADIENT } from "@/lib/brand-glyph";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SettleFlowDemo } from "@/components/marketing/settle-flow-demo";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { motion } from "framer-motion";

// LoginModal pulls in LoginForm → the full Supabase client SDK (auth, realtime,
// postgrest — ~200KB minified). Lazy-loaded so that weight only downloads when
// a visitor actually taps Sign in/Get started, not on every single visit to
// this already JS-heavy carousel (see app/CLAUDE.md Landing Page section).
const LoginModal = dynamic(() => import("@/components/shared/login-modal").then((mod) => mod.LoginModal), { ssr: false });

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
// 11 slides: Hero → Overview → Trips → AI → Settle (Debt Flow merged) → Insights → Stats → Nests → Streams → Circles → CTA
const SLIDE_COUNT = 11;

const SLIDES = [
  { label: "ClearOff",    short: "Home",     accent: "#06B6D4" },
  { label: "Overview",    short: "Overview", accent: "#0891B2" },
  { label: "Trips",       short: "Trips",    accent: "#06B6D4" },
  { label: "AI-powered",  short: "AI",       accent: "#7C3AED" },
  { label: "Settle up",   short: "Settle",   accent: "#059669" },
  { label: "Insights",    short: "Insights", accent: "#D97706" },
  { label: "By the numbers", short: "Stats", accent: "#0891B2" },
  { label: "Nests",       short: "Nests",    accent: "#0D9488" },
  { label: "Streams",     short: "Streams",  accent: "#6366F1" },
  { label: "Circles",     short: "Circles",  accent: "#8B5CF6" },
  { label: "Get started", short: "Start",    accent: "#0D9488" },
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
        {/* ── Wide ambient shadow beneath the device — opacity-50 dark:opacity-100:
            these shadow/glow values were tuned by eye against the dark-mode
            background, where harshness disappears into the surrounding dark
            page. Against the light-mode page they read as a visible dark smudge
            with a soft-but-noticeable rectangular edge instead of fading away
            (reported across multiple slides, 2026-06-22) — halving opacity in
            light mode (the default, no dark: prefix) fixes that without
            touching how it already looks in dark mode. ── */}
        <div
          className="absolute opacity-50 dark:opacity-100"
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

        {/* ── Outer-shell drop shadow — split from the body fill below so
            opacity-50 dark:opacity-100 only softens the shadow, not the
            device's own purple colour. Sits behind the body (rendered first). ── */}
        <div
          className="absolute inset-0 opacity-50 dark:opacity-100"
          style={{
            borderRadius: 54,
            boxShadow:
              "0 12px 32px rgba(58,48,72,0.7)," +   /* tight purple shadow */
              "0 48px 96px rgba(30,20,45,0.55)",     /* wide purple halo */
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
  // the upper ~60% of each screen) is fully visible while the bottom nav bar
  // is hidden — giving an immersive "phone rising from bottom" feel. Clipped to
  // 0.66 (was 0.78) so the header (label + headline + pills, which now sits ABOVE
  // the phone on mobile) plus the phone fit in one viewport without scrolling.
  // 628 × 1.069 × 0.66 ≈ 443px clipped height.
  const MOBILE_W = 310;
  const SCALE    = MOBILE_W / 290;           // ~1.069
  const CLIP_H   = Math.round(628 * SCALE * 0.66); // visible portion

  return (
    <>
      {/* ── Mobile ── */}
      <div
        className="md:hidden relative mx-auto"
        style={{ width: MOBILE_W, height: CLIP_H, overflow: "hidden" }}
      >
        {/* Per-slide ambient glow behind the phone — opacity-50 dark:opacity-100,
            same light-mode softening as PhoneFrame's drop shadow above. */}
        {accentGlow && (
          <div
            className="absolute pointer-events-none opacity-50 dark:opacity-100"
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
            className="absolute pointer-events-none opacity-50 dark:opacity-100"
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

// ─── Breakout card ────────────────────────────────────────────────────────────
// Desktop-only "exploded UI": the slide's hero element lifted OUT of the cramped
// 290-px phone screen and shown large + fully legible in the copy column. Mobile
// keeps the phone + single Callout (no room to break out). A tinted ring + the
// next-to-phone placement read it as "this piece, from this app." The accent
// caption pill ties it to the slide's colour identity.
function BreakoutCard({
  children, accentHex = "#0891B2", caption,
}: {
  children: React.ReactNode; accentHex?: string; caption?: string;
}) {
  return (
    <motion.div className="hidden md:block w-full max-w-[300px] mt-1" variants={fadeScale}>
      <div
        className="relative rounded-2xl p-4 bg-white/85 dark:bg-slate-900/75 backdrop-blur-xl"
        style={{
          border: `1px solid ${accentHex}33`,
          boxShadow: `0 26px 60px ${accentHex}26, 0 4px 16px rgba(0,0,0,0.10)`,
        }}
      >
        {caption && (
          <div
            className="absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide shadow-sm"
            style={{ background: accentHex, color: "white" }}
          >
            {caption}
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
}

// ─── Feature slide layout ─────────────────────────────────────────────────────
// Mobile: phone fills top 60 %, copy + feature pills fill bottom 40 %.
// Desktop: phone + copy side-by-side (phone left or right). When `breakout` is
// supplied it takes the bullets' place in the copy column (it IS the evidence).
function FeatureSlide({
  label, labelColor = "text-cyan-500 dark:text-cyan-400", labelHex,
  headline,
  body, pills, bullets,
  phone, phoneRight = true,
  tilt, accentGlow,
  callouts, breakout,
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
  breakout?: { caption?: string; accentHex?: string; content: React.ReactNode; mobile?: boolean };
  isActive?: boolean;
}) {
  const animState = isActive ? "visible" : "hidden";
  const breakoutAccent = breakout?.accentHex ?? "#0891B2";
  return (
    <div
      className={`snap-start snap-always flex h-full w-full shrink-0 overflow-hidden
        flex-col md:flex-row items-center justify-start md:justify-center
        md:gap-12 lg:gap-16
        md:px-14 lg:px-20 md:py-0
        ${phoneRight ? "" : "md:flex-row-reverse"} ${isActive ? "" : "slide-paused"}`}
      role="group"
      aria-roledescription="slide"
      aria-label={label}
    >
      {/* ── Phone — order-2 on mobile (sits BELOW the header so the copy is
              always visible without scrolling); order-1 on desktop. ── */}
      <motion.div
        className="shrink-0 order-2 md:order-1 w-full md:w-auto flex justify-center pt-1 md:pt-0 relative"
        variants={fadeScale}
        initial="hidden"
        animate={animState}
      >
        <div className="relative">
          <ResponsivePhone tilt={tilt} accentGlow={accentGlow}>
            {phone}
          </ResponsivePhone>
          {callouts}

          {/* Mobile breakout — floating glass card overlapping the phone's lower
              third. Absolute, so it never adds column height (no scroll).
              Opt out with `mobile: false` for slides whose phone visual (e.g. the
              Debt-Flow graph) can't survive being half-covered. */}
          {breakout && breakout.mobile !== false && (
            <div
              className="md:hidden absolute left-1/2 -translate-x-1/2 z-30"
              style={{ bottom: 10, width: "92%", maxWidth: 300 }}
            >
              <div
                className="relative rounded-2xl p-3 bg-white/92 dark:bg-slate-900/88 backdrop-blur-xl"
                style={{
                  border: `1px solid ${breakoutAccent}38`,
                  boxShadow: `0 18px 44px ${breakoutAccent}3a, 0 4px 16px rgba(0,0,0,0.22)`,
                }}
              >
                {breakout.caption && (
                  <div
                    className="absolute -top-2.5 left-3 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide shadow-sm"
                    style={{ background: breakoutAccent, color: "white" }}
                  >
                    {breakout.caption}
                  </div>
                )}
                {breakout.content}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Copy — order-1 on mobile (header on top); order-2 on desktop ── */}
      <motion.div
        className="flex-1 flex flex-col items-center md:items-start text-center md:text-left order-1 md:order-2 min-w-0 max-w-sm md:max-w-xs lg:max-w-sm px-5 md:px-0 pt-2 pb-2 md:py-0"
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

        {/* Body — desktop only, and only when there's no breakout (the breakout
            is the evidence; dropping body keeps the desktop column inside one
            viewport on shorter laptops) */}
        <motion.p className={`${breakout ? "hidden" : "hidden md:block"} text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 max-w-xs`} variants={fadeUp}>
          {body}
        </motion.p>

        {/* Breakout card takes the bullets' place when present — it IS the evidence */}
        {breakout && (
          <BreakoutCard accentHex={breakout.accentHex} caption={breakout.caption}>
            {breakout.content}
          </BreakoutCard>
        )}

        {/* Bullets — stagger individually on desktop (only when no breakout) */}
        {bullets && !breakout && (
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

// ─── Slide window — render virtualization for mobile load perf ────────────────
/**
 * Mounts `children` only when within 1 slide of `active`; otherwise renders a
 * lightweight placeholder with identical scroll-snap sizing (so `handleScroll`'s
 * `scrollLeft / clientWidth` arithmetic and snap geometry stay correct
 * regardless of which slides are virtualized). Constructing a slide's JSX
 * element graph is cheap, but actually mounting it — running `FeatureSlide`'s
 * own function body, Framer Motion's variant setup, and the browser's real
 * layout/paint work for nested SVGs/gradients/phone-frame mockups — is not,
 * and doing that for all 11 slides on first paint was the dominant cost
 * behind the carousel's slow mobile load (June 2026 investigation — see
 * app/CLAUDE.md Landing Page section; the eager LoginModal→Supabase chain was
 * a smaller, separately-fixed contributor). Window is ±1, not just the active
 * slide alone, so a swipe never reveals an empty placeholder mid-gesture — the
 * about-to-be-active neighbor is already mounted by the time the user arrives.
 */
function SlideWindow({ index, active, children }: { index: number; active: number; children: React.ReactNode }) {
  if (Math.abs(active - index) <= 1) return <>{children}</>;
  return (
    <div
      className="snap-start snap-always w-full shrink-0 h-full"
      role="group"
      aria-roledescription="slide"
      aria-label={SLIDES[index]?.label}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CarouselLanding() {
  // On mobile, "/" renders this same component — so a link back to "/" is a
  // dead no-op there (Next.js doesn't navigate a <Link> to the current URL).
  // Only show the "go home"/"see all features" links when mounted at a
  // different route (i.e. "/about", desktop's dedicated tour URL).
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [active, setActive] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Client-side login modal state — avoids Next.js parallel-route intercepting
  // route re-open bug (modal stuck with isOpen:false on second click).
  const [loginModal, setLoginModal] = useState<{ open: boolean; intent?: string } | null>(null);

  // Tracks whether the Hero slide's fade-up entrance has already played once.
  // Lives on CarouselLanding (not inside the slide-0 subtree) so it survives
  // SlideWindow unmounting/remounting that subtree as the user swipes away and
  // back. Starts false so the very first mount — server-rendered HTML, before
  // hydration — never ships the Hero text at opacity:0: Framer Motion can't
  // run JS during SSR, so an `initial="hidden"` Hero would otherwise paint
  // invisible in the SSR'd HTML and stay that way until hydration completes,
  // and Chrome's LCP algorithm excludes 0-opacity elements from candidacy —
  // confirmed via a perf trace as the dominant chunk of this slide's LCP
  // render delay (2026-06-22). Flipped to true after the first paint so any
  // later revisit (swipe away ≥2 slides, then back) still gets the intended
  // animated entrance — see the "replays on each visit" comment below.
  const heroFirstPaintDoneRef = useRef(false);

  const handleScroll = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const idx = Math.round(c.scrollLeft / c.clientWidth);
    setActive(Math.max(0, Math.min(idx, SLIDE_COUNT - 1)));
  }, []);

  const goTo = useCallback((i: number) => {
    const c = containerRef.current;
    if (!c) return;
    // Clamp here (not just at call sites) — every caller today happens to
    // clamp first, but that's not guaranteed for a future call site, and an
    // out-of-range `active` makes SLIDES[active] undefined and breaks
    // SlideWindow's ±1 virtualization window.
    const clamped = Math.max(0, Math.min(i, SLIDE_COUNT - 1));
    c.scrollTo({ left: clamped * c.clientWidth, behavior: "smooth" });
    setActive(clamped);
  }, []);

  // Re-snap on resize/orientation change. `active` is otherwise only ever
  // recomputed from a `scroll` event — a viewport resize (phone rotation, or
  // a desktop browser resize since this component also renders at /about on
  // desktop) changes `clientWidth` without necessarily firing one. Left
  // alone, `active` goes stale: SlideWindow (which only mounts active ± 1)
  // can then unmount the slide actually on screen, leaving a blank
  // aria-label-only placeholder until the user swipes again. Debounced so a
  // drag-resize doesn't re-snap on every intermediate frame.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const c = containerRef.current;
        if (!c) return;
        const idx = Math.max(0, Math.min(Math.round(c.scrollLeft / c.clientWidth), SLIDE_COUNT - 1));
        c.scrollTo({ left: idx * c.clientWidth });
        setActive(idx);
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Scroll tracking
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.addEventListener("scroll", handleScroll, { passive: true });
    return () => c.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Flips once, right after CarouselLanding's own first paint (this component
  // mounts exactly once per page session — unlike the slide-0 subtree, which
  // SlideWindow unmounts/remounts as the user swipes away and back). From
  // this point on, any (re)mount of the Hero slide gets its normal animated
  // entrance; only the very first one — the SSR/hydration-flash-prone one —
  // skipped it.
  useEffect(() => {
    heroFirstPaintDoneRef.current = true;
  }, []);

  // No autostart — the slideshow waits for the user. A one-time coach hint +
  // edge peek invite the first swipe instead.
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 7000);
    return () => clearTimeout(t);
  }, []);

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
    <div
      className="clear-carousel fixed inset-0 flex flex-col bg-white dark:bg-slate-950"
      role="region"
      aria-roledescription="carousel"
      aria-label="ClearOff feature tour"
    >
      {/* Screen-reader announcement of the current slide */}
      <div aria-live="polite" className="sr-only">
        {`Slide ${active + 1} of ${SLIDE_COUNT}: ${SLIDES[active]?.label}`}
      </div>

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
        @keyframes peekPulse{0%,100%{opacity:0.45;transform:translateX(6px) scaleY(0.94)}50%{opacity:0.85;transform:translateX(0) scaleY(1)}}
        @keyframes chevNudge{0%,100%{transform:translateX(0);opacity:0.55}50%{transform:translateX(4px);opacity:1}}
        @keyframes hintFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        /* Off-screen slides freeze ALL their CSS animations (blobs, ticker,
           waveform, pulse dots) so the browser isn't repainting 10 invisible
           slides at 60fps — big battery/CPU win. Framer Motion (JS-driven) is
           unaffected and already gates on isActive. */
        .slide-paused, .slide-paused *{animation-play-state:paused !important;}
        @media (prefers-reduced-motion: reduce){
          /* Reduced-motion users: kill ALL decorative CSS animation in the
             carousel (blobs, ticker, waveform, pulse dots, peek, hint). Framer
             one-shot entrances are JS-driven and short, so they're left alone. */
          .clear-carousel *{animation:none !important}
        }
      `}</style>

      {/* ── Top nav — two breakpoint-swapped variants, never both mounted
          visibly at once. Mobile keeps its own bespoke nav (Home escape
          hatch, no Pricing — see below); sm: and up uses the same
          MarketingNav every other marketing page uses, for pixel-identical
          logo placement and link cluster across /, /about, /pricing,
          /changelog (June 2026 consistency pass). The bottom bar below is
          carousel-position UI only, not navigation. ── */}
      <nav className="sm:hidden shrink-0 h-14 flex items-center justify-between px-4 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-100/80 dark:border-slate-800/60">
        {/* On mobile's own "/" there's nowhere further "home" to go, so it's
            a plain, unlinked logo; on /about (rare on mobile, but reachable
            by direct URL) it's a real back-to-home link. */}
        {isHome ? (
          <ClearLogo iconSize={30} showWordmark={false} className="flex items-center gap-2" />
        ) : (
          <Link href="/" className="flex items-center gap-2 group">
            <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            <ClearLogo iconSize={30} showWordmark={false} className="flex items-center gap-2" />
          </Link>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {/* Mobile has no other route to the full landing page (this carousel
              IS its "/"), so this slot is a "Full site" escape hatch instead of
              Pricing — ?view=full overrides the device check in app/page.tsx.
              Pricing is reachable from there once landed. Labelled "Full site",
              not "Home" — the carousel already IS home for a mobile UA, so a
              "Home" link pointing elsewhere read as broken/misleading
              (reported 2026-06-22). "Full tour" was considered and rejected —
              the carousel's own aria-label is "ClearOff feature tour", so
              that wording would've read as "more of the same" rather than a
              different format.

              Hard window.location.href navigation, not a soft <Link> —
              this was tried once before (2026-06-22) and reverted because
              AboutLanding was heavy enough (451KB) that the extra reload
              cost was a worse regression than the bug it fixed. Since then,
              AboutLanding's 11 feature showcases were lazy-loaded (down to
              ~247KB, see lazy-section.tsx) and a real RSC bug in that work
              was found and fixed — re-tested afterward, soft navigation
              still didn't render fresh content (NavProgress fired, but the
              carousel stayed on screen for a long, visible delay before
              eventually showing the real page) — consistent with Next.js's
              client router cache serving the stale cached "/" entry and
              only swapping in real content once a background revalidation
              finishes, since the router cache is keyed by pathname and "/"
              → "/?view=full" only changes searchParams. A hard navigation
              skips that entirely — same fix the codebase already uses for
              /admin (see app/CLAUDE.md "Admin navigation") — and the
              original objection (page too heavy) no longer applies now
              that the destination is fast. */}
          <button
            onClick={() => {
              window.dispatchEvent(new Event("navprogress"));
              window.location.href = "/?view=full";
            }}
            className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            Full site
          </button>
          <button onClick={() => setLoginModal({ open: true })} className="text-sm font-semibold text-slate-600 dark:text-slate-300 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Sign in</button>
          <button onClick={() => setLoginModal({ open: true, intent: "signup" })} className="inline-flex items-center gap-1.5 bg-gradient-to-br from-[#129DB8] to-[#07788C] hover:from-[#07788C] hover:to-[#08596A] text-white text-sm font-semibold py-2 px-3 rounded-xl shadow-md shadow-cyan-500/25 transition-all hover:-translate-y-0.5">
            Get started
          </button>
        </div>
      </nav>
      <div className="hidden sm:block shrink-0">
        <MarketingNav current={isHome ? "home" : "about"} />
      </div>

      {/* ── Carousel wrapper (relative so right-edge overlay can be absolute) ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* ── Right-edge peek — "there's a next slide" ──
            A dimmed/blurred depth-edge tinted with the NEXT slide's accent colour
            (a faint "reflection" of what's coming) + a pulsing, tappable chevron.
            The base gradient still cleanly cuts the current slide off against the bg. */}
        {active < SLIDE_COUNT - 1 && (
          <>
            {/* base fade — theme-aware */}
            <div
              className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-20 dark:hidden"
              style={{ background: "linear-gradient(to right,transparent 0%,rgba(0,0,0,0.05) 45%,rgba(0,0,0,0.16) 100%)" }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none z-20 hidden dark:block"
              style={{ background: "linear-gradient(to right,transparent 0%,rgba(2,6,23,0.5) 50%,rgba(2,6,23,0.95) 100%)" }}
            />
            {/* accent "card behind" sliver — tinted by the next slide, gently pulsing */}
            <div
              data-peek
              className="absolute right-0 top-[14%] bottom-[14%] w-2.5 pointer-events-none z-20 rounded-l-2xl"
              style={{
                background: `linear-gradient(to bottom, transparent, ${SLIDES[active + 1]?.accent}, transparent)`,
                filter: "blur(2px)",
                animation: "peekPulse 2.6s ease-in-out infinite",
              }}
            />
            {/* tappable pulsing chevron — real affordance on mobile (no arrows there) */}
            <button
              data-peek-chevron
              onClick={() => { setUserInteracted(true); goTo(active + 1); }}
              aria-label="Next slide"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-11 h-11 rounded-full"
              style={{ animation: "chevNudge 1.6s ease-in-out infinite" }}
            >
              <ChevronRight className="w-6 h-6" style={{ color: SLIDES[active + 1]?.accent }} />
            </button>
          </>
        )}

        {/* ── Left-edge peek — subtle "you can go back" depth cue ── */}
        {active > 0 && (
          <div
            data-peek
            className="absolute left-0 top-[16%] bottom-[16%] w-2 pointer-events-none z-20 rounded-r-2xl"
            style={{
              background: `linear-gradient(to bottom, transparent, ${SLIDES[active - 1]?.accent}, transparent)`,
              filter: "blur(2px)",
              opacity: 0.5,
            }}
          />
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
        <SlideWindow index={0} active={active}>
        {/* justify-center-safe is the actual fix (confirmed via cross-device
            testing, 2026-06-22 — only the shortest viewports, iPhone SE/Galaxy
            S8, clip the logo; taller phones render fine, proving this is a
            content-taller-than-viewport overflow, not a contrast/styling issue).
            Plain `justify-center` + overflow-hidden/auto clips or strands the
            TOP of overflowing centered flex content — browsers don't reliably
            let you scroll into the negative space above a centered flex
            container's natural top edge, so the logo (topmost element in the
            stack) stayed clipped regardless of overflow-hidden vs overflow-auto.
            `safe center` is the CSS WG's purpose-built fix: centers normally
            when content fits, falls back to top-alignment (never clips) when
            it doesn't. overflow-y-auto stays as the safety net for the bottom
            overflow that fallback then produces on short viewports. */}
        <div className={`snap-start snap-always w-full shrink-0 h-full relative flex flex-col items-center justify-center-safe px-6 overflow-y-auto overflow-x-hidden ${active === 0 ? "" : "slide-paused"}`} role="group" aria-roledescription="slide" aria-label="ClearOff">

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

          {/* ── Content — staggered Framer Motion entrance, replays on each visit
              (after the very first page load — see heroFirstPaintDoneRef above). ── */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center max-w-xl"
            variants={stagger(0)}
            initial={heroFirstPaintDoneRef.current ? "hidden" : false}
            animate={active === 0 ? "visible" : "hidden"}
          >

            {/* Logo mark — confirmed via DevTools to render at the correct 80×80
                (2026-06-22); the "half visible" report was the gradient's
                darkest corner (#062F38) sitting too close in value to the dark
                page background (#020617/#0F172A) to read as a defined edge.
                The nav logo (ClearLogo component) doesn't have this problem
                because it layers a specular bloom + rim border on top of the
                gradient — this hand-rolled copy was missing both. Added here. */}
            <motion.div
              className="relative w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-cyan-500/20 overflow-hidden"
              variants={fadeScale}
              style={{
                background: GLYPH_GRADIENT,
                boxShadow: "0 20px 48px rgba(8,145,178,0.35)",
              }}
            >
              {/* specular bloom (top-left) — same as ClearLogo */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 28% 16%, rgba(255,255,255,0.5), rgba(255,255,255,0.12) 30%, rgba(255,255,255,0) 62%)",
                }}
              />
              {/* glass rim — same as ClearLogo, defines the edge against any background */}
              <div className="absolute inset-0 rounded-3xl" style={{ border: "1px solid rgba(255,255,255,0.22)" }} />
              <div className="relative flex">
                <ClearIcon size={52} />
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.06] text-slate-800 dark:text-slate-100 mb-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
              variants={fadeUp}
            >
              Split it.
              <br />
              <span style={{ background:"linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                Clear it off.
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#129DB8] to-[#07788C] hover:from-[#07788C] hover:to-[#08596A] text-white font-semibold text-sm py-3 px-8 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
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

            <motion.p className="text-[11px] text-slate-400/70 dark:text-slate-500/70 text-center mb-6 max-w-xs" variants={fadeUp}>
              Native App Store / Play Store apps coming soon — install today as a web app, same full experience.
            </motion.p>

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
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 1 — Overview: Trips · Nests · Streams · Circle (2×2 grid)
            Designed for 4 contexts from day 1 — Circle shown as "coming soon".
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={1} active={active}>
        {/* justify-center-safe + overflow-y-auto — same preventive fix as
            slide 0 (see its comment): avoids the identical clip-on-short-
            viewports failure mode pre-emptively, not because this slide was
            reported broken. */}
        <div className={`snap-start snap-always w-full shrink-0 h-full flex flex-col items-center justify-center-safe px-5 sm:px-8 py-6 overflow-y-auto overflow-x-hidden ${active === 1 ? "" : "slide-paused"}`} role="group" aria-roledescription="slide" aria-label="Overview">
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
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 2 — Trips  (day-by-day timeline in the phone + 3-D map breakout)
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={2} active={active}>
        <FeatureSlide
          isActive={active === 2}
          label="Trips"
          labelHex="#0891B2"
          headline={<>Your trip, <span style={{ background:"linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>day by day.</span></>}
          body="A living timeline — spend, payers and categories for every day — plus a 3-D map that replays exactly where each rupee went."
          pills={[
            { icon:"🗓️", text:"Day-by-day timeline", color:"#0891B2" },
            { icon:"🗺️", text:"3-D map replay",       color:"#14B8A6" },
          ]}
          phoneRight={false}
          accentGlow="rgba(6,182,212,0.2)"
          tilt={-5}
          breakout={{
            accentHex: "#0891B2",
            caption: "3-D map view",
            content: (
              <div>
                <div className="relative rounded-xl overflow-hidden" style={{ height:128, background:"linear-gradient(150deg,#0e7490 0%,#0891B2 45%,#155E75 100%)" }}>
                  {/* faint terrain grid */}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.25) 1px,transparent 1px)", backgroundSize:"22px 22px" }} />
                  {/* isometric 3-D buildings + route path drawn over them */}
                  <svg viewBox="0 0 240 128" className="absolute inset-0 w-full h-full">
                    {[
                      { cx:46,  cy:94, h:15 },
                      { cx:96,  cy:84, h:22 },
                      { cx:150, cy:72, h:13 },
                      { cx:122, cy:100, h:28 },
                      { cx:196, cy:78, h:18 },
                    ].map((b, i) => {
                      const tw = 11, th = 5.5;
                      const top   = `${b.cx},${b.cy-th} ${b.cx+tw},${b.cy} ${b.cx},${b.cy+th} ${b.cx-tw},${b.cy}`;
                      const left  = `${b.cx-tw},${b.cy} ${b.cx},${b.cy+th} ${b.cx},${b.cy+th+b.h} ${b.cx-tw},${b.cy+b.h}`;
                      const right = `${b.cx+tw},${b.cy} ${b.cx},${b.cy+th} ${b.cx},${b.cy+th+b.h} ${b.cx+tw},${b.cy+b.h}`;
                      return (
                        <g key={i} opacity={0.9}>
                          <polygon points={left}  fill="#0A4655" />
                          <polygon points={right} fill="#0E7490" />
                          <polygon points={top}   fill="#5FD8E8" />
                        </g>
                      );
                    })}
                    <path d="M28 96 C70 60, 96 104, 132 64 S196 36, 214 52" fill="none" stroke="#FDE68A" strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" opacity="0.95" />
                  </svg>
                  {/* pins */}
                  {[
                    { x:"10%",  y:"66%", e:"🏨" },
                    { x:"52%",  y:"44%", e:"🏄" },
                    { x:"86%",  y:"34%", e:"🍽️" },
                  ].map((p) => (
                    <div key={p.e} className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full shadow-md" style={{ left:p.x, top:p.y, width:24, height:24, background:"white", fontSize:12 }}>
                      {p.e}
                    </div>
                  ))}
                  {/* day chip */}
                  <div className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)" }}>
                    Day 2 · Goa
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                  Pins, route &amp; 3-D buildings — replay the whole trip on the map.
                </p>
              </div>
            ),
          }}
          phone={
            <div className="h-full flex flex-col" style={{ background:"#080C14" }}>
              <AppBar
                title="Goa 2025 · Timeline"
                right={<span className="rounded-full px-2 py-0.5 text-cyan-300 font-bold" style={{ fontSize:9, background:"rgba(6,182,212,0.15)", border:"1px solid rgba(6,182,212,0.3)" }}>3 days</span>}
              />
              <div className="flex-1 overflow-hidden px-3 pt-3 pb-14 space-y-2">
                {[
                  {
                    badge:"Day 1/3", date:"Mon, Jun 2", total:"₹6,500", tone:"#22D3EE",
                    note:null as string | null,
                    bar:[{ w:"77%", c:"#2563EB" }, { w:"23%", c:"#EA580C" }], barW:"50%",
                    payers:[{ l:"P", c:"#06B6D4" }, { l:"Y", c:"#8B5CF6" }],
                    exp:{ e:"🏨", t:"Hotel check-in", by:"Priya", amt:"₹5,000" },
                  },
                  {
                    badge:"Day 2/3", date:"Tue, Jun 3", total:"₹14,200", tone:"#FCD34D",
                    note:"🔥 busiest day",
                    bar:[{ w:"56%", c:"#16A34A" }, { w:"23%", c:"#EA580C" }, { w:"21%", c:"#9333EA" }], barW:"100%",
                    payers:[{ l:"R", c:"#16A34A" }, { l:"Y", c:"#8B5CF6" }, { l:"P", c:"#06B6D4" }],
                    exp:{ e:"🏄", t:"Water sports", by:"Raj", amt:"₹8,000" },
                  },
                  {
                    badge:"Day 3/3", date:"Wed, Jun 4", total:"₹3,800", tone:"#22D3EE",
                    note:"light day",
                    bar:[{ w:"66%", c:"#DB2777" }, { w:"34%", c:"#EA580C" }], barW:"30%",
                    payers:[{ l:"A", c:"#F59E0B" }, { l:"M", c:"#EC4899" }],
                    exp:{ e:"🛍️", t:"Souvenirs", by:"Anil", amt:"₹2,500" },
                  },
                ].map((d) => (
                  <div key={d.badge} className="rounded-2xl px-3 pt-2 pb-2" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize:9, background:"rgba(6,182,212,0.18)", color:"#67E8F9" }}>{d.badge}</span>
                      <span style={{ fontSize:9.5, color:"rgba(148,163,184,0.7)" }}>{d.date}</span>
                      <span style={{ fontSize:9, color:"rgba(148,163,184,0.4)" }}>·</span>
                      <span className="font-bold tabular-nums" style={{ fontSize:11, color:d.tone, fontFamily:"var(--font-fraunces)" }}>{d.total}</span>
                      <div className="flex-1" />
                      <div className="flex -space-x-1">
                        {d.payers.map((p, i) => (
                          <div key={i} className="rounded-full flex items-center justify-center text-white font-bold ring-1 ring-[#080C14]" style={{ width:16, height:16, fontSize:8, background:p.c }}>{p.l}</div>
                        ))}
                      </div>
                    </div>
                    {/* category bar */}
                    <div className="relative h-2 rounded-full overflow-hidden mb-1.5" style={{ background:"rgba(255,255,255,0.06)" }}>
                      <div className="absolute inset-y-0 left-0 flex rounded-full overflow-hidden" style={{ width:d.barW }}>
                        {d.bar.map((s, i) => (<div key={i} className="h-full" style={{ width:s.w, background:s.c }} />))}
                      </div>
                    </div>
                    {d.note && <p className="text-center font-medium mb-1" style={{ fontSize:8.5, color:d.tone }}>{d.note}</p>}
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize:13 }}>{d.exp.e}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize:10, color:"rgba(226,232,240,0.85)" }}>{d.exp.t}</p>
                        <p style={{ fontSize:8, color:"rgba(148,163,184,0.5)" }}>{d.exp.by}</p>
                      </div>
                      <span className="tabular-nums font-semibold" style={{ fontSize:10, color:"rgba(226,232,240,0.8)" }}>{d.exp.amt}</span>
                    </div>
                  </div>
                ))}
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 3 — AI Quick-add
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={3} active={active}>
        <FeatureSlide
          isActive={active === 3}
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
          breakout={{
            accentHex: "#7C3AED",
            caption: "Chat import",
            content: (
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">Paste a group chat →</p>
                <div className="rounded-lg p-2 mb-2 space-y-1" style={{ background:"rgba(124,58,237,0.06)", border:"1px solid rgba(124,58,237,0.16)" }}>
                  {[
                    { who:"Priya", msg:"paid 4500 for dinner 🍽️" },
                    { who:"Raj",   msg:"got the cab — 800" },
                    { who:"Me",    msg:"hotel was 12k" },
                  ].map((c) => (
                    <p key={c.who} className="text-[10px] leading-snug text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-violet-600 dark:text-violet-300">{c.who}:</span> {c.msg}
                    </p>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize:12 }}>✨</span>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">3 expenses imported</span>
                  <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background:"rgba(124,58,237,0.14)", color:"#7C3AED" }}>₹17,300</span>
                </div>
              </div>
            ),
          }}
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
                    background:"rgba(6,182,212,0.08)",
                    border:"1.5px solid rgba(34,211,238,0.45)",
                    boxShadow:"0 0 0 4px rgba(6,182,212,0.08), 0 0 20px rgba(34,211,238,0.12)",
                  }}
                >
                  {/* Animated waveform bars — cyan so the live voice moment pops
                      against the violet AI theme. transformOrigin bottom = pulse from base. */}
                  <div className="flex items-end justify-center gap-1 mb-2" style={{ height:32 }}>
                    {[0.3,0.6,1,0.8,0.5,0.9,0.4,0.7,1,0.6,0.3,0.8,0.5].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width:3,
                          height:Math.round(h * 30),
                          borderRadius:2,
                          background:"linear-gradient(180deg,#67E8F9,#06B6D4)",
                          opacity:0.6 + h * 0.4,
                          boxShadow:h >= 0.8 ? "0 0 6px rgba(34,211,238,0.6)" : undefined,
                          transformOrigin:"center bottom",
                          animation:`waveBar${i % 4} 0.75s ease-in-out infinite`,
                          animationDelay:`${i * 0.06}s`,
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize:11, color:"rgba(103,232,249,0.9)", textAlign:"center", fontWeight:500 }}>
                    "Priya paid dinner at Taj…"
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span style={{ fontSize:10, color:"#22D3EE", fontWeight:600 }}>Listening…</span>
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
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 4 — Settle Up  (Debt-Flow graph in the phone + minimum-payment
            action lifted into the breakout — the old standalone Debt Flow slide
            is merged in here)
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={4} active={active}>
        <FeatureSlide
          isActive={active === 4}
          label="Settle up"
          labelHex="#059669"
          headline={<>One payment each. <span style={{ background:"linear-gradient(135deg,#059669 0%,#0891B2 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>No math.</span></>}
          body="The Debt-Flow graph maps who owes whom with animated arcs; ClearOff's optimizer collapses the tangle into the fewest transfers. Tap an arc to pay."
          pills={[
            { icon:"💫", text:"Animated Debt Flow", color:"#059669" },
            { icon:"🧮", text:"Fewest transfers",   color:"#0891B2" },
          ]}
          phoneRight={false}
          accentGlow="rgba(5,150,105,0.2)"
          tilt={5}
          breakout={{
            accentHex: "#059669",
            caption: "Minimum payment",
            // Desktop-only: on mobile the Debt-Flow graph fills the phone and an
            // overlay would cover it. The graph's own footer summary carries mobile.
            mobile: false,
            content: (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Your balance</p>
                <p className="text-[20px] font-bold text-amber-500 dark:text-amber-400 leading-none mt-0.5" style={{ fontFamily:"var(--font-fraunces)" }}>You owe ₹2,500</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 mb-2.5">You paid ₹5,000 · fair share ₹2,500</p>
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 mb-2" style={{ background:"rgba(5,150,105,0.06)", border:"1px solid rgba(5,150,105,0.18)" }}>
                  <Av name="Priya" color="#0891B2" size={26} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Pay Priya</p>
                    <p className="text-[9px] text-slate-400">GPay · PhonePe · UPI</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-white font-bold text-[11px]" style={{ background:"linear-gradient(135deg,#059669,#0891B2)" }}>
                    ₹2,500 →
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span>🎉</span> 1 payment clears the whole trip
                </div>
              </div>
            ),
          }}
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
              {/* Debt-Flow graph fills the space above the nav.
                  pb-14 (56px) prevents content going behind PhoneNav. */}
              <div className="flex-1 overflow-hidden flex flex-col justify-center pb-14 px-1 pt-1">
                <SettleFlowDemo dark />
              </div>
              <PhoneNav active={0} />
            </div>
          }
        />
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 5 — Insights
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={5} active={active}>
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
          breakout={{
            accentHex: "#D97706",
            caption: "Spend by category",
            content: (
              <div className="flex items-center gap-4">
                {/* Conic donut */}
                <div className="relative shrink-0" style={{ width:108, height:108 }}>
                  <div
                    className="w-full h-full rounded-full"
                    style={{ background:"conic-gradient(#0891B2 0% 48%, #0D9488 48% 77%, #7C3AED 77% 92%, #D97706 92% 100%)" }}
                  />
                  <div className="absolute inset-[17px] rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
                    <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-none" style={{ fontFamily:"var(--font-fraunces)" }}>₹28.5k</span>
                    <span className="text-[8.5px] text-slate-400 mt-0.5">5 ppl · 4 days</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {[
                    { label:"Accommodation", amount:"₹13,680", pct:"48%", color:"#0891B2" },
                    { label:"Food & drink",  amount:"₹8,265",  pct:"29%", color:"#0D9488" },
                    { label:"Activities",    amount:"₹4,275",  pct:"15%", color:"#7C3AED" },
                    { label:"Transport",     amount:"₹2,280",  pct:"8%",  color:"#D97706" },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background:c.color }} />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 flex-1 min-w-0 truncate">{c.label}</span>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums shrink-0">{c.amount}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums shrink-0 w-7 text-right">{c.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          }}
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
                {/* AI trip narrative — distinctive Clear feature, complements the
                    category donut that's lifted into the breakout card */}
                <div className="rounded-2xl px-3 py-2.5" style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.14),rgba(217,119,6,0.06))", border:"1px solid rgba(124,58,237,0.25)" }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span style={{ fontSize:11 }}>✨</span>
                    <p className="font-semibold" style={{ fontSize:9, color:"#C4B5FD", textTransform:"uppercase", letterSpacing:"0.08em" }}>AI trip story</p>
                  </div>
                  <p style={{ fontSize:10.5, lineHeight:1.5, color:"rgba(226,232,240,0.8)" }}>
                    A food-forward Goa run — <span style={{ color:"#FCD34D", fontWeight:600 }}>Jun 3 was the splurge</span> at ₹14,200. You fronted ₹9,000, so the group owes <span style={{ color:"#34D399", fontWeight:600 }}>you ₹3,300</span>.
                  </p>
                </div>
                {/* Daily spend bars — different chart from the category donut */}
                <div className="rounded-2xl px-3 py-2.5" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="font-semibold" style={{ fontSize:9, color:"rgba(226,232,240,0.45)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Daily spend</p>
                    <span style={{ fontSize:8.5, color:"rgba(148,163,184,0.5)" }}>peak Jun 3</span>
                  </div>
                  <div className="flex items-end justify-between gap-2" style={{ height:54 }}>
                    {[
                      { day:"1", h:38, amt:"6.5k", peak:false },
                      { day:"2", h:30, amt:"5.1k", peak:false },
                      { day:"3", h:54, amt:"14.2k", peak:true  },
                      { day:"4", h:22, amt:"2.7k", peak:false },
                    ].map((d) => (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <span style={{ fontSize:7.5, color:d.peak ? "#FCD34D" : "rgba(148,163,184,0.55)", fontWeight:600 }}>{d.amt}</span>
                        <div
                          className="w-full rounded-md"
                          style={{
                            height:d.h,
                            background:d.peak
                              ? "linear-gradient(180deg,#FCD34D,#D97706)"
                              : "linear-gradient(180deg,#22D3EE,#0891B2)",
                          }}
                        />
                        <span style={{ fontSize:8, color:"rgba(148,163,184,0.5)" }}>D{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <PhoneNav active={2} />
            </div>
          }
        />
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 6 — Stats interstitial (pattern break — no phone, big numbers)
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={6} active={active}>
        {/* justify-center-safe + overflow-y-auto — same preventive fix as slide 0. */}
        <div className={`snap-start snap-always w-full shrink-0 h-full relative flex flex-col items-center justify-center-safe px-6 overflow-y-auto overflow-x-hidden ${active === 6 ? "" : "slide-paused"}`} role="group" aria-roledescription="slide" aria-label="By the numbers">
          {/* Ambient blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div style={{ position:"absolute", top:"-12%", left:"-8%", width:"55%", height:"55%", borderRadius:"50%", background:"radial-gradient(circle,rgba(6,182,212,0.22) 0%,transparent 70%)", animation:"blob1 15s ease-in-out infinite" }} />
            <div style={{ position:"absolute", bottom:"-12%", right:"-8%", width:"52%", height:"52%", borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,0.16) 0%,transparent 70%)", animation:"blob2 19s ease-in-out infinite" }} />
          </div>

          <motion.div
            className="relative z-10 w-full max-w-2xl text-center"
            variants={stagger(0)}
            initial="hidden"
            animate={active === 6 ? "visible" : "hidden"}
          >
            <motion.p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2" variants={fadeUp}>By the numbers</motion.p>
            <motion.h2
              className="text-3xl sm:text-4xl md:text-5xl font-normal leading-[1.08] text-slate-800 dark:text-slate-100 mb-8"
              style={{ fontFamily:"var(--font-fraunces)" }}
              variants={fadeUp}
            >
              The tangle,{" "}
              <span style={{ background:"linear-gradient(135deg,#0891B2 0%,#14B8A6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                untangled.
              </span>
            </motion.h2>

            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" variants={stagger(0.1)}>
              {[
                { big:"₹1.2L",     sub:"split across 12 people",   grad:"linear-gradient(135deg,#0891B2,#14B8A6)" },
                { big:"3",         sub:"payments cleared the trip", grad:"linear-gradient(135deg,#059669,#0891B2)" },
                { big:"<1 sec",    sub:"to log by voice or type",   grad:"linear-gradient(135deg,#7C3AED,#0891B2)" },
                { big:"0",         sub:"accounts needed for guests", grad:"linear-gradient(135deg,#6366F1,#8B5CF6)" },
              ].map((s) => (
                <motion.div
                  key={s.sub}
                  className="rounded-2xl p-4 sm:p-5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 flex flex-col items-center"
                  variants={fadeScale}
                >
                  <span className="text-2xl sm:text-3xl md:text-4xl font-normal leading-none mb-1.5" style={{ fontFamily:"var(--font-fraunces)", background:s.grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                    {s.big}
                  </span>
                  <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug">{s.sub}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.p className="mt-8 text-sm text-slate-500 dark:text-slate-400" variants={fadeUp}>
              One splitting engine. One settlement optimizer. <span className="text-slate-700 dark:text-slate-200 font-medium">Every context.</span>
            </motion.p>
          </motion.div>
        </div>
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 7 — Nests
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={7} active={active}>
        <FeatureSlide
          isActive={active === 7}
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
          breakout={{
            accentHex: "#0D9488",
            caption: "Monthly pace",
            content: (
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Projected May</p>
                    <p className="text-[20px] font-bold text-teal-600 dark:text-teal-300 leading-none mt-0.5" style={{ fontFamily:"var(--font-fraunces)" }}>₹38,400</p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background:"rgba(16,185,129,0.14)", color:"#059669" }}>On pace 🟢</span>
                </div>
                <div className="relative h-2.5 rounded-full overflow-hidden mb-1" style={{ background:"rgba(13,148,136,0.12)" }}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width:"82%", background:"linear-gradient(90deg,#0D9488,#34D399)" }} />
                  {/* avg marker */}
                  <div className="absolute inset-y-0" style={{ left:"88%", width:2, background:"#0891B2" }} />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">vs ₹34,200 · 3-month average</p>
              </div>
            ),
          }}
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
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 8 — Streams
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={8} active={active}>
        <FeatureSlide
          isActive={active === 8}
          label="Streams"
          labelHex="#6366F1"
          headline={<>Track 1:1 money <span style={{ background:"linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>with anyone.</span></>}
          body="No group needed. A bilateral ledger — log, confirm, partially settle, or forgive. Works even for people who don't have ClearOff yet."
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
          breakout={{
            accentHex: "#6366F1",
            caption: "Guest confirm",
            content: (
              <div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2">Priya isn&apos;t on ClearOff yet — share a link, she confirms or disputes. <span className="text-slate-400">No account needed.</span></p>
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 mb-2" style={{ background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.18)" }}>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 flex-1 min-w-0 truncate">clear.app/confirm/9f2a…</span>
                  <span className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white shrink-0" style={{ background:"linear-gradient(135deg,#6366F1,#8B5CF6)" }}>Share</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg py-1.5 text-center text-[10.5px] font-semibold" style={{ background:"rgba(16,185,129,0.1)", color:"#10B981", border:"1px solid rgba(16,185,129,0.25)" }}>✓ Confirm</div>
                  <div className="flex-1 rounded-lg py-1.5 text-center text-[10.5px] font-semibold" style={{ background:"rgba(245,158,11,0.1)", color:"#D97706", border:"1px solid rgba(245,158,11,0.25)" }}>⚠ Dispute</div>
                </div>
              </div>
            ),
          }}
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
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 9 — Circles
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={9} active={active}>
        <FeatureSlide
          isActive={active === 9}
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
          breakout={{
            accentHex: "#8B5CF6",
            caption: "WhatsApp reminder",
            content: (
              <div>
                <div className="rounded-xl p-2.5 mb-2" style={{ background:"rgba(37,211,102,0.08)", border:"1px solid rgba(37,211,102,0.22)" }}>
                  <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 mb-1">🪙 Bali Trip Fund</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug tabular-nums">▓▓▓▓░░░░ 48% · ₹24,000 / ₹50,000</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Pending: <span className="font-medium text-slate-600 dark:text-slate-300">Anil, Meera</span> — pay → clear.app/pay</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize:12 }}>📲</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400">One tap — sends to your group chat</span>
                </div>
              </div>
            ),
          }}
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
        </SlideWindow>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE 10 — CTA
        ══════════════════════════════════════════════════════════════════ */}
        <SlideWindow index={10} active={active}>
        {/* justify-center-safe + overflow-y-auto — same preventive fix as slide 0. */}
        <div className={`snap-start snap-always w-full shrink-0 h-full flex flex-col items-center justify-center-safe px-6 relative overflow-y-auto overflow-x-hidden ${active === 10 ? "" : "slide-paused"}`} role="group" aria-roledescription="slide" aria-label="Get started">
          {/* Ambient blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"60%", height:"60%", borderRadius:"50%", background:"radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%)", animation:"blob1 16s ease-in-out infinite" }} />
            <div style={{ position:"absolute", bottom:"-20%", right:"-10%", width:"55%", height:"55%", borderRadius:"50%", background:"radial-gradient(circle,rgba(5,150,105,0.10) 0%,transparent 70%)", animation:"blob2 20s ease-in-out infinite" }} />
          </div>
          <motion.div
            className="relative z-10 w-full max-w-lg text-center"
            variants={fadeScale}
            initial="hidden"
            animate={active === 10 ? "visible" : "hidden"}
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
                <p className="text-teal-200/50 text-sm mb-1">Google sign-in · 30 seconds · iOS &amp; Android</p>
                <p className="text-teal-200/30 text-[11px] mb-8">Native iOS &amp; Android apps coming soon — install today as a web app.</p>
                <button
                  onClick={() => setLoginModal({ open: true, intent: "signup" })}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-700 font-bold text-base py-3.5 px-10 rounded-2xl shadow-xl transition-all hover:-translate-y-0.5"
                >
                  Start for free <ArrowRight className="w-4 h-4" />
                </button>
                <div className="mt-7 flex items-center justify-center gap-5">
                  {!isHome && (
                    <>
                      <Link href="/" className="text-teal-200/60 text-sm hover:text-white transition-colors">See all features →</Link>
                      <span className="text-teal-300/30">·</span>
                    </>
                  )}
                  <Link href="/pricing" className="text-teal-200/60 text-sm hover:text-white transition-colors">Pricing →</Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        </SlideWindow>

      </div>{/* end scroll container */}

        {/* ── One-time coach hint — invites the first swipe, fades on interaction ── */}
        {showHint && !userInteracted && active === 0 && (
          <button
            data-coach-hint
            onClick={() => { setUserInteracted(true); goTo(1); }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full pl-4 pr-3 py-2 shadow-lg backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60"
            style={{ animation: "hintFloat 2.4s ease-in-out infinite" }}
            aria-label="Swipe or tap to explore the next slide"
          >
            <span className="text-sm font-medium text-slate-600 dark:text-slate-200">Swipe to explore</span>
            <ChevronRight className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          </button>
        )}

      </div>{/* end carousel wrapper */}

      {/* ── Bottom bar — carousel position indicator only. All navigation
          (Home, Pricing, Sign in, Get started) now lives in the top nav for
          every device — this strip used to also carry Home/Pricing ghost-chips,
          but a fixed-bottom zone on a fullscreen `inset-0` layout is exactly
          where mobile Safari/Chrome's own bottom toolbar can overlap and steal
          taps, so anything that must be reliably tappable belongs in the top
          nav instead. ── */}
      <div className="shrink-0 relative h-13 flex items-center justify-center px-4 sm:px-6 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-t border-slate-100/80 dark:border-slate-800/60 z-50" style={{ height:52 }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="relative h-1.5 w-20 sm:w-28 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden shrink-0"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={SLIDE_COUNT}
            aria-valuenow={active + 1}
            aria-label="Carousel progress"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-[width] duration-300 ease-out"
              style={{ width: `${((active + 1) / SLIDE_COUNT) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap truncate">
            <span className="text-slate-600 dark:text-slate-300">{active + 1}</span>/{SLIDE_COUNT}
            <span className="hidden sm:inline"> · {SLIDES[active]?.label}</span>
          </span>
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

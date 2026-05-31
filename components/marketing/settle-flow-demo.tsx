"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Exact same palette as MemberAvatar / DebtFlowGraph
const AVATAR_COLORS = [
  { start: "#22D3EE", end: "#14B8A6" }, // cyan-400 → teal-500
  { start: "#60A5FA", end: "#6366F1" }, // blue-400 → indigo-500
  { start: "#C084FC", end: "#EC4899" }, // purple-400 → pink-500
  { start: "#FB923C", end: "#EF4444" }, // orange-400 → red-500
  { start: "#34D399", end: "#22C55E" }, // emerald-400 → green-500
  { start: "#2DD4BF", end: "#0891B2" }, // teal-400 → cyan-600
  { start: "#818CF8", end: "#A855F7" }, // indigo-400 → purple-500
  { start: "#F472B6", end: "#F43F5E" }, // pink-400 → rose-500
];

// Goa trip — same 5 people shown in the before/after settlement panel
const NODES = [
  { id: "priya", label: "Priya", x: 160, y: 42,  colorIdx: 2, net: +3000 },
  { id: "you",   label: "You",   x: 252, y: 100, colorIdx: 1, net: +1000 },
  { id: "raj",   label: "Raj",   x: 220, y: 182, colorIdx: 4, net: -1000 },
  { id: "meera", label: "Meera", x: 100, y: 182, colorIdx: 7, net: -2000 },
  { id: "anil",  label: "Anil",  x: 68,  y: 100, colorIdx: 5, net: -1000 },
];

// Same 3 transfers the algorithm produces
const PAYMENTS = [
  { fromId: "meera", toId: "priya", label: "₹2,000", amount: 2000, delay: 0    },
  { fromId: "raj",   toId: "priya", label: "₹1,000", amount: 1000, delay: 0.35 },
  { fromId: "anil",  toId: "you",   label: "₹1,000", amount: 1000, delay: 0.7  },
];

const PARTICLE_DUR = 2.0;
const CURVATURE    = 0.22;
const NODE_R       = 22;
const W = 320, H = 245;

function quadPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1,        dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return (
    `M ${x1} ${y1} ` +
    `Q ${mx + (-dy / len) * CURVATURE * len} ${my + (dx / len) * CURVATURE * len} ` +
    `${x2} ${y2}`
  );
}

function quadMid(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1,        dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cpx = mx + (-dy / len) * CURVATURE * len;
  const cpy = my + (dx / len) * CURVATURE * len;
  return {
    x:  0.25 * x1 + 0.5 * cpx + 0.25 * x2,
    y:  0.25 * y1 + 0.5 * cpy + 0.25 * y2,
    nx: -dy / len,
    ny:  dx / len,
  };
}

/**
 * `dark` — forces dark-on-dark styling (phone frame usage in carousel).
 *           Without it the `.glass` class evaluates to a whitish card on
 *           light theme, clashing with the always-dark #080C14 phone bg.
 */
export function SettleFlowDemo({ dark: forceDark = false }: { dark?: boolean }) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 420);
    return () => clearTimeout(t);
  }, []);

  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  const arcs = PAYMENTS.map((p, i) => {
    const fn = nodeMap[p.fromId], tn = nodeMap[p.toId];
    const d   = quadPath(fn.x, fn.y, tn.x, tn.y);
    const mid = quadMid(fn.x, fn.y, tn.x, tn.y);
    const fc  = AVATAR_COLORS[fn.colorIdx % AVATAR_COLORS.length];
    const tc  = AVATAR_COLORS[tn.colorIdx % AVATAR_COLORS.length];
    return { ...p, i, d, fn, tn, mid, fc, tc };
  });

  return (
    <div className="w-full max-w-[340px] mx-auto select-none">
      {/* When `forceDark`, skip the .glass card — the phone frame is the visual
          container. .glass on light theme = rgba(255,255,255,0.6) which turns
          the SVG area grey-white against the dark #080C14 phone interior. */}
      <div className={forceDark
        ? "rounded-3xl overflow-hidden"
        : "glass rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/10 border border-white/60 dark:border-slate-700/40"
      }>

        {/* ── Fake top bar ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-0.5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
            Goa 2025 · Settle Up
          </p>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400">live</span>
          </span>
        </div>

        {/* ── SVG graph ───────────────────────────────────────────── */}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          <defs>
            {/* Node radial gradients */}
            {NODES.map(n => {
              const c = AVATAR_COLORS[n.colorIdx % AVATAR_COLORS.length];
              return (
                <radialGradient key={`ng-${n.id}`} id={`sfng-${n.id}`} cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor={c.start} />
                  <stop offset="100%" stopColor={c.end} />
                </radialGradient>
              );
            })}
            {/* Arc linear gradients (userSpaceOnUse for correct direction) */}
            {arcs.map((arc) => (
              <linearGradient
                key={`ag-${arc.i}`}
                id={`sfag-${arc.i}`}
                gradientUnits="userSpaceOnUse"
                x1={arc.fn.x} y1={arc.fn.y}
                x2={arc.tn.x} y2={arc.tn.y}
              >
                <stop offset="0%"   stopColor={arc.fc.end} stopOpacity={0.6} />
                <stop offset="100%" stopColor={arc.tc.end} stopOpacity={0.92} />
              </linearGradient>
            ))}
          </defs>

          {/* ── Arcs ──────────────────────────────────────────────── */}
          {arcs.map((arc) => (
            <g key={`arc-${arc.i}`}>
              {/* Main stroke — draws in on mount */}
              <motion.path
                d={arc.d}
                fill="none"
                stroke={`url(#sfag-${arc.i})`}
                strokeWidth={arc.amount >= 2000 ? 2.8 : 2}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={drawn ? { pathLength: 1, opacity: 1 } : undefined}
                transition={{ duration: 0.7, delay: arc.delay + 0.1, ease: "easeOut" }}
              />

              {/* Amount label at arc mid, offset by normal */}
              {drawn && (
                <motion.text
                  x={arc.mid.x + arc.mid.nx * 15}
                  y={arc.mid.y + arc.mid.ny * 15}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={8}
                  fontWeight={600}
                  fill={forceDark ? "rgba(148,163,184,0.85)" : "#64748B"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: arc.delay + 0.88 }}
                >
                  {arc.label}
                </motion.text>
              )}

              {/* Flow particles — two per arc, 180° out of phase */}
              {drawn &&
                [0, PARTICLE_DUR / 2].map((phaseOff, pi) => (
                  <circle key={`p-${arc.i}-${pi}`} r={2.5} fill="#FDE68A">
                    {React.createElement("animateMotion", {
                      path: arc.d,
                      dur: `${PARTICLE_DUR}s`,
                      repeatCount: "indefinite",
                      begin: `${arc.delay + 0.78 + phaseOff}s`,
                    })}
                    {React.createElement("animate", {
                      attributeName: "opacity",
                      values: "0;0.9;0.9;0",
                      keyTimes: "0;0.08;0.82;1",
                      dur: `${PARTICLE_DUR}s`,
                      repeatCount: "indefinite",
                      begin: `${arc.delay + 0.78 + phaseOff}s`,
                    })}
                  </circle>
                ))}
            </g>
          ))}

          {/* ── Nodes ─────────────────────────────────────────────── */}
          {NODES.map((node, ni) => {
            const isCreditor = node.net > 0;
            const isDebtor   = node.net < 0;
            const c = AVATAR_COLORS[node.colorIdx % AVATAR_COLORS.length];
            return (
              // Outer <g> handles position only — Framer Motion must NOT own
              // the SVG transform attribute or it will wipe the translate when
              // it applies scale, collapsing the node to (0,0).
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <motion.g
                  style={{ transformOrigin: "0px 0px" }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 22,
                    delay: 0.06 * ni,
                  }}
                >
                  {/* Creditor halo */}
                  {isCreditor && (
                    <circle r={NODE_R + 5} fill={c.end} fillOpacity={0.13} />
                  )}

                  {/* Main avatar circle */}
                  <circle r={NODE_R} fill={`url(#sfng-${node.id})`} />

                  {/* Inner sheen ring */}
                  <circle
                    r={NODE_R - 2}
                    fill="none"
                    stroke="white"
                    strokeWidth={0.75}
                    strokeOpacity={0.22}
                  />

                  {/* Initial */}
                  <text
                    x={0} y={0.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="white"
                    fillOpacity={0.95}
                  >
                    {node.label[0]}
                  </text>

                  {/* Name label */}
                  <text
                    x={0} y={NODE_R + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={8.5}
                    fontWeight={600}
                    fill={forceDark ? "rgba(226,232,240,0.85)" : "#475569"}
                  >
                    {node.label}
                  </text>

                  {/* Net balance */}
                  <text
                    x={0} y={NODE_R + 22}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={7.5}
                    fontWeight={500}
                    fill={isCreditor ? "#10B981" : isDebtor ? "#F59E0B" : "transparent"}
                  >
                    {isCreditor
                      ? `+₹${node.net / 1000}k`
                      : `-₹${Math.abs(node.net) / 1000}k`}
                  </text>
                </motion.g>
              </g>
            );
          })}
        </svg>

        {/* ── Footer summary bar ──────────────────────────────────── */}
        <div className="px-4 pb-4 pt-0">
          <div className={`rounded-2xl px-4 py-2.5 flex items-center justify-between ${
            forceDark
              ? "bg-slate-800/70 border border-slate-700/50"
              : "bg-white/60 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/40"
          }`}>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                3 transfers · ₹4,000
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Everyone's clear ✓
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-amber-500 dark:text-amber-400">You owe ₹1,000</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">tap arc to pay →</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

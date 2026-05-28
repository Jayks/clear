"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { formatCurrency, getMemberName } from "@/lib/utils";
import { MemberProfileSheet } from "@/components/shared/member-profile-sheet";
import type { Transaction } from "@/lib/settle/optimize";
import type { GroupMember } from "@/lib/db/schema/group-members";
import type { MemberBalanceRow } from "@/lib/db/queries/balances";

// Exact same palette as MemberAvatar GRADIENTS for visual consistency
const AVATAR_COLORS = [
  { start: "#22D3EE", end: "#14B8A6" },  // cyan-400 → teal-500
  { start: "#60A5FA", end: "#6366F1" },  // blue-400 → indigo-500
  { start: "#C084FC", end: "#EC4899" },  // purple-400 → pink-500
  { start: "#FB923C", end: "#EF4444" },  // orange-400 → red-500
  { start: "#34D399", end: "#22C55E" },  // emerald-400 → green-500
  { start: "#2DD4BF", end: "#0891B2" },  // teal-400 → cyan-600
  { start: "#818CF8", end: "#A855F7" },  // indigo-400 → purple-500
  { start: "#F472B6", end: "#F43F5E" },  // pink-400 → rose-500
];

const PARTICLE_DUR = 1.8; // seconds per particle loop

function hashName(name: string) {
  return name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getLayout(n: number) {
  if (n <= 2) return { ringR: 78, nodeR: 24, currentR: 30 };
  if (n <= 4) return { ringR: 88, nodeR: 22, currentR: 28 };
  if (n <= 6) return { ringR: 98, nodeR: 20, currentR: 26 };
  if (n <= 9) return { ringR: 105, nodeR: 17, currentR: 22 };
  return { ringR: 110, nodeR: 14, currentR: 19 };
}

interface NodePos { id: string; x: number; y: number; isCurrent: boolean; }

function buildLayout(ids: string[], currentMemberId: string | undefined, cx: number, cy: number): NodePos[] {
  const n = ids.length;
  if (n === 0) return [];
  const sorted = currentMemberId
    ? [currentMemberId, ...ids.filter((id) => id !== currentMemberId)]
    : [...ids];
  const { ringR } = getLayout(n);
  const start = -Math.PI / 2;
  return sorted.map((id, i) => ({
    id,
    x: cx + ringR * Math.cos(start + (2 * Math.PI * i) / n),
    y: cy + ringR * Math.sin(start + (2 * Math.PI * i) / n),
    isCurrent: id === currentMemberId,
  }));
}

interface Arc { d: string; arrowD: string; midX: number; midY: number; }

function computeArc(ax: number, ay: number, bx: number, by: number, fromR: number, toR: number): Arc | null {
  const dx = bx - ax, dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return null;
  const nx = dx / dist, ny = dy / dist;
  const sx = ax + nx * fromR, sy = ay + ny * fromR;
  const ex = bx - nx * (toR + 4), ey = by - ny * (toR + 4);
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;
  const cpx = mx + ny * dist * 0.2, cpy = my - nx * dist * 0.2;
  const midX = 0.25 * sx + 0.5 * cpx + 0.25 * ex;
  const midY = 0.25 * sy + 0.5 * cpy + 0.25 * ey;
  const tdx = ex - cpx, tdy = ey - cpy;
  const tLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
  const tx = tdx / tLen, ty = tdy / tLen;
  const al = 7, aw = 3.5;
  const bax = ex - tx * al, bay = ey - ty * al;
  const f = (n: number) => n.toFixed(2);
  return {
    d: `M ${f(sx)} ${f(sy)} Q ${f(cpx)} ${f(cpy)} ${f(ex)} ${f(ey)}`,
    arrowD: `M ${f(ex)} ${f(ey)} L ${f(bax + ty * aw)} ${f(bay - tx * aw)} L ${f(bax - ty * aw)} ${f(bay + tx * aw)} Z`,
    midX, midY,
  };
}

interface Props {
  suggestions: Transaction[];
  members: GroupMember[];
  balances: MemberBalanceRow[];
  currentMemberId: string | undefined;
  currency: string;
  groupId: string;
}

const W = 360, H = 296;

export function DebtFlowGraph({ suggestions, members, balances, currentMemberId, currency, groupId }: Props) {
  // Early return before any hooks — members.length === 0 means nothing to render
  if (members.length === 0) return null;

  // ── State ──────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [selectedArc, setSelectedArc] = useState<number | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [profileId, setProfileId]     = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isDark, setIsDark]           = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [hasDragged, setHasDragged]   = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [settled, setSettled]         = useState(false);

  // ── Drag refs ──────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const svgRef           = useRef<SVGSVGElement>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const originalLayout   = useRef<NodePos[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const draggingRef      = useRef<string | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dragStart     = useRef<{ svgX: number; svgY: number; nodeX: number; nodeY: number } | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dragMoved     = useRef(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rafRef        = useRef<number | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const arcPathRefs   = useRef<Map<number, SVGPathElement>>(new Map());
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const suppressClick = useRef<Set<string>>(new Set());

  // ── Derived layout data ────────────────────────────────────────────
  const isSettled = suggestions.length === 0;

  const memberName = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m ? getMemberName(m) : "?";
  };

  const displayIds: string[] = isSettled
    ? members.map((m) => m.id)
    : [...new Set([
        ...(currentMemberId ? [currentMemberId] : []),
        ...suggestions.map((s) => s.from),
        ...suggestions.map((s) => s.to),
      ])];

  const cx = W / 2, cy = H / 2 - 8;
  const displayIdsKey = displayIds.join(",");

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [nodePositions, setNodePositions] = useState<NodePos[]>(() =>
    buildLayout(displayIds, currentMemberId, cx, cy)
  );

  // ── Effects ────────────────────────────────────────────────────────

  // Reset layout when members/suggestions change
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const layout = buildLayout(displayIds, currentMemberId, cx, cy);
    originalLayout.current = layout;
    setNodePositions(layout);
    setHasDragged(false);
    setSettled(false);
    setSelectedArc(null);
    draggingRef.current = null;
    dragStart.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayIdsKey]);

  // Mark entry animations as settled (enables fast interactive springs)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const totalDelay = 0.08 + displayIds.length * 0.07 + 0.25 + suggestions.length * 0.22 + 0.8;
    const t = setTimeout(() => setSettled(true), totalDelay * 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayIdsKey]);

  // Dark mode observer
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Reset arc strokeDasharray when first drag begins (Framer Motion pathLength uses it internally)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!hasDragged) return;
    arcPathRefs.current.forEach((el) => {
      if (el) { el.style.strokeDasharray = ""; el.style.strokeDashoffset = ""; }
    });
  }, [hasDragged]);

  // ── Colours ────────────────────────────────────────────────────────
  const { nodeR: baseR, currentR } = getLayout(displayIds.length);
  const nR = (id: string) => (id === currentMemberId ? currentR : baseR);

  const arcColor = (s: Transaction) =>
    s.from === currentMemberId ? "#FBBF24" : s.to === currentMemberId ? "#34D399" : "#94A3B8";

  // Lighter tint of the arc color — used for particles so they stand out against the arc stroke
  const particleColor = (s: Transaction) =>
    s.from === currentMemberId ? "#FEF08A" :   // amber-200
    s.to   === currentMemberId ? "#6EE7B7" :   // emerald-200
    "#E2E8F0";                                  // slate-200

  const pillColor = (s: Transaction) =>
    s.from === currentMemberId
      ? (isDark ? "#D97706" : "#B45309")
      : s.to === currentMemberId
      ? (isDark ? "#059669" : "#047857")
      : (isDark ? "#475569" : "#334155");

  const maxAmount  = Math.max(...suggestions.map((s) => s.amount), 1);
  const arcStrokeW = (amount: number) => 1.5 + (amount / maxAmount) * 2.5;

  // ── Selection opacity — arc selection takes priority ───────────────
  const nodeOp = (id: string) => {
    if (selectedArc !== null) {
      const s = suggestions[selectedArc];
      return s && (s.from === id || s.to === id) ? 1 : 0.15;
    }
    if (!selectedId) return 1;
    const linked = suggestions.some(
      (s) => (s.from === id || s.to === id) && (s.from === selectedId || s.to === selectedId)
    );
    return id === selectedId || linked ? 1 : 0.18;
  };

  const arcOp = (s: Transaction, i: number) => {
    if (selectedArc !== null) return selectedArc === i ? 1 : 0.1;
    if (!selectedId) return 1;
    return s.from === selectedId || s.to === selectedId ? 1 : 0.05;
  };

  // ── Animation timing ───────────────────────────────────────────────
  const NODE_BASE = 0.08, NODE_STEP = 0.07;
  const ARC_BASE  = NODE_BASE + displayIds.length * NODE_STEP + 0.25;
  const ARC_STEP  = 0.22, ARC_DUR = 0.6;

  const labelFill = isDark ? "#94A3B8" : "#64748B";

  // ── Drag helpers ───────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const toSvg = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    // Use the SVG's own CTM so preserveAspectRatio offsets are accounted for.
    // The simple (clientX - rect.left) * (W / rect.width) formula is wrong when
    // the viewBox content doesn't fill the rendered element (e.g. on wide screens
    // with maxHeight clamping the height — the content stays at scale 1 centered,
    // leaving empty space on the sides, so the effective scale is NOT W/rect.width).
    try {
      const ctm = el.getScreenCTM();
      if (ctm) {
        const pt = el.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const p = pt.matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
      }
    } catch {
      // fallthrough to rect-based fallback
    }
    const rect = el.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top)  * (H / rect.height),
    };
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const onNodePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, id: string) => {
    e.stopPropagation();
    const node = nodePositions.find((n) => n.id === id);
    if (!node) return;
    const { x, y } = toSvg(e.clientX, e.clientY);
    draggingRef.current = id;
    dragMoved.current   = false;
    dragStart.current   = { svgX: x, svgY: y, nodeX: node.x, nodeY: node.y };
    (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
  }, [nodePositions, toSvg]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const onNodePointerMove = useCallback((e: React.PointerEvent<SVGGElement>, id: string) => {
    if (draggingRef.current !== id || !dragStart.current) return;
    const { x, y } = toSvg(e.clientX, e.clientY);
    const dx = x - dragStart.current.svgX;
    const dy = y - dragStart.current.svgY;

    if (!dragMoved.current && Math.sqrt(dx * dx + dy * dy) > 3) {
      dragMoved.current = true;
      if (!hasDragged) setHasDragged(true);
    }
    if (!dragMoved.current) return;

    const pad = nR(id) + 4;
    const nx  = Math.max(pad, Math.min(W - pad, dragStart.current.nodeX + dx));
    const ny  = Math.max(pad, Math.min(H - pad - 16, dragStart.current.nodeY + dy));

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setNodePositions((prev) => prev.map((n) => (n.id === id ? { ...n, x: nx, y: ny } : n)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toSvg, hasDragged]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const onNodePointerUp = useCallback((e: React.PointerEvent<SVGGElement>, id: string) => {
    if (draggingRef.current !== id) return;
    draggingRef.current = null;
    dragStart.current   = null;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    if (dragMoved.current) {
      suppressClick.current.add(id);
      setTimeout(() => suppressClick.current.delete(id), 300);
    }
    dragMoved.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arc tap — highlight arc + scroll to & flash the exact payment card
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleArcClick = useCallback((i: number) => {
    setSelectedId(null);
    setSelectedArc((prev) => {
      const next = prev === i ? null : i;
      if (next !== null) {
        requestAnimationFrame(() => {
          const el = document.getElementById(`suggestion-${next}`);
          if (!el) return;
          // Center the card in the viewport so it's unmistakable
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // After scroll settles, briefly flash a cyan ring then fade it out
          setTimeout(() => {
            el.style.transition = "box-shadow 0.12s";
            el.style.boxShadow  = "0 0 0 2px rgba(6,182,212,0.75), 0 0 0 5px rgba(6,182,212,0.18)";
            setTimeout(() => {
              el.style.transition = "box-shadow 0.55s";
              el.style.boxShadow  = "";
              setTimeout(() => { el.style.transition = ""; }, 550);
            }, 650);
          }, 480);
        });
      }
      return next;
    });
  }, []);

  // Reset nodes to their original ring positions
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleReset = useCallback(() => {
    setNodePositions(originalLayout.current.map((n) => ({ ...n })));
    setHasDragged(false);
    setSelectedId(null);
    setSelectedArc(null);
  }, []);

  // ── Derived display values ─────────────────────────────────────────
  const selMember     = selectedId  ? members.find((m) => m.id === selectedId)  ?? null : null;
  const selBal        = selectedId  ? (balances.find((b) => b.memberId === selectedId)?.net ?? 0) : 0;
  const profMember    = profileId   ? members.find((m) => m.id === profileId)   ?? null : null;
  const profBal       = profileId   ? balances.find((b) => b.memberId === profileId)?.net : undefined;
  const selSuggestion = selectedArc !== null ? suggestions[selectedArc] ?? null : null;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="mb-6 relative">

      {/* Reset button — only visible after the user has dragged a node */}
      <AnimatePresence>
        {hasDragged && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={handleReset}
            className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-lg glass text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Reset to original layout"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </motion.button>
        )}
      </AnimatePresence>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", maxHeight: H, touchAction: "none" }}
        aria-label="Group debt flow"
        onClick={() => { setSelectedId(null); setSelectedArc(null); }}
      >
        <defs>
          {/* Node gradients — matching MemberAvatar palette */}
          {nodePositions.map(({ id }) => {
            const c   = AVATAR_COLORS[hashName(memberName(id)) % AVATAR_COLORS.length];
            const sid = id.replace(/-/g, "");
            return (
              <linearGradient key={id} id={`ng-${sid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.start} />
                <stop offset="100%" stopColor={c.end}  />
              </linearGradient>
            );
          })}
          <filter id="glow-you" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-settled" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-drag" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-arc" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Debt arcs ──────────────────────────────────────────────── */}
        {!isSettled && suggestions.map((s, i) => {
          const fn  = nodePositions.find((n) => n.id === s.from);
          const tn  = nodePositions.find((n) => n.id === s.to);
          if (!fn || !tn) return null;
          const arc = computeArc(fn.x, fn.y, tn.x, tn.y, nR(s.from), nR(s.to));
          if (!arc) return null;

          const color         = arcColor(s);
          const pColor        = pillColor(s);
          const pColor2       = particleColor(s);
          const op            = arcOp(s, i);
          const delay         = ARC_BASE + i * ARC_STEP;
          const particleDelay = delay + ARC_DUR + 0.15;
          const amtText       = formatCurrency(s.amount, currency);
          const labelW        = Math.max(46, amtText.length * 7.2);
          const isArcSelected = selectedArc === i;

          return (
            <g
              key={`arc-${i}`}
              style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); handleArcClick(i); }}
            >
              {/* Glow halo on selected arc */}
              {isArcSelected && (
                <motion.path
                  d={arc.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={arcStrokeW(s.amount) + 10}
                  strokeLinecap="round"
                  strokeOpacity={0.18}
                  filter="url(#glow-arc)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}

              {/* Main arc stroke */}
              <motion.path
                ref={(el) => {
                  if (el) arcPathRefs.current.set(i, el as unknown as SVGPathElement);
                  else arcPathRefs.current.delete(i);
                }}
                d={arc.d}
                fill="none"
                stroke={color}
                strokeWidth={arcStrokeW(s.amount)}
                strokeLinecap="round"
                initial={hasDragged ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: hasDragged ? undefined : 1, opacity: op }}
                transition={hasDragged
                  ? { opacity: { duration: 0.12 } }
                  : {
                      pathLength: { delay, duration: ARC_DUR, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
                      opacity:    { delay, duration: 0.12 },
                    }
                }
              />

              {/* Arrowhead */}
              <motion.path
                d={arc.arrowD}
                fill={color}
                initial={hasDragged ? false : { opacity: 0, scale: 0 }}
                animate={{ opacity: op, scale: 1 }}
                transition={hasDragged
                  ? { opacity: { duration: 0.1 } }
                  : { delay: delay + ARC_DUR * 0.78, duration: 0.18, scale: { type: "spring", stiffness: 420, damping: 20 } }
                }
                style={{ transformOrigin: `${arc.midX}px ${arc.midY}px` }}
              />

              {/* Amount pill */}
              <motion.g
                initial={hasDragged ? false : { opacity: 0, scale: 0.65 }}
                animate={{ opacity: op, scale: 1 }}
                transition={hasDragged
                  ? { opacity: { duration: 0.1 } }
                  : { delay: delay + ARC_DUR * 0.68, duration: 0.22, scale: { type: "spring", stiffness: 340, damping: 22 } }
                }
                style={{ transformOrigin: `${arc.midX}px ${arc.midY}px` }}
              >
                <rect
                  x={arc.midX - labelW / 2} y={arc.midY - 10}
                  width={labelW} height={20} rx={10}
                  fill={pColor}
                  stroke="white" strokeWidth={isArcSelected ? 1 : 0.6} strokeOpacity={isArcSelected ? 0.45 : 0.25}
                />
                <text
                  x={arc.midX} y={arc.midY + 4.5}
                  textAnchor="middle" fontSize={9.5} fontWeight="700" fill="white"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {amtText}
                </text>
              </motion.g>

              {/* ── Flow particles — lighter tint so they read on top of the arc stroke ── */}
              {!hasDragged && (
                <>
                  {[0, PARTICLE_DUR / 2].map((phaseOff, pi) => (
                    <circle key={`p-${i}-${pi}`} r={2.6} fill={pColor2}>
                      {React.createElement("animateMotion", {
                        path: arc.d,
                        dur: `${PARTICLE_DUR}s`,
                        repeatCount: "indefinite",
                        begin: `${particleDelay + phaseOff}s`,
                      })}
                      {React.createElement("animate", {
                        attributeName: "opacity",
                        values: "0;0.95;0.95;0",
                        keyTimes: "0;0.08;0.80;1",
                        dur: `${PARTICLE_DUR}s`,
                        repeatCount: "indefinite",
                        begin: `${particleDelay + phaseOff}s`,
                      })}
                    </circle>
                  ))}
                </>
              )}
            </g>
          );
        })}

        {/* ── Settled decorative arcs ─────────────────────────────────── */}
        {isSettled && nodePositions.slice(0, -1).map((n, i) => {
          const next = nodePositions[i + 1];
          const arc  = computeArc(n.x, n.y, next.x, next.y, baseR, baseR);
          if (!arc) return null;
          return (
            <motion.path key={`sa-${i}`}
              d={arc.d} fill="none" stroke="#34D399"
              strokeWidth={1.5} strokeOpacity={0.3}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.25 + i * 0.1, duration: 0.7, ease: "easeOut" as const }}
            />
          );
        })}

        {/* ── Nodes ──────────────────────────────────────────────────── */}
        {nodePositions.map(({ id, x, y, isCurrent }, i) => {
          const name       = memberName(id);
          const r          = nR(id);
          const sid        = id.replace(/-/g, "");
          const isDragging = draggingRef.current === id;
          const label      = isCurrent ? "You" : name.length > 7 ? name.slice(0, 6) + "…" : name;
          const bal        = balances.find((b) => b.memberId === id);
          const net        = bal?.net ?? 0;
          const showBal    = !isSettled && Math.abs(net) > 0.01 && displayIds.length <= 9;
          const nodeDelay  = NODE_BASE + i * NODE_STEP;

          return (
            <g
              key={id}
              transform={`translate(${x},${y})`}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
              onPointerDown={(e) => onNodePointerDown(e, id)}
              onPointerMove={(e) => onNodePointerMove(e, id)}
              onPointerUp={(e)   => onNodePointerUp(e, id)}
              onPointerCancel={() => { draggingRef.current = null; dragStart.current = null; }}
            >
              <motion.g
                initial={{ opacity: 0, scale: 0.25 }}
                animate={{
                  opacity: nodeOp(id),
                  scale:   isDragging ? 1.1 : 1,
                  filter:  isDragging ? "url(#glow-drag)" : isCurrent ? "url(#glow-you)" : "none",
                }}
                transition={
                  !settled
                    ? { delay: nodeDelay, type: "spring", stiffness: 300, damping: 18 }
                    : { type: "spring", stiffness: 450, damping: 28 }
                }
                onClick={(e) => {
                  if (suppressClick.current.has(id)) return;
                  e.stopPropagation();
                  setSelectedArc(null);
                  setSelectedId((prev) => (prev === id ? null : id));
                }}
              >
                {/* Breathing glow — current user */}
                {isCurrent && !isSettled && (
                  <motion.circle
                    cx={0} cy={0} r={r + 5} fill="none"
                    stroke="#06B6D4" strokeWidth={1.8}
                    initial={{ strokeOpacity: 0 }}
                    animate={{ r: [r + 4, r + 9, r + 4], strokeOpacity: [0.2, 0.6, 0.2] }}
                    transition={{ delay: nodeDelay + 0.7, duration: 2.8, repeat: Infinity, ease: "easeInOut" as const }}
                  />
                )}

                {/* Settled glow ring */}
                {isSettled && (
                  <motion.circle
                    cx={0} cy={0} r={r + 4} fill="none"
                    stroke="#34D399" strokeWidth={1.5}
                    initial={{ strokeOpacity: 0 }}
                    animate={{ r: [r + 3, r + 7, r + 3], strokeOpacity: [0.15, 0.45, 0.15] }}
                    transition={{ delay: nodeDelay + 0.5, duration: 2.5, repeat: Infinity, ease: "easeInOut" as const }}
                  />
                )}

                {/* Selection dashed ring */}
                {selectedId === id && (
                  <motion.circle
                    cx={0} cy={0} r={r + 4} fill="none"
                    stroke={isDark ? "#CBD5E1" : "#475569"}
                    strokeWidth={1.5} strokeDasharray="4 3"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                  />
                )}

                {/* Main circle — MemberAvatar gradient fill */}
                <circle
                  cx={0} cy={0} r={r}
                  fill={`url(#ng-${sid})`}
                  filter={
                    isDragging  ? "url(#glow-drag)"
                    : isCurrent ? "url(#glow-you)"
                    : isSettled ? "url(#glow-settled)"
                    : undefined
                  }
                />

                {/* Inner sheen ring — avatar-style white highlight */}
                <circle
                  cx={0} cy={0} r={r - 2}
                  fill="none"
                  stroke="white"
                  strokeWidth={0.75}
                  strokeOpacity={0.22}
                />

                {/* Initials / check mark */}
                <text
                  x={0} y={isSettled ? 5 : (r <= 17 ? 4 : 5)}
                  textAnchor="middle"
                  fontSize={isSettled ? r * 0.72 : r <= 17 ? 8.5 : 10}
                  fontWeight="700" fill="white"
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {isSettled ? "✓" : getInitials(name)}
                </text>

                {/* Name label */}
                <text
                  x={0} y={r + 13}
                  textAnchor="middle"
                  fontSize={r <= 17 ? 7.5 : 9}
                  fontWeight={isCurrent ? "700" : "500"}
                  fill={isCurrent ? (isDark ? "#67E8F9" : "#0891B2") : labelFill}
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {label}
                </text>

                {/* Net balance */}
                {showBal && (
                  <text
                    x={0} y={r + 23}
                    textAnchor="middle" fontSize={7.5} fontWeight="600"
                    fill={net > 0 ? "#34D399" : "#FBBF24"}
                    style={{ userSelect: "none", pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}
                  >
                    {net > 0 ? "+" : "−"}{formatCurrency(Math.abs(net), currency)}
                  </text>
                )}
              </motion.g>
            </g>
          );
        })}
      </svg>

      {/* ── Info bar — 3 states: arc selected / node selected / hint ─── */}
      <AnimatePresence mode="wait">
        {selSuggestion ? (
          /* Arc selected: payment summary + Settle → scroll */
          <motion.div key="arc-info"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }}
            className="flex items-center gap-2.5 mt-1 mx-0.5 glass rounded-xl px-3 py-2.5"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: arcColor(selSuggestion) }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mb-0.5 uppercase tracking-wide font-medium">
                Payment
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate leading-snug">
                {memberName(selSuggestion.from)}{" "}
                <span className="text-slate-400 dark:text-slate-500 font-normal">→</span>{" "}
                {memberName(selSuggestion.to)}
              </p>
            </div>
            <span
              className="text-sm font-bold tabular-nums shrink-0"
              style={{ fontFamily: "var(--font-fraunces)", color: arcColor(selSuggestion) }}
            >
              {formatCurrency(selSuggestion.amount, currency)}
            </span>
            <button
              type="button"
              onClick={() => {
                document.getElementById(`suggestion-${selectedArc}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
            >
              Settle →
            </button>
          </motion.div>
        ) : selMember ? (
          /* Node selected: member summary + View → profile */
          <motion.div key="node-info"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }}
            className="flex items-center gap-3 mt-1 mx-0.5 glass rounded-xl px-3 py-2.5"
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
              background: `linear-gradient(135deg, ${AVATAR_COLORS[hashName(memberName(selectedId!)) % AVATAR_COLORS.length].start}, ${AVATAR_COLORS[hashName(memberName(selectedId!)) % AVATAR_COLORS.length].end})`,
            }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate leading-snug">
                {getMemberName(selMember)}
              </p>
              {Math.abs(selBal) > 0.01 ? (
                <p className={`text-xs font-medium leading-snug ${selBal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {selBal > 0 ? "Owed " : "Owes "}{formatCurrency(Math.abs(selBal), currency)}
                </p>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-snug">Settled</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setProfileId(selectedId)}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
            >
              View →
            </button>
          </motion.div>
        ) : (
          /* Default: contextual hint */
          <motion.p key="hint"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2.5"
          >
            {isSettled
              ? "All debts cleared ✓"
              : "Tap arc → payment · Tap node → details · Drag to rearrange"}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Member profile sheet */}
      {profMember && (
        <MemberProfileSheet
          member={profMember} groupId={groupId} currency={currency}
          currentMemberId={currentMemberId ?? ""} netBalance={profBal}
          isOpen onClose={() => setProfileId(null)}
        />
      )}
    </div>
  );
}

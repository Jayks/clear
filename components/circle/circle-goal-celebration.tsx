"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  groupId:         string;
  collectedAmount: number;
  targetAmount:    number;
  currency:        string;
}

// 28-piece confetti burst — same approach as SettledCelebration
const PIECES = Array.from({ length: 28 }, (_, i) => i);
const COLORS = [
  "#8B5CF6", "#A78BFA", "#7C3AED",  // violets
  "#EC4899", "#F472B6",              // pinks
  "#10B981", "#34D399",              // emeralds
  "#F59E0B", "#FCD34D",              // ambers
  "#3B82F6", "#93C5FD",              // blues
];

export function CircleGoalCelebration({ groupId, collectedAmount, targetAmount, currency }: Props) {
  const storageKey = `clear_circle_goal_${groupId}`;
  const goalHit = collectedAmount >= targetAmount && targetAmount > 0;

  const [show, setShow]           = useState(false);
  const [showConfetti, setConfetti] = useState(false);

  useEffect(() => {
    if (!goalHit) return;
    if (sessionStorage.getItem(storageKey)) return; // already fired this session
    sessionStorage.setItem(storageKey, "1");
    setShow(true);
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 2500);
    return () => clearTimeout(t);
  }, [goalHit, storageKey]);

  if (!goalHit && !show) return null;
  // Show banner even after confetti fades
  if (!goalHit) return null;

  return (
    <div className="relative mb-6">
      {/* Confetti burst */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-10">
          {PIECES.map((i) => {
            const color  = COLORS[i % COLORS.length];
            const isRect = i % 3 !== 0;
            const left   = `${(i / PIECES.length) * 100}%`;
            const delay  = `${(i * 0.06).toFixed(2)}s`;
            const dur    = `${1.8 + (i % 4) * 0.2}s`;
            return (
              <div
                key={i}
                style={{
                  position:        "absolute",
                  top:             "-6px",
                  left,
                  width:           isRect ? "6px" : "8px",
                  height:          isRect ? "12px" : "8px",
                  backgroundColor: color,
                  borderRadius:    isRect ? "1px" : "50%",
                  animation:       `confettiFall ${dur} ease-in ${delay} forwards`,
                  transform:       `rotate(${i * 37}deg)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Goal reached banner */}
      <div className="glass rounded-2xl px-5 py-4 border border-emerald-200/60 dark:border-emerald-700/40
                      bg-gradient-to-r from-emerald-50/80 to-violet-50/60 dark:from-emerald-900/20 dark:to-violet-900/20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              Goal reached!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatCurrency(collectedAmount, currency)} collected
              {collectedAmount > targetAmount && (
                <> · {formatCurrency(collectedAmount - targetAmount, currency)} extra 🎉</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

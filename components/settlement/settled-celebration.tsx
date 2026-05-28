"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  groupId: string;
}

const SESSION_KEY = (id: string) => `clear_settled_confetti_${id}`;

// 30 confetti pieces — mix of small squares and thin rectangles
const PIECES = Array.from({ length: 30 }, (_, i) => {
  const angle = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
  const distance = 120 + Math.random() * 180;
  const colors = [
    "#06B6D4", // cyan-500
    "#14B8A6", // teal-500
    "#10B981", // emerald-500
    "#F59E0B", // amber-500
    "#8B5CF6", // violet-500
    "#34D399", // emerald-400
    "#67E8F9", // cyan-300
  ];
  return {
    id: i,
    color: colors[i % colors.length],
    // final position relative to burst origin
    x: Math.cos(angle) * distance * (0.8 + Math.random() * 0.4),
    y: Math.sin(angle) * distance * (0.6 + Math.random() * 0.4) - 60, // bias upward
    rotate: Math.random() * 720 - 360,
    // shape variety: square vs thin rectangle
    width: i % 3 === 0 ? 10 : 6,
    height: i % 3 === 0 ? 10 : 14,
    delay: Math.random() * 0.15,
    duration: 0.9 + Math.random() * 0.5,
  };
});

export function SettledCelebration({ groupId }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = SESSION_KEY(groupId);
    if (sessionStorage.getItem(key)) return; // already celebrated this session
    sessionStorage.setItem(key, "1");
    setShow(true);
    // auto-remove after all pieces have landed
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, [groupId]);

  return (
    <AnimatePresence>
      {show && (
        // Anchor point sits over the checkmark icon — centred, high on the page
        <div
          className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center"
          aria-hidden="true"
        >
          {/* Burst origin — sits roughly where the CheckCircle is */}
          <div className="relative mt-[38vh]">
            {PIECES.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  opacity: 0,
                  rotate: p.rotate,
                  scale: 0.4,
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: [0.2, 0, 0.8, 1],
                }}
                className="absolute rounded-sm"
                style={{
                  width: p.width,
                  height: p.height,
                  backgroundColor: p.color,
                  top: -p.height / 2,
                  left: -p.width / 2,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  personId: string;
}

const SESSION_KEY = (id: string) => `clear_stream_settled_${id}`;

// Indigo + emerald palette to match Stream's accent
const PIECES = Array.from({ length: 28 }, (_, i) => {
  const angle    = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
  const distance = 100 + Math.random() * 160;
  const colors   = [
    "#6366F1", // indigo-500
    "#8B5CF6", // violet-500
    "#10B981", // emerald-500
    "#34D399", // emerald-400
    "#A78BFA", // violet-400
    "#67E8F9", // cyan-300
    "#F59E0B", // amber-500
  ];
  return {
    id:       i,
    color:    colors[i % colors.length],
    x:        Math.cos(angle) * distance * (0.8 + Math.random() * 0.4),
    y:        Math.sin(angle) * distance * (0.6 + Math.random() * 0.4) - 50,
    rotate:   Math.random() * 720 - 360,
    width:    i % 3 === 0 ? 10 : 6,
    height:   i % 3 === 0 ? 10 : 14,
    delay:    Math.random() * 0.15,
    duration: 0.9 + Math.random() * 0.5,
  };
});

export function StreamSettledCelebration({ personId }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = SESSION_KEY(personId);
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, [personId]);

  return (
    <AnimatePresence>
      {show && (
        <div
          className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center"
          aria-hidden="true"
        >
          <div className="relative mt-[35vh]">
            {PIECES.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.4 }}
                transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0, 0.8, 1] }}
                className="absolute rounded-sm"
                style={{
                  width:           p.width,
                  height:          p.height,
                  backgroundColor: p.color,
                  top:             -p.height / 2,
                  left:            -p.width  / 2,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

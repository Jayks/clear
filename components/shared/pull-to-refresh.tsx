"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72;

export function PullToRefresh() {
  const router = useRouter();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
        active.current = true;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) setPullY(Math.min(dy * 0.45, THRESHOLD + 20));
      else active.current = false;
    }

    function onTouchEnd() {
      if (!active.current) return;
      active.current = false;
      if (pullY >= THRESHOLD) {
        setRefreshing(true);
        router.refresh();
        setTimeout(() => {
          setRefreshing(false);
          setPullY(0);
        }, 1000);
      } else {
        setPullY(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY, refreshing, router]);

  const visible = pullY > 4 || refreshing;
  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      className="fixed left-0 right-0 flex justify-center z-40 pointer-events-none md:hidden transition-[opacity,transform] duration-200"
      style={{
        top: 56,
        opacity: visible ? 1 : 0,
        transform: `translateY(${Math.min(pullY * 0.35, 20)}px)`,
      }}
    >
      <div className="glass rounded-full p-2 shadow-md shadow-cyan-500/10">
        <RefreshCw
          className="w-4 h-4 text-cyan-500"
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
            transition: refreshing ? undefined : "transform 0.05s linear",
            animation: refreshing ? "spin 0.7s linear infinite" : undefined,
          }}
        />
      </div>
    </div>
  );
}

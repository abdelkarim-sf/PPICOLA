"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#6366f1", "#27b089", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

/** Subtle confetti burst — plays once when mounted. */
export default function Confetti({ count = 28 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: 8 + Math.random() * 84,
        delay: Math.random() * 0.25,
        duration: 1.4 + Math.random() * 0.8,
        drift: -40 + Math.random() * 80,
        rotate: -180 + Math.random() * 360,
        size: 5 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: -16, opacity: 1, rotate: 0 }}
          animate={{ x: p.drift, y: 320, opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.45,
            backgroundColor: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

export default function ProgressBar({
  value,
  label,
  tone = "brand",
}: {
  value: number; // 0–100
  label?: string;
  tone?: "brand" | "mint";
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      {(label || pct > 0) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-500 dark:text-gray-400">{label}</span>
          <span className="font-bold text-brand-600 dark:text-brand-300 tabular-nums">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-100/60 dark:bg-white/10">
        <motion.div
          className={`h-full rounded-full ${
            tone === "mint"
              ? "bg-gradient-to-r from-mint-400 to-mint-500"
              : "bg-gradient-to-r from-brand-400 to-brand-600"
          }`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

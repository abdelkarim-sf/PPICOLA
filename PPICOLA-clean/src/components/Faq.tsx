"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item, i) => {
        const open = openIdx === i;
        return (
          <div
            key={i}
            className="rounded-3xl border border-black/[0.04] dark:border-white/10 bg-white/80 dark:bg-white/[0.04] shadow-soft overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(open ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left rtl:text-right"
              aria-expanded={open}
            >
              <span className="font-semibold">{item.q}</span>
              <motion.span
                animate={{ rotate: open ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg ${open ? "bg-brand-500 text-white" : "bg-brand-50 dark:bg-white/10 text-brand-600 dark:text-brand-300"}`}
              >
                +
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                >
                  <p className="px-6 pb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

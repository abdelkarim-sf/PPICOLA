"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/i18n";

export type ToolError = { file?: string; reason: string };

/** Dismissible list of friendly error messages. */
export default function ErrorList({
  errors,
  onDismiss,
}: {
  errors: ToolError[];
  onDismiss?: () => void;
}) {
  const { t } = useT();
  if (!errors.length) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4"
        role="alert"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none">⚠️</span>
            <ul className="space-y-1 text-sm text-rose-600 dark:text-rose-300">
              {errors.map((e, i) => (
                <li key={i}>
                  {e.file && <strong className="font-semibold">{e.file}: </strong>}
                  {e.reason}
                </li>
              ))}
            </ul>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label={t("shared.dismissErrors")}
              className="rounded-lg px-2 py-0.5 text-sm text-rose-400 hover:text-rose-600 dark:hover:text-rose-200"
            >
              ✕
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

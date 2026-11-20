import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  emoji: string;
  title: string;
  desc: string;
  badge?: string;
  children: ReactNode;
  aside: ReactNode;
};

/** Consistent layout for every tool page: header + workspace column + options column. */
export default function ToolShell({ emoji, title, desc, badge, children, aside }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-400 text-2xl shadow-lift sm:h-16 sm:w-16 sm:text-3xl">
            {emoji}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            {badge && (
              <span className="mt-1 inline-block rounded-full bg-mint-50 dark:bg-white/5 border border-mint-200 dark:border-white/10 px-3 py-0.5 text-[11px] font-bold text-mint-700 dark:text-mint-300">
                {badge}
              </span>
            )}
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">{desc}</p>
      </motion.header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">{children}</div>
        <aside className="space-y-6 lg:sticky lg:top-24">{aside}</aside>
      </div>
    </div>
  );
}

/** Card used inside ToolShell columns. */
export function ToolCard({
  title,
  children,
  actions,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-soft p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

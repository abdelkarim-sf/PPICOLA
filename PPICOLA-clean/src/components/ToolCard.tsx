"use client";

import Link from "next/link";
import { useT } from "@/i18n";
import { motion } from "framer-motion";

type Props = {
  href: string;
  title: string;
  desc: string;
  emoji: string;
  accent: string;
  index: number;
};

export default function ToolCard({ href, title, desc, emoji, accent, index }: Props) {
  const { lang } = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
    >
      <Link
        href={href}
        className={`group flex h-full flex-col gap-3 rounded-3xl border border-black/[0.04] dark:border-white/10 bg-gradient-to-br ${accent} bg-white/80 dark:bg-white/[0.04] p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-white/10 text-2xl shadow-soft transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          {emoji}
        </span>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{desc}</p>
        <span className="mt-auto pt-2 text-sm font-semibold text-brand-600 dark:text-brand-300">
          {lang === "ar" ? "فتح الأداة" : "Open tool"} <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
        </span>
      </Link>
    </motion.div>
  );
}

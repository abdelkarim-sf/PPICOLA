"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { config } from "@/config";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useT, LangSwitcher } from "@/i18n";

export default function Navbar() {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/images-to-pdf", label: t("nav.i2p") },
    { href: "/pdf-to-images", label: t("nav.p2i") },
    { href: "/merge-pdfs", label: t("nav.mergePdf") },
    { href: "/merge-images", label: t("nav.mergeImages") },
    { href: "/pdf-reader", label: t("nav.reader") },
  ];

  return (
    <header className="sticky top-0 z-40 glass">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-400 text-lg shadow-lift transition-transform group-hover:scale-105 group-hover:rotate-3">
            <Logo />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            {config.name}
            <span className="text-gradient">.</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-brand-50 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />
          <button
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 dark:border-white/10 bg-white/70 dark:bg-white/5"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.menu")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-brand-600 dark:text-brand-200">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-brand-50 dark:border-white/5"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-brand-50 dark:hover:bg-white/5"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

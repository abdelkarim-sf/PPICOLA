"use client";

import { motion } from "framer-motion";
import DropZone from "@/components/DropZone";
import ToolCard from "@/components/ToolCard";
import Faq from "@/components/Faq";
import { useT } from "@/i18n";

const TOOLS = [
  { href: "/images-to-pdf", emoji: "🖼️", accent: "from-brand-400/20 to-brand-500/5", tKey: "tool1" },
  { href: "/pdf-to-images", emoji: "📄", accent: "from-mint-400/20 to-mint-500/5", tKey: "tool2" },
  { href: "/merge-pdfs", emoji: "📚", accent: "from-violet-400/20 to-violet-500/5", tKey: "tool3" },
  { href: "/merge-images", emoji: "🧩", accent: "from-rose-300/20 to-rose-400/5", tKey: "tool4" },
  { href: "/pdf-reader", emoji: "📖", accent: "from-sky-300/20 to-sky-400/5", tKey: "tool5" },
];

export default function HomeContent() {
  const { t } = useT();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.10),transparent)] rtl:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.10),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-10 sm:pt-20 sm:pb-14 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl"
          >
            {t("home.heroA")} <span className="text-gradient">{t("home.heroB")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-gray-500 dark:text-gray-400"
          >
            {t("home.heroSub")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-10 max-w-2xl"
          >
            <DropZone />
          </motion.div>
        </div>
      </section>

      {/* Tools */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-2xl font-extrabold sm:text-3xl"
        >
          {t("home.toolsTitle")}
        </motion.h2>
        <p className="mt-3 text-center text-sm sm:text-base text-gray-500 dark:text-gray-400">
          {t("home.toolsSub")}
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {TOOLS.map((tool, i) => (
            <ToolCard
              key={tool.href}
              href={tool.href}
              title={t(`home.${tool.tKey}T`)}
              desc={t(`home.${tool.tKey}D`)}
              emoji={tool.emoji}
              accent={tool.accent}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">{t("home.howTitle")}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: n * 0.1 }}
              className="relative rounded-3xl bg-white/80 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/10 p-7 shadow-soft"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-lg font-extrabold text-white shadow-lift">
                {n}
              </span>
              <h3 className="mt-5 text-lg font-bold">{t(`home.stepT${n}`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{t(`home.stepD${n}`)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Privacy note */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600 p-8 sm:p-12 text-white shadow-lift"
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl rtl:-left-20 rtl:right-auto" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <span className="text-6xl animate-floaty">🔒</span>
            <div className="text-center sm:text-left rtl:text-right">
              <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.privacyTitle")}</h2>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-white/85 leading-relaxed">
                {t("home.privacyText")}
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">{t("home.faqTitle")}</h2>
        <div className="mt-10">
          <Faq
            items={[1, 2, 3, 4, 5].map((n) => ({ q: t(`home.faqQ${n}`), a: t(`home.faqA${n}`) }))}
          />
        </div>
      </section>
    </div>
  );
}

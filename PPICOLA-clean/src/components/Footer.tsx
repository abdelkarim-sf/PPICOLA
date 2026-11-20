"use client";

import Link from "next/link";
import { config } from "@/config";
import Logo from "./Logo";
import { useT } from "@/i18n";

export default function Footer() {
  const { t } = useT();
  return (
    <footer className="mt-20 border-t border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-400 text-lg shadow-lift">
                <Logo />
              </span>
              <span className="text-lg font-extrabold">{config.name}.</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {t("footer.tagline")}
            </p>
            {config.donateUrl && (
              <a
                href={config.donateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost mt-5 text-sm"
              >
                {t("footer.support")}
              </a>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t("footer.toolsH")}</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link className="hover:text-brand-500 transition-colors" href="/images-to-pdf">{t("nav.i2p")}</Link></li>
              <li><Link className="hover:text-brand-500 transition-colors" href="/pdf-to-images">{t("nav.p2i")}</Link></li>
              <li><Link className="hover:text-brand-500 transition-colors" href="/merge-pdfs">{t("nav.mergePdf")}</Link></li>
              <li><Link className="hover:text-brand-500 transition-colors" href="/merge-images">{t("nav.mergeImages")}</Link></li>
              <li><Link className="hover:text-brand-500 transition-colors" href="/pdf-reader">{t("nav.reader")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t("footer.companyH")}</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link className="hover:text-brand-500 transition-colors" href="/about">{t("footer.about")}</Link></li>
              <li><Link className="hover:text-brand-500 transition-colors" href="/privacy">{t("footer.privacy")}</Link></li>
              <li><Link className="hover:text-brand-500 transition-colors" href="/terms">{t("footer.terms")}</Link></li>
              <li><Link className="hover:text-brand-500 transition-colors" href="/contact">{t("footer.contact")}</Link></li>
              <li><a className="hover:text-brand-500 transition-colors" href="mailto:bob4rell@gmail.com">bob4rell@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-black/5 dark:border-white/10 pt-6 text-xs text-gray-400 dark:text-gray-500">
          <p>© {new Date().getFullYear()} {config.name}. {t("footer.rights")}</p>
          <p>{t("footer.badges")}</p>
        </div>
      </div>
    </footer>
  );
}

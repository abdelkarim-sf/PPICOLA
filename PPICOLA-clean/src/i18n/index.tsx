"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type Dict } from "./en";
import { ar } from "./ar";

export type Lang = "en" | "ar";
const dicts: Record<Lang, Dict> = { en, ar };

type LangCtx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<LangCtx>({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
  t: (p) => p,
});

function lookup(d: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = d;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    let initial: Lang = "en";
    try {
      const saved = localStorage.getItem("ppicola-lang");
      if (saved === "ar" || saved === "en") initial = saved;
      else if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ar")) initial = "ar";
    } catch {}
    setLangState(initial);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem("ppicola-lang", lang);
    } catch {}
  }, [lang]);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang: setLangState,
      t: (path, vars) => {
        let s = lookup(dicts[lang], path) ?? lookup(dicts.en, path) ?? path;
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            s = s.split(`{${k}}`).join(String(v));
          }
        }
        return s;
      },
    }),
    [lang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}

/** Language toggle button (globe). */
export function LangSwitcher() {
  const { lang, setLang, t } = useT();
  const next: Lang = lang === "ar" ? "en" : "ar";
  return (
    <button
      onClick={() => setLang(next)}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm font-extrabold text-brand-600 dark:text-brand-200 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      {lang === "ar" ? "EN" : "ع"}
    </button>
  );
}

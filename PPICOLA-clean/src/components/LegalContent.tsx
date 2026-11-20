"use client";
import { useT } from "@/i18n";
export default function LegalContent({ page }: { page: "about" | "privacy" | "terms" | "contact" }) {
 const {t}=useT();
 const heading="mt-10 text-xl font-bold";
 const para="mt-3 text-gray-500 dark:text-gray-400 leading-relaxed";
 if(page==='contact') return <article className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
  <h1 className="text-3xl sm:text-4xl font-extrabold">{t('legal.contactT')}</h1><p className="mt-4 text-gray-500 dark:text-gray-400 leading-relaxed">{t('legal.contactP')}</p>
  <div className="mt-10 grid gap-5 sm:grid-cols-2"><div className="card-soft p-6"><span className="text-2xl">✉️</span><h2 className="mt-3 font-bold">{t('legal.email')}</h2><p className="mt-1 text-sm"><a className="text-brand-600 dark:text-brand-300 hover:underline" href="mailto:bob4rell@gmail.com">bob4rell@gmail.com</a></p><p className="mt-2 text-xs text-gray-400">{t('legal.emailHint')}</p></div><div className="card-soft p-6"><span className="text-2xl">🐛</span><h2 className="mt-3 font-bold">{t('legal.bug')}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('legal.bugHint')}</p><a href="mailto:bob4rell@gmail.com?subject=PPICOLA%20bug%20report" className="btn-ghost mt-4 !px-4 !py-2 text-sm">{t('legal.reportBug')}</a></div></div>
 </article>;
 if(page==='about') return <article className="mx-auto max-w-3xl px-4 sm:px-6 py-16"><h1 className="text-3xl sm:text-4xl font-extrabold">{t('legal.aboutT')}</h1><p className={para}>{t('legal.aboutP1')}</p><h2 className={heading}>{t('legal.aboutH1')}</h2><p className={para}>{t('legal.aboutP2')}</p><h2 className={heading}>{t('legal.aboutH2')}</h2><ul className="mt-3 space-y-3 text-gray-500 dark:text-gray-400 leading-relaxed">{[1,2,3].map(n=><li key={n}>{t(`legal.aboutLi${n}`)}</li>)}</ul></article>;
 const prefix=page==='privacy'?'priv':'terms';
 return <article className="mx-auto max-w-3xl px-4 sm:px-6 py-16"><h1 className="text-3xl sm:text-4xl font-extrabold">{t(`legal.${page==='privacy'?'privacyT':'termsT'}`)}</h1><p className="mt-4 text-sm text-gray-400">{t('legal.updated')}</p>{[1,2,3,4,5].map(n=><section key={n}><h2 className={heading}>{t(`legal.${prefix}H${n}`)}</h2><p className={para}>{t(`legal.${prefix}P${n}`)}</p></section>)}<p className={para}><a className="text-brand-600 dark:text-brand-300 hover:underline" href="mailto:bob4rell@gmail.com">bob4rell@gmail.com</a></p></article>;
}

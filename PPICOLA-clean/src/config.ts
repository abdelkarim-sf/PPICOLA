/**
 * PPICOLA — single source of truth for app-wide configuration.
 * To rename the app, change APP_NAME here (plus metadata below).
 */
export const APP_NAME = "PPICOLA";

export const APP_TAGLINE = "Convert & manage images and PDFs — right in your browser.";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ppicola.pages.dev";

export const config = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  url: APP_URL,

  // Donation link (Ko-fi / Buy Me a Coffee). Empty string hides the button.
  donateUrl: process.env.NEXT_PUBLIC_DONATE_URL ?? "",

  // Ads — leave unset to render nothing.
  adsenseId: process.env.NEXT_PUBLIC_ADSENSE_ID ?? "",
  adScriptUrl: process.env.NEXT_PUBLIC_AD_SCRIPT_URL ?? "",

  // Limits
  maxFileBytes: 25 * 1024 * 1024, // 25 MB per file
  maxFiles: 50,

  // Feature flags — premium hooks for later. Premium is NOT built yet.
  features: {
    premium: false,
    premiumNoAds: false,
    premiumBatch: false,
    premiumOcr: false,
    premiumCompression: false,
    premiumPasswordProtection: false,
  },
} as const;

export const isPremiumEnabled = config.features.premium;

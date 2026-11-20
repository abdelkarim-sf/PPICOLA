import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Cairo } from "next/font/google";
import "./globals.css";
import { config } from "@/config";
import ThemeScript from "@/components/ThemeScript";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LangProvider } from "@/i18n";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const arabic = Cairo({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(config.url),
  title: {
    default: `${config.name} — Convert & manage images and PDFs`,
    template: `%s · ${config.name}`,
  },
  description:
    "Free, private, beginner-friendly tools to convert images to PDF, PDFs to images, and merge files — all in your browser. Your files never leave your device.",
  applicationName: config.name,
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "PPICOLA" }],
    siteName: config.name,
    title: `${config.name} — Convert & manage images and PDFs`,
    description:
      "Free, private tools to convert images to PDF, PDFs to images, and merge files — all in your browser.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d1a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${arabic.variable}`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen flex flex-col">
        <LangProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}

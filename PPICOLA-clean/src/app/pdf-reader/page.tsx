import type { Metadata } from "next";
import PdfReaderClient from "@/components/tools/PdfReaderClient";

export const metadata: Metadata = {
  title: "PDF Reader — read PDFs online, free",
  description:
    "Open and read PDFs directly in your browser. Smooth scrolling, zoom, thumbnails, search, dark mode and fullscreen — free, private, nothing uploaded.",
  openGraph: {
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "PPICOLA" }],
    title: "PDF Reader · PPICOLA",
    description: "Read PDFs in your browser — free, private, offline-friendly.",
  },
};

export default function PdfReaderPage() {
  return <PdfReaderClient />;
}

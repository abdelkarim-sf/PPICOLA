import type { Metadata } from "next";
import PdfToImagesClient from "@/components/tools/PdfToImagesClient";

export const metadata: Metadata = {
  title: "PDF to Images — free online converter",
  description:
    "Extract PDF pages as high-quality JPG or PNG images for free. Select pages, crop or rotate, choose resolution, download single images or a ZIP. Private — everything runs in your browser.",
  openGraph: {
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "PPICOLA" }],
    title: "PDF to Images · PPICOLA",
    description: "Turn PDF pages into JPG or PNG images — free, private, in your browser.",
  },
};

export default function PdfToImagesPage() {
  return <PdfToImagesClient />;
}

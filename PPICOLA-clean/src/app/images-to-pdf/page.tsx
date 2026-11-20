import type { Metadata } from "next";
import ImagesToPdfClient from "@/components/tools/ImagesToPdfClient";

export const metadata: Metadata = {
  title: "Images to PDF — free online converter",
  description:
    "Convert JPG, PNG and WebP images to a single PDF for free. Reorder, crop, rotate and adjust images right in your browser. Private, no uploads, works offline.",
  openGraph: {
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "PPICOLA" }],
    title: "Images to PDF · PPICOLA",
    description: "Turn images into one polished PDF — free, private, in your browser.",
  },
};

export default function ImagesToPdfPage() {
  return <ImagesToPdfClient />;
}

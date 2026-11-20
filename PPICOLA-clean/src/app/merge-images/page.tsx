import type { Metadata } from "next";
import MergeImagesClient from "@/components/tools/MergeImagesClient";

export const metadata: Metadata = {
  title: "Merge Images — join photos online",
  description:
    "Combine multiple images into one, vertically or horizontally. Set spacing, padding and background color, see a live preview, export as PNG or JPG. Free and private.",
  openGraph: {
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "PPICOLA" }],
    title: "Merge Images · PPICOLA",
    description: "Join images into one — free, private, in your browser.",
  },
};

export default function MergeImagesPage() {
  return <MergeImagesClient />;
}

import type { Metadata } from "next";
import MergePdfClient from "@/components/tools/MergePdfClient";

export const metadata: Metadata = {
  title: "Merge PDFs — free online tool",
  description:
    "Combine multiple PDF files into one document for free. Drag-and-drop reordering, page counts, merged PDF or ZIP of originals. Private — everything runs in your browser.",
  openGraph: {
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630, alt: "PPICOLA" }],
    title: "Merge PDFs · PPICOLA",
    description: "Combine PDFs into one — free, private, in your browser.",
  },
};

export default function MergePdfPage() {
  return <MergePdfClient />;
}

import type { Metadata } from "next";
import HomeContent from "@/components/HomeContent";

export const metadata: Metadata = {
  title: {
    absolute: "PPICOLA — Convert & manage images and PDFs",
  },
};

export default function HomePage() {
  return <HomeContent />;
}

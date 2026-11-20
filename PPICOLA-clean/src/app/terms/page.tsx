import type { Metadata } from "next";
import LegalContent from "@/components/LegalContent";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Page() { return <LegalContent page="terms" />; }

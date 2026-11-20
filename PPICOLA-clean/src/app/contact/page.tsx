import type { Metadata } from "next";
import LegalContent from "@/components/LegalContent";

export const metadata: Metadata = { title: "Contact" };

export default function Page() { return <LegalContent page="contact" />; }

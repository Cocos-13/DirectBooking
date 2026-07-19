import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";
import { siteConfig } from "@/content/siteConfig";

export const metadata: Metadata = {
  title: `Booking Terms — ${siteConfig.name}`,
  robots: { index: false }, // draft; don't index until legal review is done
};

export default function TermsPage() {
  return <LegalDoc slug="terms" />;
}

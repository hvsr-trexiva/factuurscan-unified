export const dynamic="force-dynamic";
import type { Metadata } from "next";
import "./globals.css";
import {LanguageProvider} from "@/components/site-language";
import ServiceChat from "@/components/service-chat";
import SiteConsent from "@/components/site-consent";

export const metadata: Metadata = {
  title: "Factuurscan — Energie-inzicht voor bedrijven",
  description: "Lever uw energiefactuur aan en vraag advies over uw energiecontract, verbruik, zonnepanelen en batterijen.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl-BE">
      <body className="antialiased"><LanguageProvider>{children}<SiteConsent/><ServiceChat/></LanguageProvider></body>
    </html>
  );
}

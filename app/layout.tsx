import type { Metadata } from "next";
import { Geist, Nunito } from "next/font/google";
import { brand } from "@/lib/branding";
import { InteractionFlower } from "@/components/ui/interaction-flower";
import "./globals.css";
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});
export const metadata: Metadata = {
  title: "tamuperiod.",
  description: brand.description,
  openGraph: {
    title: brand.name,
    description: brand.description,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${nunito.variable}`}>
      <body>
        {children}
        <InteractionFlower />
      </body>
    </html>
  );
}

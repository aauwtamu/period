import type { Metadata } from "next";
import { Geist, Nunito } from "next/font/google";
import { brand } from "@/lib/branding";
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
// Replace app/favicon.ico with a final square 32/48px ICO; master artwork 512px.
export const metadata: Metadata = {
  title: "tamuperiod. | A little campus care",
  description: brand.description,
  openGraph: {
    title: brand.name,
    description: brand.description,
    type: "website",
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}

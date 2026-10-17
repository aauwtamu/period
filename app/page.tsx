import { connection } from "next/server";
import { getInventory } from "@/lib/server/inventory";
import { SiteHeader } from "@/components/branding/site-header";
import { SiteFooter } from "@/components/branding/site-footer";
import { HeroSection } from "@/components/dashboard/hero-section";
import { InventoryDashboard } from "@/components/dashboard/inventory-dashboard";
import { ClosingCTA } from "@/components/dashboard/closing-cta";
import { WaveDivider } from "@/components/ui/wave-divider";
export const runtime = "nodejs";
export default async function Home() {
  await connection();
  const inventory = await getInventory();
  return (
    <>
      <a href="#inventory" className="skip-link">
        Skip to product inventory
      </a>
      <SiteHeader />
      <main>
        <HeroSection />
        <WaveDivider className="hero-wave" />
        <InventoryDashboard initial={inventory} />
        <SiteFooter />
        <ClosingCTA />
      </main>
    </>
  );
}

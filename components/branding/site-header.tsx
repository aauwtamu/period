import { MapPin } from "lucide-react";
import { brand } from "@/lib/branding";
import { BrandLogo } from "./brand-logo";

export function SiteHeader() {
  return (
    <>
      <div className="announcement">
        <MapPin size={12} aria-hidden="true" /> Texas A&amp;M University
      </div>
      <header className="site-header content-width">
        <a href="#" className="brand" aria-label={`${brand.name} home`}>
          <BrandLogo />
        </a>
        <nav aria-label="Main navigation">
          <a href="#supported-by" className="nav-link">
            Our community
          </a>
        </nav>
      </header>
    </>
  );
}

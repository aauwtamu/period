import { ArrowUpRight } from "lucide-react";
import { LogoPlaceholder } from "./logo-placeholder";

export function SiteHeader() {
  return (
    <>
      <div className="announcement">
        A little community care goes a long way. <span>♥</span> Free products.
        Always.
      </div>
      <header className="site-header content-width">
        <a href="#" className="brand" aria-label="tamuperiod. home">
          <LogoPlaceholder />
          <span>
            tamuperiod<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works" className="nav-link">
            How it works
          </a>
          <a href="#supported-by" className="nav-link">
            Our community
          </a>
          <a href="#inventory" className="button button-small">
            Find products <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
    </>
  );
}

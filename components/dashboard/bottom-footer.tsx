import { Heart } from "lucide-react";
import { brand } from "@/lib/branding";
import { BrandLogo } from "@/components/branding/brand-logo";

export function BottomFooter() {
  return (
    <footer className="bottom-footer content-width">
      <a href="#" className="footer-brand" aria-label={`${brand.name} home`}>
        <BrandLogo />
      </a>
      <p>
        Made with <Heart size={12} /> for the aggie community.
      </p>
    </footer>
  );
}

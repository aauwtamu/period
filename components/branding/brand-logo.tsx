import Image from "next/image";
import { brand } from "@/lib/branding";

export function BrandLogo({ alt = "" }: { alt?: string }) {
  return (
    <span className="brand-logo">
      <Image
        src={brand.assets.logo}
        alt={alt}
        width={400}
        height={106}
        className="brand-logo-image"
      />
    </span>
  );
}

import { FlowerDecoration } from "@/components/ui/flower-decoration";

export function LogoPlaceholder() {
  // Replace this badge with <Image src="/branding/logo.svg" ... />.
  // Wide logo: 400 × 160 SVG viewBox (800 × 320 PNG); square mark: 512 × 512.
  return (
    <span className="logo-placeholder" title="Organization logo placeholder">
      <FlowerDecoration />
      <span>LOGO</span>
    </span>
  );
}

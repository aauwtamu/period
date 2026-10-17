import Image from "next/image";

export function SponsorLogo({
  name,
  imageSrc,
  href,
}: {
  name: string;
  imageSrc?: string;
  href?: string;
}) {
  // Add /public/branding/<name>.svg, with a 320 × 160 viewBox, or a 640 × 320
  // transparent PNG. Set imageSrc and the official URL in lib/branding.ts.
  const content = imageSrc ? (
    <Image
      src={imageSrc}
      alt={name}
      width={320}
      height={160}
      className="sponsor-image"
    />
  ) : (
    <span className="sponsor-placeholder">
      <strong>{name}</strong>
      <small>LOGO PLACEHOLDER</small>
    </span>
  );
  return href ? (
    <a className="sponsor-slot" href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <div className="sponsor-slot">{content}</div>
  );
}

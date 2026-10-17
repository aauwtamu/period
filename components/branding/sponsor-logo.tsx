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
  const content = imageSrc ? (
    <Image
      src={imageSrc}
      alt={name}
      fill
      sizes="(max-width: 640px) 135px, (max-width: 900px) 140px, 172px"
      className="sponsor-image"
    />
  ) : (
    <span className="sponsor-placeholder">
      <strong>{name}</strong>
      <small>LOGO PLACEHOLDER</small>
    </span>
  );
  const slotClass = imageSrc ? "sponsor-slot sponsor-slot-image" : "sponsor-slot";
  return href ? (
    <a className={slotClass} href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <div className={slotClass}>{content}</div>
  );
}

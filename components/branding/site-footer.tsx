import Image from "next/image";
import { brand, sponsors } from "@/lib/branding";
import { SponsorLogo } from "./sponsor-logo";
import { WaveDivider } from "@/components/ui/wave-divider";

export function SiteFooter() {
  return (
    <>
      <section
        className="community-section"
        id="supported-by"
        aria-labelledby="community-title"
      >
        <WaveDivider className="community-wave" />
        <div className="content-width community-inner">
          <div>
            <h2 id="community-title">
              Care is a<br />
              community effort
              <Image
                src={brand.assets.footerFlower}
                alt=""
                width={28}
                height={28}
              />
            </h2>
          </div>
          <div className="community-logos">
            {sponsors.map((s) => (
              <SponsorLogo key={s.name} {...s} />
            ))}
          </div>
        </div>
        <p className="community-thanks">
          A big thank you to the organizations keeping our campus stocked!
        </p>
        <WaveDivider className="community-closing-wave" />
      </section>
    </>
  );
}

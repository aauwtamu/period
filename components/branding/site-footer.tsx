import Image from "next/image";
import { brand, sponsors } from "@/lib/branding";
import { SponsorLogo } from "./sponsor-logo";
import { WaveDivider } from "@/components/ui/wave-divider";

export function SiteFooter() {
  return (
    <>
      <section
        className="sponsor-section"
        id="supported-by"
        aria-labelledby="sponsor-title"
      >
        <WaveDivider className="sponsor-wave" />
        <div className="content-width sponsor-inner">
          <div>
            <h2 id="sponsor-title">
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
          <div className="sponsor-list">
            {sponsors.map((s) => (
              <SponsorLogo key={s.name} {...s} />
            ))}
          </div>
        </div>
        <p className="sponsor-thanks">
          A big thank you to the organizations keeping our campus stocked!
        </p>
        <WaveDivider className="closing-wave" />
      </section>
    </>
  );
}

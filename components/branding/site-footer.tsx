import { sponsors } from "@/lib/branding";
import { SponsorLogo } from "./sponsor-logo";
import { FlowerDecoration } from "@/components/ui/flower-decoration";
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
            <p className="eyebrow">GOOD PEOPLE. GOOD THINGS.</p>
            <h2 id="sponsor-title">
              Care is a<br />
              community effort
              <FlowerDecoration />.
            </h2>
          </div>
          <div className="sponsor-list">
            {sponsors.map((s) => (
              <SponsorLogo key={s.name} {...s} />
            ))}
          </div>
        </div>
        <p className="sponsor-thanks">
          A big thank-you to the organizations keeping our campus stocked.
        </p>
        <WaveDivider className="closing-wave" />
      </section>
    </>
  );
}

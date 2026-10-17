import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { brand } from "@/lib/branding";
import { HeroSteps } from "./hero-steps";

export function HeroSection() {
  return (
    <section className="hero content-width" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Periods happen.
          <br />
          We’ve got <span>you.</span>
        </h1>
        <HeroSteps />
        <a href="#inventory" className="button">
          Find your nearest products <ArrowDown size={17} />
        </a>
      </div>
      <Image
        src={brand.assets.hero}
        alt="Illustrated campus map highlighting locations for period products"
        className="care-art"
        width={640}
        height={560}
        priority
      />
    </section>
  );
}

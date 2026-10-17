import { ArrowUpRight, Heart } from "lucide-react";
import { FlowerDecoration } from "@/components/ui/flower-decoration";

export function ClosingCTA() {
  return (
    <>
      <section className="closing content-width">
        <FlowerDecoration className="closing-flower" />
        <p className="eyebrow">SMALL ACTIONS. BIG DIFFERENCE.</p>
        <h2>
          Aggies take care
          <br />
          of each other.
        </h2>
        <p>
          Took a product? Tap to update the count.
          <br />
          Spot an empty dispenser? Let the community know.
        </p>
        <a className="button" href="#inventory">
          Help keep campus covered <ArrowUpRight size={17} />
        </a>
      </section>
      <footer className="bottom-footer content-width">
        <a href="#" className="footer-wordmark">
          tamuperiod.
        </a>
        <p>
          Made with <Heart size={12} /> for our campus community.
        </p>
        <a href="#inventory">Find products ↑</a>
      </footer>
    </>
  );
}

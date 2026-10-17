"use client";

import { useRef } from "react";
import Image from "next/image";
import { useInView } from "framer-motion";
import type { InventorySnapshot } from "@/types/inventory";

const products = [
  { key: "pads", label: "Pads", image: "pad" },
  { key: "tampons", label: "Tampons", image: "tampon" },
  { key: "liners", label: "Liners", image: "liner" },
] as const;

function ProductPhoto({ product }: { product: (typeof products)[number] }) {
  return (
    <div className="stat-photo" aria-hidden="true">
      <Image
        src={`/images/products/${product.image}.png`}
        alt=""
        fill
        sizes="(max-width: 640px) 110px, (max-width: 900px) 180px, 260px"
        unoptimized
      />
    </div>
  );
}

export function StatsCards({ snapshot }: { snapshot: InventorySnapshot | null }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(gridRef, { once: true, amount: 0.3 });

  const totals = snapshot?.bathrooms.reduce(
    (counts, bathroom) => ({
      pads: counts.pads + bathroom.pads,
      tampons: counts.tampons + bathroom.tampons,
      liners: counts.liners + bathroom.liners,
    }),
    { pads: 0, tampons: 0, liners: 0 },
  );

  return (
    <div className="stats-grid" ref={gridRef} data-revealed={isInView}>
      {products.map((product, index) => (
        <article
          className={`stat-card stat-card-${index}`}
          key={product.key}
        >
          <ProductPhoto product={product} />
          <div className="stat-copy">
            <strong className="stat-number">
              {totals ? totals[product.key].toLocaleString("en-US") : "—"}
            </strong>
            <h3>{product.label} stocked</h3>
          </div>
        </article>
      ))}
    </div>
  );
}

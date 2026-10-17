"use client";
import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import type { ItemType } from "@/types/inventory";

export const itemLabels: Record<ItemType, string> = {
  pads: "Pad",
  tampons: "Tampon",
  liners: "Liner",
  other: "Other",
};
export function ProductCounter({
  item,
  count,
  disabled,
  pending,
  take,
  location,
  limitReached,
}: {
  item: ItemType;
  count: number;
  disabled: boolean;
  pending: boolean;
  take: () => void;
  location: string;
  limitReached: boolean;
}) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const previous = useRef(count);
  const singular =
    item === "other" ? "other item" : itemLabels[item].toLowerCase();
  useEffect(() => {
    if (previous.current !== count && !reduced) {
      controls.set({ scale: 0.8, y: 3 });
      void controls.start({ scale: 1, y: 0 });
    }
    previous.current = count;
  }, [count, controls, reduced]);
  return (
    <div className={`product-counter ${count === 0 ? "empty-stock" : ""}`}>
      <motion.strong
        initial={false}
        animate={controls}
        transition={{ type: "spring", stiffness: 330, damping: 17 }}
      >
        {count}
      </motion.strong>
      <span className="mobile-product-label">
        {itemLabels[item]}
        {item === "other" ? "" : "s"}
      </span>
      <button
        onClick={take}
        disabled={disabled || count === 0 || limitReached}
        aria-label={
          limitReached
            ? `Five-item visit limit reached at ${location}`
            : `Take one ${singular} from ${location}`
        }
      >
        {pending && <LoaderCircle size={12} className="spin" />}
        <span>{count === 0 ? "Empty" : limitReached ? "5 taken" : "Take"}</span>
      </button>
    </div>
  );
}

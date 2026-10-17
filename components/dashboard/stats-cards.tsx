"use client";
import { useEffect } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { Heart, Package, Flag, ArrowUpRight } from "lucide-react";
import type { InventorySnapshot } from "@/types/inventory";
import { inventoryStats } from "@/lib/utils/inventory";

export function StatsCards({
  snapshot,
}: {
  snapshot: InventorySnapshot | null;
}) {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  useEffect(() => {
    if (reduce) {
      controls.set({ opacity: 1, y: 0 });
      return;
    }
    controls.set({ opacity: 0, y: 15 });
    void controls.start({ opacity: 1, y: 0 });
  }, [controls, reduce]);
  const stats = snapshot ? inventoryStats(snapshot.bathrooms) : null;
  const cards = [
    {
      label: "Products available",
      value: stats?.available,
      note: "Pads, tampons & liners. All free.",
      icon: Package,
    },
    {
      label: "Distributed since launch",
      value: snapshot?.distributed,
      note: "A little help, one product at a time.",
      icon: Heart,
    },
    {
      label: "Locations needing restock",
      value: stats?.flagged,
      note: "Flagged for replenishment.",
      icon: Flag,
    },
  ];
  return (
    <div className="stats-grid">
      {cards.map(({ label, value, note, icon: Icon }, i) => (
        <motion.div
          className={`stat-card stat-card-${i}`}
          key={label}
          initial={false}
          animate={controls}
          transition={{ delay: i * 0.09, duration: 0.4 }}
        >
          <div className="stat-top">
            <span className="stat-icon">
              <Icon size={19} />
            </span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </div>
          <strong className="stat-number">
            {value === undefined ? "—" : value.toLocaleString("en-US")}
          </strong>
          <h3>{label}</h3>
          <p>{note}</p>
        </motion.div>
      ))}
    </div>
  );
}

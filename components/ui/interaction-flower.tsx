"use client";

import { useEffect, useRef, useState } from "react";

type Burst = { id: number; x: number; y: number };

export function InteractionFlower() {
  const nextIdRef = useRef(0);
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const rect = target instanceof Element ? target.getBoundingClientRect() : null;
      const x = event.detail === 0 && rect ? rect.left + rect.width / 2 : event.clientX;
      const y = event.detail === 0 && rect ? rect.top + rect.height / 2 : event.clientY;
      const id = nextIdRef.current++;
      setBursts((current) => [...current.slice(-7), { id, x, y }]);
      const timer = setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id));
        timers.delete(timer);
      }, 700);
      timers.add(timer);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="interaction-flower-layer" aria-hidden="true">
      {bursts.map(({ id, x, y }) => (
        <span className="interaction-flower-burst" key={id} style={{ left: x, top: y }}>
          <span className="interaction-flower-burst-core interaction-flower-shape" />
          {Array.from({ length: 6 }, (_, index) => (
            <span
              className="interaction-flower-petal interaction-flower-shape"
              key={index}
              style={{ "--petal-angle": `${index * 60}deg` } as React.CSSProperties}
            />
          ))}
        </span>
      ))}
    </div>
  );
}

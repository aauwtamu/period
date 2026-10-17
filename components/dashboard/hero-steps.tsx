"use client";

import { useRef, useSyncExternalStore } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

const steps = [
  "Find a bathroom.",
  "Grab the products you need.",
  'Tap "Take" for each item so we can restock.',
];
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function reducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}
function serverReducedMotionSnapshot() {
  return false;
}

function HeroStep({
  index,
  step,
  progress,
  reduceMotion,
}: {
  index: number;
  step: string;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const start = index * 0.4;
  const ringProgress = useTransform(progress, [start, start + 0.2], [0, 1]);
  const lineProgress = useTransform(progress, [start + 0.2, start + 0.4], [0, 1]);
  const textOpacity = useTransform(progress, [start, start + 0.2], [0.7, 1]);

  return (
    <li className="hero-step">
      <span className="hero-step-number" aria-hidden="true">
        <svg viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#e7a9bc" strokeWidth="2.5" />
          <motion.circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform="rotate(-90 28 28)"
            style={{ pathLength: reduceMotion ? 1 : ringProgress }}
          />
        </svg>
        <span>{String(index + 1).padStart(2, "0")}</span>
      </span>
      <motion.span
        className="hero-step-copy"
        style={{ opacity: reduceMotion ? 1 : textOpacity }}
      >
        {step}
      </motion.span>
      {index < steps.length - 1 && (
        <motion.span
          className="hero-step-connector"
          aria-hidden="true"
          style={{ scaleY: reduceMotion ? 1 : lineProgress }}
        />
      )}
    </li>
  );
}

export function HeroSteps() {
  const list = useRef<HTMLOListElement>(null);
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    serverReducedMotionSnapshot,
  );
  const { scrollYProgress } = useScroll({
    target: list,
    offset: ["start 25%", "end 25%"],
  });

  return (
    <ol className="hero-steps" ref={list}>
      {steps.map((step, index) => (
        <HeroStep
          key={step}
          index={index}
          step={step}
          progress={scrollYProgress}
          reduceMotion={reduceMotion}
        />
      ))}
    </ol>
  );
}

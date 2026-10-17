import { ArrowDown, Heart, MapPin } from "lucide-react";
import { FlowerDecoration } from "@/components/ui/flower-decoration";

function CareIllustration() {
  return (
    <div
      className="care-art"
      role="img"
      aria-label="Illustrated period product pouch, pad, and a smiling pink flower"
    >
      <div className="art-orbit" />
      <span className="art-note">
        here for you,
        <br />
        <em>period.</em>
      </span>
      <svg viewBox="0 0 440 390" className="product-art" aria-hidden="true">
        <defs>
          <pattern
            id="pouch-stripes"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 0v24" stroke="#ec81a3" strokeWidth="12" />
          </pattern>
        </defs>
        <ellipse cx="220" cy="342" rx="160" ry="17" fill="#b71f4920" />
        <g transform="rotate(-12 190 210)">
          <rect
            x="66"
            y="101"
            width="236"
            height="225"
            rx="18"
            fill="#ffc8d8"
            stroke="#a92248"
            strokeWidth="2"
          />
          <rect
            x="66"
            y="101"
            width="236"
            height="225"
            rx="18"
            fill="url(#pouch-stripes)"
            opacity=".55"
          />
          <path
            d="M67 124h233M67 301h233"
            stroke="#a92248"
            strokeWidth="2"
            strokeDasharray="4 5"
          />
          <rect
            x="101"
            y="163"
            width="166"
            height="105"
            rx="4"
            fill="#fff5ed"
            transform="rotate(4 184 216)"
          />
          <text
            x="184"
            y="203"
            textAnchor="middle"
            fill="#a92248"
            fontSize="26"
            fontWeight="900"
            fontFamily="var(--font-nunito), sans-serif"
          >
            a little
          </text>
          <text
            x="184"
            y="236"
            textAnchor="middle"
            fill="#a92248"
            fontSize="32"
            fontWeight="900"
            fontFamily="var(--font-nunito), sans-serif"
          >
            care kit.
          </text>
        </g>
        <g transform="rotate(19 315 242)">
          <path
            d="M290 150q-3-30 25-30t25 30v42q32 4 27 30l-27 16v64q0 35-25 35t-25-35v-64l-27-16q-5-26 27-30Z"
            fill="#fffaf4"
            stroke="#a92248"
            strokeWidth="2"
          />
          <rect
            x="300"
            y="143"
            width="30"
            height="169"
            rx="15"
            fill="#ffe6ec"
          />
          <path d="M308 157v141m14-141v141" stroke="#f8c3d2" strokeWidth="2" />
        </g>
        <path
          d="m369 111 5-15 5 15 15 5-15 5-5 15-5-15-15-5ZM63 51l4-12 4 12 12 4-12 4-4 12-4-12-12-4Z"
          fill="#a92248"
        />
      </svg>
      <FlowerDecoration className="hero-flower" smile />
      <div className="art-caption">
        <Heart size={14} fill="currentColor" /> TAKE WHAT YOU NEED
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="hero content-width" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow location-label">
          <MapPin size={14} /> TEXAS A&M UNIVERSITY
        </p>
        <h1 id="hero-title">
          Periods happen.
          <br />
          We’ve got <span>you.</span>
        </h1>
        <p className="hero-description">
          Your period shouldn’t slow you down. Find free pads, tampons, and
          liners around campus—then help us keep the next person covered.
        </p>
        <a href="#inventory" className="button">
          Find your nearest products <ArrowDown size={17} />
        </a>
        <p className="hero-footnote">
          <Heart size={13} /> No cost. No questions. Just care.
        </p>
      </div>
      <CareIllustration />
    </section>
  );
}

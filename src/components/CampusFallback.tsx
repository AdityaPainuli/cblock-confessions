"use client";

import type { Stage } from "./three/CampusScene";

/**
 * Flat stand-in for the WebGL campus. Shown on low-end phones and whenever
 * the visitor asked for reduced motion.
 */
export default function CampusFallback({ stage }: { stage: Stage }) {
  const entered = stage === "block";

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070b12]">
      <div className="stars absolute inset-0 opacity-70" />
      <div
        className="absolute inset-x-0 bottom-0 origin-bottom transition-transform duration-[1400ms] ease-out"
        style={{ transform: entered ? "scale(2.3) translateX(-14%)" : "scale(1)" }}
      >
        <svg viewBox="0 0 400 200" className="w-full" aria-hidden>
          <rect y="170" width="400" height="30" fill="#101a24" />
          <rect x="120" y="90" width="160" height="80" fill="#ece4d2" />
          <polygon points="200,50 250,90 150,90" fill="#8d5a3b" />
          <rect x="20" y="110" width="90" height="60" fill="#d8d0be" />
          <rect x="290" y="100" width="95" height="70" fill="#e4dccb" />
          <rect x="300" y="150" width="20" height="20" fill="#ff5fa2" />
          <rect x="296" y="108" width="83" height="12" fill="#12060f" />
          <text
            x="337"
            y="118"
            fontSize="9"
            fill="#ff5fa2"
            textAnchor="middle"
            fontFamily="Arial"
            fontWeight="bold"
          >
            C BLOCK
          </text>
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x={128 + i * 15} y={104} width="8" height="10" fill="#3fd0ff" opacity="0.8" />
          ))}
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-transparent to-[#070b12]/60" />
    </div>
  );
}

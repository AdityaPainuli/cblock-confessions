"use client";

import { CAMPUS, BRAND } from "@/lib/palette";
import type { Stage } from "./three/CampusScene";

/**
 * Flat stand-in for the WebGL campus: the same axial plaza, sandstone blocks
 * and red pylons, drawn once. Shown on low-end phones and for reduced motion.
 */
export default function CampusFallback({ stage }: { stage: Stage }) {
  // Pull in a little at the chooser, then all the way in at the wall.
  const zoom = stage === "wall" ? "scale(2.4) translateX(-16%)" : stage === "blocks" ? "scale(1.3)" : "scale(1)";

  return (
    <div className="haze absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 origin-bottom transition-transform duration-[1400ms] ease-out"
        style={{ transform: zoom }}
      >
        <svg viewBox="0 0 400 220" className="w-full" aria-hidden>
          {/* ground and axial plaza */}
          <rect y="150" width="400" height="70" fill={CAMPUS.lawn} />
          <polygon points="150,150 250,150 330,220 70,220" fill={CAMPUS.paving} />
          <polygon points="185,150 215,150 245,220 155,220" fill={CAMPUS.water} />

          {/* left block */}
          <rect x="8" y="96" width="120" height="58" fill={CAMPUS.sand} />
          <rect x="112" y="90" width="18" height="64" fill={CAMPUS.terracotta} />
          {[104, 116, 128, 140].map((y) => (
            <rect key={y} x="14" y={y} width="94" height="5" fill={CAMPUS.glass} />
          ))}

          {/* centre block with barrel vault */}
          <rect x="140" y="104" width="112" height="46" fill={CAMPUS.sand} />
          <path d="M146 104 a28 28 0 0 1 100 0 z" fill={CAMPUS.vault} />
          {[118, 130, 142].map((y) => (
            <rect key={y} x="146" y={y} width="100" height="5" fill={CAMPUS.glass} />
          ))}

          {/* C block, the destination */}
          <rect x="264" y="88" width="128" height="66" fill={CAMPUS.sand} />
          <path d="M270 88 a30 26 0 0 1 116 0 z" fill={CAMPUS.vault} />
          <rect x="264" y="88" width="16" height="66" fill={CAMPUS.terracotta} />
          {[108, 122, 136].map((y) => (
            <rect key={y} x="286" y={y} width="98" height="6" fill={CAMPUS.interior} opacity="0.85" />
          ))}
          <rect x="296" y="94" width="82" height="11" fill={BRAND.maroon} />
          <text
            x="337"
            y="103"
            fontSize="8"
            fill="#fff4e6"
            textAnchor="middle"
            fontFamily="Helvetica, Arial"
            fontWeight="bold"
            letterSpacing="2"
          >
            C BLOCK
          </text>

          {/* red sandstone pylons down the axis */}
          {[
            [168, 150, 10],
            [232, 150, 10],
            [158, 168, 13],
            [242, 168, 13],
            [146, 190, 17],
            [254, 190, 17],
          ].map(([x, y, h], i) => (
            <rect key={i} x={x} y={y - h} width={h * 0.42} height={h} fill={CAMPUS.terracotta} />
          ))}
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#f4ece0] via-transparent to-transparent" />
    </div>
  );
}

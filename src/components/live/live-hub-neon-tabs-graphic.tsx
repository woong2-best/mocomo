"use client";

import { useId } from "react";
import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { LIVE_HUB_NEON_THEME } from "@/components/live/live-hub-neon-theme";

export function LiveHubNeonTabsGraphic({ active }: { active: LiveFolderFilter }) {
  const uid = useId().replace(/:/g, "");
  const t = LIVE_HUB_NEON_THEME[active] ?? LIVE_HUB_NEON_THEME.ALL;
  const gp = `gp-${uid}`;
  const gm = `gm-${uid}`;
  const gk = `gk-${uid}`;
  const ln = `ln-${uid}`;

  return (
    <svg
      viewBox="32 0 2576 358"
      xmlns="http://www.w3.org/2000/svg"
      className="live-hub-neon-tabs-art pointer-events-none select-none live-hub-neon-tabs-art--animated"
      role="presentation"
      aria-hidden
    >
      <defs>
        <filter id={`f4-${uid}`} x="-4%" y="-80%" width="108%" height="260%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.35 0" />
        </filter>
        <filter id={`f3-${uid}`} x="-2%" y="-60%" width="104%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id={`f1-${uid}`} x="-2%" y="-60%" width="104%" height="220%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <filter id={`f08-${uid}`}>
          <feGaussianBlur stdDeviation=".7" />
        </filter>
        <filter id={`ft-${uid}`}>
          <feGaussianBlur stdDeviation=".55" />
        </filter>
        <linearGradient id={gp} gradientUnits="userSpaceOnUse" x1="328" x2="2312">
          <stop offset="0" stopColor={t.gp[0]} />
          <stop offset=".5" stopColor={t.gp[1]} />
          <stop offset="1" stopColor={t.gp[2]} />
        </linearGradient>
        <linearGradient id={gm} gradientUnits="userSpaceOnUse" x1="328" x2="2312">
          <stop offset="0" stopColor={t.gm[0]} />
          <stop offset="1" stopColor={t.gm[1]} />
        </linearGradient>
        <linearGradient id={gk} gradientUnits="userSpaceOnUse" x1="328" x2="2312">
          <stop offset="0" stopColor={t.gk[0]} />
          <stop offset="1" stopColor={t.gk[1]} />
        </linearGradient>
        <linearGradient id="in" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e0020" />
          <stop offset=".35" stopColor="#0e0620" />
          <stop offset="1" stopColor="#0a0a24" />
        </linearGradient>
        <linearGradient id="side" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".3" />
          <stop offset=".12" stopColor="#000" stopOpacity="0" />
          <stop offset=".88" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.bloomFill} stopOpacity="0" />
          <stop offset="1" stopColor={t.bloomFill} stopOpacity=".42" />
        </linearGradient>
        <linearGradient id={ln} x1="0" x2="1">
          <stop offset="0" stopColor={t.lineEdge} stopOpacity=".55" />
          <stop offset=".05" stopColor={t.lineCore} />
          <stop offset=".95" stopColor={t.lineCore} />
          <stop offset="1" stopColor={t.lineEdge} stopOpacity=".55" />
        </linearGradient>
        <linearGradient id="t0" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3e0a24" />
          <stop offset="0.35" stopColor="#7c1642" />
          <stop offset="0.7" stopColor="#b41f4c" />
          <stop offset="1" stopColor="#de3068" />
        </linearGradient>
        <clipPath id="c0">
          <path d="M480 241 V145 Q480 112 513 112 L710 104 V241 Z" />
        </clipPath>
        <linearGradient id="t1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a1408" />
          <stop offset="0.4" stopColor="#7e2c10" />
          <stop offset="0.8" stopColor="#b84a22" />
          <stop offset="1" stopColor="#cf6030" />
        </linearGradient>
        <clipPath id="c1">
          <path d="M714 241 V103 L950 100 V241 Z" />
        </clipPath>
        <linearGradient id="t2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#06143c" />
          <stop offset="0.5" stopColor="#0e2c78" />
          <stop offset="1" stopColor="#1c48b0" />
        </linearGradient>
        <clipPath id="c2">
          <path d="M954 241 V100 L1197 96 V241 Z" />
        </clipPath>
        <linearGradient id="t3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#256e16" />
          <stop offset="0.5" stopColor="#309020" />
          <stop offset="1" stopColor="#42a52c" />
        </linearGradient>
        <clipPath id="c3">
          <path d="M1201 241 V95 L1439 95 V241 Z" />
        </clipPath>
        <linearGradient id="t4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34086a" />
          <stop offset="0.5" stopColor="#520f8c" />
          <stop offset="1" stopColor="#6c1caa" />
        </linearGradient>
        <clipPath id="c4">
          <path d="M1443 241 V96 L1686 100 V241 Z" />
        </clipPath>
        <linearGradient id="t5" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b2a3a" />
          <stop offset="0.5" stopColor="#1e5666" />
          <stop offset="1" stopColor="#3d8fa9" />
        </linearGradient>
        <clipPath id="c5">
          <path d="M1690 241 V100 L1926 103 V241 Z" />
        </clipPath>
        <linearGradient id="t6" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a0407" />
          <stop offset="0.5" stopColor="#5e0d10" />
          <stop offset="0.85" stopColor="#7a1611" />
          <stop offset="1" stopColor="#8c2440" />
        </linearGradient>
        <clipPath id="c6">
          <path d="M2160 241 V145 Q2160 112 2127 112 L1930 104 V241 Z" />
        </clipPath>
      </defs>
      <path d="M371 245 C371 151.2 457 75 620 75 H2020 C2183 75 2269 151.2 2269 245 Z" fill="url(#in)" />
      <path
        d="M328 245 C328 127.4 457 32 620 32 H2020 C2183 32 2312 127.4 2312 245"
        fill="none"
        stroke="#38344e"
        strokeWidth="6"
        filter={`url(#f08-${uid})`}
      />
      <path
        d="M339 245 C339 133.5 457 43 620 43 H2020 C2183 43 2301 133.5 2301 245"
        fill="none"
        stroke={`url(#${gp})`}
        strokeWidth="17"
        filter={`url(#f4-${uid})`}
      />
      <path
        d="M350 245 C350 139.6 457 54 620 54 H2020 C2183 54 2290 139.6 2290 245"
        fill="none"
        stroke={`url(#${gm})`}
        strokeWidth="12"
        filter={`url(#f4-${uid})`}
      />
      <path
        d="M358 245 C358 144.0 457 62 620 62 H2020 C2183 62 2282 144.0 2282 245"
        fill="none"
        stroke={`url(#${gk})`}
        strokeWidth="10"
        filter={`url(#f3-${uid})`}
      />
      <path
        d="M367 245 C367 149.0 457 71 620 71 H2020 C2183 71 2273 149.0 2273 245"
        fill="none"
        stroke={t.rim}
        strokeWidth="7"
        filter={`url(#f1-${uid})`}
      />
      <g clipPath="url(#c0)">
        <rect x="480" y="90" width="230" height="152" fill="url(#t0)" />
        <rect x="480" y="90" width="230" height="152" fill="url(#side)" />
        <rect x="480" y="215" width="230" height="27" fill="url(#glow)" />
      </g>
      <g clipPath="url(#c1)">
        <rect x="714" y="90" width="236" height="152" fill="url(#t1)" />
        <rect x="714" y="90" width="236" height="152" fill="url(#side)" />
        <rect x="714" y="215" width="236" height="27" fill="url(#glow)" />
      </g>
      <g clipPath="url(#c2)">
        <rect x="954" y="90" width="243" height="152" fill="url(#t2)" />
        <rect x="954" y="90" width="243" height="152" fill="url(#side)" />
        <rect x="954" y="215" width="243" height="27" fill="url(#glow)" />
      </g>
      <g clipPath="url(#c3)">
        <rect x="1201" y="90" width="238" height="152" fill="url(#t3)" />
        <rect x="1201" y="90" width="238" height="152" fill="url(#side)" />
        <rect x="1201" y="215" width="238" height="27" fill="url(#glow)" />
      </g>
      <g clipPath="url(#c4)">
        <rect x="1443" y="90" width="243" height="152" fill="url(#t4)" />
        <rect x="1443" y="90" width="243" height="152" fill="url(#side)" />
        <rect x="1443" y="215" width="243" height="27" fill="url(#glow)" />
      </g>
      <g clipPath="url(#c5)">
        <rect x="1690" y="90" width="236" height="152" fill="url(#t5)" />
        <rect x="1690" y="90" width="236" height="152" fill="url(#side)" />
        <rect x="1690" y="215" width="236" height="27" fill="url(#glow)" />
      </g>
      <g clipPath="url(#c6)">
        <rect x="1930" y="90" width="230" height="152" fill="url(#t6)" />
        <rect x="1930" y="90" width="230" height="152" fill="url(#side)" />
        <rect x="1930" y="215" width="230" height="27" fill="url(#glow)" />
      </g>
      <g
        filter={`url(#ft-${uid})`}
        style={{
          fontFamily: "Roboto, Inter, 'Helvetica Neue', Arial, sans-serif",
          fontWeight: 700,
          fill: "#fdfdfd",
        }}
      >
        <text x="532" y="198" fontSize="72" textLength="126" lengthAdjust="spacingAndGlyphs">
          ALL
        </text>
        <text x="732" y="198" fontSize="55" textLength="200" lengthAdjust="spacingAndGlyphs">
          FOLLOW
        </text>
        <text x="988" y="198" fontSize="66" textLength="175" lengthAdjust="spacingAndGlyphs">
          GAME
        </text>
        <text x="1237.5" y="198" fontSize="66" textLength="165" lengthAdjust="spacingAndGlyphs">
          CHAT
        </text>
        <text x="1457" y="198" fontSize="55" textLength="215" lengthAdjust="spacingAndGlyphs">
          FESTIVAL
        </text>
        <text x="1719" y="198" fontSize="58" textLength="178" lengthAdjust="spacingAndGlyphs">
          MUSIC
        </text>
        <text x="1980" y="198" fontSize="70" textLength="130" lengthAdjust="spacingAndGlyphs">
          R-18
        </text>
      </g>
      <rect x="45" y="248" width="2550" height="14" fill={t.bloomFill} opacity=".22" filter={`url(#f4-${uid})`} />
      <rect x="45" y="241" width="2550" height="7.5" rx="3" fill={`url(#${ln})`} />
    </svg>
  );
}

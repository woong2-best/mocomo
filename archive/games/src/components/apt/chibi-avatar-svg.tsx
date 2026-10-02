import type { ChibiAvatarConfig } from "@/lib/apt/bondee/types";

const HAIR_PALETTES = ["#5c3d2e", "#2a2a2a", "#8b6914", "#c45c26", "#4a3728", "#6b4423"];

/** APT 치비 아바타 — 랭킹·UI용 2D SVG */
export function ChibiAvatarSvg({
  config,
  celebrate = false,
  holdTrophy = false,
  className,
}: {
  config: ChibiAvatarConfig;
  celebrate?: boolean;
  holdTrophy?: boolean;
  className?: string;
}) {
  const hair = config.hairColor || HAIR_PALETTES[config.hairStyle % HAIR_PALETTES.length];

  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden>
      {/* legs */}
      <rect x="38" y="88" width="10" height="18" rx="4" fill={config.bottomColor} />
      <rect x="52" y="88" width="10" height="18" rx="4" fill={config.bottomColor} />
      <ellipse cx="43" cy="107" rx="7" ry="4" fill={config.shoeColor} />
      <ellipse cx="57" cy="107" rx="7" ry="4" fill={config.shoeColor} />

      {/* torso */}
      <rect x="34" y="58" width="32" height="32" rx="10" fill={config.topColor} />
      {config.topStyle === 1 && (
        <path d="M34 62 h32 v8 H34 Z" fill={config.topColor} opacity="0.85" />
      )}
      {config.topStyle === 2 && (
        <path d="M30 52 Q50 38 70 52 L66 62 Q50 48 34 62 Z" fill={config.topColor} />
      )}

      {/* arms */}
      {holdTrophy ? (
        <>
          <rect x="22" y="62" width="10" height="22" rx="5" fill={config.skinColor} transform="rotate(-28 27 62)" />
          <rect x="68" y="58" width="10" height="24" rx="5" fill={config.skinColor} transform="rotate(18 73 58)" />
        </>
      ) : (
        <>
          <rect x="24" y="64" width="10" height="20" rx="5" fill={config.skinColor} />
          <rect x="66" y="64" width="10" height="20" rx="5" fill={config.skinColor} />
        </>
      )}

      {/* head */}
      <circle cx="50" cy="38" r="22" fill={config.skinColor} />
      <ellipse cx="50" cy="20" rx="24" ry="14" fill={hair} />
      {config.hairStyle === 0 && <ellipse cx="50" cy="18" rx="20" ry="10" fill={hair} />}
      {config.hairStyle >= 3 && (
        <>
          <ellipse cx="28" cy="34" rx="8" ry="14" fill={hair} />
          <ellipse cx="72" cy="34" rx="8" ry="14" fill={hair} />
        </>
      )}
      {config.hairStyle === 5 && <rect x="36" y="8" width="28" height="10" rx="4" fill={hair} />}

      {/* blush */}
      {config.blush && (
        <>
          <ellipse cx="36" cy="42" rx="5" ry="3" fill="#ffb0b8" opacity="0.55" />
          <ellipse cx="64" cy="42" rx="5" ry="3" fill="#ffb0b8" opacity="0.55" />
        </>
      )}

      {/* eyes */}
      {celebrate || config.eyeStyle === 2 ? (
        <>
          <path d="M38 36 Q42 32 46 36" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M54 36 Q58 32 62 36" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : config.eyeStyle === 3 ? (
        <path d="M38 36 h24" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="40" cy="36" r={config.eyeStyle === 1 ? 3.5 : 2.8} fill="#1a1a1a" />
          <circle cx="60" cy="36" r={config.eyeStyle === 1 ? 3.5 : 2.8} fill="#1a1a1a" />
        </>
      )}

      {/* smile */}
      <path
        d={celebrate ? "M40 48 Q50 58 60 48" : "M42 46 Q50 52 58 46"}
        stroke="#c47a6a"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* trophy */}
      {holdTrophy && (
        <g transform="translate(62, 34) rotate(12)">
          <path
            d="M0 0 h14 v5 a7 7 0 0 1-14 0 V0 Z"
            fill="#fbbf24"
            stroke="#b45309"
            strokeWidth="1"
          />
          <path d="M-2 0 H-5 a2 2 0 0 0 0 3 h3 M16 0 h3 a2 2 0 0 1 0 3 h-3" stroke="#b45309" strokeWidth="1.2" fill="none" />
          <rect x="5" y="10" width="4" height="5" fill="#b45309" />
          <rect x="1" y="14" width="12" height="2.5" rx="1" fill="#b45309" />
        </g>
      )}
    </svg>
  );
}

/** 유저명 기반 기본 APT 아바타 (프로필 없을 때) */
export function chibiAvatarFromSeed(seed: string): ChibiAvatarConfig {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const pick = (n: number) => hash >> (n % 24) & 0xff;

  return {
    skinColor: "#f5d0b5",
    hairColor: HAIR_PALETTES[pick(0) % HAIR_PALETTES.length],
    hairStyle: (pick(1) % 6) as ChibiAvatarConfig["hairStyle"],
    eyeStyle: (pick(2) % 4) as ChibiAvatarConfig["eyeStyle"],
    mouthStyle: 0,
    topColor: ["#7a8a9a", "#6b8cce", "#c45c8a", "#5a9a6e"][pick(3) % 4],
    bottomColor: ["#4a5568", "#3d4a5c", "#5c4033", "#2d3748"][pick(4) % 4],
    shoeColor: "#2a2a2a",
    topStyle: (pick(5) % 3) as ChibiAvatarConfig["topStyle"],
    bottomStyle: (pick(6) % 2) as ChibiAvatarConfig["bottomStyle"],
    blush: true,
  };
}

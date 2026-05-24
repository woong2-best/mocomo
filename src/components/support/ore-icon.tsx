import { SupportTierLevel } from "@prisma/client";
import { getTierInfo } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/** 광석 일러스트 SVG (등급별) */
export function OreIcon({
  tier,
  size = 20,
  className,
}: {
  tier: SupportTierLevel;
  size?: number;
  className?: string;
}) {
  const info = getTierInfo(tier);
  const [c1, c2] = info.gradient;
  const s = size;

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      className={cn("shrink-0 drop-shadow-sm", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`ore-${tier}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <OreShape tier={tier} fill={`url(#ore-${tier})`} />
    </svg>
  );
}

function OreShape({ tier, fill }: { tier: SupportTierLevel; fill: string }) {
  switch (tier) {
    case "PEBBLE":
      return (
        <>
          <ellipse cx="12" cy="16" rx="7" ry="4" fill={fill} opacity="0.5" />
          <circle cx="10" cy="11" r="4" fill={fill} />
          <circle cx="15" cy="13" r="3" fill={fill} opacity="0.85" />
        </>
      );
    case "STONE":
      return <path d="M6 18 L12 5 L18 18 Z" fill={fill} />;
    case "COAL":
      return (
        <>
          <rect x="5" y="8" width="14" height="12" rx="2" fill={fill} />
          <rect x="7" y="5" width="10" height="5" rx="1" fill={fill} opacity="0.7" />
        </>
      );
    case "IRON":
      return (
        <>
          <rect x="8" y="4" width="8" height="16" rx="1" fill={fill} />
          <rect x="5" y="10" width="14" height="4" rx="1" fill={fill} opacity="0.75" />
        </>
      );
    case "BRONZE":
      return <polygon points="12,4 20,20 4,20" fill={fill} />;
    case "SILVER":
      return <polygon points="12,3 21,12 12,21 3,12" fill={fill} />;
    case "GOLD":
      return (
        <>
          <polygon points="12,2 22,9 18,22 6,22 2,9" fill={fill} />
          <polygon points="12,6 18,10 16,18 8,18 6,10" fill="#fff" opacity="0.25" />
        </>
      );
    case "PLATINUM":
      return <polygon points="12,2 20,8 20,16 12,22 4,16 4,8" fill={fill} />;
    case "EMERALD":
      return <rect x="7" y="5" width="10" height="14" transform="rotate(45 12 12)" fill={fill} />;
    case "SAPPHIRE":
      return <polygon points="12,2 19,8 19,16 12,22 5,16 5,8" fill={fill} />;
    case "RUBY":
      return <polygon points="12,3 21,9 17,21 7,21 3,9" fill={fill} />;
    case "DIAMOND":
      return <polygon points="12,2 22,12 12,22 2,12" fill={fill} />;
    case "CRYSTAL":
      return (
        <>
          <polygon points="12,2 18,10 12,22 6,10" fill={fill} />
          <line x1="12" y1="2" x2="12" y2="22" stroke="#fff" strokeWidth="0.8" opacity="0.35" />
        </>
      );
    case "MYTHRIL":
      return (
        <>
          <circle cx="12" cy="12" r="9" fill={fill} opacity="0.3" />
          <polygon points="12,4 16,12 12,20 8,12" fill={fill} />
        </>
      );
    case "ORICHALCUM":
      return <ellipse cx="12" cy="12" rx="10" ry="8" fill={fill} />;
    case "CELESTITE":
      return (
        <>
          <polygon points="12,3 20,12 12,21 4,12" fill={fill} />
          <circle cx="12" cy="12" r="3" fill="#fff" opacity="0.4" />
        </>
      );
    case "ASTRAL":
      return (
        <>
          <polygon points="12,2 14,9 21,9 15,13 17,20 12,16 7,20 9,13 3,9 10,9" fill={fill} />
        </>
      );
    case "COSMIC":
      return (
        <>
          <circle cx="12" cy="12" r="9" fill={fill} opacity="0.35" />
          <circle cx="12" cy="12" r="5" fill={fill} />
          <circle cx="8" cy="9" r="1.5" fill="#fff" opacity="0.8" />
        </>
      );
    case "ETERNAL":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill={fill} opacity="0.4" />
          <polygon points="12,4 15,11 22,12 15,13 12,20 9,13 2,12 9,11" fill={fill} />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="8" fill={fill} />;
  }
}

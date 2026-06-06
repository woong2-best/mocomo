import { cn } from "@/lib/utils";

/** Hand-painted sun with closed eyes — folk motif */
export function FolkSunFace({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle cx="32" cy="32" r="28" fill="#D4A843" stroke="#1B3A8C" strokeWidth="3" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="32"
          y1="4"
          x2="32"
          y2="10"
          stroke="#C4522A"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${deg} 32 32)`}
        />
      ))}
      <path
        d="M18 28 Q22 24 26 28"
        stroke="#1B3A8C"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M38 28 Q42 24 46 28"
        stroke="#1B3A8C"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 40 Q32 48 40 40"
        stroke="#1B3A8C"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** SVG brushstroke section divider */
export function FolkBrushDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      className={cn("w-full h-3 text-folk-cobalt", className)}
      aria-hidden
    >
      <path
        d="M0,6 Q50,0 100,6 T200,6 T300,6 T400,6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M0,8 Q60,12 120,7 T240,9 T360,5 T400,8"
        fill="none"
        stroke="#C4522A"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/** Protea-inspired maximalist floral accent */
export function FolkFloralAccent({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 80"
      className={cn("text-folk-terracotta opacity-30", className)}
      aria-hidden
    >
      <ellipse cx="60" cy="40" rx="28" ry="18" fill="#C4522A" opacity="0.5" />
      <ellipse cx="45" cy="35" rx="14" ry="22" fill="#1B3A8C" opacity="0.25" transform="rotate(-20 45 35)" />
      <ellipse cx="75" cy="38" rx="12" ry="20" fill="#D4A843" opacity="0.4" transform="rotate(15 75 38)" />
      <circle cx="60" cy="42" r="8" fill="#2E5C3A" opacity="0.5" />
      <path
        d="M60 50 L58 72 M60 50 L62 72"
        stroke="#2E5C3A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

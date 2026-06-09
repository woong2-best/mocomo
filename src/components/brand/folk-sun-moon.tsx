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
      <path d="M18 28 Q22 24 26 28" stroke="#1B3A8C" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M38 28 Q42 24 46 28" stroke="#1B3A8C" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M24 40 Q32 48 40 40" stroke="#1B3A8C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function FolkMoonFace({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M44 12 A28 28 0 1 0 44 52 A22 22 0 1 1 44 12"
        fill="#F5F0E8"
        stroke="#1B3A8C"
        strokeWidth="3"
      />
      <path d="M36 30 Q40 26 44 30" stroke="#1B3A8C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="48" cy="24" r="2" fill="#C4522A" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1="32"
          y1="6"
          x2="32"
          y2="11"
          stroke="#D4A843"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${deg} 32 32)`}
        />
      ))}
    </svg>
  );
}

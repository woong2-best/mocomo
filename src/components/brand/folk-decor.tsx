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

export function FolkFloralAccent({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={cn("text-folk-terracotta", className)} aria-hidden>
      <ellipse cx="60" cy="40" rx="28" ry="18" fill="#C4522A" opacity="0.45" />
      <ellipse cx="45" cy="35" rx="14" ry="22" fill="#1B3A8C" opacity="0.22" transform="rotate(-20 45 35)" />
      <ellipse cx="75" cy="38" rx="12" ry="20" fill="#D4A843" opacity="0.35" transform="rotate(15 75 38)" />
      <circle cx="60" cy="42" r="8" fill="#2E5C3A" opacity="0.45" />
      <path d="M60 50 L58 72 M60 50 L62 72" stroke="#2E5C3A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Maximalist protea field — tiled background */
export function FolkFloralField({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-full h-full", className)}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <pattern id="folk-protea" x="0" y="0" width="160" height="120" patternUnits="userSpaceOnUse">
          <rect width="160" height="120" fill="transparent" />
          <ellipse cx="40" cy="50" rx="22" ry="14" fill="#C4522A" opacity="0.12" />
          <ellipse cx="120" cy="70" rx="18" ry="12" fill="#1B3A8C" opacity="0.08" />
          <ellipse cx="80" cy="30" rx="16" ry="24" fill="#D4A843" opacity="0.1" transform="rotate(-15 80 30)" />
          <circle cx="40" cy="52" r="5" fill="#2E5C3A" opacity="0.15" />
          <circle cx="120" cy="72" r="4" fill="#2E5C3A" opacity="0.12" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#folk-protea)" />
    </svg>
  );
}

export function FolkSectionTitle({
  children,
  className,
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: "sun" | "moon";
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {icon === "moon" ? (
        <FolkMoonFace size={36} className="opacity-90" />
      ) : (
        <FolkSunFace size={36} className="opacity-90 animate-folk-float" />
      )}
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-folk-cobalt folk-chunky-text leading-tight">
          {children}
        </h2>
        <FolkBrushDivider className="mt-1 max-w-[12rem]" />
      </div>
    </div>
  );
}

/** Page backdrop — floral field + celestial motifs */
export function FolkArtStage({
  children,
  className,
  dense = false,
}: {
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div className={cn("folk-art-stage relative", className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <FolkFloralField className={cn("absolute inset-0", dense ? "opacity-[0.14]" : "opacity-[0.09]")} />
        <FolkSunFace
          size={dense ? 64 : 96}
          className="absolute -top-4 -right-2 sm:right-8 opacity-[0.18] animate-folk-float"
        />
        <FolkMoonFace
          size={dense ? 48 : 72}
          className="absolute bottom-16 -left-4 opacity-[0.12] hidden sm:block"
        />
        <FolkFloralAccent className="absolute top-1/3 right-0 w-32 h-20 opacity-40 hidden lg:block" />
        <FolkFloralAccent className="absolute bottom-1/4 left-0 w-28 h-16 opacity-30 scale-x-[-1] hidden md:block" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Auth / modal frame with painted border */
export function FolkArtFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "folk-art-frame relative rounded-2xl border-[3px] border-folk-cobalt/50 bg-folk-cream/95 shadow-folk p-6 sm:p-8",
        className
      )}
    >
      <FolkSunFace size={40} className="absolute -top-5 -right-3 opacity-80" />
      <FolkMoonFace size={32} className="absolute -bottom-4 -left-3 opacity-70 hidden sm:block" />
      {children}
    </div>
  );
}

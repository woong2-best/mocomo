import { cn } from "@/lib/utils";
import { FolkThemeCelestial } from "@/components/brand/folk-theme-celestial";

export { FolkMoonFace, FolkSunFace } from "@/components/brand/folk-sun-moon";

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
      {icon ? <FolkThemeCelestial size={36} className="opacity-90 animate-folk-float" /> : null}
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
        <FolkThemeCelestial
          size={dense ? 64 : 96}
          className="absolute -top-4 -right-2 sm:right-8 opacity-[0.18] animate-folk-float"
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
      <FolkThemeCelestial size={40} className="absolute -top-5 -right-3 opacity-80 pointer-events-none" />
      {children}
    </div>
  );
}

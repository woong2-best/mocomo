import { cn } from "@/lib/utils";

export { FolkMoonFace, FolkSunFace } from "@/components/brand/folk-sun-moon";

/** @deprecated Decorative divider removed */
export function FolkBrushDivider(_props: { className?: string }) {
  return null;
}

/** @deprecated Decorative accent removed */
export function FolkFloralAccent(_props: { className?: string }) {
  return null;
}

/** @deprecated Decorative field removed */
export function FolkFloralField(_props: { className?: string }) {
  return null;
}

export function FolkSectionTitle({
  children,
  className,
  icon: _icon,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: "sun" | "moon";
}) {
  return (
    <h2
      className={cn(
        "font-display font-bold text-xl sm:text-2xl text-foreground leading-tight",
        className
      )}
    >
      {children}
    </h2>
  );
}

/** Page wrapper — no decorative backdrop */
export function FolkArtStage({
  children,
  className,
  dense: _dense = false,
}: {
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return <div className={cn("relative", className)}>{children}</div>;
}

/** Auth / modal frame — plain card */
export function FolkArtFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative rounded-2xl border border-border bg-card shadow-sm p-6 sm:p-8", className)}>
      {children}
    </div>
  );
}

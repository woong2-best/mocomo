import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmoticonPreview({
  name,
  price,
  previewUrl,
  className,
  size = "md",
}: {
  name: string;
  price: number;
  previewUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const hasImage = !!previewUrl?.trim();
  const sizeClass =
    size === "lg" ? "aspect-square min-h-[200px]" : size === "sm" ? "h-14 w-14" : "aspect-square w-full";

  if (hasImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl!}
        alt={name}
        className={cn(sizeClass, "object-cover bg-muted/30", className)}
      />
    );
  }

  const tierLabel = `${price / 10_000}만원`;
  return (
    <div
      className={cn(
        sizeClass,
        "flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-500/15 via-pink-500/10 to-cyan-500/15 border border-dashed border-border/60 rounded-xl p-4",
        className
      )}
    >
      <Sparkles className={cn(size === "sm" ? "h-6 w-6" : "h-10 w-10", "text-primary/70")} />
      {size !== "sm" && (
        <>
          <span className="text-xs font-medium text-muted-foreground">이미지 준비 중</span>
          <span className="text-[10px] text-muted-foreground/80">{tierLabel}</span>
        </>
      )}
    </div>
  );
}

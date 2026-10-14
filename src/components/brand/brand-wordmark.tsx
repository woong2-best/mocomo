import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Header wordmark: MoCoMo in brand color, spaced “. net” suffix in white. */
export function BrandWordmark({
  nameClassName,
  suffixClassName,
  className,
}: {
  nameClassName?: string;
  suffixClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-baseline whitespace-nowrap", className)}>
      <span className={cn("shrink-0", nameClassName)}>{BRAND.name}</span>
      <span
        className={cn(
          "shrink-0 font-display font-bold leading-none text-white ml-[0.28em]",
          suffixClassName
        )}
      >
        <span className="mr-[0.1em]">.</span>
        <span>net</span>
      </span>
    </span>
  );
}

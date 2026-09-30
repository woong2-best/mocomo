import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";

type BrandLogoLockupProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** App icon mark — full bleed, no white matte frame. */
export function BrandLogoLockup({ size = 56, className, priority }: BrandLogoLockupProps) {
  return (
    <BrandLogo
      size={size}
      priority={priority}
      className={cn("rounded-[22%] object-cover shadow-sm", className)}
    />
  );
}

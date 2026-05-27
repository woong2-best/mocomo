import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ size = 44, className, priority }: BrandLogoProps) {
  return (
    <Image
      src={BRAND.logoSrc}
      alt={`${BRAND.name} 로고`}
      width={size}
      height={size}
      className={cn("object-contain shrink-0", className)}
      priority={priority}
    />
  );
}

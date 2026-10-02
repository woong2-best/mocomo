import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
      alt={t("brand.swb2c", { v0: BRAND.name })}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      priority={priority}
    />
  );
}

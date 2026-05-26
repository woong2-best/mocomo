import { countryFlag } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function CountryFlag({
  code,
  className,
  title,
}: {
  code: string;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn("inline-block leading-none shrink-0", className)}
      title={title ?? code}
      aria-hidden
    >
      {countryFlag(code)}
    </span>
  );
}

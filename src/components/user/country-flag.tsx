import { cn } from "@/lib/utils";

function normalizeCountryCode(code: string): string | null {
  const c = code.trim().toUpperCase();
  if (c === "OTHER" || c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return null;
  return c;
}

/** ISO 3166-1 alpha-2 국기 (Windows에서도 emoji 대신 이미지로 표시) */
export function CountryFlag({
  code,
  className,
  title,
  size = 18,
}: {
  code: string;
  className?: string;
  title?: string;
  size?: number;
}) {
  const iso = normalizeCountryCode(code);
  if (!iso) {
    return (
      <span className={cn("inline-block leading-none shrink-0 text-base", className)} title={title ?? code} aria-hidden>
        🌐
      </span>
    );
  }

  const height = Math.max(12, Math.round(size * 0.72));

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${iso.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${iso.toLowerCase()}.png 2x`}
      width={size}
      height={height}
      alt=""
      className={cn("inline-block rounded-[2px] object-cover shrink-0 align-middle", className)}
      title={title ?? iso}
      aria-hidden
      loading="lazy"
      decoding="async"
    />
  );
}

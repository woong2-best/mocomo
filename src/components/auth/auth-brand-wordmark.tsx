import { BRAND } from "@/lib/brand";

/** Auth cards — wordmark instead of square logo lockup. */
export function AuthBrandWordmark({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-4xl font-extrabold tracking-tight text-white drop-shadow-sm ${className}`.trim()}
      aria-label={BRAND.name}
    >
      {BRAND.name}
    </p>
  );
}

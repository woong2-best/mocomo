import { cn } from "@/lib/utils";

const GF_PATH =
  "M585 248 A282 281 0 1 0 604 632 Q607 628 607 618 L606 422 Q606 411 595 411 L383 411 Q371 411 371 423 L371 498 Q371 510 383 510 L494 510 L494 578 Q494 586 486 592 A168 174 0 1 1 497 322 Q505 335 520 330 L585 273 Q596 263 585 248 Z";

/** Compact GF wordmark for GIF attach buttons. */
export function GfIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="70 160 950 580"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-3 w-[20px]", className)}
      aria-hidden
    >
      <g fill="currentColor">
        <path d={GF_PATH} />
        <rect x="685" y="180" width="110" height="57" rx="8" />
        <rect x="685" y="282" width="102" height="436" rx="10" />
        <rect x="685" y="282" width="307" height="76" rx="10" />
        <rect x="770" y="455" width="195" height="80" rx="8" />
      </g>
    </svg>
  );
}

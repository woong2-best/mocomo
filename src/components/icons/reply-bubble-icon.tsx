import { cn } from "@/lib/utils";

/** 답글 — 왼쪽 곡선 화살표. `currentColor` → 라이트 검정 · 다크 흰색 */
export function ReplyBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      <path
        d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

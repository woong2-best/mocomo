import { cn } from "@/lib/utils";

/** 답글/댓글 — 말풍선 아웃라인. `currentColor` → 라이트 검정 · 다크 흰색 */
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
        d="M7 3.75h10a2.75 2.75 0 0 1 2.75 2.75v6.75A2.75 2.75 0 0 1 17 16H11.8L8.2 19.4V16H7A2.75 2.75 0 0 1 4.25 13.25V6.5A2.75 2.75 0 0 1 7 3.75Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

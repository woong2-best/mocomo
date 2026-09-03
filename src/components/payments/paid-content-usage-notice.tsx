import { cn } from "@/lib/utils";
import {
  PAID_CONTENT_USAGE_NOTICE_BODY,
  PAID_CONTENT_USAGE_NOTICE_TITLE,
} from "@/lib/paid-content-usage-notice";

/** Personal-viewing-licence warning. Renders immediately above the pay action. */
export function PaidContentUsageNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-left",
        className
      )}
      role="note"
    >
      <p className="text-[13px] font-bold leading-snug text-amber-900 dark:text-amber-200">
        {PAID_CONTENT_USAGE_NOTICE_TITLE}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
        {PAID_CONTENT_USAGE_NOTICE_BODY}
      </p>
    </div>
  );
}

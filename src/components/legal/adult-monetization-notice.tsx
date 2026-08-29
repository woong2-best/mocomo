import Link from "next/link";
import { ADULT_MONETIZATION_BANNED_SHORT } from "@/lib/adult-monetization-ban";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  compact?: boolean;
};

/** 성인 콘텐츠 유료화 금지 안내 */
export function AdultMonetizationNotice({ className, compact }: Props) {
  return (
    <p
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 text-destructive",
        compact ? "px-3 py-2 text-xs leading-relaxed" : "px-4 py-3 text-sm leading-relaxed",
        className
      )}
      role="note"
    >
      {ADULT_MONETIZATION_BANNED_SHORT}{" "}
      <Link href="/legal/payment" className="font-semibold underline underline-offset-2">
        결제 정책
      </Link>
      {" · "}
      <Link href="/legal/terms" className="font-semibold underline underline-offset-2">
        이용약관
      </Link>
    </p>
  );
}

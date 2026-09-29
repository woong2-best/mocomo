import Link from "next/link";
import { USED_AUCTION_C2C_DISCLOSURE } from "@/lib/used-auction-legal";

export function UsedAuctionLegalNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
          : "rounded-xl border border-border/60 bg-muted/20 p-3"
      }
    >
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {USED_AUCTION_C2C_DISCLOSURE}{" "}
        <Link href="/legal/terms" className="text-primary hover:underline whitespace-nowrap">
          이용약관 제8조
        </Link>
      </p>
    </div>
  );
}

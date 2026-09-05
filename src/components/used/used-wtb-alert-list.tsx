"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { removeSubcultureWtbAlert } from "@/actions/subculture-wtb";
import { formatUsedPrice } from "@/lib/used-market";
import { usedProductTypeLabel } from "@/lib/used-catalog";
import { Button } from "@/components/ui/button";

export type WtbAlertRow = {
  id: string;
  workTitle: string | null;
  animeSlug: string | null;
  productType: string | null;
  characterName: string | null;
  maxPrice: number | null;
  currency: string;
  note: string | null;
  createdAt: string;
};

function alertSummary(a: WtbAlertRow): string {
  return [
    a.workTitle,
    a.productType ? usedProductTypeLabel(a.productType) : null,
    a.characterName,
  ]
    .filter(Boolean)
    .join(" · ");
}

function searchHref(a: WtbAlertRow): string {
  const params = new URLSearchParams();
  if (a.animeSlug) params.set("anime", a.animeSlug);
  else if (a.workTitle) params.set("work", a.workTitle);
  if (a.productType) params.set("product", a.productType);
  return `/used?${params.toString()}`;
}

export function UsedWtbAlertList({ alerts: initial }: { alerts: WtbAlertRow[] }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    const res = await removeSubcultureWtbAlert(id);
    setBusyId(null);
    if ("error" in res && res.error) return;
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        등록된 WTB 알림이 없어요. 상품 상세에서 조건을 등록할 수 있어요.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li
          key={a.id}
          className="flex items-start gap-3 p-3 rounded-xl border bg-card"
        >
          <div className="min-w-0 flex-1">
            <Link href={searchHref(a)} className="font-medium text-sm hover:underline line-clamp-2">
              {alertSummary(a) || "조건 알림"}
            </Link>
            {a.maxPrice != null && a.maxPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                희망 최대 {formatUsedPrice(a.maxPrice, a.currency)}
              </p>
            )}
            {a.note && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.note}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(a.createdAt).toLocaleDateString("ko-KR")} 등록
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground"
            disabled={busyId === a.id}
            onClick={() => void remove(a.id)}
            aria-label="WTB 알림 해제"
          >
            <BellOff className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

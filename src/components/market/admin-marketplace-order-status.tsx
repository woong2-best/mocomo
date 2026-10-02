"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSetMarketplaceOrderStatus } from "@/actions/marketplace-admin";
import { Button } from "@/components/ui/button";

const STATUSES = [
  { id: "PAID" as const, label: t("market.s1p6xvzw") },
  { id: "PREPARING" as const, label: t("market.sq4kb3p") },
  { id: "SHIPPED" as const, label: t("market.sx24l") },
  { id: "DELIVERED" as const, label: t("market.sojtant") },
  { id: "CONFIRMED" as const, label: t("market.smnpopk") },
];

export function AdminMarketplaceOrderStatus({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {STATUSES.map((s) => (
        <Button
          key={s.id}
          type="button"
          size="sm"
          variant={currentStatus === s.id ? "default" : "outline"}
          disabled={pending || currentStatus === s.id}
          className="h-7 text-[10px] px-2"
          onClick={() => {
            startTransition(async () => {
              await adminSetMarketplaceOrderStatus(orderId, s.id);
              router.refresh();
            });
          }}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}

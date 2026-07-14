"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSetMarketplaceOrderStatus } from "@/actions/marketplace-admin";
import { Button } from "@/components/ui/button";

const STATUSES = [
  { id: "PAID" as const, label: "결제 완료" },
  { id: "PREPARING" as const, label: "준비 중" },
  { id: "SHIPPED" as const, label: "발송" },
  { id: "DELIVERED" as const, label: "배송완료" },
  { id: "CONFIRMED" as const, label: "구매확정" },
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

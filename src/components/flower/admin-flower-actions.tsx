"use client";

import { useTransition } from "react";
import {
  adminApproveFlowerRedeem,
  adminRejectFlowerRedeem,
} from "@/actions/flower-admin";
import { Button } from "@/components/ui/button";

type Redeem = Awaited<
  ReturnType<typeof import("@/actions/flower-admin").getAdminFlowerDashboard>
>["redeems"][number];

export function AdminFlowerRedeemActions({ redeem }: { redeem: Redeem }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await adminApproveFlowerRedeem(redeem.id);
            window.location.reload();
          })
        }
      >
        환전 승인·지급
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await adminRejectFlowerRedeem(redeem.id, "관리자 거절");
            window.location.reload();
          })
        }
      >
        거절·자산 복구
      </Button>
    </div>
  );
}

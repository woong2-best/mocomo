"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelMyCreatorSubscription } from "@/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";

export type SubscriptionRow = {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorName: string | null;
  creatorImage: string | null;
  amount: number;
  status: string;
  active: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  subscribedSince: string;
};

export function MySubscriptionsPanel({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function cancel(creatorId: string) {
    startTransition(async () => {
      const res = await cancelMyCreatorSubscription(creatorId);
      if ("error" in res && res.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (subscriptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        활성 정기 후원이 없습니다. 크리에이터 프로필에서 월 구독을 시작할 수 있습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {subscriptions.map((s) => (
        <li
          key={s.id}
          className="rounded-xl border border-border/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="min-w-0 flex-1">
            <Link href={`/u/${s.creatorUsername}`} className="font-bold hover:underline">
              @{s.creatorUsername}
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatUsd(s.amount)}/월 ·{" "}
              {s.active
                ? s.cancelAtPeriodEnd
                  ? `해지 예정 (${new Date(s.currentPeriodEnd).toLocaleDateString("ko-KR")}까지 이용)`
                  : `다음 결제 ${new Date(s.currentPeriodEnd).toLocaleDateString("ko-KR")}`
                : "만료됨"}
            </p>
          </div>
          {s.active && !s.cancelAtPeriodEnd ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => cancel(s.creatorId)}
            >
              다음 달 결제 취소
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

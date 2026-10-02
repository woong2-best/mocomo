"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
        {t("settings.ss4scu4")}
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
              {formatUsd(s.amount)}
              {t("settings.perMonth")} ·{" "}
              {s.active
                ? s.cancelAtPeriodEnd
                  ? t("settings.s1lmrs9d", { v0: new Date(s.currentPeriodEnd).toLocaleDateString("ko-KR") })
                  : t("settings.seb61es", { v0: new Date(s.currentPeriodEnd).toLocaleDateString("ko-KR") })
                : t("settings.ss44h4")}
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
              {t("settings.s1hnxsoc")}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

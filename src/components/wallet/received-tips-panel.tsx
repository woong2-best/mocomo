"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { formatUsd } from "@/lib/money";
import type { TipHistory } from "@/actions/support";

type Props = {
  tips: TipHistory["receivedTips"];
};

export function ReceivedTipsPanel({ tips }: Props) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <p className="font-bold">받은 후원</p>
      {tips.length === 0 ? (
        <p className="text-sm text-muted-foreground">받은 후원이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {tips.map((tip) => (
            <li key={tip.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/u/${tip.sender.username}`}
                    className="font-medium text-primary hover:underline"
                  >
                    @{tip.sender.username}
                  </Link>
                  {tip.message ? (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2">{tip.message}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(tip.createdAt, { addSuffix: true, locale: ko })}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-emerald-700">
                  +{formatUsd(tip.amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

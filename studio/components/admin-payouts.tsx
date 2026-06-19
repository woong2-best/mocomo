"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StudioPayoutRequest, User } from "@prisma/client";
import { completeStudioPayout } from "@/studio/actions/wallet";
import { Button } from "@/components/ui/button";

type Row = StudioPayoutRequest & {
  user: Pick<User, "id" | "username" | "name">;
};

export function AdminPayoutsClient({ payouts }: { payouts: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!payouts.length) {
    return <p className="text-muted-foreground">대기 중인 출금 요청이 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {payouts.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
          <div>
            <p className="font-medium">{p.user.name ?? p.user.username}</p>
            <p className="text-sm text-muted-foreground">
              {p.amountKrw.toLocaleString()}원 · {p.createdAt.toLocaleString("ko-KR")}
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await completeStudioPayout(p.id);
                router.refresh();
              })
            }
          >
            입금 완료
          </Button>
        </div>
      ))}
    </div>
  );
}

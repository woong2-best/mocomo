"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminUserAddMemoAction,
  adminUserChangeUsernameAction,
  adminUserGrantPremiumAction,
  adminUserRestoreAction,
  adminUserSoftDeleteAction,
  adminUserSuspendAction,
} from "@/actions/admin-cms";

export function AdminUserActions({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [reason, setReason] = useState("");
  const [newUsername, setNewUsername] = useState(username);
  const [memo, setMemo] = useState("");
  const [premiumDays, setPremiumDays] = useState(30);

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    start(async () => {
      const res = await fn();
      setMsg(res.error ?? "완료되었습니다.");
      if (!res.error) router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 p-4">
      <h2 className="text-sm font-semibold">관리 작업</h2>
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="사유 (정지/삭제)"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            run(() =>
              adminUserSuspendAction({
                userId,
                reason: reason || "관리자 정지",
                mode: "permanent",
              })
            )
          }
        >
          계정 정지
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            const until = new Date();
            until.setDate(until.getDate() + 7);
            return run(() =>
              adminUserSuspendAction({
                userId,
                reason: reason || "임시 정지 7일",
                mode: "temporary",
                untilIso: until.toISOString(),
              })
            );
          }}
        >
          7일 정지
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(() => adminUserRestoreAction(userId, reason || "해제"))}
        >
          계정 해제
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => adminUserSoftDeleteAction(userId, reason || "관리자 soft delete"))
          }
        >
          Soft Delete
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-muted-foreground">프리미엄 일수</label>
          <Input
            type="number"
            className="w-28"
            value={premiumDays}
            onChange={(e) => setPremiumDays(Number(e.target.value) || 30)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(() => adminUserGrantPremiumAction(userId, premiumDays))}
        >
          프리미엄 지급
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">닉네임 변경</label>
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(() => adminUserChangeUsernameAction(userId, newUsername))}
        >
          닉네임 저장
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">관리자 메모</label>
        <textarea
          className="min-h-[80px] w-full rounded-xl border border-border bg-background p-3 text-sm"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || !memo.trim()}
          onClick={() =>
            run(async () => {
              const r = await adminUserAddMemoAction(userId, memo);
              if (!r.error) setMemo("");
              return r;
            })
          }
        >
          메모 저장
        </Button>
      </div>

      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
    </div>
  );
}

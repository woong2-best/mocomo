"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  restoreUserAccount,
  searchSuspendedUsers,
  suspendUserPermanently,
  banUser,
} from "@/actions/admin";
import {
  getAdminAppeals,
  getBanEvasionSuspects,
  updateAppealStatus,
} from "@/actions/appeal";
import { accountStatusLabel, appealStatusLabel } from "@/lib/account-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountStatus, AppealStatus } from "@prisma/client";

type SuspendedUser = {
  id: string;
  username: string;
  email: string | null;
  accountStatus: AccountStatus;
  suspensionReason: string | null;
  suspendedAt: Date | null;
  isBanned: boolean;
};

export function AdminSuspensionsPanel({
  initialUsers,
  initialAppeals,
  initialEvasion,
}: {
  initialUsers: SuspendedUser[];
  initialAppeals: Awaited<ReturnType<typeof getAdminAppeals>>;
  initialEvasion: Awaited<ReturnType<typeof getBanEvasionSuspects>>;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [appeals, setAppeals] = useState(initialAppeals);
  const [evasion, setEvasion] = useState(initialEvasion);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("운영원칙 위반");
  const [targetUserId, setTargetUserId] = useState("");
  const [pending, startTransition] = useTransition();

  function refreshUsers() {
    startTransition(async () => {
      const rows = await searchSuspendedUsers(query);
      setUsers(rows);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-lg font-semibold">계정 제재</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="사용자 ID"
            className="max-w-xs"
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="정지 사유"
            className="min-w-[240px] flex-1"
          />
          <Button
            type="button"
            disabled={pending || !targetUserId.trim()}
            onClick={() =>
              startTransition(async () => {
                await suspendUserPermanently(targetUserId.trim(), reason.trim());
                refreshUsers();
              })
            }
          >
            영구 정지 (읽기 전용)
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !targetUserId.trim()}
            onClick={() =>
              startTransition(async () => {
                await banUser(targetUserId.trim(), reason.trim());
                refreshUsers();
              })
            }
          >
            이용 금지
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="계정 검색 (닉네임, 이메일, ID)"
            className="max-w-md"
          />
          <Button type="button" variant="secondary" disabled={pending} onClick={refreshUsers}>
            검색
          </Button>
        </div>

        <div className="divide-y divide-border/60 rounded-xl border border-border/60">
          {users.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">제재 계정이 없습니다.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">@{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.id}</p>
                  <p className="mt-1 text-sm">{accountStatusLabel(user.accountStatus)}</p>
                  <p className="text-sm text-muted-foreground">{user.suspensionReason ?? "-"}</p>
                  {user.suspendedAt && (
                    <p className="text-xs text-muted-foreground">
                      {format(user.suspendedAt, "yyyy-MM-dd HH:mm", { locale: ko })}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await restoreUserAccount(user.id, "관리자 복구");
                      refreshUsers();
                    })
                  }
                >
                  계정 복구
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-lg font-semibold">이의 제기</h2>
        <div className="divide-y divide-border/60 rounded-xl border border-border/60">
          {appeals.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">접수된 이의 제기가 없습니다.</p>
          ) : (
            appeals.map((appeal) => (
              <div key={appeal.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{appeal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      @{appeal.user.username} · {appealStatusLabel(appeal.status)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["UNDER_REVIEW", "INFO_REQUESTED", "APPROVED", "REJECTED"] as AppealStatus[]).map(
                      (status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await updateAppealStatus(appeal.id, status, `관리자 처리: ${status}`);
                              const next = await getAdminAppeals();
                              setAppeals(next);
                            })
                          }
                        >
                          {appealStatusLabel(status)}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <h2 className="text-lg font-semibold text-amber-800">제재 우회 의심</h2>
        <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
          {evasion.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">의심 기록이 없습니다.</p>
          ) : (
            evasion.map((row) => (
              <div key={row.id} className="p-4 text-sm">
                <p className="font-medium">
                  신규 @{row.user.username} ↔ 제재 @{row.linkedUser.username}
                </p>
                <p className="text-muted-foreground">유형: {row.matchType}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

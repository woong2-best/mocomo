"use client";

import { useState, useTransition } from "react";
import {
  operatorLiftRestriction,
  operatorRestoreContent,
  searchUserSanctions,
} from "@/actions/operator-sanctions";
import type { ContentTargetType } from "@/lib/operator-sanctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Lookup = Awaited<ReturnType<typeof searchUserSanctions>>;

function kindLabel(kind: string) {
  switch (kind) {
    case "CONTENT_REMOVE":
      return "게시물 숨김";
    case "SUSPEND_24H":
      return "24시간 정지";
    case "SUSPEND_3D":
      return "3일 정지";
    case "SUSPEND_5D":
      return "5일 정지";
    case "SUSPEND_PERMANENT":
      return "영구 정지";
    case "RESTORE_CONTENT":
      return "게시물 복구";
    case "LIFT_SUSPENSION":
      return "계정 제한 해제";
    default:
      return kind;
  }
}

export function AdminSanctionsLookup() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Lookup | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function search() {
    setMessage("");
    startTransition(async () => {
      const res = await searchUserSanctions(query);
      setResult(res);
      if (res.error) setMessage(res.error);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">유저 제재 기록</h2>
        <p className="text-sm text-muted-foreground">
          유저 ID 또는 username을 입력하면 시간순 제재 기록이 나옵니다. 숨긴 게시물은 좋아요·순서 그대로 복구됩니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="user id 또는 username"
          className="max-w-sm"
        />
        <Button type="button" disabled={pending || !query.trim()} onClick={search}>
          찾기
        </Button>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {result?.user ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
            <div>
              @{result.user.username} · {result.user.accountStatus}
              {result.user.suspensionExpiresAt
                ? ` · until ${new Date(result.user.suspensionExpiresAt).toLocaleString()}`
                : ""}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await operatorLiftRestriction(result.user!.id);
                  setMessage(res.error ?? "계정 제한을 해제했습니다.");
                  search();
                })
              }
            >
              계정 제한 해제
            </Button>
          </div>
          <ul className="space-y-2">
            {result.sanctions.map((row) => (
              <li key={row.id} className="rounded-xl border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {kindLabel(row.kind)} · {new Date(row.createdAt).toLocaleString()}
                  </p>
                  {row.kind === "CONTENT_REMOVE" && !row.reversedAt && row.targetId ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await operatorRestoreContent({
                            targetType: row.targetType as ContentTargetType,
                            targetId: row.targetId!,
                          });
                          setMessage(res.error ?? "게시물을 복구했습니다.");
                          search();
                        })
                      }
                    >
                      삭제 전 상태로 복구
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-muted-foreground">
                  actor @{row.actor.username}
                  {row.targetType ? ` · ${row.targetType}` : ""}
                  {row.targetId ? ` · ${row.targetId}` : ""}
                  {row.reversedAt ? ` · restored ${new Date(row.reversedAt).toLocaleString()}` : ""}
                </p>
                {row.reason ? <p className="mt-1">{row.reason}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  adminBanUserForStreamingAbuse,
  adminDeleteStreamingAccount,
  adminLoadVerificationLogs,
  adminRevokeStreamingAccount,
} from "@/actions/admin-streaming-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type AccountItem = {
  id: string;
  platform: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  verified: boolean;
  verificationMethod: string | null;
  verifiedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  user: { id: string; username: string };
  _count: { verificationLogs: number };
};

type LogItem = {
  id: string;
  action: string;
  method: string | null;
  success: boolean;
  detail: string | null;
  actorId: string | null;
  createdAt: Date;
};

type Props = {
  items: AccountItem[];
  total: number;
  page: number;
  totalPages: number;
  query: { q?: string; verified?: string; page?: number };
};

export function AdminStreamingAccountsTable({ items, total, page, totalPages, query }: Props) {
  const [q, setQ] = useState(query.q ?? "");
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [pending, startTransition] = useTransition();

  function buildHref(overrides: Record<string, string | number | undefined>) {
    const p = new URLSearchParams();
    const merged = { ...query, ...overrides };
    if (merged.q) p.set("q", String(merged.q));
    if (merged.verified && merged.verified !== "all") p.set("verified", String(merged.verified));
    if (merged.page && Number(merged.page) > 1) p.set("page", String(merged.page));
    const qs = p.toString();
    return `/admin/streaming-accounts${qs ? `?${qs}` : ""}`;
  }

  async function showLogs(accountId: string) {
    setLogsFor(accountId);
    const res = await adminLoadVerificationLogs(accountId);
    if (res.ok) setLogs(res.logs);
  }

  function onRevoke(accountId: string) {
    const reason = prompt("해제 사유를 입력하세요:");
    if (!reason?.trim()) return;
    startTransition(async () => {
      await adminRevokeStreamingAccount(accountId, reason);
      window.location.reload();
    });
  }

  function onDelete(accountId: string) {
    if (!confirm("연결을 완전히 삭제할까요?")) return;
    startTransition(async () => {
      await adminDeleteStreamingAccount(accountId);
      window.location.reload();
    });
  }

  function onBanUser(userId: string, username: string) {
    const reason = prompt(`@${username} 계정 정지 사유:`);
    if (!reason?.trim()) return;
    startTransition(async () => {
      await adminBanUserForStreamingAbuse(userId, reason);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <form action="/admin/streaming-accounts" method="get" className="flex flex-wrap gap-2">
        <Input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="채널명 · ID · 사용자명"
          className="max-w-xs"
        />
        <select
          name="verified"
          defaultValue={query.verified ?? "all"}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">전체</option>
          <option value="yes">인증됨</option>
          <option value="no">미인증</option>
          <option value="revoked">해제됨</option>
        </select>
        <Button type="submit" size="sm">
          검색
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">총 {total.toLocaleString()}건</p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">플랫폼</th>
              <th className="px-3 py-2 font-medium">채널</th>
              <th className="px-3 py-2 font-medium">MoCoMo 사용자</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium">로그</th>
              <th className="px-3 py-2 text-right font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-2">{row.platform}</td>
                <td className="px-3 py-2">
                  <div className="max-w-[200px] truncate font-medium">{row.channelName}</div>
                  <a
                    href={row.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {row.channelId}
                  </a>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${row.user.id}`} className="hover:underline">
                    @{row.user.username}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {row.revokedAt ? (
                    <Badge variant="destructive">해제</Badge>
                  ) : row.verified ? (
                    <Badge>인증</Badge>
                  ) : (
                    <Badge variant="secondary">대기</Badge>
                  )}
                  {row.verificationMethod ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {row.verificationMethod}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="ghost" onClick={() => showLogs(row.id)}>
                    {row._count.verificationLogs}
                  </Button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {!row.revokedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onRevoke(row.id)}
                      >
                        해제
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => onDelete(row.id)}
                    >
                      삭제
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => onBanUser(row.user.id, row.user.username)}
                    >
                      정지
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref({ page: page - 1, q })}>
            <Button size="sm" variant="outline">
              이전
            </Button>
          </Link>
        ) : null}
        <span className="self-center text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={buildHref({ page: page + 1, q })}>
            <Button size="sm" variant="outline">
              다음
            </Button>
          </Link>
        ) : null}
      </div>

      {logsFor ? (
        <div className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">검증 로그</h3>
            <Button size="sm" variant="ghost" onClick={() => setLogsFor(null)}>
              닫기
            </Button>
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
            {logs.map((log) => (
              <li key={log.id} className="rounded bg-muted/50 p-2">
                <span className={log.success ? "text-foreground" : "text-destructive"}>
                  {log.action}
                </span>
                {" · "}
                {new Date(log.createdAt).toLocaleString("ko-KR")}
                {log.detail ? <p className="mt-1 text-muted-foreground">{log.detail}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

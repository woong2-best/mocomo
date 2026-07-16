"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminExportUsersCsvAction } from "@/actions/admin-cms";

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  role: string;
  premiumTier: string;
  accountStatus: string;
  isBanned: boolean;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  lastLoginAt: Date | string | null;
};

export function AdminUsersTable({
  items,
  total,
  page,
  totalPages,
  query,
}: {
  items: UserRow[];
  total: number;
  page: number;
  totalPages: number;
  query: { q?: string; sort?: string; order?: string; status?: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(query.q ?? "");
  const [pending, start] = useTransition();

  function pushParams(patch: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    });
    router.push(`/admin/users?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="닉네임 · 이메일 · UID"
          className="max-w-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") pushParams({ q: q || undefined, page: "1" });
          }}
        />
        <Button type="button" onClick={() => pushParams({ q: q || undefined, page: "1" })}>
          검색
        </Button>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={query.status ?? "all"}
          onChange={(e) => pushParams({ status: e.target.value, page: "1" })}
        >
          <option value="all">전체</option>
          <option value="active">활성</option>
          <option value="suspended">정지</option>
          <option value="premium">프리미엄</option>
          <option value="deleted">삭제됨</option>
        </select>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={query.sort ?? "createdAt"}
          onChange={(e) => pushParams({ sort: e.target.value })}
        >
          <option value="createdAt">가입일</option>
          <option value="lastLoginAt">최근 로그인</option>
          <option value="username">닉네임</option>
        </select>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await adminExportUsersCsvAction({
                q: query.q,
                sort: query.sort as "createdAt" | "lastLoginAt" | "username" | undefined,
                order: query.order as "asc" | "desc" | undefined,
                status: query.status as
                  | "all"
                  | "active"
                  | "suspended"
                  | "deleted"
                  | "premium"
                  | undefined,
              });
              if (!res.ok || !res.csv) return;
              const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `users-${Date.now()}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            })
          }
        >
          CSV 다운로드
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">총 {total.toLocaleString()}명</p>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">회원</th>
              <th className="px-3 py-2">역할</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">가입</th>
              <th className="px-3 py-2">최근 로그인</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-primary hover:underline">
                    @{u.username}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">{u.email ?? u.id}</p>
                </td>
                <td className="px-3 py-2 text-xs">{u.role}</td>
                <td className="px-3 py-2 text-xs">
                  {u.deletedAt ? "DELETED" : u.isBanned ? "BANNED" : u.accountStatus}
                  {u.premiumTier === "PREMIUM" ? " · PREMIUM" : ""}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(u.createdAt).toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().slice(0, 16).replace("T", " ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => pushParams({ page: String(page - 1) })}
        >
          이전
        </Button>
        <span className="text-xs text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => pushParams({ page: String(page + 1) })}
        >
          다음
        </Button>
      </div>
    </div>
  );
}

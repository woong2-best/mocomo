"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminExportCouponsCsvAction } from "@/actions/admin-coupons";
import { CouponCreateDialog } from "@/components/admin/cms/coupon-create-dialog";

type Row = {
  id: string;
  name: string;
  code: string;
  listStatus: string;
  benefitLabel: string;
  audience: string;
  assignedCount: number;
  usedCount: number;
  usedBenefitKrw: number;
  remainingBenefitKrw: number | null;
  createdAt: Date | string;
  endsAt: Date | string | null;
  createdBy: { username: string };
};

export function AdminCouponsTable({
  items,
  total,
  page,
  totalPages,
  query,
  canWrite,
}: {
  items: Row[];
  total: number;
  page: number;
  totalPages: number;
  query: { q?: string; status?: string; sort?: string };
  canWrite: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(query.q ?? "");
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  function push(patch: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (!v || v === "all") sp.delete(k);
      else sp.set(k, v);
    });
    router.push(`/admin/coupons?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="코드 · 쿠폰명 · 생성자"
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") push({ q: q || undefined, page: "1" });
            }}
          />
          <Button type="button" onClick={() => push({ q: q || undefined, page: "1" })}>
            검색
          </Button>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={query.status ?? "all"}
            onChange={(e) => push({ status: e.target.value, page: "1" })}
          >
            <option value="all">전체</option>
            <option value="ACTIVE">사용중</option>
            <option value="EXPIRED">만료</option>
            <option value="INACTIVE">비활성화</option>
            <option value="EXHAUSTED">사용완료</option>
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={query.sort ?? "newest"}
            onChange={(e) => push({ sort: e.target.value })}
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="expires">만료순</option>
            <option value="usage">사용량순</option>
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await adminExportCouponsCsvAction({
                  q: query.q,
                  status: query.status as
                    | "all"
                    | "ACTIVE"
                    | "INACTIVE"
                    | "EXPIRED"
                    | "EXHAUSTED"
                    | undefined,
                  sort: query.sort as "newest" | "oldest" | "expires" | "usage" | undefined,
                });
                if (!res.ok || !res.csv) return;
                const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `coupons-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              })
            }
          >
            CSV 다운로드
          </Button>
        </div>
        {canWrite ? (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            새 쿠폰 생성
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">총 {total.toLocaleString()}개</p>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">쿠폰명</th>
              <th className="px-3 py-2">코드</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">혜택</th>
              <th className="px-3 py-2">적용 대상</th>
              <th className="px-3 py-2">사용 인원</th>
              <th className="px-3 py-2">사용 금액</th>
              <th className="px-3 py-2">남은 혜택</th>
              <th className="px-3 py-2">생성일</th>
              <th className="px-3 py-2">만료일</th>
              <th className="px-3 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                <td className="px-3 py-2 text-xs">{c.listStatus}</td>
                <td className="px-3 py-2 text-xs">{c.benefitLabel}</td>
                <td className="px-3 py-2 text-xs">{c.audience}</td>
                <td className="px-3 py-2 tabular-nums">
                  {c.usedCount}/{c.assignedCount}
                </td>
                <td className="px-3 py-2 tabular-nums">₩{c.usedBenefitKrw.toLocaleString()}</td>
                <td className="px-3 py-2 tabular-nums">
                  {c.remainingBenefitKrw != null
                    ? `₩${c.remainingBenefitKrw.toLocaleString()}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(c.createdAt).toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 10) : "—"}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/coupons/${c.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    상세
                  </Link>
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
          onClick={() => push({ page: String(page - 1) })}
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
          onClick={() => push({ page: String(page + 1) })}
        >
          다음
        </Button>
      </div>

      {canWrite ? (
        <CouponCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </div>
  );
}

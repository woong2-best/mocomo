"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromotionCreateDialog } from "@/components/admin/cms/promotion-create-dialog";

type Row = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  priority: number;
  trigger: string;
  benefitLabel: string;
  assignedCount: number;
  usedCount: number;
  usedBenefitKrw: number;
  endsAt: Date | string | null;
  createdBy: { username: string };
};

export function AdminPromotionsTable({
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
  query: { q?: string; active?: string };
  canWrite: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(query.q ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, start] = useTransition();

  function push(patch: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const next = { q: query.q, active: query.active, ...patch };
    Object.entries(next).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    router.push(`/admin/promotions?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.slug")}
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") push({ q: q || undefined, page: "1" });
            }}
          />
          <Button type="button" disabled={pending} onClick={() => start(() => push({ q: q || undefined, page: "1" }))}>
            검색
          </Button>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={query.active ?? "all"}
            onChange={(e) =>
              push({
                active: e.target.value === "all" ? undefined : e.target.value,
                page: "1",
              })
            }
          >
            <option value="all">{t("lib.live.categories.s934dd25ec5")}</option>
            <option value="true">{t("settings.twoFactorOn")}</option>
            <option value="false">{t("settings.twoFactorOff")}</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/promotions/statistics">{t("lib.admin.s10m9b")}</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/coupons">{t("lib.admin.s10is0")}</Link>
          </Button>
          {canWrite ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              프로모션 생성
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">총 {total.toLocaleString()}건</p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">{t("admin.spved3s")}</th>
              <th className="p-3">{t("market.name")}</th>
              <th className="p-3">{t("admin.s11kch")}</th>
              <th className="p-3">{t("admin.svrn5o")}</th>
              <th className="p-3">{t("admin.s1b66usf")}</th>
              <th className="p-3">{t("admin.syyvc")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-border/60">
                <td className="p-3 font-mono">{p.priority}</td>
                <td className="p-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.slug}</div>
                  {!p.active ? (
                    <span className="text-xs text-destructive">{t("settings.twoFactorOff")}</span>
                  ) : null}
                </td>
                <td className="p-3">{p.benefitLabel}</td>
                <td className="p-3 font-mono text-xs">{p.trigger}</td>
                <td className="p-3">
                  {p.assignedCount} / {p.usedCount}
                </td>
                <td className="p-3">₩{p.usedBenefitKrw.toLocaleString()}</td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/promotions/${p.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    상세
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  프로모션이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => push({ page: String(page - 1) })}
          >
            이전
          </Button>
          <span className="self-center text-sm">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => push({ page: String(page + 1) })}
          >
            다음
          </Button>
        </div>
      ) : null}

      <PromotionCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

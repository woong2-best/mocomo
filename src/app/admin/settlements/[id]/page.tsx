import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetSettlementAction } from "@/actions/admin-settlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminSettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await adminGetSettlementAction(id);
  if (!res.ok || !res.data) notFound();
  const s = res.data;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/admin/settlements" className="text-sm text-muted-foreground hover:underline">
          ← 정산 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{s.title ?? t("app.admin.sz397")}</h1>
        <p className="text-sm text-muted-foreground">
          @{s.user.username} · {s.status}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Amount</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">{t("lib.platform.spwb1vk")}</span>
          <span>₩{s.grossAmountKrw.toLocaleString()}</span>
          <span className="text-muted-foreground">{t("app.admin.stdhak")}</span>
          <span>₩{s.feeAmountKrw.toLocaleString()}</span>
          <span className="text-muted-foreground">{t("admin.syyvc")}</span>
          <span>₩{s.discountAmountKrw.toLocaleString()}</span>
          <span className="text-muted-foreground">{t("admin.sueibc")}</span>
          <span className="font-semibold">₩{s.netAmountKrw.toLocaleString()}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("app.admin.settlementitem")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {s.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{i.type}</span>{" "}
                  {i.label}
                </span>
                <span>₩{i.amountKrw.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("app.admin.settlementhistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {s.history.map((h) => (
              <li key={h.id}>
                {h.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {h.action}
                {h.fromStatus ? ` ${h.fromStatus}` : ""}
                {h.toStatus ? ` → ${h.toStatus}` : ""}
                {h.detail ? ` · ${h.detail}` : ""}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

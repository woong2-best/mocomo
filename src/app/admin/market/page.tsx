import Link from "next/link";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminMarketplaceOrderStatus } from "@/components/market/admin-marketplace-order-status";
import {
  AdminDisputeCard,
  AdminReviewOrderCard,
} from "@/components/market/admin-dispute-center";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getAdminMarketplaceDisputeCenter,
  listPendingMarketplaceSellers,
} from "@/actions/marketplace-admin";
import { AdminSellerApprovalList } from "@/components/market/admin-seller-approval";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export const dynamic = "force-dynamic";

export default async function AdminMarketPage() {
  try {
    await requireAdmin({ action: "MARKETPLACE_ADMIN_VIEW" });
  } catch {
    return <AdminAccessDenied />;
  }

  const [center, orders, feeSum, pendingSellers] = await Promise.all([
    getAdminMarketplaceDisputeCenter(),
    db.marketplaceOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        buyer: { select: { username: true } },
        seller: { select: { username: true } },
        items: { take: 1 },
      },
    }),
    db.marketplaceOrder.aggregate({
      where: {
        status: {
          in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED", "SETTLED"],
        },
      },
      _sum: { platformFeeAmount: true, sellerEarnAmount: true, subtotalAmount: true },
    }),
    listPendingMarketplaceSellers().catch(() => []),
  ]);

  return (
    <AdminPageChrome maxWidth="4xl" title={`${MARKET_BRAND_NAME} 분쟁 · 보호 센터`}>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← 관리자 홈
        </Link>
      </div>

      <section className="mb-8 space-y-3">
        <h2 className="font-semibold">판매자 승인 대기 (KYC·정산 검토)</h2>
        <AdminSellerApprovalList sellers={pendingSellers} />
      </section>

      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">거래액(상품)</p>
          <p className="text-xl font-bold">
            {(feeSum._sum.subtotalAmount ?? 0).toLocaleString()}원
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">플랫폼 수수료</p>
          <p className="text-xl font-bold">
            {(feeSum._sum.platformFeeAmount ?? 0).toLocaleString()}원
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">판매자 정산 예정/완료</p>
          <p className="text-xl font-bold">
            {(feeSum._sum.sellerEarnAmount ?? 0).toLocaleString()}원
          </p>
        </div>
      </div>

      <section className="mb-8 space-y-3">
        <h2 className="font-semibold">열린 분쟁</h2>
        {center.disputes.length === 0 ? (
          <p className="text-sm text-muted-foreground">열린 분쟁이 없습니다.</p>
        ) : (
          center.disputes.map((d) => <AdminDisputeCard key={d.id} dispute={d} />)
        )}
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="font-semibold">위험 · 정산 보류 주문</h2>
        {center.reviewOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">검토 대기 주문이 없습니다.</p>
        ) : (
          center.reviewOrders.map((o) => <AdminReviewOrderCard key={o.id} order={o} />)
        )}
      </section>

      <section className="mb-8 space-y-2">
        <h2 className="font-semibold">대기 신고</h2>
        {center.reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">대기 중인 신고가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 text-sm">
            {center.reports.map((r) => (
              <li key={r.id} className="p-3">
                <p className="font-medium">
                  {r.reason} · listing {r.listingId ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">{r.details}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8 space-y-2">
        <h2 className="font-semibold">감사 로그 (최근)</h2>
        <ul className="text-xs space-y-1 max-h-64 overflow-auto rounded-xl border border-border/60 p-3">
          {center.recentAudit.map((a) => (
            <li key={a.id} className="text-muted-foreground">
              <span className="text-foreground font-medium">{a.action}</span> ·{" "}
              {a.createdAt.toISOString().slice(0, 19)} · {a.detail ?? ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">최근 주문</h2>
        <ul className="divide-y divide-border/60 rounded-2xl border border-border/60">
          {orders.map((o) => (
            <li key={o.id} className="p-3 text-sm flex justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <Link href={`/market/orders/${o.id}`} className="hover:underline">
                    {o.items[0]?.titleSnapshot ?? o.id}
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  @{o.buyer.username} → @{o.seller.username} · {o.status} ·{" "}
                  {o.settlementStatus}
                  {o.shipCountry ? ` · ${o.shipCountry}` : ""}
                </p>
                <AdminMarketplaceOrderStatus orderId={o.id} currentStatus={o.status} />
              </div>
              <p className="text-xs shrink-0">
                {(o.subtotalAmount + o.shippingAmount).toLocaleString()}원
              </p>
            </li>
          ))}
        </ul>
      </section>
    </AdminPageChrome>
  );
}

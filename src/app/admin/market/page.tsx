import Link from "next/link";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminMarketplaceOrderStatus } from "@/components/market/admin-marketplace-order-status";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveMarketplaceDispute } from "@/actions/marketplace-admin";

export const dynamic = "force-dynamic";

export default async function AdminMarketPage() {
  try {
    await requireAdmin({ action: "MARKETPLACE_ADMIN_VIEW" });
  } catch {
    return <AdminAccessDenied />;
  }

  const [orders, disputes, feeSum] = await Promise.all([
    db.marketplaceOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        buyer: { select: { username: true } },
        seller: { select: { username: true } },
        items: { take: 1 },
      },
    }),
    db.marketplaceDispute.findMany({
      where: { status: { in: ["OPEN", "EVIDENCE", "REVIEWING"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        opener: { select: { username: true } },
        order: { select: { id: true, buyerId: true, sellerId: true } },
      },
    }),
    db.marketplaceOrder.aggregate({
      where: { status: { in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED"] } },
      _sum: { platformFeeAmount: true, sellerEarnAmount: true, subtotalAmount: true },
    }),
  ]);

  return (
    <AdminPageChrome maxWidth="4xl" title="MARKET 정산 · 분쟁">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← 관리자 홈
        </Link>
      </div>

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
          <p className="text-xs text-muted-foreground">판매자 지급액</p>
          <p className="text-xl font-bold">
            {(feeSum._sum.sellerEarnAmount ?? 0).toLocaleString()}원
          </p>
        </div>
      </div>

      <section className="mb-8 space-y-3">
        <h2 className="font-semibold">열린 분쟁</h2>
        {disputes.length === 0 ? (
          <p className="text-sm text-muted-foreground">열린 분쟁이 없습니다.</p>
        ) : (
          disputes.map((d) => (
            <form
              key={d.id}
              action={async (fd) => {
                "use server";
                const decision = String(fd.get("decision") ?? "");
                const note = String(fd.get("note") ?? "");
                await resolveMarketplaceDispute(d.id, decision as "buyer" | "seller", note);
              }}
              className="rounded-xl border border-border/60 p-3 space-y-2 text-sm"
            >
              <p className="font-medium">
                @{d.opener.username} · {d.reason}
              </p>
              <p className="text-xs text-muted-foreground">주문 {d.orderId}</p>
              <input
                name="note"
                placeholder="처리 메모"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  name="decision"
                  value="buyer"
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                >
                  구매자 승
                </button>
                <button
                  name="decision"
                  value="seller"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  판매자 승
                </button>
              </div>
            </form>
          ))
        )}
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
                  @{o.buyer.username} → @{o.seller.username} · {o.status}
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

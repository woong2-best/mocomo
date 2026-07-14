import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listMyMarketplaceOrders } from "@/actions/marketplace-checkout";
import { MarketPageTitle } from "@/components/market/market-page-chrome";

export const dynamic = "force-dynamic";

export default async function MarketOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/market/orders");

  const role = (await searchParams).role === "seller" ? "seller" : "buyer";
  const orders = await listMyMarketplaceOrders(role);

  return (
    <>
      <MarketPageTitle>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">주문</h1>
            <p className="text-sm text-muted-foreground">구매 · 판매 주문 관리</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              href="/market/orders"
              className={role === "buyer" ? "font-semibold text-primary" : "text-muted-foreground"}
            >
              구매
            </Link>
            <Link
              href="/market/orders?role=seller"
              className={role === "seller" ? "font-semibold text-primary" : "text-muted-foreground"}
            >
              판매
            </Link>
          </div>
        </div>
      </MarketPageTitle>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">주문이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-2xl border border-border/60">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/market/orders/${o.id}`} className="block p-4 hover:bg-muted/30">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {o.items[0]?.titleSnapshot ?? "주문"}
                      {o.items.length > 1 ? ` 외 ${o.items.length - 1}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {o.status} · {(o.subtotalAmount + o.shippingAmount).toLocaleString()}원 ·{" "}
                      {role === "buyer" ? `@${o.seller.username}` : `@${o.buyer.username}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {o.createdAt.toISOString().slice(0, 10)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

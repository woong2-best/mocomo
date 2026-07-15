import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyFlowerWallet, listFlowerCatalog } from "@/actions/flower";
import {
  FlowerCatalogBuy,
  FlowerRedeemButton,
  FlowerSendForm,
} from "@/components/flower/flower-widgets";
import { SupportPageChrome, SupportPageTitle } from "@/components/support/support-page-chrome";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "shop", label: "구매" },
  { id: "wallet", label: "보관함" },
  { id: "sent", label: "보낸 꽃" },
  { id: "received", label: "받은 꽃" },
  { id: "ledger", label: "원장" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default async function FlowersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; to?: string; context?: string; contextId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/flowers");

  const params = await searchParams;
  const tab = (TABS.some((t) => t.id === params.tab) ? params.tab : "shop") as Tab;

  const [catalog, wallet] = await Promise.all([listFlowerCatalog(), getMyFlowerWallet()]);

  return (
    <SupportPageChrome>
      <SupportPageTitle>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flower Gift</h1>
          <p className="text-sm text-muted-foreground mt-1">
            현금 가치 있는 디지털 후원 꽃 · 선물 · 재선물 · 환전 (수수료 15%)
          </p>
        </div>
      </SupportPageTitle>

      <div className="rounded-2xl border border-border/60 p-4 mb-6 grid gap-2 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">보유 자산</p>
          <p className="text-lg font-bold">{wallet.assetCount}송이</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">환전 가능 액면가</p>
          <p className="text-lg font-bold">{wallet.redeemableKrw.toLocaleString()}원</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">환전 시 예상 수령 (약 85%)</p>
          <p className="text-lg font-bold">
            {Math.floor(wallet.redeemableKrw * 0.85).toLocaleString()}원
          </p>
        </div>
      </div>

      <nav className="flex border-b border-border/60 gap-1 overflow-x-auto mb-6">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/flowers?tab=${t.id}`}
            className={`shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "shop" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Stripe로 구매 후 보관함에 지급됩니다. MoCoMo는 원장(Ledger)으로 모든 이동을 기록합니다.
          </p>
          <FlowerCatalogBuy types={catalog} />
        </div>
      )}

      {tab === "wallet" && (
        <div className="space-y-6">
          <FlowerSendForm
            assets={wallet.held}
            defaultTo={params.to}
            defaultContext={
              (params.context as "PROFILE" | "LIVE" | "DIRECT" | undefined) ?? "DIRECT"
            }
            defaultContextId={params.contextId}
          />
          <ul className="space-y-2">
            {wallet.held.length === 0 ? (
              <p className="text-sm text-muted-foreground">보유 중인 Flower가 없습니다.</p>
            ) : (
              wallet.held.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {a.flowerType.emoji} {a.flowerType.nameKo} · {a.faceValueKrw.toLocaleString()}
                      원
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.status} · {a.id.slice(0, 10)}…
                    </p>
                  </div>
                  {a.status === "HELD" && (
                    <FlowerRedeemButton assetId={a.id} faceValueKrw={a.faceValueKrw} />
                  )}
                </li>
              ))
            )}
          </ul>
          {wallet.redeems.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">환전 요청</h2>
              {wallet.redeems.map((r) => (
                <div key={r.id} className="rounded-xl border p-3 text-xs text-muted-foreground">
                  {r.asset.flowerType.emoji} {r.status} · 수령 예정{" "}
                  {r.netAmountKrw.toLocaleString()}원
                  {r.riskFlags.length > 0 ? ` · 위험 ${r.riskFlags.join(",")}` : ""}
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {tab === "sent" && (
        <ul className="space-y-2 text-sm">
          {wallet.sent.length === 0 ? (
            <p className="text-muted-foreground">보낸 기록이 없습니다.</p>
          ) : (
            wallet.sent.map((t) => (
              <li key={t.id} className="rounded-xl border border-border/60 p-3">
                <p className="font-medium">
                  {t.asset.flowerType.emoji} → @{t.toUser.username}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.createdAt.toISOString().slice(0, 16)} · {t.message}
                </p>
              </li>
            ))
          )}
        </ul>
      )}

      {tab === "received" && (
        <ul className="space-y-2 text-sm">
          {wallet.received.length === 0 ? (
            <p className="text-muted-foreground">받은 기록이 없습니다.</p>
          ) : (
            wallet.received.map((t) => (
              <li key={t.id} className="rounded-xl border border-border/60 p-3">
                <p className="font-medium">
                  {t.asset.flowerType.emoji} ← @{t.fromUser.username}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.createdAt.toISOString().slice(0, 16)} · {t.message}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  재선물·환전은 보관함에서 가능합니다.
                </p>
              </li>
            ))
          )}
        </ul>
      )}

      {tab === "ledger" && (
        <ul className="space-y-1 text-xs font-mono max-h-[480px] overflow-auto rounded-xl border p-3">
          {wallet.ledger.map((e) => (
            <li key={e.id} className="text-muted-foreground border-b border-border/40 py-1.5">
              <span className="text-foreground">{e.action}</span> {e.amountKrw} · bal{" "}
              {e.balanceAfterKrw ?? "-"} · {e.createdAt.toISOString().slice(0, 19)}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-muted-foreground mt-8">
        Flower Gift는 디지털 자산입니다. 모든 계산은 서버에서 수행되며, 중복 지급·음수 잔액·잔액
        초과 전송을 방지합니다.{" "}
        <Link href="/support" className="underline">
          후원 홈
        </Link>
      </p>
    </SupportPageChrome>
  );
}

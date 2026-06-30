"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { X, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { createPurchaseServiceForClient } from "@/lib/apt/purchase/purchase-service";
import { verifyIapOnServer } from "@/lib/apt/iap/client-verify";
import {
  exchangeAptGemsForGold,
  getAptGemShopCatalog,
} from "@/actions/apt-iap";
import { calcGoldFromGems } from "@/lib/apt/economy/economy-config-types";
import type { AptGemShopCatalog } from "@/actions/apt-iap";
import { hydrateLocalEconomy } from "@/lib/apt/local-home-store";

function AptGemShopSheetInner() {
  const {
    game,
    economy,
    gemShopOpen,
    setGemShopOpen,
    showToast,
    refreshEconomyFromServer,
    setGame,
  } = useAptGameRequired();
  const { isNativeApp } = useClientPlatform();
  const [catalog, setCatalog] = useState<AptGemShopCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [billingReady, setBillingReady] = useState(false);
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [exchangeGems, setExchangeGems] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!gemShopOpen) {
      setMsg(null);
      setPurchasingId(null);
      setLoading(false);
      setCatalog(null);
      setStorePrices({});
      setBillingReady(false);
      return;
    }
    setCatalogLoading(true);
    void getAptGemShopCatalog()
      .then(setCatalog)
      .finally(() => setCatalogLoading(false));
    void createPurchaseServiceForClient(isNativeApp).then(async (svc) => {
      setBillingReady(await svc.isAvailable());
    });
  }, [gemShopOpen, isNativeApp]);

  useEffect(() => {
    const max = economy.wallet.gems;
    if (max <= 0) {
      setExchangeGems(1);
      return;
    }
    if (exchangeGems > max) setExchangeGems(max);
  }, [economy.wallet.gems, exchangeGems]);

  useEffect(() => {
    if (!gemShopOpen || !catalog || !billingReady) {
      if (!billingReady) setStorePrices({});
      return;
    }
    const ids = catalog.products.filter((p) => p.type === "gems").map((p) => p.productId);
    if (ids.length === 0) return;
    void createPurchaseServiceForClient(isNativeApp).then(async (svc) => {
      try {
        const products = await svc.getProducts(ids);
        setStorePrices(Object.fromEntries(products.map((p) => [p.productId, p.price])));
      } catch {
        setStorePrices({});
      }
    });
  }, [gemShopOpen, catalog, billingReady, isNativeApp]);

  const exchangePreview = useMemo(() => {
    if (!catalog) return 0;
    return calcGoldFromGems(exchangeGems, catalog.config);
  }, [catalog, exchangeGems]);

  const handlePurchase = useCallback(
    async (productId: string) => {
      setLoading(true);
      setPurchasingId(productId);
      setMsg(null);
      try {
        const svc = await createPurchaseServiceForClient(isNativeApp);
        const available = await svc.isAvailable();
        if (!available) {
          setMsg("인앱 결제는 모바일 앱에서만 이용할 수 있습니다.");
          return;
        }
        const result = await svc.purchase(productId);
        const res = await verifyIapOnServer({
          provider: result.provider,
          productId: result.productId,
          purchaseToken: result.purchaseToken,
          orderId: result.orderId,
          receipt: result.receipt,
        });
        if (!("ok" in res) || !res.ok) {
          setMsg("error" in res ? res.error : "결제 검증 실패");
          return;
        }
        if (!res.economy) return;

        const merged = await hydrateLocalEconomy(res.economy);
        await refreshEconomyFromServer();
        setGame((g) => ({
          ...g,
          gold: merged.wallet.gold,
          gems: merged.wallet.gems,
        }));

        if (res.alreadyFulfilled) {
          showToast("이미 지급된 구매입니다", "default");
        } else {
          const parts: string[] = [];
          if (res.gemsGranted > 0) parts.push(`+${res.gemsGranted}💎`);
          if (res.goldGranted > 0) parts.push(`+${res.goldGranted}G`);
          showToast(`구매 완료 ${parts.join(" · ")}`, "gold");
          setGemShopOpen(false);
        }
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "결제에 실패했습니다.");
      } finally {
        setLoading(false);
        setPurchasingId(null);
      }
    },
    [isNativeApp, refreshEconomyFromServer, setGame, setGemShopOpen, showToast]
  );

  const handleRestore = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const svc = await createPurchaseServiceForClient(isNativeApp);
      const purchases = await svc.restorePurchases();
      let restored = 0;
      for (const p of purchases) {
        const res = await verifyIapOnServer({
          provider: p.provider,
          productId: p.productId,
          purchaseToken: p.purchaseToken,
          orderId: p.orderId,
          receipt: p.receipt,
        });
        if ("ok" in res && res.ok && !res.alreadyFulfilled) restored += 1;
      }
      await refreshEconomyFromServer();
      showToast(`복원 ${restored}건 처리`, "default");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "복원에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [isNativeApp, refreshEconomyFromServer, showToast]);

  const handleExchange = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await exchangeAptGemsForGold(exchangeGems);
      if ("error" in res && res.error) {
        setMsg(res.error);
        return;
      }
      if ("economy" in res) {
        await hydrateLocalEconomy(res.economy);
        await refreshEconomyFromServer();
        setGame((g) => ({
          ...g,
          gold: res.economy.wallet.gold,
          gems: res.economy.wallet.gems,
        }));
        showToast(`환전 완료 +${res.goldReceived}G`, "gold");
      }
    } finally {
      setLoading(false);
    }
  }, [exchangeGems, refreshEconomyFromServer, setGame, showToast]);

  if (!gemShopOpen) return null;

  const gemProducts = catalog?.products.filter((p) => p.type === "gems") ?? [];

  return (
    <div className="pointer-events-auto absolute inset-0 z-[200] flex flex-col justify-end bg-black/40">
      <div className="apt-game-shop-sheet mx-auto max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-[1.75rem] bg-[#faf6f0] shadow-2xl animate-moco-slide-up">
        <div className="flex items-center justify-between border-b border-[#e8dcc8]/80 px-4 py-3">
          <div>
            <p className="text-sm font-black text-[#5c4033]">젬 상점</p>
            <p className="text-[10px] text-[#8b7355]">
              🪙 {game.gold.toLocaleString()} · 💎 {economy.wallet.gems.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {billingReady && (
              <button
                type="button"
                onClick={() => void handleRestore()}
                disabled={loading}
                className="rounded-full p-2 text-[#8b7355] active:bg-black/5"
                aria-label="구매 복원"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setGemShopOpen(false)}
              className="rounded-full p-2 text-[#8b7355] active:bg-black/5"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!billingReady && (
          <p className="px-4 py-2 text-[11px] text-amber-800/90">
            인앱 결제는 iOS·Android 앱에서 이용할 수 있습니다. 웹에서는 젬→골드 환전만 가능해요.
          </p>
        )}

        {catalogLoading ? (
          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="apt-game-shop-card h-28 animate-pulse rounded-2xl bg-[#e8dcc8]/80" />
            ))}
          </div>
        ) : gemProducts.length === 0 ? (
          <p className="px-4 py-6 text-center text-[11px] text-[#8b7355]">판매 중인 젬 상품이 없습니다.</p>
        ) : (
        <div className="grid grid-cols-2 gap-2 overflow-y-auto px-4 py-3">
          {gemProducts.map((p) => {
            const isPurchasing = purchasingId === p.productId;
            const storePrice = storePrices[p.productId];
            return (
            <button
              key={p.id}
              type="button"
              disabled={loading || !billingReady}
              onClick={() => void handlePurchase(p.productId)}
              className={cn(
                "apt-game-shop-card relative flex flex-col items-center rounded-2xl p-3 text-center",
                !billingReady && "opacity-50",
                isPurchasing && "ring-2 ring-amber-400/80"
              )}
            >
              {isPurchasing && (
                <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-amber-600" />
              )}
              <span className="text-2xl">💎</span>
              <span className="mt-1 text-xs font-black text-[#5c4033]">{p.title}</span>
              {p.bonusAmount > 0 && (
                <span className="text-[10px] font-semibold text-violet-700">
                  +{p.bonusAmount} 보너스
                </span>
              )}
              <span className="mt-1 text-[10px] font-bold text-[#5c4033]">
                {storePrice ?? p.description}
              </span>
            </button>
            );
          })}
        </div>
        )}

        <div className="border-t border-[#e8dcc8]/80 px-4 py-4">
          <p className="text-xs font-black text-[#5c4033]">젬 → 골드 환전</p>
          <p className="mt-0.5 text-[10px] text-[#8b7355]">
            1💎 = {catalog?.config.goldPerGem ?? 100}G
            {(catalog?.config.bonusRate ?? 0) > 0 &&
              ` · 보너스 ${Math.round((catalog?.config.bonusRate ?? 0) * 100)}%`}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={economy.wallet.gems}
              value={exchangeGems}
              onChange={(e) => setExchangeGems(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-xl border border-[#e8dcc8] bg-white px-2 py-1.5 text-sm font-bold"
            />
            <span className="text-[11px] text-[#8b7355]">→ {exchangePreview.toLocaleString()}G</span>
            <button
              type="button"
              disabled={loading || !billingReady || economy.wallet.gems < 1}
              onClick={() => void handleExchange()}
              className="ml-auto rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white active:scale-95 disabled:opacity-50"
            >
              환전
            </button>
          </div>
        </div>

        {msg && (
          <div className="mx-4 mb-[max(0.5rem,env(safe-area-inset-bottom))] rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[11px] font-semibold text-rose-700">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

export const AptGemShopSheet = memo(AptGemShopSheetInner);

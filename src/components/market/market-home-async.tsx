import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Store } from "lucide-react";
import { getPhysicalProducts } from "@/actions/goods-shop";
import { MarketPageTitle } from "@/components/market/market-page-chrome";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export async function MarketHomeAsync() {
  const goods = await getPhysicalProducts().catch(() => []);

  return (
    <div className="space-y-6">
      <MarketPageTitle>
        <div>
          <h1 className="text-2xl font-bold">{MARKET_BRAND_NAME}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("market.s1lmkrob")}</p>
        </div>
      </MarketPageTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/market/goods">
          <Card className="rounded-2xl hover:border-primary/40 transition-shadow h-full">
            <CardContent className="p-5 flex gap-4 items-center">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Package className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="font-bold">{t("market.s4bfnld")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("market.goodsOnSale", { count: String(goods.length) })}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/market/sell">
          <Card className="rounded-2xl hover:border-primary/40 transition-shadow h-full">
            <CardContent className="p-5 flex gap-4 items-center">
              <div className="h-12 w-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Store className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-bold">{t("market.s1g9286t")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("market.starBrandRegistered", { brand: MARKET_BRAND_NAME })}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

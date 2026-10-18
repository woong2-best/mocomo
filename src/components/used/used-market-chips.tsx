import Link from "next/link";
import { Menu } from "lucide-react";
import {
  DIGITAL_MARKET_CATEGORIES,
  MARKET_LANE_CHIPS,
  PHYSICAL_MARKET_CATEGORIES,
  parseMarketLane,
  parseMarketTrack,
} from "@/lib/market-browse";
import { cn } from "@/lib/utils";
import { createTranslator } from "@/lib/i18n/messages";
import { AutoSubmitSelect } from "@/components/used/auto-submit-select";
import { KOREA_SIDO, USED_SHIPPING_REGION } from "@/lib/korea-regions";
import { usedShippingRegionLabel } from "@/lib/used-regions-global";
import {
  SUBCULTURE_CONDITION_GRADES,
  SUBCULTURE_LIMITED_KINDS,
  SUBCULTURE_TRADE_MODES,
} from "@/lib/subculture-commerce/types";

const t = createTranslator("en");

function href(next: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/market?${qs}` : "/market";
}

export function UsedMarketChips({
  track: trackParam,
  lane: laneParam,
  category,
  product,
  q,
  region,
  sido,
  condition,
  limited,
  trade,
}: {
  track?: string | null;
  lane?: string | null;
  category?: string | null;
  product?: string | null;
  q?: string | null;
  region?: string | null;
  sido?: string | null;
  condition?: string | null;
  limited?: string | null;
  trade?: string | null;
}) {
  const lane = parseMarketLane(laneParam);
  const track = parseMarketTrack(trackParam);
  const personal = !!lane;
  const categoryActive = !!(category || product);
  const keep = {
    q,
    region,
    sido,
    condition,
    limited,
    trade,
  };
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold whitespace-nowrap",
      active ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border bg-card text-folk-cobalt"
    );

  return (
    <div className="space-y-2 pb-2 -mx-4 px-4 pt-0 border-b border-border/60">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <Link href={href({ ...keep, track: null, lane: null, category: null, product: null })} className={chip(!personal && track === "all")}>
            {t("market.track.all")}
          </Link>
          <Link
            href={href({ ...keep, track: "physical", lane: null, category: null, product: null })}
            className={chip(!personal && track === "physical")}
          >
            {t("market.scope.physical")}
          </Link>
          <Link
            href={href({ ...keep, track: "digital", lane: null, category: null, product: null })}
            className={chip(!personal && track === "digital")}
          >
            {t("market.scope.digital")}
          </Link>
          {MARKET_LANE_CHIPS.map((item) => (
            <Link
              key={item.id}
              href={lane === item.id ? href({ ...keep, track: track === "all" ? null : track, lane: null }) : href({ ...keep, lane: item.id, track: track === "all" ? null : track })}
              className={chip(lane === item.id)}
            >
              {t(item.key)}
            </Link>
          ))}
        </div>
        {personal ? null : (
          <details className="relative shrink-0">
            <summary className={cn(chip(categoryActive), "inline-flex cursor-pointer list-none items-center gap-1.5 px-3")}>
              <Menu className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.menu")}</span>
            </summary>
            <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
              <Link
                href={href({ ...keep, track: track === "all" ? null : track, category: null, product: null })}
                className="block rounded-lg px-3 py-2 text-sm font-extrabold"
              >
                {t("market.track.all")}
              </Link>
              <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                {t("market.scope.physical")}
              </p>
              {PHYSICAL_MARKET_CATEGORIES.map((c) => (
                <Link
                  key={c.id}
                  href={href({ ...keep, track: "physical", category: c.id, product: null, lane: null })}
                  className={cn("block rounded-lg px-3 py-2 text-sm", category === c.id && "font-extrabold text-folk-cobalt")}
                >
                  {t(c.key)}
                </Link>
              ))}
              <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                {t("market.scope.digital")}
              </p>
              {DIGITAL_MARKET_CATEGORIES.map((c) => (
                <Link
                  key={c.id}
                  href={href({ ...keep, track: "digital", product: c.id, category: null, lane: null })}
                  className={cn("block rounded-lg px-3 py-2 text-sm", product === c.id && "font-extrabold text-folk-cobalt")}
                >
                  {t(c.key)}
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>

      {personal || track === "digital" ? null : (
        <form action="/market" method="get" className="space-y-2">
          {track !== "all" ? <input type="hidden" name="track" value={track} /> : null}
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {product ? <input type="hidden" name="product" value={product} /> : null}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <AutoSubmitSelect
            name="sido"
            defaultValue={sido || (region === USED_SHIPPING_REGION ? "__shipping__" : "")}
            className="h-[38px] w-full rounded-full border-[1.5px] border-border bg-card px-3 text-[13px] font-extrabold text-folk-cobalt"
            aria-label={t("used.s2dzhae")}
          >
            <option value="">{t("used.s2dzhae")}</option>
            {KOREA_SIDO.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
            <option value="__shipping__">{usedShippingRegionLabel("en")}</option>
          </AutoSubmitSelect>
          <div className="grid grid-cols-3 gap-1.5">
            <AutoSubmitSelect
              name="condition"
              defaultValue={condition ?? ""}
              className="h-9 min-w-0 rounded-lg border border-border bg-background px-1.5 text-[11px]"
            >
              <option value="">{t("used.s1xg4kgm")}</option>
              {SUBCULTURE_CONDITION_GRADES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </AutoSubmitSelect>
            <AutoSubmitSelect
              name="limited"
              defaultValue={limited ?? ""}
              className="h-9 min-w-0 rounded-lg border border-border bg-background px-1.5 text-[11px]"
            >
              <option value="">{t("used.s13opco")}</option>
              {SUBCULTURE_LIMITED_KINDS.filter((o) => o.id !== "STANDARD").map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </AutoSubmitSelect>
            <AutoSubmitSelect
              name="trade"
              defaultValue={trade ?? ""}
              className="h-9 min-w-0 rounded-lg border border-border bg-background px-1.5 text-[11px]"
            >
              <option value="">{t("used.s9vvetl")}</option>
              {SUBCULTURE_TRADE_MODES.filter((o) => o.id !== "SELL").map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </AutoSubmitSelect>
          </div>
          <noscript>
            <button type="submit" className="text-xs font-extrabold text-folk-cobalt">
              Apply
            </button>
          </noscript>
        </form>
      )}
    </div>
  );
}

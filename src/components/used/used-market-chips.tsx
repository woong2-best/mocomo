import Link from "next/link";
import {
  DIGITAL_MARKET_CATEGORIES,
  MARKET_LANE_CHIPS,
  PHYSICAL_MARKET_CATEGORIES,
  parseMarketLane,
  parseMarketTrack,
} from "@/lib/market-browse";
import { cn } from "@/lib/utils";
import { createTranslator } from "@/lib/i18n/messages";

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
}: {
  track?: string | null;
  lane?: string | null;
  category?: string | null;
  product?: string | null;
}) {
  const lane = parseMarketLane(laneParam);
  const track = parseMarketTrack(trackParam);
  const personal = !!lane;
  const categories = track === "digital" ? DIGITAL_MARKET_CATEGORIES : PHYSICAL_MARKET_CATEGORIES;
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold",
      active ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border bg-card text-folk-cobalt"
    );

  return (
    <div className="space-y-2 pb-2 -mx-4 px-4 pt-0 border-b border-border/60">
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <Link href={href({ track: "physical" })} className={chip(!personal && track === "physical")}>
          {t("market.scope.physical")}
        </Link>
        <Link href={href({ track: "digital" })} className={chip(!personal && track === "digital")}>
          {t("market.scope.digital")}
        </Link>
        {MARKET_LANE_CHIPS.map((item) => (
          <Link
            key={item.id}
            href={lane === item.id ? href({ track }) : href({ lane: item.id, track })}
            className={chip(lane === item.id)}
          >
            {t(item.key)}
          </Link>
        ))}
      </div>
      {personal ? null : (
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map((c) => {
            const selected = track === "digital" ? product === c.id : category === c.id;
            return (
              <Link
                key={c.id}
                href={
                  selected
                    ? href({ track })
                    : track === "digital"
                      ? href({ track: "digital", product: c.id })
                      : href({ track: "physical", category: c.id })
                }
                className={chip(selected)}
              >
                {t(c.key)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

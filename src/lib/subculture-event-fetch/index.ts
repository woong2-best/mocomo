import {
  SUBCULTURE_EVENT_SEEDS,
  type SubcultureEventSeed,
} from "@/lib/subculture-event-seeds";
import type { FetchedSubcultureEvent, FetcherResult } from "@/lib/subculture-event-fetch/types";
import { fetchComicWorldEvents } from "@/lib/subculture-event-fetch/sources/comicw";
import { fetchComiketEvents } from "@/lib/subculture-event-fetch/sources/comiket";
import {
  fetchGstarEvents,
  fetchSeoulPopconEvents,
} from "@/lib/subculture-event-fetch/sources/korea";
import {
  fetchKyomafEvents,
  fetchTgsEvents,
  fetchWonfesEvents,
} from "@/lib/subculture-event-fetch/sources/japan";

const FETCHERS: { sourceId: string; run: () => Promise<FetchedSubcultureEvent[]> }[] = [
  { sourceId: "comicw", run: fetchComicWorldEvents },
  { sourceId: "gstar", run: fetchGstarEvents },
  { sourceId: "seoulpopcon", run: fetchSeoulPopconEvents },
  { sourceId: "comiket", run: fetchComiketEvents },
  { sourceId: "wonfes", run: fetchWonfesEvents },
  { sourceId: "kyomaf", run: fetchKyomafEvents },
  { sourceId: "tgs", run: fetchTgsEvents },
];

function seedToFetched(seed: SubcultureEventSeed): FetchedSubcultureEvent {
  return {
    ...seed,
    country: seed.country ?? "kr",
    sourceId: "seed",
  };
}

/** 자동 수집 성공 시 중복되는 수동 시드 제외 */
function filterSeedFallback(
  seeds: SubcultureEventSeed[],
  auto: FetchedSubcultureEvent[]
): FetchedSubcultureEvent[] {
  const autoKeys = new Set(auto.map((a) => a.externalKey));
  const hasComicwAuto = [...autoKeys].some((k) => k.startsWith("auto-comicw-"));
  const hasComiketAuto = autoKeys.has("auto-comiket-108") || autoKeys.has("auto-comiket-109");
  const hasWonfesAuto = autoKeys.has("auto-wonfes-2026-summer");
  const hasKyomafAuto = autoKeys.has("auto-kyomaf");
  const hasTgsAuto = autoKeys.has("auto-tgs");
  const hasGstarAuto = autoKeys.has("auto-gstar-2026");
  const hasSeoulPopconAuto = autoKeys.has("auto-seoulpopcon-2026");

  return seeds
    .filter((s) => {
      if (hasComicwAuto && s.externalKey.startsWith("official-comicw")) return false;
      if (hasComiketAuto && s.externalKey.startsWith("official-jp-comiket")) return false;
      if (hasWonfesAuto && s.externalKey.startsWith("official-jp-wonfes")) return false;
      if (hasKyomafAuto && s.externalKey.startsWith("official-jp-kyomaf")) return false;
      if (hasTgsAuto && s.externalKey.startsWith("official-jp-tgs")) return false;
      if (hasGstarAuto && s.externalKey.startsWith("official-gstar")) return false;
      if (hasSeoulPopconAuto && s.externalKey.startsWith("official-seoul-popcon")) return false;
      return true;
    })
    .map(seedToFetched);
}

export async function fetchAllSubcultureEvents(): Promise<{
  events: FetchedSubcultureEvent[];
  results: FetcherResult[];
}> {
  const results: FetcherResult[] = [];
  const auto: FetchedSubcultureEvent[] = [];

  await Promise.all(
    FETCHERS.map(async ({ sourceId, run }) => {
      try {
        const events = await run();
        results.push({ sourceId, events });
        auto.push(...events);
      } catch (e) {
        results.push({
          sourceId,
          events: [],
          error: e instanceof Error ? e.message : "fetch failed",
        });
      }
    })
  );

  const fallback = filterSeedFallback(SUBCULTURE_EVENT_SEEDS, auto);
  const merged = new Map<string, FetchedSubcultureEvent>();
  for (const s of fallback) merged.set(s.externalKey, s);
  for (const a of auto) merged.set(a.externalKey, a);

  const now = Date.now();
  const events = [...merged.values()]
    .filter((e) => new Date(e.endsAt).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return { events, results };
}

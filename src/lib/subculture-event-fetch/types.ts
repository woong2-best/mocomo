import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";
import type { SubcultureEventSeed } from "@/lib/subculture-event-types";

export type FetchedSubcultureEvent = SubcultureEventSeed & {
  country: SubcultureEventCountry;
  sourceId: string;
};

export type FetcherResult = {
  sourceId: string;
  events: FetchedSubcultureEvent[];
  error?: string;
};

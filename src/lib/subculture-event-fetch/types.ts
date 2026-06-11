import type { SubcultureEventCountry, SubcultureEventSeed } from "@/lib/subculture-event-seeds";

export type FetchedSubcultureEvent = SubcultureEventSeed & {
  country: SubcultureEventCountry;
  sourceId: string;
};

export type FetcherResult = {
  sourceId: string;
  events: FetchedSubcultureEvent[];
  error?: string;
};

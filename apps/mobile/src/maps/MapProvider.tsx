import { selectMapEngine } from "@/maps/select-engine";
import type { MapProviderProps } from "@/maps/types";
import { KakaoMapProvider } from "@/maps/providers/KakaoMapProvider";
import { MapLibreMapProvider } from "@/maps/providers/MapLibreMapProvider";

type Props = MapProviderProps & {
  country: string;
};

/**
 * Auto-selects native map engine from country.
 * Users never pick a map service. google/apple can be added later.
 */
export function MapProvider({ country, ...rest }: Props) {
  const engine = selectMapEngine(country);
  if (engine === "kakao") {
    return <KakaoMapProvider {...rest} />;
  }
  return <MapLibreMapProvider {...rest} />;
}

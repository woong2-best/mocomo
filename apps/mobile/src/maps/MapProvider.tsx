import type { MapProviderProps } from "@/maps/types";
import { MapLibreMapProvider } from "@/maps/providers/MapLibreMapProvider";

type Props = MapProviderProps & {
  country: string;
};

/** Auto-selects native map engine from country (MapLibre globally). */
export function MapProvider({ country: _country, ...rest }: Props) {
  return <MapLibreMapProvider {...rest} />;
}

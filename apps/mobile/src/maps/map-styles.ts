/**
 * Shared MapLibre style specs.
 * - Esri World Imagery → Subculture Map (parity with web)
 * - OpenFreeMap liberty → Used-trade MeetMap (non-KR)
 */

export const OSM_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const ESRI_ATTRIBUTION = "Tiles © Esri";
export const ESRI_ATTRIBUTION_URL = "https://www.esri.com/";

/** Raster style matching web `subculture-events-map.tsx` SATELLITE_STYLE */
export const ESRI_SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "satellite-tiles": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster" as const,
      source: "satellite-tiles",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

/** Asia-Pacific discovery view — mirrors web globe initial framing */
export const SUBCULTURE_MAP_GLOBAL_VIEW = { lat: 28, lng: 135, zoom: 2.4 };

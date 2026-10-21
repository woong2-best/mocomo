/**
 * Shared MapLibre style specs.
 * - Esri World Imagery → Subculture Map (parity with web)
 * - OpenFreeMap liberty → Used-trade MeetMap (non-KR)
 */

export const OSM_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Same glyph host as OpenFreeMap liberty (`Noto Sans *`). */
export const MAPLIBRE_GLYPHS_URL =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

export const MAPLIBRE_LABEL_FONTS = ["Noto Sans Bold"] as const;

export const ESRI_ATTRIBUTION = "Tiles © Esri";
export const ESRI_ATTRIBUTION_URL = "https://www.esri.com/";

/**
 * Last Esri World Imagery zoom with real tiles. z20+ is the gray
 * "Map data not yet available" placeholder (except a few US cities).
 * Put this on the Map/Camera and the raster *source* — not the layer.
 */
export const ESRI_SATELLITE_MAX_ZOOM = 19;

/** Raster style matching web `subculture-events-map.tsx` SATELLITE_STYLE */
export const ESRI_SATELLITE_STYLE = {
  version: 8 as const,
  glyphs: MAPLIBRE_GLYPHS_URL,
  sources: {
    "satellite-tiles": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
      maxzoom: ESRI_SATELLITE_MAX_ZOOM,
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

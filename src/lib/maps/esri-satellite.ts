/**
 * Esri World Imagery is real through zoom 19 in the cities we checked
 * (Seoul, Tokyo, Busan, Paris, London, …). Zoom 20+ returns a 2521-byte
 * gray JPEG that says "Map data not yet available".
 *
 * Set this on the Map (`maxZoom`) and on the raster *source* (`maxzoom`).
 * Do not put it on the raster *layer* — layer maxzoom hides the layer.
 */
export const ESRI_SATELLITE_MAX_ZOOM = 19;

export const ESRI_WORLD_IMAGERY_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/** OpenFreeMap glyph atlas — same stack as the liberty style (`Noto Sans *`). */
export const MAPLIBRE_GLYPHS_URL =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

export const MAPLIBRE_LABEL_FONTS = ["Noto Sans Bold"] as const;

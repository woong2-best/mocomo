/** MapLibre v6 compact attribution starts expanded (`open` + `maplibregl-compact-show`). */
export function collapseMapLibreAttribution(root: HTMLElement) {
  const el = root.querySelector(".maplibregl-ctrl-attrib");
  if (!(el instanceof HTMLElement)) return;
  el.classList.remove("maplibregl-compact-show");
  el.removeAttribute("open");
}

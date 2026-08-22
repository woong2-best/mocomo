export function resolveForensicPaintSize(
  wrap: HTMLElement,
  fallbackWidth: number,
  fallbackHeight: number
): { width: number; height: number } | null {
  let w = wrap.clientWidth;
  let h = wrap.clientHeight;
  if (w >= 8 && h >= 8) return { width: w, height: h };

  w = wrap.offsetWidth;
  h = wrap.offsetHeight;
  if (w >= 8 && h >= 8) return { width: w, height: h };

  const parent = wrap.parentElement;
  if (parent) {
    w = parent.clientWidth;
    h = parent.clientHeight;
    if (w >= 8 && h >= 8) return { width: w, height: h };
  }

  if (fallbackWidth >= 8 && fallbackHeight >= 8) {
    const maxW = Math.min(fallbackWidth, 1920);
    const maxH = Math.min(fallbackHeight, 1920);
    w = Math.max(w, maxW);
    h = Math.max(h, Math.round(maxH * (w / fallbackWidth)));
    if (w >= 8 && h >= 8) return { width: w, height: h };
  }

  return null;
}

export function drawSourceFit(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  fit: "cover" | "contain"
) {
  ctx.clearRect(0, 0, width, height);
  const scale =
    fit === "contain"
      ? Math.min(width / sourceWidth, height / sourceHeight)
      : Math.max(width / sourceWidth, height / sourceHeight);
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(source, dx, dy, dw, dh);
}

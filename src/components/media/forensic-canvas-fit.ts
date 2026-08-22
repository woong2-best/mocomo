export type ForensicPaintSize = {
  /** CSS layout pixels — what occupies space in the layout. */
  cssWidth: number;
  cssHeight: number;
  /** Canvas backing-store pixels — what we embed into and screenshots sample. */
  width: number;
  height: number;
  devicePixelRatio: number;
};

export function getForensicDevicePixelRatio(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
}

function findContainBounds(wrap: HTMLElement): { maxW: number; maxH: number } {
  let maxW =
    typeof window !== "undefined" ? Math.min(window.innerWidth, 1920) : 1920;
  let maxH =
    typeof window !== "undefined" ? Math.min(window.innerHeight, 1080) : 1080;

  let el: HTMLElement | null = wrap.parentElement;
  for (let depth = 0; depth < 8 && el; depth += 1) {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w >= 8) maxW = Math.min(maxW, w);
    if (h >= 8) maxH = Math.min(maxH, h);
    el = el.parentElement;
  }

  return {
    maxW: Math.max(8, maxW - 32),
    maxH: Math.max(8, maxH - 32),
  };
}

function fitIntrinsicSize(
  intrinsicWidth: number,
  intrinsicHeight: number,
  maxW: number,
  maxH: number,
  fit: "cover" | "contain"
): { cssWidth: number; cssHeight: number } {
  const scale =
    fit === "contain"
      ? Math.min(maxW / intrinsicWidth, maxH / intrinsicHeight, 1)
      : Math.max(maxW / intrinsicWidth, maxH / intrinsicHeight);
  return {
    cssWidth: Math.max(8, Math.round(intrinsicWidth * scale)),
    cssHeight: Math.max(8, Math.round(intrinsicHeight * scale)),
  };
}

export function resolveForensicPaintSize(
  wrap: HTMLElement,
  intrinsicWidth: number,
  intrinsicHeight: number,
  fit: "cover" | "contain" = "contain"
): ForensicPaintSize | null {
  let cssWidth = wrap.clientWidth;
  let cssHeight = wrap.clientHeight;
  if (cssWidth >= 8 && cssHeight >= 8) {
    return toBackingStoreSize(cssWidth, cssHeight);
  }

  cssWidth = wrap.offsetWidth;
  cssHeight = wrap.offsetHeight;
  if (cssWidth >= 8 && cssHeight >= 8) {
    return toBackingStoreSize(cssWidth, cssHeight);
  }

  const parent = wrap.parentElement;
  if (parent) {
    cssWidth = parent.clientWidth;
    cssHeight = parent.clientHeight;
    if (cssWidth >= 8 && cssHeight >= 8) {
      return toBackingStoreSize(cssWidth, cssHeight);
    }
  }

  if (intrinsicWidth >= 8 && intrinsicHeight >= 8) {
    const { maxW, maxH } = findContainBounds(wrap);
    const fitted = fitIntrinsicSize(intrinsicWidth, intrinsicHeight, maxW, maxH, fit);
    return toBackingStoreSize(fitted.cssWidth, fitted.cssHeight);
  }

  return null;
}

function toBackingStoreSize(cssWidth: number, cssHeight: number): ForensicPaintSize {
  const devicePixelRatio = getForensicDevicePixelRatio();
  return {
    cssWidth,
    cssHeight,
    width: Math.max(8, Math.round(cssWidth * devicePixelRatio)),
    height: Math.max(8, Math.round(cssHeight * devicePixelRatio)),
    devicePixelRatio,
  };
}

/** Backing store must match physical pixels; CSS size matches layout box. */
export function applyForensicCanvasSize(canvas: HTMLCanvasElement, size: ForensicPaintSize) {
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.style.width = `${size.cssWidth}px`;
  canvas.style.height = `${size.cssHeight}px`;
}

export function applyForensicWrapSize(wrap: HTMLElement, size: ForensicPaintSize) {
  wrap.style.width = `${size.cssWidth}px`;
  wrap.style.height = `${size.cssHeight}px`;
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

export type ForensicPaintSize = {
  /** CSS layout pixels — what occupies space in the layout. */
  cssWidth: number;
  cssHeight: number;
  /** Canvas backing-store pixels — must match CSS pixels for OS screenshot alignment. */
  width: number;
  height: number;
  devicePixelRatio: number;
};

export type ForensicWrapMode = "fixed" | "fill" | "contain";

/** Forensic embed uses 1:1 backing/CSS pixels so OS screenshots match embed coordinates. */
export function getForensicDevicePixelRatio(): number {
  return 1;
}

const MIN_DISPLAY_LONG_EDGE = 480;
/** Smaller embeds cannot recover enough quadrant bits to pass canonical verify. */
export const MIN_FORENSIC_VERIFY_LONG_EDGE = 320;

export function isForensicDisplaySizeReady(
  computed: ForensicPaintSize,
  displayed: ForensicPaintSize
): boolean {
  const computedLong = Math.max(computed.cssWidth, computed.cssHeight);
  const displayedLong = Math.max(displayed.cssWidth, displayed.cssHeight);
  const minLong = Math.min(
    MIN_FORENSIC_VERIFY_LONG_EDGE,
    Math.max(96, Math.round(computedLong * 0.35))
  );
  if (displayedLong < minLong) return false;

  const computedArea = computed.cssWidth * computed.cssHeight;
  const displayedArea = displayed.cssWidth * displayed.cssHeight;
  if (computedArea > 0 && displayedArea / computedArea < 0.2) return false;

  return true;
}

/** Client embed gate: use the aligned/on-screen box only (avoids max-h/max-w deadlock). */
export function isForensicEmbedSizeReady(displayed: ForensicPaintSize): boolean {
  if (displayed.cssWidth < 8 || displayed.cssHeight < 8) return false;
  const displayedLong = Math.max(displayed.cssWidth, displayed.cssHeight);
  return displayedLong >= MIN_FORENSIC_VERIFY_LONG_EDGE;
}

function readComputedMaxPx(style: CSSStyleDeclaration, prop: "maxWidth" | "maxHeight"): number | null {
  const value = style[prop];
  if (!value || value === "none") return null;
  const px = Number.parseFloat(value);
  return Number.isFinite(px) && px > 0 ? px : null;
}

function flushLayout(...elements: HTMLElement[]) {
  for (const el of elements) {
    void el.offsetHeight;
    void el.getBoundingClientRect();
  }
}

function findContainBounds(wrap: HTMLElement): { maxW: number; maxH: number } {
  const viewportW =
    typeof window !== "undefined" ? Math.min(window.innerWidth, 1920) : 1920;
  const viewportH =
    typeof window !== "undefined" ? Math.min(window.innerHeight, 1080) : 1080;
  let maxW = viewportW;
  let maxH = viewportH;

  let el: HTMLElement | null = wrap;
  for (let depth = 0; depth < 12 && el; depth += 1) {
    if (typeof window !== "undefined") {
      const style = window.getComputedStyle(el);
      const cssMaxW = readComputedMaxPx(style, "maxWidth");
      const cssMaxH = readComputedMaxPx(style, "maxHeight");
      if (cssMaxW) maxW = Math.min(maxW, cssMaxW);
      if (cssMaxH) maxH = Math.min(maxH, cssMaxH);
    }

    const w = el.clientWidth;
    const h = el.clientHeight;
    // Ignore collapsed/stub boxes (e.g. lightbox spinner min-size siblings).
    if (w >= MIN_FORENSIC_VERIFY_LONG_EDGE) maxW = Math.min(maxW, w);
    if (h >= MIN_FORENSIC_VERIFY_LONG_EDGE) maxH = Math.min(maxH, h);

    el = el.parentElement;
  }

  const padding = 32;
  return {
    maxW: Math.max(MIN_FORENSIC_VERIFY_LONG_EDGE, maxW - padding),
    maxH: Math.max(MIN_FORENSIC_VERIFY_LONG_EDGE, maxH - padding),
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
  let cssWidth = Math.max(8, Math.round(intrinsicWidth * scale));
  let cssHeight = Math.max(8, Math.round(intrinsicHeight * scale));

  const longEdge = Math.max(cssWidth, cssHeight);
  if (longEdge < MIN_DISPLAY_LONG_EDGE && longEdge > 0) {
    const boost = Math.min(
      MIN_DISPLAY_LONG_EDGE / longEdge,
      maxW / cssWidth,
      maxH / cssHeight
    );
    if (boost > 1.01) {
      cssWidth = Math.max(8, Math.round(cssWidth * boost));
      cssHeight = Math.max(8, Math.round(cssHeight * boost));
    }
  }

  return { cssWidth, cssHeight };
}

function readParentBox(wrap: HTMLElement): { cssWidth: number; cssHeight: number } | null {
  let cssWidth = wrap.clientWidth;
  let cssHeight = wrap.clientHeight;
  if (cssWidth >= 8 && cssHeight >= 8) {
    return { cssWidth, cssHeight };
  }

  cssWidth = wrap.offsetWidth;
  cssHeight = wrap.offsetHeight;
  if (cssWidth >= 8 && cssHeight >= 8) {
    return { cssWidth, cssHeight };
  }

  const parent = wrap.parentElement;
  if (parent) {
    cssWidth = parent.clientWidth;
    cssHeight = parent.clientHeight;
    if (cssWidth >= 8 && cssHeight >= 8) {
      return { cssWidth, cssHeight };
    }
  }

  return null;
}

export function resolveForensicPaintSize(
  wrap: HTMLElement,
  intrinsicWidth: number,
  intrinsicHeight: number,
  fit: "cover" | "contain" = "contain",
  options?: { fillParent?: boolean }
): ForensicPaintSize | null {
  if (options?.fillParent) {
    const parentBox = readParentBox(wrap);
    if (parentBox) {
      if (fit === "cover") {
        return toBackingStoreSize(parentBox.cssWidth, parentBox.cssHeight);
      }
      const fitted = fitIntrinsicSize(
        intrinsicWidth,
        intrinsicHeight,
        parentBox.cssWidth,
        parentBox.cssHeight,
        "contain"
      );
      return toBackingStoreSize(fitted.cssWidth, fitted.cssHeight);
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

function readStylePx(element: HTMLElement, prop: "width" | "height"): number | null {
  const raw = element.style[prop];
  if (!raw) return null;
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) && px >= 4 ? Math.round(px) : null;
}

/** On-screen box after layout — OS screenshots sample these CSS pixels. */
export function readDisplayedPaintSize(element: HTMLElement): ForensicPaintSize | null {
  const rect = element.getBoundingClientRect();
  if (rect.width >= 4 && rect.height >= 4) {
    return toBackingStoreSize(Math.round(rect.width), Math.round(rect.height));
  }

  if (element.clientWidth >= 4 && element.clientHeight >= 4) {
    return toBackingStoreSize(element.clientWidth, element.clientHeight);
  }

  if (element.offsetWidth >= 4 && element.offsetHeight >= 4) {
    return toBackingStoreSize(element.offsetWidth, element.offsetHeight);
  }

  const styleW = readStylePx(element, "width");
  const styleH = readStylePx(element, "height");
  if (styleW && styleH) {
    return toBackingStoreSize(styleW, styleH);
  }

  if (element instanceof HTMLCanvasElement && element.width >= 4 && element.height >= 4) {
    return toBackingStoreSize(element.width, element.height);
  }

  return null;
}

function readAppliedPaintSize(
  canvas: HTMLCanvasElement,
  computed: ForensicPaintSize
): ForensicPaintSize {
  return (
    readDisplayedPaintSize(canvas) ??
    toBackingStoreSize(computed.cssWidth, computed.cssHeight)
  );
}

/**
 * Apply computed size, then re-read the painted box so embed coordinates match
 * what exportPng() and OS capture actually sample (avoids max-h / DPR drift).
 */
export function alignPaintSizeToDisplay(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
  computed: ForensicPaintSize,
  wrapMode: ForensicWrapMode = "fixed"
): ForensicPaintSize | null {
  applyForensicWrapSize(wrap, computed, wrapMode);
  applyForensicCanvasSize(canvas, computed);
  flushLayout(wrap, canvas);

  let displayed = readAppliedPaintSize(canvas, computed);

  if (wrapMode === "contain") {
    const wrapBox = readDisplayedPaintSize(wrap);
    if (wrapBox) {
      const wrapLong = Math.max(wrapBox.cssWidth, wrapBox.cssHeight);
      const displayLong = Math.max(displayed.cssWidth, displayed.cssHeight);
      if (wrapLong > 0 && wrapLong < displayLong) {
        displayed = wrapBox;
      }
    }
  }

  if (
    displayed.cssWidth !== computed.cssWidth ||
    displayed.cssHeight !== computed.cssHeight
  ) {
    applyForensicWrapSize(wrap, displayed, wrapMode);
    applyForensicCanvasSize(canvas, displayed);
    flushLayout(wrap, canvas);
    displayed = readAppliedPaintSize(canvas, displayed);
  }

  if (!isForensicEmbedSizeReady(displayed)) {
    if (!isForensicEmbedSizeReady(computed)) return null;
    displayed = computed;
    applyForensicWrapSize(wrap, displayed, wrapMode === "contain" ? "fixed" : wrapMode);
    applyForensicCanvasSize(canvas, displayed);
    flushLayout(wrap, canvas);
    displayed = readAppliedPaintSize(canvas, displayed);
    if (!isForensicEmbedSizeReady(displayed)) return null;
  }

  return displayed;
}

/** Like alignPaintSizeToDisplay, but waits until layout is large enough to verify. */
export function alignPaintSizeToDisplayWhenReady(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
  computed: ForensicPaintSize,
  wrapMode: ForensicWrapMode = "fixed"
): ForensicPaintSize | null {
  return alignPaintSizeToDisplay(wrap, canvas, computed, wrapMode);
}

/** Backing store must match on-screen CSS pixels; style size matches layout box. */
export function applyForensicCanvasSize(canvas: HTMLCanvasElement, size: ForensicPaintSize) {
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.style.width = `${size.cssWidth}px`;
  canvas.style.height = `${size.cssHeight}px`;
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
}

export function applyForensicWrapSize(
  wrap: HTMLElement,
  size: ForensicPaintSize,
  mode: ForensicWrapMode = "fixed"
) {
  if (mode === "fill") {
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    wrap.style.maxWidth = "";
    wrap.style.maxHeight = "";
    return;
  }

  wrap.style.width = `${size.cssWidth}px`;
  wrap.style.height = `${size.cssHeight}px`;

  if (mode === "contain") {
    wrap.style.maxWidth = "100%";
    wrap.style.maxHeight = "100%";
    wrap.style.boxSizing = "border-box";
  } else {
    wrap.style.maxWidth = "";
    wrap.style.maxHeight = "";
  }
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

export type SourceDrawValidation = {
  ok: boolean;
  centerRgba: [number, number, number, number];
  sampledOpaque: number;
  sampleCount: number;
};

/**
 * After drawSourceFit, failed drawImage leaves cleared (transparent) pixels.
 * Self-verify alone cannot catch this — embed still passes on an empty canvas.
 */
export function validateDrawnSourcePixels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): SourceDrawValidation {
  const cx = Math.min(width - 1, Math.floor(width / 2));
  const cy = Math.min(height - 1, Math.floor(height / 2));
  const center = ctx.getImageData(cx, cy, 1, 1).data;
  const centerRgba: [number, number, number, number] = [
    center[0] ?? 0,
    center[1] ?? 0,
    center[2] ?? 0,
    center[3] ?? 0,
  ];

  let sampledOpaque = 0;
  const sampleCount = 9;
  for (let yi = 0; yi < 3; yi++) {
    for (let xi = 0; xi < 3; xi++) {
      const x = Math.min(width - 1, Math.floor(((xi + 0.5) / 3) * width));
      const y = Math.min(height - 1, Math.floor(((yi + 0.5) / 3) * height));
      const alpha = ctx.getImageData(x, y, 1, 1).data[3] ?? 0;
      if (alpha >= 200) sampledOpaque += 1;
    }
  }

  // Letterboxed contain leaves transparent margins; require most sample points painted.
  const ok = sampledOpaque >= Math.min(3, sampleCount);
  return { ok, centerRgba, sampledOpaque, sampleCount };
}

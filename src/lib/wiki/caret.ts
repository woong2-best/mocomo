type CaretBox = { top: number; left: number; height: number };
type CaretFn = (element: HTMLElement, position: number) => CaretBox;

let impl: CaretFn | null = null;
let loading = false;

function fallbackCaret(element: HTMLTextAreaElement, position: number): CaretBox {
  const style = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) || 18;
  const value = element.value.slice(0, position);
  const lines = value.split("\n");
  const row = Math.max(0, lines.length - 1);
  const col = lines[row]?.length ?? 0;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const fontSize = Number.parseFloat(style.fontSize) || 14;
  return {
    top: paddingTop + row * lineHeight,
    left: paddingLeft + col * fontSize * 0.6,
    height: lineHeight,
  };
}

function loadPackage() {
  if (impl || loading || typeof window === "undefined") return;
  loading = true;
  void import("textarea-caret")
    .then((mod) => {
      const fn = (typeof mod === "function" ? mod : (mod as { default?: CaretFn }).default) as CaretFn | undefined;
      if (typeof fn === "function") impl = fn;
    })
    .catch(() => {
      impl = null;
    })
    .finally(() => {
      loading = false;
    });
}

export function getCaretCoordinates(element: HTMLTextAreaElement, position: number): CaretBox {
  loadPackage();
  if (impl) return impl(element, position);
  return fallbackCaret(element, position);
}

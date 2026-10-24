type Axis = "x" | "y";

type RunningAnim = {
  raf: number;
  restore: () => void;
};

const running = new WeakMap<HTMLElement, RunningAnim>();

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

function targetScroll(port: HTMLElement, child: HTMLElement, axis: Axis): number {
  const portRect = port.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  if (axis === "y") {
    return port.scrollTop + (childRect.top - portRect.top);
  }
  return (
    port.scrollLeft +
    (childRect.left - portRect.left) -
    (port.clientWidth - childRect.width) / 2
  );
}

function writeScroll(port: HTMLElement, axis: Axis, value: number) {
  if (axis === "y") port.scrollTop = value;
  else port.scrollLeft = value;
}

function readScroll(port: HTMLElement, axis: Axis): number {
  return axis === "y" ? port.scrollTop : port.scrollLeft;
}

/** Stop a running port animation and put snap/behavior back. */
export function cancelScrollPortAnimation(port: HTMLElement | null) {
  if (!port) return;
  const prev = running.get(port);
  if (!prev) return;
  cancelAnimationFrame(prev.raf);
  prev.restore();
  running.delete(port);
}

function disableSnap(port: HTMLElement): () => void {
  const snap = port.style.scrollSnapType;
  const behavior = port.style.scrollBehavior;
  port.style.scrollSnapType = "none";
  port.style.scrollBehavior = "auto";
  return () => {
    port.style.scrollSnapType = snap;
    port.style.scrollBehavior = behavior;
  };
}

/** Scroll only this port so snap/focus never walks ancestor scrollers to the last reel. */
export function scrollPortToChild(
  port: HTMLElement,
  child: HTMLElement,
  axis: Axis,
  behavior: ScrollBehavior = "auto"
) {
  cancelScrollPortAnimation(port);
  const next = targetScroll(port, child, axis);
  if (axis === "y") {
    port.scrollTo({
      top: next,
      behavior,
    });
    return;
  }
  port.scrollTo({
    left: next,
    behavior,
  });
}

export function scrollPortToSelector(
  port: HTMLElement | null,
  selector: string,
  axis: Axis,
  behavior: ScrollBehavior = "auto"
) {
  if (!port) return;
  const child = port.querySelector<HTMLElement>(selector);
  if (!child) return;
  scrollPortToChild(port, child, axis, behavior);
}

/**
 * Page the port to a child in a fixed duration. Snap is off for the flight so
 * mandatory snap cannot pause on every intermediate reel.
 */
export function animateScrollPortToChild(
  port: HTMLElement,
  child: HTMLElement,
  axis: Axis,
  durationMs: number
) {
  const start = readScroll(port, axis);
  const end = targetScroll(port, child, axis);
  if (Math.abs(end - start) < 1) {
    writeScroll(port, axis, end);
    return;
  }

  const prev = running.get(port);
  if (prev) {
    cancelAnimationFrame(prev.raf);
    running.delete(port);
  }
  const restore = prev?.restore ?? disableSnap(port);
  const t0 = performance.now();

  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / Math.max(1, durationMs));
    writeScroll(port, axis, start + (end - start) * easeOutCubic(t));
    if (t < 1) {
      const raf = requestAnimationFrame(tick);
      running.set(port, { raf, restore });
      return;
    }
    writeScroll(port, axis, end);
    restore();
    running.delete(port);
  };

  const raf = requestAnimationFrame(tick);
  running.set(port, { raf, restore });
}

export function animateScrollPortToSelector(
  port: HTMLElement | null,
  selector: string,
  axis: Axis,
  durationMs: number
) {
  if (!port) return;
  const child = port.querySelector<HTMLElement>(selector);
  if (!child) return;
  animateScrollPortToChild(port, child, axis, durationMs);
}

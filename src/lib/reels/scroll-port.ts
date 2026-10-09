type Axis = "x" | "y";

/** Scroll only this port so snap/focus never walks ancestor scrollers to the last reel. */
export function scrollPortToChild(
  port: HTMLElement,
  child: HTMLElement,
  axis: Axis,
  behavior: ScrollBehavior = "auto"
) {
  const portRect = port.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  if (axis === "y") {
    port.scrollTo({
      top: port.scrollTop + (childRect.top - portRect.top),
      behavior,
    });
    return;
  }
  port.scrollTo({
    left:
      port.scrollLeft +
      (childRect.left - portRect.left) -
      (port.clientWidth - childRect.width) / 2,
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

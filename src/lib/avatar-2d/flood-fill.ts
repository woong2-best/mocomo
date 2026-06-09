/** Canvas flood fill — tolerance 0~255 per channel */
export function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillRgba: [number, number, number, number],
  tolerance = 32
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= w || py >= h) return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const start = (py * w + px) * 4;
  const sr = data[start]!;
  const sg = data[start + 1]!;
  const sb = data[start + 2]!;
  const sa = data[start + 3]!;

  if (
    Math.abs(sr - fillRgba[0]) <= tolerance &&
    Math.abs(sg - fillRgba[1]) <= tolerance &&
    Math.abs(sb - fillRgba[2]) <= tolerance &&
    Math.abs(sa - fillRgba[3]) <= tolerance
  ) {
    return;
  }

  const match = (i: number) =>
    Math.abs(data[i]! - sr) <= tolerance &&
    Math.abs(data[i + 1]! - sg) <= tolerance &&
    Math.abs(data[i + 2]! - sb) <= tolerance &&
    Math.abs(data[i + 3]! - sa) <= tolerance;

  const stack: number[] = [px, py];
  const visited = new Uint8Array(w * h);

  while (stack.length) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const vi = cy * w + cx;
    if (visited[vi]) continue;
    const i = vi * 4;
    if (!match(i)) continue;
    visited[vi] = 1;
    data[i] = fillRgba[0];
    data[i + 1] = fillRgba[1];
    data[i + 2] = fillRgba[2];
    data[i + 3] = fillRgba[3];
    stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
  }

  ctx.putImageData(imageData, 0, 0);
}

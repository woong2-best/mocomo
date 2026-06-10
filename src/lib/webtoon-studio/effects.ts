export function applyLayerFilter(
  ctx: CanvasRenderingContext2D,
  filterId: string,
  width: number,
  height: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;

  if (filterId === "grayscale") {
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
      d[i] = d[i + 1] = d[i + 2] = g;
    }
  } else if (filterId === "brightness") {
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i]! + 24);
      d[i + 1] = Math.min(255, d[i + 1]! + 24);
      d[i + 2] = Math.min(255, d[i + 2]! + 24);
    }
  } else if (filterId === "saturation") {
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
      d[i] = Math.min(255, g + (d[i]! - g) * 1.35);
      d[i + 1] = Math.min(255, g + (d[i + 1]! - g) * 1.35);
      d[i + 2] = Math.min(255, g + (d[i + 2]! - g) * 1.35);
    }
  } else if (filterId === "sharpen") {
    ctx.filter = "contrast(1.15) saturate(1.1)";
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = "none";
    return;
  } else if (filterId === "blur") {
    ctx.filter = "blur(3px)";
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = "none";
    return;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  template: "normal" | "think" | "shout",
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (template === "think") {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (template === "shout") {
    const spikes = 12;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 1 : 0.82;
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const px = x + w / 2 + Math.cos(a) * (w / 2) * r;
      const py = y + h / 2 + Math.sin(a) * (h / 2) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    const r = 16;
    ctx.roundRect(x, y, w, h, r);
  }
  ctx.fill();
  ctx.stroke();
  if (template !== "think") {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h);
    ctx.lineTo(x + w * 0.25, y + h + 24);
    ctx.lineTo(x + w * 0.45, y + h);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSpeedLines(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * size * 0.2, cy + Math.sin(a) * size * 0.2);
    ctx.lineTo(cx + Math.cos(a) * size, cy + Math.sin(a) * size);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPageText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  font = "Pretendard, sans-serif"
) {
  ctx.save();
  ctx.fillStyle = "#111";
  ctx.font = `bold ${size}px ${font}`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawScreentone(
  ctx: CanvasRenderingContext2D,
  pattern: "dots" | "lines" | "cross",
  x: number,
  y: number,
  w: number,
  h: number
) {
  const tile = document.createElement("canvas");
  tile.width = 12;
  tile.height = 12;
  const tctx = tile.getContext("2d")!;
  tctx.fillStyle = "#fff";
  tctx.fillRect(0, 0, 12, 12);
  tctx.fillStyle = "rgba(0,0,0,0.35)";
  if (pattern === "dots") {
    tctx.beginPath();
    tctx.arc(6, 6, 1.5, 0, Math.PI * 2);
    tctx.fill();
  } else if (pattern === "lines") {
    tctx.fillRect(0, 5, 12, 1);
  } else {
    tctx.fillRect(0, 5, 12, 1);
    tctx.fillRect(5, 0, 1, 12);
  }
  ctx.save();
  const pat = ctx.createPattern(tile, "repeat");
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

export function drawGuideGrid(ctx: CanvasRenderingContext2D, width: number, height: number, step = 80) {
  ctx.save();
  ctx.strokeStyle = "rgba(59,130,246,0.25)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

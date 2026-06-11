import type {
  LiveOverlayLotteryProps,
  LiveOverlayQuizProps,
  LiveOverlayState,
  LiveOverlayTextProps,
  LiveOverlayWheelProps,
  LiveOverlayWordGuessProps,
  LiveOverlayWidget,
} from "@/lib/live-overlays/types";

function px(v: number, total: number) {
  return (v / 100) * total;
}

function drawTextWidget(ctx: CanvasRenderingContext2D, props: LiveOverlayTextProps, w: number, h: number) {
  const pad = Math.max(8, w * 0.02);
  ctx.font = `${props.bold ? "bold" : "normal"} ${Math.round(props.fontSize * (w / 640))}px system-ui, sans-serif`;
  ctx.textAlign = props.align;
  ctx.textBaseline = "middle";
  const lines = props.content.split("\n");
  const lineH = props.fontSize * 1.35 * (w / 640);
  const blockH = lines.length * lineH + pad * 2;
  const blockW = w - pad * 2;
  if (props.background && props.background !== "transparent") {
    ctx.fillStyle = props.background;
    ctx.globalAlpha = 0.85;
    roundRect(ctx, pad, (h - blockH) / 2, blockW, blockH, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = props.color || "#ffffff";
  const startY = h / 2 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((line, i) => {
    const x = props.align === "center" ? w / 2 : props.align === "right" ? w - pad : pad;
    ctx.fillText(line, x, startY + i * lineH);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWheelWidget(ctx: CanvasRenderingContext2D, props: LiveOverlayWheelProps, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.42;
  const segs = props.segments.length || 1;
  const totalWeight = props.segments.reduce((s, seg) => s + Math.max(1, seg.weight), 0);
  let angle = (props.rotation * Math.PI) / 180;
  props.segments.forEach((seg, i) => {
    const slice = (Math.max(1, seg.weight) / totalWeight) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = `hsl(${(i * 360) / segs}, 70%, 55%)`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += slice;
  });
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(w * 0.08)}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText(props.title.slice(0, 12), cx, cy - r * 0.55);
  if (props.lastResult) {
    ctx.font = `${Math.round(w * 0.06)}px system-ui`;
    ctx.fillText(props.lastResult, cx, cy + r * 0.65);
  }
}

function drawLotteryWidget(ctx: CanvasRenderingContext2D, props: LiveOverlayLotteryProps, w: number, h: number) {
  ctx.fillStyle = "rgba(15,15,30,0.88)";
  roundRect(ctx, 4, 4, w - 8, h - 8, 14);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(w * 0.09)}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText(props.title, w / 2, h * 0.22);
  ctx.font = `${Math.round(w * 0.07)}px system-ui`;
  const label = props.drawing ? "추첨 중…" : props.winner ?? `${props.entries.length}명`;
  ctx.fillStyle = props.winner ? "#fbbf24" : "#cbd5e1";
  ctx.fillText(label, w / 2, h * 0.55);
}

function drawQuizWidget(ctx: CanvasRenderingContext2D, props: LiveOverlayQuizProps, w: number, h: number) {
  ctx.fillStyle = "rgba(20,10,40,0.9)";
  roundRect(ctx, 4, 4, w - 8, h - 8, 12);
  ctx.fill();
  ctx.fillStyle = "#c4b5fd";
  ctx.font = `bold ${Math.round(w * 0.07)}px system-ui`;
  ctx.textAlign = "left";
  ctx.fillText(props.title.slice(0, 16), 12, h * 0.12);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(w * 0.085)}px system-ui`;
  wrapText(ctx, props.question, 12, h * 0.22, w - 24, h * 0.1);
  const labels = ["1", "2", "3", "4"];
  props.options.forEach((opt, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ox = 12 + col * (w / 2 - 8);
    const oy = h * 0.42 + row * (h * 0.18);
    const isCorrect = props.phase === "reveal" && i === props.correctIndex;
    ctx.fillStyle = isCorrect ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.12)";
    roundRect(ctx, ox, oy, w / 2 - 16, h * 0.14, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.round(w * 0.06)}px system-ui`;
    ctx.fillText(`${labels[i]} ${opt.slice(0, 14)}`, ox + 6, oy + h * 0.09);
  });
  if (props.phase === "active" && props.timeLeft > 0) {
    ctx.fillStyle = "#fcd34d";
    ctx.font = `bold ${Math.round(w * 0.08)}px system-ui`;
    ctx.textAlign = "right";
    ctx.fillText(`${props.timeLeft}s`, w - 12, h * 0.12);
  }
}

function drawWordGuessWidget(
  ctx: CanvasRenderingContext2D,
  props: LiveOverlayWordGuessProps,
  w: number,
  h: number
) {
  ctx.fillStyle = "rgba(30,15,10,0.9)";
  roundRect(ctx, 4, 4, w - 8, h - 8, 12);
  ctx.fill();
  ctx.fillStyle = "#fcd34d";
  ctx.font = `bold ${Math.round(w * 0.08)}px system-ui`;
  ctx.textAlign = "left";
  ctx.fillText(props.title.slice(0, 14), 12, h * 0.14);
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.round(w * 0.065)}px system-ui`;
  ctx.fillText(`[${props.category}]`, 12, h * 0.28);
  if (props.hint) wrapText(ctx, props.hint, 12, h * 0.38, w - 24, h * 0.08);
  if (props.phase === "reveal") {
    ctx.fillStyle = "#fbbf24";
    ctx.font = `bold ${Math.round(w * 0.1)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(props.answer, w / 2, h * 0.62);
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number
) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

function drawWidget(ctx: CanvasRenderingContext2D, widget: LiveOverlayWidget, canvasW: number, canvasH: number) {
  if (!widget.visible) return;
  const x = px(widget.x, canvasW);
  const y = px(widget.y, canvasH);
  const w = px(widget.w, canvasW);
  const h = px(widget.h, canvasH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  if (widget.type === "text") drawTextWidget(ctx, widget.props as LiveOverlayTextProps, w, h);
  if (widget.type === "wheel") drawWheelWidget(ctx, widget.props as LiveOverlayWheelProps, w, h);
  if (widget.type === "lottery") drawLotteryWidget(ctx, widget.props as LiveOverlayLotteryProps, w, h);
  if (widget.type === "quiz") drawQuizWidget(ctx, widget.props as LiveOverlayQuizProps, w, h);
  if (widget.type === "wordGuess")
    drawWordGuessWidget(ctx, widget.props as LiveOverlayWordGuessProps, w, h);
  ctx.restore();
}

/** WHIP 송출 캔버스에 오버레이 위젯 그리기 */
export function drawLiveOverlaysToCanvas(
  ctx: CanvasRenderingContext2D,
  state: LiveOverlayState | null | undefined,
  width: number,
  height: number
) {
  if (!state?.widgets.length) return;
  const sorted = [...state.widgets].sort((a, b) => a.z - b.z);
  sorted.forEach((w) => drawWidget(ctx, w, width, height));
}

export function drawLiveChromaBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#00ff00";
  ctx.fillRect(0, 0, w, h);
}

export function drawLiveGradientBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#1a0f2e");
  g.addColorStop(0.45, "#120820");
  g.addColorStop(1, "#06040c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const vignette = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.15, w / 2, h * 0.55, h * 0.85);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

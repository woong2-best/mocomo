"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { AiMotionState, AiPose } from "@/lib/ai-live/motion";
import { createAiMotion, setLook, stepAiMotion } from "@/lib/ai-live/motion";
import type { LipSync } from "@/components/live/ai-host/speak-host";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  motionRef: RefObject<AiMotionState | null>;
  lipRef: RefObject<LipSync | null>;
};

function drawHost(ctx: CanvasRenderingContext2D, w: number, h: number, pose: AiPose) {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 20, w * 0.5, h * 0.5, w * 0.7);
  bg.addColorStop(0, "#3a2418");
  bg.addColorStop(1, "#07060a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const scale = Math.min(w / 240, h / 135);
  ctx.save();
  ctx.translate((w - 240 * scale) / 2, (h - 135 * scale) / 2);
  ctx.scale(scale, scale);

  ctx.save();
  ctx.translate(0, pose.breath);
  ctx.fillStyle = "#c45c3e";
  ctx.beginPath();
  ctx.moveTo(62, 118);
  ctx.quadraticCurveTo(120, 96, 178, 118);
  ctx.lineTo(196, 140);
  ctx.lineTo(44, 140);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f6e7d4";
  ctx.beginPath();
  ctx.moveTo(108, 108);
  ctx.quadraticCurveTo(120, 118, 132, 108);
  ctx.lineTo(128, 120);
  ctx.quadraticCurveTo(120, 124, 112, 120);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(120, 96);
  ctx.rotate((pose.head * Math.PI) / 180);
  ctx.translate(-120, -96);

  ctx.fillStyle = "#2c1a24";
  ctx.beginPath();
  ctx.moveTo(86, 58);
  ctx.bezierCurveTo(74, 18, 120, 6, 162, 28);
  ctx.bezierCurveTo(188, 48, 186, 92, 174, 120);
  ctx.quadraticCurveTo(140, 100, 120, 98);
  ctx.quadraticCurveTo(96, 102, 66, 122);
  ctx.bezierCurveTo(58, 90, 64, 70, 86, 58);
  ctx.fill();

  ctx.fillStyle = "#f2c7b0";
  ctx.fillRect(108, 86, 24, 18);
  ctx.beginPath();
  ctx.ellipse(120, 62, 30, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(244,114,182,0.38)";
  ctx.beginPath();
  ctx.ellipse(100, 72, 7, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(140, 72, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3a2418";
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (pose.angry > 0.5) {
    ctx.moveTo(96, 48);
    ctx.lineTo(112, 53);
    ctx.moveTo(144, 48);
    ctx.lineTo(128, 53);
  } else {
    ctx.moveTo(96, 51);
    ctx.lineTo(112, 48);
    ctx.moveTo(144, 51);
    ctx.lineTo(128, 48);
  }
  ctx.stroke();

  const eyeScale = Math.max(0.08, 1 - pose.blink * 0.92);
  for (const side of [-1, 1]) {
    const ex = 120 + side * 14;
    ctx.save();
    ctx.translate(ex, 60);
    ctx.scale(1, eyeScale);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a6741";
    ctx.beginPath();
    ctx.arc(pose.lookX * 2.2, pose.lookY * 1.5, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c140c";
    ctx.beginPath();
    ctx.arc(pose.lookX * 2.2, pose.lookY * 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(pose.lookX * 2.2 + 1.1, pose.lookY * 1.5 - 1.2, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const mouth = pose.mouth;
  ctx.beginPath();
  ctx.ellipse(120, 78, 7 + mouth * 2, 1.15 + mouth * 6.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = mouth > 0.18 ? "#7a3040" : "#e48aaa";
  ctx.fill();
  ctx.strokeStyle = "#c45c78";
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = "#3a2430";
  ctx.beginPath();
  ctx.moveTo(92, 38);
  ctx.quadraticCurveTo(120, 24, 150, 38);
  ctx.quadraticCurveTo(138, 52, 120, 46);
  ctx.quadraticCurveTo(102, 52, 92, 38);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

/** Studio-female bust. Eyes, head, breath, and mouth are separate tracks. */
export function AiHostStage({ motionRef, lipRef }: Props) {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    if (!motionRef.current) motionRef.current = createAiMotion(performance.now());
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const frame = (now: number) => {
      const motion = motionRef.current;
      if (motion) {
        const parent = canvas.parentElement;
        const cssW = parent?.clientWidth || 320;
        const cssH = parent?.clientHeight || 180;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const pxW = Math.round(cssW * dpr);
        const pxH = Math.round(cssH * dpr);
        if (canvas.width !== pxW || canvas.height !== pxH) {
          canvas.width = pxW;
          canvas.height = pxH;
        }
        const pose = stepAiMotion(motion, now, reducedRef.current);
        const level = lipRef.current?.level() ?? null;
        if (level != null && level > 0.05) pose.mouth = level;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawHost(ctx, pxW, pxH, pose);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [lipRef, motionRef]);

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
      onPointerMove={(e) => {
        const motion = motionRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        if (!motion || rect.width < 1 || rect.height < 1) return;
        setLook(
          motion,
          ((e.clientX - rect.left) / rect.width - 0.5) * 2,
          ((e.clientY - rect.top) / rect.height - 0.42) * 2
        );
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
      <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-[#1a4fa0] px-2 py-1 text-[11px] font-black tracking-wide text-white shadow">
        {t("live.aiOfficialBadge")}
      </span>
    </div>
  );
}

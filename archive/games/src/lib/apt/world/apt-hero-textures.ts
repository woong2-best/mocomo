"use client";

import * as THREE from "three";
import { APT_ART } from "./apt-world-art";

export function makeNeonSignTexture(text = "APT"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(10,10,30,0.85)";
  if (typeof ctx.roundRect === "function") ctx.roundRect(8, 8, 240, 80, 16);
  else ctx.fillRect(8, 8, 240, 80);
  ctx.fill();
  ctx.strokeStyle = "#ff88cc";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = "bold 52px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#ff88cc";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 128, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeHeroBillboardTexture(title = "APT TOWN", subtitle = "오늘도 좋은 하루"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, "#ffb4c8");
  grad.addColorStop(0.5, "#ffd8e8");
  grad.addColorStop(1, "#b8d8ff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(16, 16, 480, 224);
  ctx.fillStyle = "#334455";
  ctx.font = "bold 48px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, 256, 100);
  ctx.font = "24px system-ui,sans-serif";
  ctx.fillStyle = "#667788";
  ctx.fillText(subtitle, 256, 150);
  ctx.fillStyle = "#ff88aa";
  ctx.font = "600 20px system-ui,sans-serif";
  ctx.fillText("★ LIVE · OPEN · WELCOME ★", 256, 200);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeArtWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff6ee";
  ctx.fillRect(0, 0, 256, 192);
  const colors = ["#ffb4c8", "#b8d8ff", "#ffe8a0", "#c8f0d8", "#e8d8ff"];
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.55 + (i % 3) * 0.12;
    ctx.beginPath();
    ctx.arc(30 + (i % 4) * 58, 30 + Math.floor(i / 4) * 52, 18 + (i % 3) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = `#${APT_ART.trimWood.toString(16).padStart(6, "0")}`;
  ctx.font = "600 18px system-ui,sans-serif";
  ctx.fillText("APT ART WALL", 20, 178);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

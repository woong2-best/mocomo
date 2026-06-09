"use client";

import {
  adjustSkinColor,
  getOutfitAccent,
  getOutfitBottomColor,
  HAIR_COLORS,
  SKIN_TONES,
} from "@/lib/virtual-avatar/presets";
import type { AvatarConfig, FaceShape, MotionId, ParticleEffect } from "@/lib/virtual-avatar/types";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number; hue: number };

export class VirtualAvatarRenderer {
  private raf = 0;
  private particles: Particle[] = [];
  private blinkTimer = 0;
  private blinkClosed = false;
  private getConfig: () => AvatarConfig = () => ({}) as AvatarConfig;

  constructor(private canvas: HTMLCanvasElement) {}

  start(getConfig: () => AvatarConfig) {
    this.getConfig = getConfig;
    const loop = (t: number) => {
      this.draw(getConfig(), t / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  exportPng(): string {
    return this.canvas.toDataURL("image/png");
  }

  private draw(config: AvatarConfig, time: number) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w < 2 || h < 2) return;

    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    this.drawBackground(ctx, w, h, config, time);
    this.updateParticles(w, h, config.effects.particle, time);

    const cx = w / 2;
    const cy = h * 0.52;
    const baseScale = Math.min(w, h) * 0.0042 * config.view.zoom;
    const rot = config.view.rotation + (config.view.autoRotate ? time * 0.35 : 0);
    const bob =
      config.effects.animationPlaying && config.effects.motion === "idle"
        ? Math.sin(time * 2.2) * 4
        : 0;

    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(rot);
    ctx.scale(baseScale, baseScale);

    const body = config.body;
    const heightScale = body.height / 168;
    const weightScale = 0.85 + (body.weight - 40) / 120;
    const shoulder = body.shoulderWidth / 45;
    const waist = body.waist / 68;
    const armLen = body.armLength / 60;
    const armThick = body.armThickness / 60;
    const legLen = body.legLength / 90;
    const gender = body.genderExpression;

    const skinHex = SKIN_TONES[config.skin.toneIndex]?.hex ?? SKIN_TONES[2].hex;
    const skin = adjustSkinColor(skinHex, config.skin.brightness, config.skin.saturation);

    const motion = config.effects.animationPlaying ? config.effects.motion : "idle";
    const motionT = this.motionPhase(motion, time);

    this.drawLegs(ctx, legLen, waist, weightScale, config, skin, motion, motionT);
    this.drawTorso(ctx, shoulder, waist, weightScale, heightScale, gender, config, motion, motionT);
    this.drawArms(ctx, shoulder, armLen, armThick, weightScale, skin, config, motion, motionT);
    this.drawHead(ctx, config, skin, motion, motionT, time);
    this.drawHair(ctx, config);

    ctx.restore();
    this.drawParticles(ctx, w, h, config.effects.particle);
  }

  private motionPhase(motion: MotionId, time: number): number {
    switch (motion) {
      case "wave":
        return Math.sin(time * 4) * 0.5 + 0.5;
      case "dance":
        return Math.sin(time * 6) * 0.5 + 0.5;
      case "talk":
        return Math.abs(Math.sin(time * 12));
      case "smile":
        return 0.8 + Math.sin(time * 2) * 0.2;
      case "bow":
        return Math.min(1, (Math.sin(time * 1.5) + 1) * 0.35);
      default:
        return 0;
    }
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    config: AvatarConfig,
    time: number
  ) {
    const bg = config.effects.background;
    let grad: CanvasGradient;

    switch (bg) {
      case "pink":
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#831843");
        grad.addColorStop(1, "#500724");
        break;
      case "cyber":
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#0f172a");
        grad.addColorStop(0.5, "#312e81");
        grad.addColorStop(1, "#0f172a");
        break;
      case "nature":
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#14532d");
        grad.addColorStop(1, "#052e16");
        break;
      case "solid":
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#27272a");
        grad.addColorStop(1, "#18181b");
        break;
      default:
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#1e1b4b");
        grad.addColorStop(1, "#0f0a1a");
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (bg === "space" || bg === "cyber") {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137.5 + time * 12) % w);
        const sy = ((i * 97.3) % h);
        const size = (i % 3) + 1;
        ctx.globalAlpha = 0.3 + (i % 5) * 0.12;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  private updateParticles(w: number, h: number, effect: ParticleEffect, time: number) {
    if (effect === "none") {
      this.particles = [];
      return;
    }
    if (this.particles.length < 28 && Math.random() < 0.35) {
      this.particles.push({
        x: Math.random() * w,
        y: h + 8,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -1.5 - Math.random() * 2,
        life: 1,
        size: 3 + Math.random() * 5,
        hue: (time * 40 + Math.random() * 360) % 360,
      });
    }
    this.particles = this.particles
      .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.012 }))
      .filter((p) => p.life > 0);
  }

  private drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, effect: ParticleEffect) {
    if (effect === "none") return;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      if (effect === "hearts") {
        this.drawHeart(ctx, p.x, p.y, p.size, "#f472b6");
      } else if (effect === "stars") {
        this.drawStar(ctx, p.x, p.y, p.size, "#fde047");
      } else if (effect === "fireworks") {
        ctx.fillStyle = `hsl(${p.hue},90%,65%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `hsl(${p.hue},80%,70%)`;
        ctx.fillRect(p.x, p.y, p.size * 0.4, p.size * 0.4);
      }
      ctx.restore();
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s * 0.3);
    ctx.bezierCurveTo(x - s, y + s * 0.7, x, y + s, x, y + s * 1.2);
    ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.7, x + s, y + s * 0.3);
    ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.3);
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? s : s * 0.45;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private faceScale(shape: FaceShape): { sx: number; sy: number } {
    switch (shape) {
      case "round":
        return { sx: 1.14, sy: 1.06 };
      case "heart":
        return { sx: 1.1, sy: 1.08 };
      case "square":
        return { sx: 1.16, sy: 1.02 };
      case "long":
        return { sx: 0.86, sy: 1.18 };
      case "diamond":
        return { sx: 0.88, sy: 1.1 };
      case "invertedTriangle":
        return { sx: 1.12, sy: 1.04 };
      case "triangle":
        return { sx: 1.12, sy: 1.0 };
      default:
        return { sx: 0.94, sy: 1.08 };
    }
  }

  private drawHead(
    ctx: CanvasRenderingContext2D,
    config: AvatarConfig,
    skin: string,
    motion: MotionId,
    motionT: number,
    time: number
  ) {
    const face = config.face;
    const { sx, sy } = this.faceScale(face.faceShape);
    const bowTilt = motion === "bow" ? motionT * 0.35 : 0;

    ctx.save();
    ctx.translate(0, -95 * sy);
    ctx.rotate(bowTilt);

    if (config.skin.glow) {
      ctx.shadowColor = "rgba(255,220,180,0.45)";
      ctx.shadowBlur = 18;
    }

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 0, 38 * sx, 42 * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    this.drawEyes(ctx, face, time);
    this.drawNose(ctx, face, skin);
    this.drawMouth(ctx, face, motion, motionT);

    if (config.skin.blush) {
      ctx.fillStyle = "rgba(244,114,182,0.35)";
      ctx.beginPath();
      ctx.ellipse(-22 * sx, 8, 8, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(22 * sx, 8, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (config.skin.freckles) {
      ctx.fillStyle = "rgba(120,70,40,0.35)";
      for (let i = 0; i < 8; i++) {
        const fx = -12 + (i % 4) * 8;
        const fy = -2 + Math.floor(i / 4) * 10;
        ctx.beginPath();
        ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawEyes(ctx: CanvasRenderingContext2D, face: AvatarConfig["face"], time: number) {
    const size = 4 + (face.eyeSize / 100) * 6;
    const spacing = 10 + (face.eyeSpacing / 100) * 14;
    const tilt = ((face.eyeTilt - 50) / 50) * 0.25;
    const lid = face.doubleEyelid / 100;

    this.blinkTimer += 0.016;
    if (this.blinkTimer > 3.5 + Math.random() * 0.01) {
      this.blinkClosed = true;
      if (this.blinkTimer > 3.65) {
        this.blinkTimer = 0;
        this.blinkClosed = false;
      }
    }

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * spacing, -4);
      ctx.rotate(side * tilt);

      if (this.blinkClosed) {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.1, size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(size * 0.2, -size * 0.2, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
        if (lid > 0.35) {
          ctx.strokeStyle = `rgba(26,26,26,${0.3 + lid * 0.4})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, -size * 0.15, size * 1.05, 0.15, Math.PI - 0.15);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  private drawNose(ctx: CanvasRenderingContext2D, face: AvatarConfig["face"], skin: string) {
    const size = 2 + (face.noseSize / 100) * 4;
    const height = (face.noseHeight / 100) * 8;
    ctx.fillStyle = skin;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 6 + height * 0.3, size * 0.6, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawMouth(
    ctx: CanvasRenderingContext2D,
    face: AvatarConfig["face"],
    motion: MotionId,
    motionT: number
  ) {
    const thick = 1 + (face.lipThickness / 100) * 3;
    const width = 8 + (face.lipWidth / 100) * 10;
    let smile = 0.15;

    if (motion === "smile") smile = 0.35 + motionT * 0.25;
    if (motion === "talk") smile = 0.05 + motionT * 0.2;

    ctx.strokeStyle = "#c45c5c";
    ctx.lineWidth = thick;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (motion === "talk" && motionT > 0.4) {
      ctx.ellipse(0, 18, width * 0.35, width * 0.25 * motionT, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8b3030";
      ctx.fill();
    } else {
      ctx.arc(0, 16, width, 0.15, Math.PI - 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 16 + smile * 4, width * 0.85, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }

  private drawHair(ctx: CanvasRenderingContext2D, config: AvatarConfig) {
    const hair = config.hair;
    const base = HAIR_COLORS[hair.colorIndex]?.hex ?? "#1a1a1a";
    const vol = 0.7 + hair.volume / 100;
    const len = 0.6 + hair.length / 100;
    const style = hair.style;

    ctx.save();
    ctx.translate(0, -95);

    let grad: CanvasGradient | string = base;
    if (hair.gradient || hair.colorIndex === 9) {
      grad = ctx.createLinearGradient(-30, -50, 30, 20);
      grad.addColorStop(0, base === "linear" ? "#f472b6" : base);
      grad.addColorStop(0.5, hair.colorIndex === 9 ? "#a855f7" : base);
      grad.addColorStop(1, hair.colorIndex === 9 ? "#22d3ee" : "#4a3728");
    }
    ctx.fillStyle = grad;

    const drawBlob = (x: number, y: number, rx: number, ry: number) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx * vol, ry * vol * len, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    switch (style) {
      case 1:
        drawBlob(0, -38, 42, 48);
        drawBlob(-28, 10, 14, 55 * len);
        drawBlob(28, 10, 14, 55 * len);
        break;
      case 2:
        drawBlob(0, -36, 40, 44);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(35, 30, 40, 70 * len);
        ctx.quadraticCurveTo(10, 50, 0, 20);
        ctx.fill();
        break;
      case 3:
        drawBlob(0, -36, 40, 44);
        drawBlob(-32, -20, 12, 40 * len);
        drawBlob(32, -20, 12, 40 * len);
        break;
      case 4:
        drawBlob(0, -34, 38, 36);
        break;
      case 5:
        drawBlob(0, -36, 44, 46);
        for (let i = -2; i <= 2; i++) {
          drawBlob(i * 14, -10 + Math.abs(i) * 4, 12, 22);
        }
        break;
      case 6:
        drawBlob(0, -36, 40, 44);
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-38, 50 * len);
        ctx.lineTo(-22, 45 * len);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(38, 50 * len);
        ctx.lineTo(22, 45 * len);
        ctx.fill();
        break;
      case 7:
        drawBlob(0, -42, 18, 50);
        drawBlob(-12, -48, 10, 20);
        drawBlob(12, -48, 10, 20);
        break;
      default:
        drawBlob(0, -36, 40, 44);
        drawBlob(-18, 5, 16, 28 * len);
        drawBlob(18, 5, 16, 28 * len);
    }

    if (hair.highlight) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      drawBlob(-8, -42, 14, 18);
    }

    ctx.restore();
  }

  private drawTorso(
    ctx: CanvasRenderingContext2D,
    shoulder: number,
    waist: number,
    weight: number,
    height: number,
    gender: AvatarConfig["body"]["genderExpression"],
    config: AvatarConfig,
    motion: MotionId,
    motionT: number
  ) {
    const outfit = config.outfit;
    if (!outfit.layers.top && !outfit.layers.bottom) return;

    const topColor = outfit.topColor;
    const bottomColor = getOutfitBottomColor(outfit.preset, topColor);
    const accent = getOutfitAccent(outfit.preset);
    const genderW = gender === "male" ? 1.08 : gender === "female" ? 0.92 : 1;
    const sw = 38 * shoulder * weight * genderW;
    const ww = 28 * waist * weight * genderW;
    const danceSway = motion === "dance" ? Math.sin(motionT * Math.PI * 2) * 8 : 0;

    ctx.save();
    ctx.translate(danceSway, -48 * height);

    if (outfit.layers.top) {
      ctx.fillStyle = topColor;
      if (outfit.preset === "dressy") {
        ctx.beginPath();
        ctx.moveTo(-sw, 0);
        ctx.lineTo(sw, 0);
        ctx.lineTo(sw * 1.1, 55);
        ctx.quadraticCurveTo(0, 70, -sw * 1.1, 55);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(-4, 0, 8, 12);
      } else if (outfit.preset === "game") {
        ctx.fillRect(-sw, 0, sw * 2, 42);
        ctx.fillStyle = accent;
        ctx.fillRect(-sw, 30, sw * 2, 6);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LV.99", 0, 22);
      } else if (outfit.preset === "fantasy") {
        ctx.beginPath();
        ctx.moveTo(-sw, 0);
        ctx.lineTo(0, -18);
        ctx.lineTo(sw, 0);
        ctx.lineTo(sw, 45);
        ctx.lineTo(-sw, 45);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, -18, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (outfit.preset === "cyberpunk") {
        ctx.fillRect(-sw, 0, sw * 2, 42);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(-sw + 4, 6, sw * 2 - 8, 28);
        ctx.fillStyle = accent;
        ctx.fillRect(-sw, 38, sw * 2, 3);
      } else if (outfit.preset === "office") {
        ctx.fillRect(-sw, 0, sw * 2, 42);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(-8, 0, 16, 38);
        ctx.fillStyle = accent;
        ctx.fillRect(-5, 32, 10, 8);
      } else {
        ctx.beginPath();
        ctx.moveTo(-sw, 0);
        ctx.lineTo(-ww, 45);
        ctx.lineTo(ww, 45);
        ctx.lineTo(sw, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(0, 28);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (outfit.layers.bottom && outfit.preset !== "dressy") {
      ctx.fillStyle = bottomColor;
      const legW = ww * 0.85;
      ctx.fillRect(-legW, 42, legW * 0.85, 38 * (config.body.legLength / 90));
      ctx.fillRect(legW * 0.15, 42, legW * 0.85, 38 * (config.body.legLength / 90));
    }

    if (outfit.layers.accessories) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      if (outfit.preset === "fantasy") {
        ctx.beginPath();
        ctx.arc(0, -52, 14, Math.PI, 0);
        ctx.stroke();
      } else if (outfit.preset === "cyberpunk") {
        ctx.fillStyle = accent;
        ctx.fillRect(-18, -8, 36, 4);
      }
    }

    ctx.restore();
  }

  private drawLegs(
    ctx: CanvasRenderingContext2D,
    legLen: number,
    waist: number,
    weight: number,
    config: AvatarConfig,
    skin: string,
    motion: MotionId,
    motionT: number
  ) {
    if (!config.outfit.layers.bottom && config.outfit.preset !== "dressy") return;
    const ww = 28 * (waist / 1) * weight;
    const len = 38 * legLen;
    const dance = motion === "dance" ? Math.sin(motionT * Math.PI * 2) * 12 : 0;
    const bottomColor = getOutfitBottomColor(config.outfit.preset, config.outfit.topColor);

    ctx.save();
    ctx.translate(0, 0);

    if (config.outfit.preset === "dressy") {
      return;
    }

    const drawLeg = (x: number, bend: number) => {
      ctx.save();
      ctx.translate(x, 42);
      ctx.rotate(bend);
      ctx.fillStyle = config.outfit.layers.bottom ? bottomColor : skin;
      ctx.fillRect(-ww * 0.35, 0, ww * 0.7, len);
      if (config.outfit.layers.shoes) {
        ctx.fillStyle = config.outfit.preset === "cyberpunk" ? "#f472b6" : "#1e293b";
        ctx.fillRect(-ww * 0.38, len - 6, ww * 0.76, 8);
      }
      ctx.restore();
    };

    drawLeg(-ww * 0.55 + dance * 0.3, motion === "dance" ? dance * 0.02 : 0);
    drawLeg(ww * 0.55 - dance * 0.3, motion === "dance" ? -dance * 0.02 : 0);
    ctx.restore();
  }

  private drawArms(
    ctx: CanvasRenderingContext2D,
    shoulder: number,
    armLen: number,
    armThick: number,
    weight: number,
    skin: string,
    config: AvatarConfig,
    motion: MotionId,
    motionT: number
  ) {
    const sw = 38 * shoulder * weight;
    const len = 32 * armLen;
    const thick = 7 * armThick;
    const topColor = config.outfit.topColor;

    const drawArm = (side: number, angle: number) => {
      ctx.save();
      ctx.translate(side * sw, -40);
      ctx.rotate(angle);
      ctx.fillStyle = config.outfit.layers.top ? topColor : skin;
      ctx.fillRect(-thick * 0.5, 0, thick, len * 0.55);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(0, len * 0.58, thick * 0.65, thick * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    let leftAngle = 0.15;
    let rightAngle = -0.15;

    if (motion === "wave") {
      rightAngle = -1.2 + motionT * 0.8;
    } else if (motion === "dance") {
      leftAngle = 0.5 + motionT * 0.6;
      rightAngle = -0.5 - motionT * 0.6;
    } else if (motion === "bow") {
      leftAngle = 0.4;
      rightAngle = -0.4;
    }

    drawArm(-1, leftAngle);
    drawArm(1, rightAngle);
  }
}

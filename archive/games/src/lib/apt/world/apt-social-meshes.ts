"use client";

import * as THREE from "three";
import { APT_ART, aptBox, aptGlowMat, aptMat, makeCanvasLabel } from "./apt-world-art";
import type { AptSocialSnapshot } from "./apt-social-presence";

function add(g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}

function makeGuestbookTexture(names: string[]): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff8f0";
  ctx.fillRect(0, 0, 200, 160);
  ctx.strokeStyle = "#c9a882";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 188, 148);
  ctx.fillStyle = "#4488cc";
  ctx.font = "bold 16px system-ui,sans-serif";
  ctx.fillText("방명록", 16, 28);
  ctx.fillStyle = "#556677";
  ctx.font = "13px system-ui,sans-serif";
  names.slice(0, 4).forEach((n, i) => ctx.fillText(`♥ ${n}`, 14, 52 + i * 24));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSocialBoardTexture(snapshot: AptSocialSnapshot): THREE.CanvasTexture {
  const lines: string[] = ["── APT LIVE ──", `접속 ${snapshot.onlineCount}명`];
  if (snapshot.todayHome) {
    lines.push(`★ 오늘의 집: ${snapshot.todayHome.displayName}`);
    const id = snapshot.todayHome.identity;
    if (id) {
      lines.push(`  ${id.archetypeLabel} · ${id.tags.slice(0, 2).join(" ")}`);
      if (id.showcaseRoomLabel) {
        lines.push(`  대표 ${id.showcaseRoomLabel}${id.showcaseItemLabel ? ` · ${id.showcaseItemLabel}` : ""}`);
      }
    } else {
      lines.push(`  ${snapshot.todayHome.homeFloor}층 · 점수 ${snapshot.todayHome.score}`);
    }
  } else if (snapshot.popularHome) {
    lines.push(`인기 집: ${snapshot.popularHome.displayName}`);
    lines.push(`  ${snapshot.popularHome.homeFloor}층 · 방문 ${snapshot.popularHome.score}`);
  }
  if (snapshot.residentOfDay) {
    lines.push(`오늘의 입주민: ${snapshot.residentOfDay.displayName}`);
  }
  if (snapshot.weeklyBestRoom?.identity) {
    const wb = snapshot.weeklyBestRoom;
    lines.push(`주간 베스트: ${wb.displayName}`);
    lines.push(`  ${wb.identity!.archetypeLabel}`);
  }
  if (snapshot.streamingFloors.length) {
    lines.push(`방송 중: ${snapshot.streamingFloors.length}세대`);
  }
  lines.push(snapshot.todayEvent);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, "#ffd8e8");
  grad.addColorStop(1, "#b8d8ff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillRect(14, 14, 484, 228);
  ctx.fillStyle = "#334455";
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? "bold 26px system-ui,sans-serif" : "18px system-ui,sans-serif";
    ctx.fillText(line, 28, 48 + i * 32);
  });
  if (snapshot.visitorRanking[1]) {
    ctx.fillStyle = "#667788";
    ctx.font = "16px system-ui,sans-serif";
    ctx.fillText(
      `방문 랭킹 2위 ${snapshot.visitorRanking[1].displayName} (${snapshot.visitorRanking[1].homeFloor}F)`,
      28,
      220
    );
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlazaEventTexture(snapshot: AptSocialSnapshot): THREE.CanvasTexture {
  const ev = snapshot.scheduledEvent;
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#2a2233";
  ctx.fillRect(0, 0, 320, 128);
  const accent =
    ev.kind === "live" || ev.kind === "busking" ? "#ff88cc" : ev.kind === "cosplay" ? "#c084fc" : "#88ccff";
  ctx.fillStyle = accent;
  ctx.font = "bold 20px system-ui,sans-serif";
  ctx.fillText(ev.title.slice(0, 18), 16, 36);
  ctx.fillStyle = "#ccccdd";
  ctx.font = "15px system-ui,sans-serif";
  ctx.fillText(ev.subtitle.slice(0, 22), 16, 64);
  ctx.fillStyle = "#4ade80";
  ctx.fillText(ev.timeLabel, 16, 96);
  if (snapshot.todayHome) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "13px system-ui,sans-serif";
    const id = snapshot.todayHome.identity;
    const sub = id
      ? `${id.archetypeLabel.slice(0, 10)} · ${id.tags[0] ?? ""}`
      : `오늘의 집 ${snapshot.todayHome.displayName.slice(0, 8)}`;
    ctx.fillText(sub.slice(0, 28), 16, 118);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 현관문·복도 — 택배·방명록·최근 방문 */
export function buildHomeDoorSocialTraces(snapshot: AptSocialSnapshot): THREE.Group {
  const g = new THREE.Group();
  g.name = "social-home-traces";

  if (snapshot.hasHomeDelivery) {
    const pkg = add(g, aptBox(0.28, 0.18, 0.22, 0.02), aptMat(0xd4c4a8), 0.22, 0.1, 0.14, 0.15);
    pkg.name = "social-delivery-box";
    add(g, aptBox(0.12, 0.04, 0.08, 0.008), aptMat(0xff6644), 0.22, 0.2, 0.14);
  }

  if (snapshot.guestbookNames.length) {
    const gb = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.16),
      new THREE.MeshBasicMaterial({
        map: makeGuestbookTexture(snapshot.guestbookNames),
        transparent: true,
      })
    );
    gb.position.set(-0.32, 0.95, 0.08);
    gb.name = "social-guestbook";
    g.add(gb);
  } else if (snapshot.recentVisitors.length) {
    const gb = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.16),
      new THREE.MeshBasicMaterial({
        map: makeGuestbookTexture(snapshot.recentVisitors.map((v) => `${v.displayName} · ${v.agoLabel}`)),
        transparent: true,
      })
    );
    gb.position.set(-0.32, 0.95, 0.08);
    gb.name = "social-guestbook";
    g.add(gb);
  }

  if (snapshot.recentVisitors[0]) {
    const recent = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.08),
      new THREE.MeshBasicMaterial({
        map: makeCanvasLabel(`${snapshot.recentVisitors[0].displayName.slice(0, 6)} · ${snapshot.recentVisitors[0].agoLabel}`, {
          bg: APT_ART.signBlue,
          fg: "#ffffff",
          w: 140,
          h: 28,
        }),
        transparent: true,
      })
    );
    recent.position.set(0.1, 1.22, 0.08);
    recent.name = "social-recent-badge";
    g.add(recent);
  }

  return g;
}

/** 로비 — LIVE 보드·랭킹·엘리베이터 사용 */
export function buildLobbySocialBoards(snapshot: AptSocialSnapshot): THREE.Group {
  const g = new THREE.Group();
  g.name = "social-lobby-boards";

  const main = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.55),
    new THREE.MeshStandardMaterial({ map: makeSocialBoardTexture(snapshot), roughness: 0.65 })
  );
  main.position.set(0, 2.05, -4.75);
  main.name = "social-lobby-main-board";
  g.add(main);

  const rank = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.85),
    new THREE.MeshStandardMaterial({
      map: makeCanvasLabel(
        snapshot.visitorRanking[0]
          ? `#1 ${snapshot.visitorRanking[0].displayName.slice(0, 6)}`
          : "—",
        { bg: 0xffd700, fg: "#334455", w: 128, h: 96 }
      ),
      roughness: 0.7,
    })
  );
  rank.position.set(4.8, 1.55, -4.78);
  rank.name = "social-rank-badge";
  g.add(rank);

  if (snapshot.elevatorBusy) {
    const elev = add(g, aptBox(0.35, 0.1, 0.02, 0.008), aptGlowMat(0xffaa44, 0.5), 0.55, 2.55, 3.38);
    elev.name = "social-elevator-busy";
  }

  return g;
}

/** 광장 — 공연·전시·접속자 */
export function buildPlazaSocialLayer(snapshot: AptSocialSnapshot): THREE.Group {
  const g = new THREE.Group();
  g.name = "social-plaza-layer";

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.95),
    new THREE.MeshBasicMaterial({ map: makePlazaEventTexture(snapshot), transparent: true })
  );
  board.position.set(-2.2, 2.2, 6);
  board.name = "social-plaza-event-board";
  g.add(board);

  const count = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.22),
    new THREE.MeshBasicMaterial({
      map: makeCanvasLabel(`LIVE ${snapshot.onlineCount}`, { bg: 0x22c55e, fg: "#ffffff" }),
      transparent: true,
    })
  );
  count.position.set(2.5, 2.8, 5.5);
  count.name = "social-online-badge";
  g.add(count);

  if (snapshot.plazaEvent.kind === "music" || snapshot.plazaPerformers.length > 0) {
    const stage = new THREE.Group();
    stage.name = "social-plaza-stage";
    stage.position.set(0, 0, 4.2);
    add(stage, aptBox(1.8, 0.08, 0.9, 0.02), aptMat(APT_ART.trimWood), 0, 0.12, 0);
    add(stage, aptBox(0.08, 0.5, 0.08, 0.015), aptMat(0x333344), -0.5, 0.35, 0);
    add(stage, aptBox(0.08, 0.5, 0.08, 0.015), aptMat(0x333344), 0.5, 0.35, 0);
    const mic = add(stage, aptBox(0.04, 0.12, 0.04, 0.008), aptMat(0x888899, { metalness: 0.4 }), 0, 0.42, 0.1);
    mic.name = "social-stage-mic";
    g.add(stage);
  }

  return g;
}

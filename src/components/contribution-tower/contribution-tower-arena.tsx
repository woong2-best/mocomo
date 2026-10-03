"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ContributionTowerPayload } from "@/components/contribution-tower/contribution-tower-global";
import styles from "@/components/contribution-tower/contribution-tower-rock.module.css";

const STAGE_MAX_WIDTH = 640;
const INITIAL_HEIGHT = 650;
const EXPAND_THRESHOLD_Y = 150;
const EXPAND_AMOUNT = 280;
const EXPAND_MIN_STONES = 6;

type MatterModule = typeof import("matter-js");
type MatterBody = ReturnType<MatterModule["Bodies"]["circle"]>;

type StoneRecord = {
  id: string;
  body: MatterBody;
  linkEl: HTMLAnchorElement;
  r: number;
};

export type ContributionTowerArenaHandle = {
  addContribution: (payload: ContributionTowerPayload) => void;
};

function profileInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function normalizeProfileUrl(url: string) {
  if (!url) return "/";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  return `/${url.replace(/^\/+/, "")}`;
}

function randomStoneSize() {
  return 50 + Math.floor(Math.random() * 24);
}

export function blockToContributionPayload(block: {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
}): ContributionTowerPayload {
  return {
    id: block.id,
    name: block.displayName,
    avatar: block.profileImageUrl ?? "",
    profileUrl: `/u/${block.username}`,
  };
}

export function ContributionTowerArena({
  emptyPrefix,
  emptyTopUpLabel,
  emptySuffix,
  initialBlocks = [],
  onContribution,
  registerHandle,
}: {
  emptyPrefix: string;
  emptyTopUpLabel: string;
  emptySuffix: string;
  initialBlocks?: Array<{
    id: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
  }>;
  onContribution?: (name: string) => void;
  registerHandle?: (handle: ContributionTowerArenaHandle | null) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cairnRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stonesRef = useRef<StoneRecord[]>([]);
  const spawnedIdsRef = useRef<Set<string>>(new Set());
  const matterRef = useRef<MatterModule | null>(null);
  const engineRef = useRef<ReturnType<MatterModule["Engine"]["create"]> | null>(null);
  const runnerRef = useRef<ReturnType<MatterModule["Runner"]["create"]> | null>(null);
  const groundRef = useRef<MatterBody | null>(null);
  const leftWallRef = useRef<MatterBody | null>(null);
  const rightWallRef = useRef<MatterBody | null>(null);
  const widthRef = useRef(STAGE_MAX_WIDTH);
  const heightRef = useRef(INITIAL_HEIGHT);
  const growingRef = useRef(false);
  const engineReadyRef = useRef(false);
  const pendingDropsRef = useRef<ContributionTowerPayload[]>([]);
  const initialBlocksRef = useRef(initialBlocks);
  initialBlocksRef.current = initialBlocks;
  const onContributionRef = useRef(onContribution);
  onContributionRef.current = onContribution;

  const [stageHeight, setStageHeight] = useState(INITIAL_HEIGHT);
  const [stageWidth, setStageWidth] = useState(STAGE_MAX_WIDTH);
  const [hasStones, setHasStones] = useState(false);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = widthRef.current;
    canvas.height = heightRef.current;
  }, []);

  const makeBounds = useCallback(() => {
    const Matter = matterRef.current;
    const engine = engineRef.current;
    if (!Matter || !engine) return;

    const W = widthRef.current;
    const H = heightRef.current;
    const boundsOpt = { isStatic: true, friction: 0.65, restitution: 0.03 };

    if (groundRef.current) {
      Matter.Composite.remove(engine.world, [groundRef.current, leftWallRef.current!, rightWallRef.current!]);
    }

    groundRef.current = Matter.Bodies.rectangle(W / 2, H + 40, W + 100, 80, boundsOpt);
    leftWallRef.current = Matter.Bodies.rectangle(-40, H / 2, 80, H * 4, boundsOpt);
    rightWallRef.current = Matter.Bodies.rectangle(W + 40, H / 2, 80, H * 4, boundsOpt);
    Matter.Composite.add(engine.world, [groundRef.current, leftWallRef.current, rightWallRef.current]);
  }, []);

  const tryExpand = useCallback(() => {
    if (growingRef.current || stonesRef.current.length < EXPAND_MIN_STONES) return;

    let topY = Infinity;
    for (const s of stonesRef.current) {
      if (s.body.position.y < topY) topY = s.body.position.y;
    }
    if (topY >= EXPAND_THRESHOLD_Y) return;

    const Matter = matterRef.current;
    if (!Matter) return;

    growingRef.current = true;
    heightRef.current += EXPAND_AMOUNT;
    setStageHeight(heightRef.current);
    syncCanvasSize();

    for (const s of stonesRef.current) {
      Matter.Body.translate(s.body, { x: 0, y: EXPAND_AMOUNT });
    }
    makeBounds();

    window.setTimeout(() => {
      growingRef.current = false;
    }, 800);
  }, [makeBounds, syncCanvasSize]);

  const mountStoneDom = useCallback((payload: ContributionTowerPayload, size: number) => {
    const cairn = cairnRef.current;
    if (!cairn) return null;

    const link = document.createElement("a");
    link.href = normalizeProfileUrl(payload.profileUrl);
    link.className = styles.stoneLink;
    link.setAttribute("aria-label", payload.name);
    link.style.width = `${size}px`;
    link.style.height = `${size}px`;

    const stone = document.createElement("div");
    stone.className = styles.stone;

    if (payload.avatar) {
      const img = document.createElement("img");
      img.className = styles.avatar;
      img.src = payload.avatar;
      img.alt = payload.name || "";
      img.onerror = () => {
        img.remove();
        const fallback = document.createElement("span");
        fallback.className = styles.avatarFallback;
        fallback.textContent = profileInitial(payload.name);
        stone.appendChild(fallback);
      };
      stone.appendChild(img);
    } else {
      const fallback = document.createElement("span");
      fallback.className = styles.avatarFallback;
      fallback.textContent = profileInitial(payload.name);
      stone.appendChild(fallback);
    }

    link.appendChild(stone);
    cairn.appendChild(link);
    return link;
  }, []);

  const insertStoneRef = useRef<
    (payload: ContributionTowerPayload, options?: { fromTop?: boolean }) => boolean
  >(() => false);

  const insertStone = useCallback(
    (payload: ContributionTowerPayload, options?: { fromTop?: boolean }) => {
      const Matter = matterRef.current;
      const engine = engineRef.current;
      if (!Matter || !engine || !engineReadyRef.current) return false;

      const id = payload.id ?? `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      if (spawnedIdsRef.current.has(id)) return true;
      spawnedIdsRef.current.add(id);

      const W = widthRef.current;
      const size = randomStoneSize();
      const r = size / 2;
      const fromTop = options?.fromTop !== false;
      const startX = 60 + Math.random() * Math.max(40, W - 120);
      const startY = fromTop ? -50 : heightRef.current - r - 20 - Math.random() * 80;

      const body = Matter.Bodies.circle(startX, startY, r, {
        restitution: 0.12,
        friction: 0.75,
        frictionAir: 0.018,
        density: 0.0012,
        slop: 0.02,
      });

      if (fromTop) {
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);
      } else {
        Matter.Sleeping.set(body, true);
      }

      Matter.Composite.add(engine.world, body);

      const linkEl = mountStoneDom(payload, size);
      if (!linkEl) {
        Matter.Composite.remove(engine.world, body);
        spawnedIdsRef.current.delete(id);
        return false;
      }

      stonesRef.current.push({ id, body, linkEl, r });
      setHasStones(true);
      if (fromTop) {
        onContributionRef.current?.(payload.name);
      }
      return true;
    },
    [mountStoneDom],
  );

  insertStoneRef.current = insertStone;

  const addContribution = useCallback(
    (payload: ContributionTowerPayload) => {
      if (!engineReadyRef.current) {
        pendingDropsRef.current.push(payload);
        return;
      }
      insertStone(payload, { fromTop: true });
    },
    [insertStone],
  );

  useEffect(() => {
    registerHandle?.({ addContribution });
    return () => registerHandle?.(null);
  }, [addContribution, registerHandle]);

  useEffect(() => {
    const handler = (payload: ContributionTowerPayload) => addContribution(payload);
    window.addContribution = handler;
    return () => {
      if (window.addContribution === handler) {
        delete window.addContribution;
      }
    };
  }, [addContribution]);

  const measureStageWidth = useCallback(() => {
    const wrap = stageRef.current?.parentElement;
    if (!wrap) return;
    const next = Math.min(Math.floor(wrap.clientWidth), STAGE_MAX_WIDTH);
    if (next > 0 && Math.abs(next - widthRef.current) > 1) {
      widthRef.current = next;
      setStageWidth(next);
      syncCanvasSize();
      makeBounds();
    }
  }, [makeBounds, syncCanvasSize]);

  useLayoutEffect(() => {
    measureStageWidth();
    const ro = new ResizeObserver(() => measureStageWidth());
    const wrap = stageRef.current?.parentElement;
    if (wrap) ro.observe(wrap);
    return () => ro.disconnect();
  }, [measureStageWidth]);

  useEffect(() => {
    let cancelled = false;
    let afterUpdateHandler: (() => void) | null = null;

    void import("matter-js").then((Matter) => {
      if (cancelled) return;
      matterRef.current = Matter;

      const engine = Matter.Engine.create({ gravity: { x: 0, y: 0.9 } });
      engine.positionIterations = 10;
      engine.velocityIterations = 8;
      engineRef.current = engine;
      makeBounds();

      const runner = Matter.Runner.create();
      runnerRef.current = runner;
      Matter.Runner.run(runner, engine);

      afterUpdateHandler = () => {
        for (const s of stonesRef.current) {
          const x = s.body.position.x - s.r;
          const y = s.body.position.y - s.r;
          s.linkEl.style.transform = `translate(${x}px, ${y}px) rotate(${s.body.angle}rad)`;
        }
        tryExpand();
      };
      Matter.Events.on(engine, "afterUpdate", afterUpdateHandler);

      engineReadyRef.current = true;

      const pending = pendingDropsRef.current.splice(0);
      for (const item of pending) {
        insertStoneRef.current(item, { fromTop: true });
      }

      initialBlocksRef.current.forEach((block) => {
        insertStoneRef.current(blockToContributionPayload(block), { fromTop: false });
      });

      syncCanvasSize();
    });

    return () => {
      cancelled = true;
      engineReadyRef.current = false;
      spawnedIdsRef.current.clear();
      const Matter = matterRef.current;
      const runner = runnerRef.current;
      const engine = engineRef.current;
      if (Matter && engine && afterUpdateHandler) {
        Matter.Events.off(engine, "afterUpdate", afterUpdateHandler);
      }
      if (Matter && runner) Matter.Runner.stop(runner);
      if (Matter && engine) {
        Matter.Composite.clear(engine.world, false);
        Matter.Engine.clear(engine);
      }
      for (const s of stonesRef.current) {
        s.linkEl.remove();
      }
      stonesRef.current = [];
    };
  }, [makeBounds, syncCanvasSize, tryExpand]);

  return (
    <div className={styles.stageWrap}>
      <div
        ref={stageRef}
        className={styles.stage}
        style={{ width: stageWidth, height: stageHeight }}
        aria-live="polite"
      >
        <canvas ref={canvasRef} className={styles.worldCanvas} aria-hidden />
        <div
          className={`${styles.empty} ${hasStones ? styles.emptyHide : ""}`}
          aria-hidden={hasStones}
        >
          {emptyPrefix}
          <br />
          <Link href="/wallet" className={styles.emptyLink}>
            {emptyTopUpLabel}
          </Link>
          {emptySuffix}
        </div>
        <div ref={cairnRef} className={styles.cairn} />
      </div>
    </div>
  );
}

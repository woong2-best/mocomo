"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { ContributionTowerPayload } from "@/components/contribution-tower/contribution-tower-global";
import styles from "@/components/contribution-tower/contribution-tower-rock.module.css";

const STONE_DIAMETER = 72;
const STONE_RADIUS = STONE_DIAMETER / 2;
const MIN_VIEW_HEIGHT = 448;
const EXPAND_HEADROOM = 96;
const EXPAND_STEP = 220;
const WALL_THICKNESS = 48;
const SPAWN_Y = 56;

type MatterModule = typeof import("matter-js");

type StoneRecord = {
  id: string;
  bodyId: number;
  linkEl: HTMLAnchorElement;
};

export type ContributionTowerArenaHandle = {
  addContribution: (payload: ContributionTowerPayload) => void;
  seedContribution: (payload: ContributionTowerPayload, index: number) => void;
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
  emptyMessage,
  initialBlocks = [],
  onLocalCountChange,
  registerHandle,
}: {
  emptyMessage: string;
  initialBlocks?: Array<{
    id: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
  }>;
  onLocalCountChange?: (count: number) => void;
  registerHandle?: (handle: ContributionTowerArenaHandle | null) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const stonesRef = useRef<Map<string, StoneRecord>>(new Map());
  const spawnedIdsRef = useRef<Set<string>>(new Set());
  const engineReadyRef = useRef(false);
  const matterRef = useRef<MatterModule | null>(null);
  const engineRef = useRef<ReturnType<MatterModule["Engine"]["create"]> | null>(null);
  const runnerRef = useRef<ReturnType<MatterModule["Runner"]["create"]> | null>(null);
  const boundaryBodiesRef = useRef<ReturnType<MatterModule["Bodies"]["rectangle"]>[]>([]);
  const worldHeightRef = useRef(MIN_VIEW_HEIGHT);
  const worldWidthRef = useRef(320);
  const rafRef = useRef<number | null>(null);
  const pendingDropsRef = useRef<ContributionTowerPayload[]>([]);
  const pendingSeedsRef = useRef<Array<{ payload: ContributionTowerPayload; index: number }>>([]);
  const initialBlocksRef = useRef(initialBlocks);
  initialBlocksRef.current = initialBlocks;

  const [worldHeight, setWorldHeight] = useState(MIN_VIEW_HEIGHT);
  const [stoneCount, setStoneCount] = useState(0);

  const bumpCount = useCallback(
    (next: number) => {
      setStoneCount(next);
      onLocalCountChange?.(next);
    },
    [onLocalCountChange],
  );

  const groundY = useCallback(() => worldHeightRef.current - STONE_RADIUS - 8, []);

  const rebuildBoundaries = useCallback(() => {
    const Matter = matterRef.current;
    const engine = engineRef.current;
    if (!Matter || !engine) return;

    for (const body of boundaryBodiesRef.current) {
      Matter.Composite.remove(engine.world, body);
    }
    boundaryBodiesRef.current = [];

    const width = worldWidthRef.current;
    const height = worldHeightRef.current;
    const floorY = height - STONE_RADIUS - 8;

    const ground = Matter.Bodies.rectangle(width / 2, floorY + 24, width + WALL_THICKNESS * 2, 48, {
      isStatic: true,
      label: "ground",
      friction: 0.95,
    });
    const leftWall = Matter.Bodies.rectangle(-WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 4, {
      isStatic: true,
      label: "left-wall",
    });
    const rightWall = Matter.Bodies.rectangle(
      width + WALL_THICKNESS / 2,
      height / 2,
      WALL_THICKNESS,
      height * 4,
      { isStatic: true, label: "right-wall" },
    );

    boundaryBodiesRef.current = [ground, leftWall, rightWall];
    Matter.Composite.add(engine.world, boundaryBodiesRef.current);
  }, []);

  const expandWorldUp = useCallback(() => {
    const Matter = matterRef.current;
    const engine = engineRef.current;
    if (!Matter || !engine) return;

    worldHeightRef.current += EXPAND_STEP;
    const delta = EXPAND_STEP;
    for (const body of Matter.Composite.allBodies(engine.world)) {
      Matter.Body.setPosition(body, { x: body.position.x, y: body.position.y + delta });
    }
    setWorldHeight(worldHeightRef.current);
    rebuildBoundaries();
  }, [rebuildBoundaries]);

  const maybeExpandWorld = useCallback(() => {
    const Matter = matterRef.current;
    const engine = engineRef.current;
    if (!Matter || !engine) return;

    let minTop = Infinity;
    for (const body of Matter.Composite.allBodies(engine.world)) {
      if (body.isStatic) continue;
      if (body.bounds.min.y < minTop) minTop = body.bounds.min.y;
    }
    if (minTop === Infinity) return;
    if (minTop < EXPAND_HEADROOM) expandWorldUp();
  }, [expandWorldUp]);

  const syncDom = useCallback(() => {
    const Matter = matterRef.current;
    const engine = engineRef.current;
    if (!Matter || !engine) return;

    for (const stone of stonesRef.current.values()) {
      const body = Matter.Composite.allBodies(engine.world).find((b) => b.id === stone.bodyId);
      if (!body) continue;
      const x = body.position.x - STONE_RADIUS;
      const y = body.position.y - STONE_RADIUS;
      stone.linkEl.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad)`;
    }
    maybeExpandWorld();
    rafRef.current = requestAnimationFrame(syncDom);
  }, [maybeExpandWorld]);

  const createStoneDom = useCallback((payload: ContributionTowerPayload) => {
    const worldEl = worldRef.current;
    if (!worldEl) return null;

    const link = document.createElement("a");
    link.href = normalizeProfileUrl(payload.profileUrl);
    link.className = styles.stoneLink;
    link.setAttribute("aria-label", payload.name);
    link.style.width = `${STONE_DIAMETER}px`;
    link.style.height = `${STONE_DIAMETER}px`;

    const rock = document.createElement("div");
    rock.className = styles.rock;

    if (payload.avatar) {
      const img = document.createElement("img");
      img.className = styles.avatar;
      img.src = payload.avatar;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      rock.appendChild(img);
    } else {
      const fallback = document.createElement("span");
      fallback.className = styles.avatarFallback;
      fallback.textContent = profileInitial(payload.name);
      rock.appendChild(fallback);
    }

    link.appendChild(rock);
    worldEl.appendChild(link);
    return link;
  }, []);

  const insertStoneRef = useRef<
    (payload: ContributionTowerPayload, options: { dropFromTop: boolean; seedIndex?: number }) => boolean
  >(() => false);

  const insertStone = useCallback(
    (
      payload: ContributionTowerPayload,
      options: { dropFromTop: boolean; seedIndex?: number },
    ) => {
      const Matter = matterRef.current;
      const engine = engineRef.current;
      if (!Matter || !engine || !engineReadyRef.current) return false;

      const id = payload.id ?? `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      if (spawnedIdsRef.current.has(id)) return true;
      spawnedIdsRef.current.add(id);

      const width = worldWidthRef.current;
      const x = STONE_RADIUS + 12 + Math.random() * Math.max(24, width - STONE_DIAMETER - 24);
      let y = SPAWN_Y;
      if (!options.dropFromTop) {
        const layer = (options.seedIndex ?? 0) % 8;
        const stackLift = Math.floor((options.seedIndex ?? 0) / 8) * (STONE_RADIUS * 0.85);
        y = groundY() - STONE_RADIUS - layer * (STONE_RADIUS * 0.55) - stackLift - Math.random() * 12;
      }

      const body = Matter.Bodies.circle(x, y, STONE_RADIUS, {
        restitution: 0.12,
        friction: 0.65,
        frictionStatic: 0.75,
        density: 0.0022,
        label: `stone-${id}`,
      });

      if (!options.dropFromTop) {
        Matter.Sleeping.set(body, true);
      }

      Matter.Composite.add(engine.world, body);

      const linkEl = createStoneDom(payload);
      if (!linkEl) {
        Matter.Composite.remove(engine.world, body);
        spawnedIdsRef.current.delete(id);
        return false;
      }

      stonesRef.current.set(id, { id, bodyId: body.id, linkEl });
      bumpCount(stonesRef.current.size);
      return true;
    },
    [bumpCount, createStoneDom, groundY],
  );

  insertStoneRef.current = insertStone;

  const flushPending = useCallback(() => {
    const seeds = pendingSeedsRef.current.splice(0);
    for (const item of seeds) {
      insertStone(item.payload, { dropFromTop: false, seedIndex: item.index });
    }
    const drops = pendingDropsRef.current.splice(0);
    for (const item of drops) {
      insertStone(item, { dropFromTop: true });
    }
  }, [insertStone]);

  const addContribution = useCallback(
    (payload: ContributionTowerPayload) => {
      if (!engineReadyRef.current) {
        pendingDropsRef.current.push(payload);
        return;
      }
      insertStone(payload, { dropFromTop: true });
    },
    [insertStone],
  );

  const seedContribution = useCallback(
    (payload: ContributionTowerPayload, index: number) => {
      if (!engineReadyRef.current) {
        pendingSeedsRef.current.push({ payload, index });
        return;
      }
      insertStone(payload, { dropFromTop: false, seedIndex: index });
    },
    [insertStone],
  );

  useEffect(() => {
    registerHandle?.({ addContribution, seedContribution });
    return () => registerHandle?.(null);
  }, [addContribution, registerHandle, seedContribution]);

  useEffect(() => {
    const handler = (payload: ContributionTowerPayload) => addContribution(payload);
    window.addContribution = handler;
    return () => {
      if (window.addContribution === handler) {
        delete window.addContribution;
      }
    };
  }, [addContribution]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.max(240, Math.floor(entry.contentRect.width - 24));
      if (Math.abs(nextWidth - worldWidthRef.current) > 2) {
        worldWidthRef.current = nextWidth;
        rebuildBoundaries();
      }
    });
    ro.observe(shell);
    worldWidthRef.current = Math.max(240, Math.floor(shell.clientWidth - 24));
    return () => ro.disconnect();
  }, [rebuildBoundaries]);

  useEffect(() => {
    let cancelled = false;

    void import("matter-js").then((Matter) => {
      if (cancelled) return;
      matterRef.current = Matter;

      const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.05, scale: 0.0016 } });
      engineRef.current = engine;
      rebuildBoundaries();

      const runner = Matter.Runner.create();
      runnerRef.current = runner;
      Matter.Runner.run(runner, engine);

      engineReadyRef.current = true;
      flushPending();
      initialBlocksRef.current.forEach((block, index) => {
        insertStoneRef.current(blockToContributionPayload(block), {
          dropFromTop: false,
          seedIndex: index,
        });
      });
      rafRef.current = requestAnimationFrame(syncDom);
    });

    return () => {
      cancelled = true;
      engineReadyRef.current = false;
      spawnedIdsRef.current.clear();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      const Matter = matterRef.current;
      const runner = runnerRef.current;
      const engine = engineRef.current;
      if (Matter && runner) Matter.Runner.stop(runner);
      if (Matter && engine) {
        Matter.Composite.clear(engine.world, false);
        Matter.Engine.clear(engine);
      }
      for (const stone of stonesRef.current.values()) {
        stone.linkEl.remove();
      }
      stonesRef.current.clear();
    };
  }, [flushPending, rebuildBoundaries, syncDom]);

  const worldStyle: CSSProperties = {
    height: worldHeight,
    minHeight: MIN_VIEW_HEIGHT,
  };

  return (
    <div ref={shellRef} className={styles.arenaShell}>
      <div ref={worldRef} className={styles.physicsWorld} style={worldStyle} aria-live="polite">
        {stoneCount === 0 ? <p className={styles.emptyOverlay}>{emptyMessage}</p> : null}
      </div>
    </div>
  );
}

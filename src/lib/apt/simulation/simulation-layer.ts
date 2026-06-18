"use client";

import * as THREE from "three";
import { FLOOR_HEIGHT } from "@/lib/apt/constants";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { createInitialSnapshot, tickSimulation } from "./engine";
import { syncFurnitureGroup } from "./furniture-meshes";
import type { FurnitureItem, ResidentAgent, SimulationSnapshot } from "./types";
import { AptVrmAgent } from "./vrm-agent";

export type SimulationChangeHandler = (snapshot: SimulationSnapshot) => void;

export class AptSimulationLayer {
  private agentRoot = new THREE.Group();
  private furnitureRoot = new THREE.Group();
  private agents = new Map<string, AptVrmAgent>();
  private snapshot: SimulationSnapshot | null = null;
  private floor = 7;
  private homeFloor = 7;
  private rooms: AptRoom[] = [];
  private onChange: SimulationChangeHandler | null = null;
  private enabled = false;

  constructor(private building: THREE.Group) {
    this.building.add(this.agentRoot);
    this.building.add(this.furnitureRoot);
  }

  setOnChange(handler: SimulationChangeHandler | null) {
    this.onChange = handler;
  }

  async bootstrap(
    floor: number,
    rooms: AptRoom[],
    residents: ResidentAgent[],
    furniture: FurnitureItem[]
  ) {
    this.floor = floor;
    this.homeFloor = floor;
    this.rooms = rooms;
    this.snapshot = createInitialSnapshot(residents, furniture, rooms);
    this.enabled = true;
    this.agentRoot.visible = true;
    await this.ensureAgents(residents);
    syncFurnitureGroup(this.furnitureRoot, furniture, rooms);
    this.onChange?.(this.snapshot);
  }

  updateContext(floor: number, rooms: AptRoom[]) {
    this.floor = floor;
    this.rooms = rooms;
    this.agentRoot.visible = floor === this.homeFloor;
    if (this.snapshot) syncFurnitureGroup(this.furnitureRoot, this.snapshot.furniture, rooms);
  }

  setFurniture(furniture: FurnitureItem[]) {
    if (!this.snapshot) return;
    this.snapshot = { ...this.snapshot, furniture };
    syncFurnitureGroup(this.furnitureRoot, furniture, this.rooms);
    this.onChange?.(this.snapshot);
  }

  getSnapshot() {
    return this.snapshot;
  }

  private async ensureAgents(residents: ResidentAgent[]) {
    const ids = new Set(residents.map((r) => r.id));
    for (const [id, agent] of this.agents) {
      if (!ids.has(id)) {
        agent.dispose();
        this.agentRoot.remove(agent.root);
        this.agents.delete(id);
      }
    }
    for (const r of residents) {
      if (!this.agents.has(r.id)) {
        const agent = new AptVrmAgent(r.vrmUrl);
        try {
          await agent.load();
          this.agents.set(r.id, agent);
          this.agentRoot.add(agent.root);
        } catch {
          /* skip failed loads */
        }
      }
    }
  }

  tick(dt: number) {
    if (!this.enabled || !this.snapshot) return;
    this.snapshot = tickSimulation(this.snapshot, this.rooms, dt);
    const floorY = (this.floor - 1) * FLOOR_HEIGHT;

    for (const r of this.snapshot.residents) {
      const agent = this.agents.get(r.id);
      if (!agent) continue;
      const walking = r.activity === "walk" || Math.hypot(r.targetX - r.x, r.targetZ - r.z) > 0.1;
      agent.update(dt, r.x, floorY + 0.14, r.z, r.rotation, walking);
    }

    syncFurnitureGroup(this.furnitureRoot, this.snapshot.furniture, this.rooms);
    this.onChange?.(this.snapshot);
  }

  dispose() {
    for (const agent of this.agents.values()) {
      agent.dispose();
    }
    this.agents.clear();
    this.building.remove(this.agentRoot);
    this.building.remove(this.furnitureRoot);
    this.furnitureRoot.clear();
    this.agentRoot.clear();
    this.snapshot = null;
    this.enabled = false;
  }
}

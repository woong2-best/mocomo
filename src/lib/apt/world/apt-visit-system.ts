"use client";

import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import type { DoorState } from "./world-types";

export type VisitTarget = {
  userId: string;
  displayName: string;
  homeFloor: number;
  rooms: AptRoom[];
  homeState: BondeeHomeState;
  doorOpen: boolean;
};

export type VisitPhase =
  | "idle"
  | "knocking"
  | "ringing"
  | "waiting"
  | "granted"
  | "denied";

export class AptVisitSystem {
  private target: VisitTarget | null = null;
  private phase: VisitPhase = "idle";
  private phaseTime = 0;
  private doorState: DoorState = "closed";

  getTarget() {
    return this.target;
  }

  getPhase() {
    return this.phase;
  }

  getDoorState() {
    return this.doorState;
  }

  isVisiting() {
    return this.target !== null;
  }

  startVisit(target: VisitTarget) {
    this.target = target;
    this.phase = "idle";
    this.phaseTime = 0;
    this.doorState = target.doorOpen ? "open" : "closed";
  }

  clearVisit() {
    this.target = null;
    this.phase = "idle";
    this.phaseTime = 0;
    this.doorState = "closed";
  }

  knock() {
    if (!this.target || this.doorState === "open") return;
    this.phase = "knocking";
    this.phaseTime = 0;
  }

  ringBell() {
    if (!this.target || this.doorState === "open") return;
    this.phase = "ringing";
    this.phaseTime = 0;
  }

  tick(dt: number): { phase: VisitPhase; doorState: DoorState; message?: string } {
    if (!this.target) return { phase: "idle", doorState: this.doorState };

    this.phaseTime += dt;

    if (this.phase === "knocking" || this.phase === "ringing") {
      if (this.phaseTime >= 0.55) {
        this.phase = "waiting";
        this.phaseTime = 0;
      }
    }

    if (this.phase === "waiting") {
      if (this.target.doorOpen) {
        this.doorState = "open";
        this.phase = "granted";
        return { phase: "granted", doorState: "open", message: `${this.target.displayName}님이 문을 열어주었습니다` };
      }
      if (this.phaseTime >= 2.2) {
        this.doorState = "locked";
        this.phase = "denied";
        return { phase: "denied", doorState: "locked", message: "현관문이 잠겨 있습니다" };
      }
    }

    return { phase: this.phase, doorState: this.doorState };
  }

  canEnter(): boolean {
    return this.doorState === "open";
  }
}

"use client";

import { ElevatorDoorAnimator, playElevatorDing } from "@/lib/apt/bondee/elevator-door";
import * as THREE from "three";

type Phase = "idle" | "doors-opening" | "enter" | "doors-closing" | "riding" | "arriving" | "doors-opening-exit" | "exit";

/** 복도 엘리베이터 — 문 열림 → 탑승 → 닫힘 → 이동 연출 → 도착 → 문 열림 → 하차 */
export class CorridorElevatorSequence {
  private elevDoors = new ElevatorDoorAnimator();
  private phase: Phase = "idle";
  private phaseTime = 0;
  private fromFloor = 1;
  private toFloor = 1;
  private onComplete: (() => void) | null = null;
  private hall: THREE.Object3D | null = null;
  private scene: THREE.Scene | null = null;

  bindHall(hall: THREE.Object3D | null, scene?: THREE.Scene) {
    this.hall = hall;
    this.scene = scene ?? null;
    this.elevDoors.bindHall(hall);
    const car = hall?.getObjectByName("elevator-hall-interior") ?? hall?.getObjectByName("elevator-car-interior");
    if (car) this.elevDoors.bindCar(car);
    this.elevDoors.setTarget(1);
  }

  get active() {
    return this.phase !== "idle";
  }

  start(fromFloor: number, toFloor: number, onComplete: () => void) {
    this.fromFloor = fromFloor;
    this.toFloor = toFloor;
    this.onComplete = onComplete;
    this.phase = "doors-opening";
    this.phaseTime = 0;
    this.elevDoors.setTarget(0);
  }

  tick(dt: number): boolean {
    if (this.phase === "idle") return false;
    this.phaseTime += dt;
    let anim = this.elevDoors.tick(dt);

    switch (this.phase) {
      case "doors-opening":
        if (this.phaseTime >= 0.55) {
          this.phase = "enter";
          this.phaseTime = 0;
        }
        break;
      case "enter":
        if (this.phaseTime >= 0.45) {
          this.phase = "doors-closing";
          this.phaseTime = 0;
          this.elevDoors.setTarget(1);
        }
        break;
      case "doors-closing":
        if (this.phaseTime >= 0.5) {
          this.phase = "riding";
          this.phaseTime = 0;
        }
        break;
      case "riding": {
        const dur = Math.min(4, 0.8 + Math.abs(this.toFloor - this.fromFloor) * 0.28);
        if (this.phaseTime >= dur) {
          this.phase = "arriving";
          this.phaseTime = 0;
          if (this.scene && this.hall) {
            const p = new THREE.Vector3();
            this.hall.getWorldPosition(p);
            playElevatorDing(this.scene, p);
          }
        }
        anim = true;
        break;
      }
      case "arriving":
        if (this.phaseTime >= 0.2) {
          this.phase = "doors-opening-exit";
          this.phaseTime = 0;
          this.elevDoors.setTarget(0);
        }
        break;
      case "doors-opening-exit":
        if (this.phaseTime >= 0.55) {
          this.phase = "exit";
          this.phaseTime = 0;
        }
        break;
      case "exit":
        if (this.phaseTime >= 0.4) {
          this.phase = "idle";
          this.onComplete?.();
          this.onComplete = null;
        }
        break;
    }
    return anim || this.phase !== "idle";
  }

  getPhaseLabel(): string {
    switch (this.phase) {
      case "doors-opening":
      case "doors-opening-exit":
        return "엘리베이터 문 열림";
      case "enter":
        return "엘리베이터 탑승";
      case "doors-closing":
        return "엘리베이터 문 닫힘";
      case "riding":
        return `${Math.round(this.fromFloor)}층 → ${Math.round(this.toFloor)}층 이동 중`;
      case "arriving":
        return `${Math.round(this.toFloor)}층 도착`;
      case "exit":
        return "엘리베이터 하차";
      default:
        return "";
    }
  }
}

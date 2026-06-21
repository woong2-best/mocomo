"use client";

import * as THREE from "three";
import type { AptCommunityFeed } from "@/lib/apt/presence-types";
import { emptyAptDailyLoop } from "@/lib/apt/apt-daily-loop";
import { buildSocialSnapshot, type AptSocialSnapshot } from "./apt-social-presence";
import {
  buildHomeDoorSocialTraces,
  buildLobbySocialBoards,
  buildPlazaSocialLayer,
} from "./apt-social-meshes";

const EMPTY_FEED: AptCommunityFeed = {
  occupants: [],
  recentVisitorsToHome: [],
  guestbookNames: [],
  popularHome: null,
  visitorRanking: [],
  mostVisitedToday: null,
  mostActiveFloor: null,
  plazaPerformers: [],
  elevatorBusy: false,
  mailboxUnread: 0,
  daily: emptyAptDailyLoop(),
};

/** APT 사회적 존재감 — 실제 데이터 3D 레이어 */
export class AptSocialLayer {
  private snapshot: AptSocialSnapshot;
  private districtGroup: THREE.Group | null = null;
  private lobbyGroup: THREE.Group | null = null;
  private corridorTraces: THREE.Group | null = null;
  private liveBadges: THREE.Mesh[] = [];

  constructor(homeFloor: number, feed: AptCommunityFeed = EMPTY_FEED, ownUserId?: string | null) {
    this.snapshot = buildSocialSnapshot(feed, homeFloor, ownUserId);
  }

  getSnapshot() {
    return this.snapshot;
  }

  update(feed: AptCommunityFeed, homeFloor: number, ownUserId?: string | null) {
    this.snapshot = buildSocialSnapshot(feed, homeFloor, ownUserId);
  }

  getActivityForTower(homeFloor: number, homeDoorOpen: boolean) {
    return {
      homeFloor,
      homeDoorOpen,
      onlineFloors: this.snapshot.onlineFloors,
      windowLifeByFloor: this.snapshot.windowLifeByFloor,
      streamingFloors: this.snapshot.streamingFloors,
    };
  }

  applyToDistrict(root: THREE.Group) {
    this.clearDistrict();
    this.districtGroup = buildPlazaSocialLayer(this.snapshot);
    root.add(this.districtGroup);
    this.collectLiveBadges(root);
  }

  applyToLobby(lobbyRoot: THREE.Group) {
    this.clearLobby();
    this.lobbyGroup = buildLobbySocialBoards(this.snapshot);
    lobbyRoot.add(this.lobbyGroup);
    this.collectLiveBadges(lobbyRoot);
  }

  applyToHomeDoor(doorGroup: THREE.Group) {
    this.clearCorridorTraces();
    this.corridorTraces = buildHomeDoorSocialTraces(this.snapshot);
    doorGroup.add(this.corridorTraces);
  }

  clearDistrict() {
    if (this.districtGroup?.parent) this.districtGroup.parent.remove(this.districtGroup);
    this.districtGroup = null;
  }

  clearLobby() {
    if (this.lobbyGroup?.parent) this.lobbyGroup.parent.remove(this.lobbyGroup);
    this.lobbyGroup = null;
  }

  clearCorridorTraces() {
    if (this.corridorTraces?.parent) this.corridorTraces.parent.remove(this.corridorTraces);
    this.corridorTraces = null;
  }

  clearAll() {
    this.clearDistrict();
    this.clearLobby();
    this.clearCorridorTraces();
    this.liveBadges = [];
  }

  private collectLiveBadges(root: THREE.Object3D) {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (
        obj.name === "hero-window-stream-live" ||
        obj.name === "social-online-badge" ||
        obj.name === "social-elevator-busy"
      ) {
        this.liveBadges.push(obj);
      }
    });
  }

  rescanLiveBadges(root: THREE.Object3D) {
    this.liveBadges = [];
    this.collectLiveBadges(root);
  }

  tick(phase: number): boolean {
    let anim = false;
    for (let i = 0; i < this.liveBadges.length; i++) {
      const mesh = this.liveBadges[i];
      const mat = mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
      if (mesh.name === "social-elevator-busy" && "emissiveIntensity" in mat) {
        mat.emissiveIntensity = 0.35 + Math.sin(phase * 6 + i) * 0.25;
        anim = true;
        continue;
      }
      if (!("opacity" in mat)) continue;
      mat.transparent = true;
      mat.opacity = 0.72 + Math.sin(phase * 5 + i) * 0.25;
      anim = true;
    }
    return anim;
  }

  dispose() {
    this.clearAll();
  }
}

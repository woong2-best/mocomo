"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { Prisma } from "@prisma/client";
import { getCachedCurrentUser, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { APT_GAME_PATH } from "@/lib/site-routes";
import { getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { DEFAULT_BONDEE_HOME, type BondeeHomeState, type BondeePlacedItem } from "@/lib/apt/bondee/types";
import { bondeeKindToStickerId } from "@/lib/apt/isometric/catalog-map";
import { suggestMarketPriceGold } from "@/lib/apt/economy/market-service";
import {
  defaultResidents,
  type ResidentAgent,
} from "@/lib/apt/simulation/types";

const ACTIVE = "ACTIVE";
const PENDING = "PENDING";
const ACCEPTED = "ACCEPTED";
const REJECTED = "REJECTED";
const CANCELLED = "CANCELLED";
const ENDED = "ENDED";

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw && typeof raw === "object") return raw as T;
  return fallback;
}

function parseBondee(raw: unknown): BondeeHomeState {
  const sim = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const bondee = sim.bondee;
  if (bondee && typeof bondee === "object" && "items" in bondee) {
    return bondee as BondeeHomeState;
  }
  return DEFAULT_BONDEE_HOME;
}

function getProfileRooms(row: { floorPlans: unknown; homeFloor: number }): AptRoom[] {
  const plans = parseJson<Record<number, AptRoom[]>>(row.floorPlans, {
    [row.homeFloor]: createDefaultFloorPlan().rooms,
  });
  return getRoomsForFloor(plans, row.homeFloor);
}

function itemOwner(item: BondeePlacedItem, hostId: string) {
  return item.ownerId ?? hostId;
}

function sellingListingRows(params: {
  sellerId: string;
  items: BondeePlacedItem[];
  source: "COHAB_MOVE_IN" | "COHAB_MOVE_OUT";
}) {
  return params.items.map((item) => {
    const stickerTypeId = bondeeKindToStickerId(item.kind);
    return {
      sellerId: params.sellerId,
      itemId: item.id,
      itemKind: item.kind,
      stickerTypeId,
      roomId: item.roomId,
      itemData: item as unknown as Prisma.InputJsonValue,
      source: params.source,
      status: "SELLING",
      priceGold: suggestMarketPriceGold(stickerTypeId),
      priceKrw: 0,
    };
  });
}

function saleSummary(count: number) {
  if (count <= 0) return "??? ??????? ?????? ????????";
  return `?? ?????${count}??? APT ???????? ??? ???????????`;
}

function findEmptyBedroom(params: {
  hostId: string;
  rooms: AptRoom[];
  home: BondeeHomeState;
  occupiedRoomIds: string[];
}) {
  const occupied = new Set(params.occupiedRoomIds);
  for (const item of params.home.items) {
    occupied.add(item.roomId);
  }
  return params.rooms.find((room) => room.type === "bedroom" && !occupied.has(room.id)) ?? null;
}

async function getActiveCohabitationForUser(userId: string) {
  return db.aptCohabitant.findFirst({
    where: { residentId: userId, status: ACTIVE, endedAt: null },
    include: {
      host: {
        select: {
          id: true,
          username: true,
          name: true,
          aptProfile: true,
        },
      },
    },
  });
}

export async function resolveAptHomeOwnerId(userId: string) {
  const cohab = await getActiveCohabitationForUser(userId);
  return cohab?.hostId ?? userId;
}

export async function canVisitAptHome(hostUserId: string, viewerUserId?: string | null) {
  if (!viewerUserId) return false;
  if (hostUserId === viewerUserId) return true;

  const [hostProfile, viewerToHost, hostToViewer, block] = await Promise.all([
    db.aptProfile.findUnique({
      where: { userId: hostUserId },
      select: { homePublic: true, moveInCompletedAt: true },
    }),
    db.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerUserId, followingId: hostUserId } },
      select: { id: true },
    }),
    db.follow.findUnique({
      where: { followerId_followingId: { followerId: hostUserId, followingId: viewerUserId } },
      select: { id: true },
    }),
    db.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: hostUserId, blockedId: viewerUserId },
          { blockerId: viewerUserId, blockedId: hostUserId },
        ],
      },
      select: { id: true },
    }),
  ]);

  return !!hostProfile?.moveInCompletedAt && !!hostProfile.homePublic && !!viewerToHost && !!hostToViewer && !block;
}

export async function mergeOwnedBondeeState(params: {
  existing: BondeeHomeState;
  incoming: BondeeHomeState;
  userId: string;
  hostId: string;
}) {
  const existingById = new Map(params.existing.items.map((item) => [item.id, item]));
  const incomingById = new Map(params.incoming.items.map((item) => [item.id, item]));

  const preserved = params.existing.items.filter((item) => {
    const owner = itemOwner(item, params.hostId);
    return owner !== params.userId;
  });

  const ownedIncoming = params.incoming.items
    .filter((item) => {
      const previous = existingById.get(item.id);
      if (!previous) return true;
      return itemOwner(previous, params.hostId) === params.userId;
    })
    .map((item) => ({ ...item, ownerId: params.userId }));

  const ownedIds = new Set(ownedIncoming.map((item) => item.id));
  const nextItems = [
    ...preserved.filter((item) => !ownedIds.has(item.id)),
    ...ownedIncoming,
  ];

  const next = { ...params.incoming, items: nextItems };
  if (params.userId !== params.hostId) {
    next.avatar = params.existing.avatar;
    next.identity = params.existing.identity;
  }
  return next;
}

async function getHostMoveInContext(hostId: string) {
  const [hostProfile, activeCohabs] = await Promise.all([
    db.aptProfile.findUnique({
      where: { userId: hostId },
      include: { user: { select: { id: true, username: true, name: true } } },
    }),
    db.aptCohabitant.findMany({
      where: { hostId, status: ACTIVE, endedAt: null },
      include: { resident: { select: { id: true, username: true, name: true } } },
    }),
  ]);
  if (!hostProfile?.moveInCompletedAt || hostProfile.housingType !== "apartment") {
    return { error: "??? ????????????????? ?????????????." } as const;
  }
  if (activeCohabs.length >= 1) {
    return { error: "?? ??? ???????? ??????? 2????????" } as const;
  }

  const rooms = getProfileRooms(hostProfile);
  const home = parseBondee(hostProfile.simulationState);
  const emptyBedroom = findEmptyBedroom({
    hostId,
    rooms,
    home,
    occupiedRoomIds: activeCohabs.map((row) => row.roomId),
  });

  if (!emptyBedroom) {
    return { error: "??????? ????? ?????? ???????? ???? ????????" } as const;
  }

  return { hostProfile, activeCohabs, emptyBedroom, home, rooms } as const;
}

export async function requestAptCohabitation(hostId: string, message?: string) {
  const user = await requireAuth();
  if (user.id === hostId) return { error: "?? ??????? ?????????????." };

  const [alreadyLiving, reciprocalFollow, block] = await Promise.all([
    db.aptCohabitant.findFirst({
      where: {
        OR: [{ residentId: user.id }, { hostId: user.id }],
        status: ACTIVE,
        endedAt: null,
      },
      select: { id: true },
    }),
    Promise.all([
      db.follow.findUnique({
        where: { followerId_followingId: { followerId: user.id, followingId: hostId } },
        select: { id: true },
      }),
      db.follow.findUnique({
        where: { followerId_followingId: { followerId: hostId, followingId: user.id } },
        select: { id: true },
      }),
    ]),
    db.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedId: hostId },
          { blockerId: hostId, blockedId: user.id },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (alreadyLiving) return { error: "???? ??? ?? ?? ??????." };
  if (!reciprocalFollow[0] || !reciprocalFollow[1]) {
    return { error: "??? ????? ??? ?????? ????????????????." };
  }
  if (block) return { error: "?? ?????? ??? ??????? ????????." };

  const context = await getHostMoveInContext(hostId);
  if ("error" in context) return context;

  const existing = await db.aptCohabitationRequest.findFirst({
    where: { requesterId: user.id, hostId, status: PENDING },
    select: { id: true },
  });
  if (existing) return { ok: true as const, requestId: existing.id, alreadyPending: true };

  const request = await db.aptCohabitationRequest.create({
    data: {
      requesterId: user.id,
      hostId,
      roomId: context.emptyBedroom.id,
      message: message?.trim() || null,
    },
  });

  await createNotification({
    userId: hostId,
    actorId: user.id,
    type: "apt_cohab_request",
    title: "??? ???",
    body: `${user.name ?? user.username}??? ${context.emptyBedroom.label} ??????????????.`,
    link: "/apt/cohabitation",
  });

  revalidatePath("/apt/cohabitation");
  return { ok: true as const, requestId: request.id };
}

export async function acceptAptCohabitationRequest(input: FormData | string) {
  const user = await requireAuth();
  const requestId = typeof input === "string" ? input : String(input.get("requestId") ?? "");
  if (!requestId) return { error: "??? ??????? ????????." };

  const request = await db.aptCohabitationRequest.findUnique({
    where: { id: requestId },
    include: {
      requester: { select: { id: true, username: true, name: true, countryCode: true } },
      host: { select: { id: true, username: true, name: true } },
    },
  });
  if (!request || request.hostId !== user.id || request.status !== PENDING) {
    return { error: "?????????? ????????" };
  }

  const context = await getHostMoveInContext(user.id);
  if ("error" in context) return context;

  const roomId = context.emptyBedroom.id;
  const requesterProfile = await db.aptProfile.findUnique({ where: { userId: request.requesterId } });
  const requesterHome = requesterProfile ? parseBondee(requesterProfile.simulationState) : DEFAULT_BONDEE_HOME;
  const requesterSaleItems = requesterHome.items.map((item) => ({
    ...item,
    ownerId: request.requesterId,
  }));
  const residents = parseJson<ResidentAgent[]>(
    context.hostProfile.residents,
    defaultResidents({ userId: user.id, displayName: user.name ?? user.username })
  );
  const nextResidents: ResidentAgent[] = [
    ...residents.filter((r) => r.userId !== request.requesterId),
    ...defaultResidents({
      userId: request.requesterId,
      displayName: request.requester.name ?? request.requester.username,
    }),
  ];

  await db.$transaction(async (tx) => {
    await tx.aptCohabitationRequest.update({
      where: { id: request.id },
      data: { status: ACCEPTED, roomId, respondedAt: new Date() },
    });
    await tx.aptCohabitationRequest.updateMany({
      where: {
        requesterId: request.requesterId,
        status: PENDING,
        id: { not: request.id },
      },
      data: { status: CANCELLED, respondedAt: new Date() },
    });
    await tx.aptCohabitant.create({
      data: {
        hostId: user.id,
        residentId: request.requesterId,
        roomId,
      },
    });

    await tx.aptProfile.update({
      where: { userId: user.id },
      data: { residents: nextResidents as unknown as Prisma.InputJsonValue },
    });

    await tx.aptProfile.upsert({
      where: { userId: request.requesterId },
      create: {
        userId: request.requesterId,
        housingType: "cohabitant",
        countryCode: context.hostProfile.countryCode,
        latitude: context.hostProfile.latitude,
        longitude: context.hostProfile.longitude,
        regionLabel: context.hostProfile.regionLabel,
        homeFloor: context.hostProfile.homeFloor,
        moveInCompletedAt: new Date(),
        furniture: [],
        simulationState: {},
      },
      update: {
        housingType: "cohabitant",
        countryCode: context.hostProfile.countryCode,
        latitude: context.hostProfile.latitude,
        longitude: context.hostProfile.longitude,
        regionLabel: context.hostProfile.regionLabel,
        homeFloor: context.hostProfile.homeFloor,
        furniture: [],
        simulationState: {},
        moveInCompletedAt: new Date(),
        homePublic: false,
      },
    });

    if (requesterSaleItems.length > 0) {
      await tx.aptMarketListing.createMany({
        data: sellingListingRows({
          sellerId: request.requesterId,
          items: requesterSaleItems,
          source: "COHAB_MOVE_IN",
        }),
      });
    }
  });

  await createNotification({
    userId: request.requesterId,
    actorId: user.id,
    type: "apt_cohab_accept",
    title: "??? ??? ???",
    body: `${user.name ?? user.username}??? ??? ??????????????. ${saleSummary(requesterSaleItems.length)}`,
    link: APT_GAME_PATH,
  });

  revalidateAptHub();
  revalidatePath("/apt/cohabitation");
  return { ok: true as const };
}

export async function acceptAptCohabitationRequestForm(formData: FormData): Promise<void> {
  await acceptAptCohabitationRequest(formData);
}

export async function rejectAptCohabitationRequest(input: FormData | string) {
  const user = await requireAuth();
  const requestId = typeof input === "string" ? input : String(input.get("requestId") ?? "");
  const request = await db.aptCohabitationRequest.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true, username: true, name: true } } },
  });
  if (!request || request.hostId !== user.id || request.status !== PENDING) {
    return { error: "????????? ????????" };
  }

  await db.aptCohabitationRequest.update({
    where: { id: request.id },
    data: { status: REJECTED, respondedAt: new Date() },
  });

  await createNotification({
    userId: request.requesterId,
    actorId: user.id,
    type: "apt_cohab_reject",
    title: "??? ??? ??",
    body: `${user.name ?? user.username}??? ??? ?????????????.`,
    link: "/apt/cohabitation",
  });

  revalidatePath("/apt/cohabitation");
  return { ok: true as const };
}

export async function rejectAptCohabitationRequestForm(formData: FormData): Promise<void> {
  await rejectAptCohabitationRequest(formData);
}

export async function requestAptCohabitationMoveOut(input: FormData | string) {
  const user = await requireAuth();
  const cohabitantId = typeof input === "string" ? input : String(input.get("cohabitantId") ?? "");
  const row = await db.aptCohabitant.findUnique({ where: { id: cohabitantId } });
  if (!row || row.status !== ACTIVE || row.endedAt) return { error: "??? ??????? ????????." };
  if (row.hostId !== user.id && row.residentId !== user.id) return { error: "??????????." };

  const counterpartId = row.hostId === user.id ? row.residentId : row.hostId;
  if (row.moveOutRequestedById && row.moveOutRequestedById !== user.id) {
    const hostProfile = await db.aptProfile.findUnique({ where: { userId: row.hostId } });
    const hostHome = hostProfile ? parseBondee(hostProfile.simulationState) : DEFAULT_BONDEE_HOME;
    const movingItems = hostHome.items
      .filter((item) => itemOwner(item, row.hostId) === row.residentId)
      .map((item) => ({ ...item, ownerId: row.residentId }));
    const remainingHome: BondeeHomeState = {
      ...hostHome,
      items: hostHome.items.filter((item) => itemOwner(item, row.hostId) !== row.residentId),
    };
    const hostSim =
      hostProfile?.simulationState && typeof hostProfile.simulationState === "object"
        ? { ...(hostProfile.simulationState as Record<string, unknown>) }
        : {};
    hostSim.bondee = remainingHome;

    await db.$transaction(async (tx) => {
      await tx.aptCohabitant.update({
        where: { id: row.id },
        data: { status: ENDED, endedAt: new Date() },
      });
      if (hostProfile) {
        await tx.aptProfile.update({
          where: { userId: row.hostId },
          data: { simulationState: hostSim as Prisma.InputJsonValue },
        });
      }
      await tx.aptProfile.upsert({
        where: { userId: row.residentId },
        create: {
          userId: row.residentId,
          housingType: "apartment",
          moveInCompletedAt: null,
          simulationState: {},
          furniture: [],
          homePublic: true,
        },
        update: {
          housingType: "apartment",
          moveInCompletedAt: null,
          simulationState: {},
          furniture: [],
          homePublic: true,
        },
      });
      if (movingItems.length > 0) {
        await tx.aptMarketListing.createMany({
          data: sellingListingRows({
            sellerId: row.residentId,
            items: movingItems,
            source: "COHAB_MOVE_OUT",
          }),
        });
      }
    });

    await createNotification({
      userId: counterpartId,
      actorId: user.id,
      type: "apt_cohab_moveout_done",
      title: "??? ??",
      body: `??? ???? ?????? ???? ?????????? ${saleSummary(movingItems.length)}`,
      link: "/apt/cohabitation",
    });
    revalidateAptHub();
    revalidatePath("/apt/cohabitation");
    return { ok: true as const, ended: true };
  }

  await db.aptCohabitant.update({
    where: { id: row.id },
    data: { moveOutRequestedById: user.id, moveOutRequestedAt: new Date() },
  });
  await createNotification({
    userId: counterpartId,
    actorId: user.id,
    type: "apt_cohab_moveout_request",
    title: "??? ?? ??? ???",
    body: "??? ?? ??????????????. ?????? ??????? ??????????????",
    link: "/apt/cohabitation",
  });

  revalidatePath("/apt/cohabitation");
  return { ok: true as const, pendingConsent: true };
}

export async function requestAptCohabitationMoveOutForm(formData: FormData): Promise<void> {
  await requestAptCohabitationMoveOut(formData);
}

export async function getMyAptCohabitationState() {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  const [incoming, outgoing, hosted, residence, marketListings] = await Promise.all([
    db.aptCohabitationRequest.findMany({
      where: { hostId: user.id, status: PENDING },
      orderBy: { createdAt: "desc" },
      include: { requester: { select: { id: true, username: true, name: true } } },
    }),
    db.aptCohabitationRequest.findMany({
      where: { requesterId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { host: { select: { id: true, username: true, name: true } } },
    }),
    db.aptCohabitant.findMany({
      where: { hostId: user.id, status: ACTIVE, endedAt: null },
      include: { resident: { select: { id: true, username: true, name: true } } },
    }),
    db.aptCohabitant.findFirst({
      where: { residentId: user.id, status: ACTIVE, endedAt: null },
      include: { host: { select: { id: true, username: true, name: true } } },
    }),
    db.aptMarketListing.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { userId: user.id, incoming, outgoing, hosted, residence, marketListings };
}

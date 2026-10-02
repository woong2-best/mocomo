import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { db } from "@/lib/db";

export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotencyStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export type IdempotencyBeginResult =
  | { action: "proceed"; recordId: string }
  | { action: "replay"; statusCode: number; body: unknown }
  | { action: "conflict" };

function expiresAtFromNow() {
  return new Date(Date.now() + IDEMPOTENCY_TTL_MS);
}

export async function beginIdempotentRequest(input: {
  scope: string;
  userId: string;
  idempotencyKey: string;
}): Promise<IdempotencyBeginResult> {
  const key = input.idempotencyKey.trim();
  if (!key || key.length > 128) {
    return { action: "proceed", recordId: "" };
  }

  const existing = await db.apiIdempotencyKey.findUnique({
    where: {
      scope_idempotencyKey: {
        scope: input.scope,
        idempotencyKey: key,
      },
    },
  });

  if (existing) {
    if (existing.expiresAt < new Date()) {
      await db.apiIdempotencyKey.delete({ where: { id: existing.id } }).catch(() => null);
    } else if (existing.userId !== input.userId) {
      return { action: "conflict" };
    } else if (existing.status === "PROCESSING") {
      return { action: "conflict" };
    } else if (existing.status === "COMPLETED" && existing.responseBody != null) {
      return {
        action: "replay",
        statusCode: existing.responseCode ?? 200,
        body: existing.responseBody,
      };
    }
  }

  try {
    const row = await db.apiIdempotencyKey.create({
      data: {
        scope: input.scope,
        idempotencyKey: key,
        userId: input.userId,
        status: "PROCESSING",
        expiresAt: expiresAtFromNow(),
      },
    });
    return { action: "proceed", recordId: row.id };
  } catch (e) {
    if (
      e instanceof PrismaNamespace.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const raced = await db.apiIdempotencyKey.findUnique({
        where: {
          scope_idempotencyKey: { scope: input.scope, idempotencyKey: key },
        },
      });
      if (raced?.status === "COMPLETED" && raced.responseBody != null) {
        return {
          action: "replay",
          statusCode: raced.responseCode ?? 200,
          body: raced.responseBody,
        };
      }
      return { action: "conflict" };
    }
    throw e;
  }
}

export async function completeIdempotentRequest(
  recordId: string,
  input: {
    status: Exclude<IdempotencyStatus, "PROCESSING">;
    responseCode: number;
    responseBody: Prisma.InputJsonValue;
  },
) {
  if (!recordId) return;
  await db.apiIdempotencyKey.update({
    where: { id: recordId },
    data: {
      status: input.status,
      responseCode: input.responseCode,
      responseBody: input.responseBody,
      expiresAt: expiresAtFromNow(),
    },
  });
}

export async function failIdempotentRequest(recordId: string) {
  if (!recordId) return;
  await db.apiIdempotencyKey.delete({ where: { id: recordId } }).catch(() => null);
}

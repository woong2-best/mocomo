import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<
  string,
  {
    id: string;
    userId: string;
    status: string;
    responseCode?: number;
    responseBody?: unknown;
    expiresAt: Date;
  }
>();

vi.mock("@/lib/db", () => ({
  db: {
    apiIdempotencyKey: {
      findUnique: async ({
        where,
      }: {
        where: { scope_idempotencyKey: { scope: string; idempotencyKey: string } };
      }) => {
        const key = `${where.scope_idempotencyKey.scope}:${where.scope_idempotencyKey.idempotencyKey}`;
        return store.get(key) ?? null;
      },
      create: async ({
        data,
      }: {
        data: {
          scope: string;
          idempotencyKey: string;
          userId: string;
          status: string;
          expiresAt: Date;
        };
      }) => {
        const key = `${data.scope}:${data.idempotencyKey}`;
        if (store.has(key)) {
          const err = new Error("Unique constraint");
          (err as Error & { code: string }).code = "P2002";
          throw err;
        }
        const row = { id: `row_${store.size + 1}`, ...data };
        store.set(key, row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        for (const [k, row] of store.entries()) {
          if (row.id === where.id) {
            store.set(k, { ...row, ...data } as (typeof store extends Map<string, infer V> ? V : never));
            return row;
          }
        }
        return null;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        for (const [k, row] of store.entries()) {
          if (row.id === where.id) store.delete(k);
        }
      },
    },
  },
}));

import { beginIdempotentRequest, completeIdempotentRequest } from "@/lib/api-idempotency";
import { ON_DEMAND_WITHDRAW_IDEMPOTENCY_SCOPE } from "@/lib/settlement-moco/on-demand-withdraw-route";

describe("api idempotency", () => {
  beforeEach(() => store.clear());

  it("returns conflict for concurrent processing keys", async () => {
    const scope = ON_DEMAND_WITHDRAW_IDEMPOTENCY_SCOPE;
    const first = await beginIdempotentRequest({
      scope,
      userId: "u1",
      idempotencyKey: "same-key",
    });
    expect(first.action).toBe("proceed");

    const second = await beginIdempotentRequest({
      scope,
      userId: "u1",
      idempotencyKey: "same-key",
    });
    expect(second.action).toBe("conflict");
  });

  it("replays completed payload", async () => {
    const scope = ON_DEMAND_WITHDRAW_IDEMPOTENCY_SCOPE;
    const first = await beginIdempotentRequest({
      scope,
      userId: "u1",
      idempotencyKey: "done-key",
    });
    if (first.action !== "proceed") throw new Error("expected proceed");

    await completeIdempotentRequest(first.recordId, {
      status: "COMPLETED",
      responseCode: 200,
      responseBody: { withdrawalId: "w1", stripeTransferId: "tr_1" },
    });

    const replay = await beginIdempotentRequest({
      scope,
      userId: "u1",
      idempotencyKey: "done-key",
    });
    expect(replay.action).toBe("replay");
    if (replay.action === "replay") {
      expect(replay.body).toEqual({ withdrawalId: "w1", stripeTransferId: "tr_1" });
    }
  });
});

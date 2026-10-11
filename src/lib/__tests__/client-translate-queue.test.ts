import test from "node:test";
import assert from "node:assert/strict";
import { enqueueTranslation } from "@/lib/client-translate/queue";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("higher-priority jobs run before older low-priority jobs still waiting", async () => {
  const order: string[] = [];
  const blockerA = enqueueTranslation(async () => {
    await delay(30);
  }, 0);
  const blockerB = enqueueTranslation(async () => {
    await delay(30);
  }, 0);
  const low = enqueueTranslation(async () => {
    order.push("low");
  }, 0);
  const high = enqueueTranslation(async () => {
    order.push("high");
  }, 2);

  await Promise.all([blockerA, blockerB, low, high]);
  assert.deepEqual(order, ["high", "low"]);
});

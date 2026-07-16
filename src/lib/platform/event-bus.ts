/**
 * 경량 in-process Event Bus.
 * 향후 Redis/Queue로 교체 가능하도록 인터페이스만 고정.
 */

export type PlatformEventName =
  | "UserRegistered"
  | "PromotionAssigned"
  | "PromotionExpired"
  | "SettlementApproved"
  | "SettlementPaid"
  | "SettlementRejected"
  | "CouponUsed"
  | "CouponRedeemed"
  | "LiveStarted"
  | "PurchaseCompleted"
  | "PaymentFailed"
  | "StripeWebhookError"
  | "CronFailed"
  | "ReportSpike"
  | string;

export type PlatformEvent<T = Record<string, unknown>> = {
  name: PlatformEventName;
  payload: T;
  occurredAt: Date;
  actorId?: string;
};

type Handler = (event: PlatformEvent) => void | Promise<void>;

const handlers = new Map<string, Set<Handler>>();

export function onPlatformEvent(name: PlatformEventName | "*", handler: Handler) {
  const set = handlers.get(name) ?? new Set();
  set.add(handler);
  handlers.set(name, set);
  return () => set.delete(handler);
}

export async function emitPlatformEvent<T extends Record<string, unknown>>(
  name: PlatformEventName,
  payload: T,
  actorId?: string
) {
  const event: PlatformEvent<T> = {
    name,
    payload,
    occurredAt: new Date(),
    actorId,
  };
  const list = [
    ...(handlers.get(name) ?? []),
    ...(handlers.get("*") ?? []),
  ];
  for (const h of list) {
    try {
      await h(event as PlatformEvent);
    } catch (e) {
      console.error(`[event-bus] handler failed for ${name}`, e);
    }
  }
  return event;
}

/**
 * Event Bus 기본 구독자 — Notification / Audit 연동.
 * 앱 부트스트랩 시 import 한 번이면 등록됨.
 */
import { onPlatformEvent } from "@/lib/platform/event-bus";
import { notifyAdmins } from "@/lib/platform/notification-center";

let registered = false;

export function registerPlatformEventHandlers() {
  if (registered) return;
  registered = true;

  onPlatformEvent("CronFailed", async (e) => {
    await notifyAdmins({
      title: "Cron job failed",
      body: `${String(e.payload.jobName ?? e.payload.jobType)}: ${String(e.payload.error ?? "")}`,
      link: "/admin/audit",
      type: "ADMIN_CRON",
    });
  });

  onPlatformEvent("PaymentFailed", async (e) => {
    await notifyAdmins({
      title: "Payment failed",
      body: String(e.payload.message ?? e.payload.reason ?? "payment failed"),
      link: "/admin/finance",
      type: "ADMIN_PAYMENT",
    });
  });

  onPlatformEvent("StripeWebhookError", async (e) => {
    await notifyAdmins({
      title: "Stripe Webhook error",
      body: String(e.payload.message ?? "webhook error"),
      link: "/admin/finance",
      type: "ADMIN_STRIPE",
    });
  });

  onPlatformEvent("SettlementApproved", async () => {
    /* user notify는 settlements 서비스에서 처리 */
  });
}

registerPlatformEventHandlers();

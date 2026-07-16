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
      title: "Cron 작업 실패",
      body: `${String(e.payload.jobName ?? e.payload.jobType)}: ${String(e.payload.error ?? "")}`,
      link: "/admin/audit",
      type: "ADMIN_CRON",
    });
  });

  onPlatformEvent("PaymentFailed", async (e) => {
    await notifyAdmins({
      title: "결제 실패",
      body: String(e.payload.message ?? e.payload.reason ?? "payment failed"),
      link: "/admin/finance",
      type: "ADMIN_PAYMENT",
    });
  });

  onPlatformEvent("StripeWebhookError", async (e) => {
    await notifyAdmins({
      title: "Stripe Webhook 오류",
      body: String(e.payload.message ?? "webhook error"),
      link: "/admin/finance",
      type: "ADMIN_STRIPE",
    });
  });

  onPlatformEvent("SettlementApproved", async () => {
    /* user notify는 settlements 서비스에서 처리 */
  });

  onPlatformEvent("PromotionExpired", async (e) => {
    await notifyAdmins({
      title: "Promotion 만료",
      body: String(e.payload.name ?? "promotion"),
      link: "/admin/promotions",
      type: "ADMIN_PROMOTION",
    });
  });
}

registerPlatformEventHandlers();

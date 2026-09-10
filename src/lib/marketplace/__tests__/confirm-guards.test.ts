import { describe, expect, it } from "vitest";
import { canBuyerManuallyConfirmOrder } from "@/lib/marketplace/confirm-guards";

describe("canBuyerManuallyConfirmOrder", () => {
  it("blocks physical confirm while SHIPPED", () => {
    const res = canBuyerManuallyConfirmOrder({
      status: "SHIPPED",
      items: [{ listingType: "PHYSICAL" }],
      shipment: { status: "IN_TRANSIT", deliveredAt: null, deliverySignalSource: null },
    });
    expect(res).toEqual({ error: "배송 완료 후에만 구매 확정할 수 있습니다." });
  });

  it("blocks physical DELIVERED without delivery signal", () => {
    const res = canBuyerManuallyConfirmOrder({
      status: "DELIVERED",
      items: [{ listingType: "PHYSICAL" }],
      shipment: { status: "SHIPPED", deliveredAt: null, deliverySignalSource: null },
    });
    expect(res).toEqual({
      error: "배송 추적상 배송 완료가 확인된 후 구매 확정할 수 있습니다.",
    });
  });

  it("allows physical confirm with 17track source", () => {
    const res = canBuyerManuallyConfirmOrder({
      status: "DELIVERED",
      items: [{ listingType: "PHYSICAL" }],
      shipment: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliverySignalSource: "17track",
      },
    });
    expect(res).toEqual({ ok: true });
  });

  it("blocks manual confirm for fallback delivery", () => {
    const res = canBuyerManuallyConfirmOrder({
      status: "DELIVERED",
      items: [{ listingType: "PHYSICAL" }],
      shipment: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliverySignalSource: "fallback",
      },
    });
    expect(res).toEqual({
      error: "배송 추적 자동 처리 주문은 분쟁 기간(72시간) 후 자동 구매확정됩니다.",
    });
  });

  it("blocks manual confirm for seller manual delivery", () => {
    const res = canBuyerManuallyConfirmOrder({
      status: "DELIVERED",
      items: [{ listingType: "PHYSICAL" }],
      shipment: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliverySignalSource: "manual",
      },
    });
    expect(res).toEqual({
      error: "판매자 수동 배송완료 주문은 구매 확정할 수 없습니다. 고객센터에 문의해 주세요.",
    });
  });

  it("allows digital confirm at DELIVERED", () => {
    const res = canBuyerManuallyConfirmOrder({
      status: "DELIVERED",
      items: [{ listingType: "DIGITAL" }],
      shipment: null,
    });
    expect(res).toEqual({ ok: true });
  });
});

import { describe, expect, it } from "vitest";
import { rejectSellerManualDeliveredForPhysical } from "@/lib/marketplace/shipment-guards";

describe("rejectSellerManualDeliveredForPhysical", () => {
  it("blocks physical DELIVERED", () => {
    const res = rejectSellerManualDeliveredForPhysical(
      [{ listingType: "PHYSICAL" }],
      "DELIVERED"
    );
    expect(res).toEqual({
      error:
        "실물 상품의 배송 완료는 택배 추적 확인 후 자동 처리됩니다. 송장번호와 발송 정보만 등록해 주세요.",
    });
  });

  it("allows physical SHIPPED", () => {
    expect(
      rejectSellerManualDeliveredForPhysical([{ listingType: "PHYSICAL" }], "SHIPPED")
    ).toEqual({ ok: true });
  });

  it("allows digital DELIVERED", () => {
    expect(
      rejectSellerManualDeliveredForPhysical([{ listingType: "DIGITAL" }], "DELIVERED")
    ).toEqual({ ok: true });
  });
});

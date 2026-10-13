import { MOCO_PURCHASE_TERMS_PATH } from "@/lib/legal/terms-versions";

/** Logged acknowledgement — Korean statutory consent for immediate opening. */
export const MOCO_PURCHASE_CHECKOUT_ACK =
  "[필수] 디지털 콘텐츠 즉시 개봉 및 환불 불가 동의. 본 상품은 결제 완료 직후 포춘쿠키가 자동으로 개봉되며, 운세 및 디지털 혜택이 즉시 제공(사용 개시)됩니다. 결제 완료 시 전자상거래법 제17조 제2항에 따라 청약철회(환불)가 불가능함에 동의합니다.";

export const MOCO_FORTUNE_COOKIE_CONSENT_TITLE =
  "[Required] Immediate digital-content opening and no-refund consent";

export const MOCO_FORTUNE_COOKIE_CONSENT_KO_TITLE =
  "[필수] 디지털 콘텐츠 즉시 개봉 및 환불 불가 동의";

export const MOCO_FORTUNE_COOKIE_CONSENT_KO_BODY =
  "본 상품은 결제 완료 직후 포춘쿠키가 자동으로 개봉되며, 운세 및 디지털 혜택이 즉시 제공(사용 개시)됩니다. 결제 완료 시 전자상거래법 제17조 제2항에 따라 청약철회(환불)가 불가능함에 동의합니다.";

export const MOCO_FORTUNE_COOKIE_CONSENT_EN_BODY =
  "This product’s fortune cookie opens automatically the moment payment completes, and the fortune and digital benefits are provided immediately (use begins). By completing payment, I agree that withdrawal of offer (refund) is not available under Article 17(2) of the Korean Act on the Consumer Protection in Electronic Commerce.";

export const MOCO_PURCHASE_TERMS_LINK_LABEL = "MOCO Purchase Terms";

export const MOCO_PURCHASE_SUPPORT_EMAIL = "support@mocomo.net";

export const MOCO_PURCHASE_TERMS_HREF = MOCO_PURCHASE_TERMS_PATH;

/** @deprecated use MOCO_PURCHASE_CHECKOUT_ACK */
export const MOCO_PURCHASE_TERMS_COPY = MOCO_PURCHASE_CHECKOUT_ACK;

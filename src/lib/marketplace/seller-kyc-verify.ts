import type { MarketplaceSellerKycStatus, MarketplaceSellerType } from "@prisma/client";
import { sellerRequiresPhoneVerification } from "@/lib/marketplace/seller-region-policy";

export type SellerKycVerifyInput = {
  countryCode: string;
  sellerType: MarketplaceSellerType | null;
  legalName: string;
  idType: string;
  idNumber: string;
  /** Apick 1원 인증으로 확인된 예금주명 */
  settlementAccountHolder: string | null;
  businessRepresentativeName: string | null;
  /** 비공개 스토리지 키 — 2차 OCR 연동 시 이미지 입력으로 사용 */
  documentKey: string | null;
};

export type SellerKycVerifyResult = {
  status: MarketplaceSellerKycStatus;
  notes: string;
  flags: string[];
  autoApproved: boolean;
};

function normalizePersonName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "")
    .replace(/[·・]/g, "")
    .toLowerCase();
}

export function personNamesMatch(a: string, b: string): boolean {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

/** 주민등록번호 13자리 체크섬 */
export function validateKoreanResidentId(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 13) return false;
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * weights[i]!;
  }
  const check = (11 - (sum % 11)) % 10;
  return check === Number(digits[12]);
}

function validateIdNumber(idType: string, idNumber: string): { ok: boolean; error?: string } {
  const compact = idNumber.replace(/\s+/g, "");
  if (idType === "NATIONAL_ID") {
    if (!validateKoreanResidentId(compact)) {
      return { ok: false, error: "주민등록번호 형식이 올바르지 않습니다." };
    }
    return { ok: true };
  }
  if (idType === "RESIDENT_CARD") {
    if (compact.replace(/\D/g, "").length < 6) {
      return { ok: false, error: "외국인등록번호를 확인해 주세요." };
    }
    return { ok: true };
  }
  if (compact.length < 4) {
    return { ok: false, error: "신분증 번호를 입력해 주세요." };
  }
  return { ok: true };
}

function isKycDevAutoPass() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return false;
  }
  return process.env.KYC_DEV_AUTO_PASS === "true" || process.env.NODE_ENV === "development";
}

/**
 * 1차 자동 KYC — OCR·공공 API 연동 전에도 형식·명의 일치 검증.
 * 플래그가 없으면 VERIFIED(즉시 승인 경로), 있으면 PENDING(예외 수동 검수).
 */
export function verifySellerKyc(input: SellerKycVerifyInput): SellerKycVerifyResult {
  const flags: string[] = [];
  const legalName = input.legalName.trim();

  const idCheck = validateIdNumber(input.idType, input.idNumber);
  if (!idCheck.ok) {
    return {
      status: "FAILED",
      notes: idCheck.error ?? "신분증 정보를 확인할 수 없습니다.",
      flags: ["INVALID_ID_FORMAT"],
      autoApproved: false,
    };
  }

  if (!input.documentKey) {
    flags.push("NO_KYC_DOCUMENT");
  }

  const isKr = sellerRequiresPhoneVerification(input.countryCode);

  if (isKr) {
    if (!input.settlementAccountHolder) {
      flags.push("NO_SETTLEMENT_HOLDER");
    } else if (!personNamesMatch(legalName, input.settlementAccountHolder)) {
      flags.push("NAME_BANK_MISMATCH");
    }

    if (input.sellerType === "BUSINESS") {
      if (!input.businessRepresentativeName) {
        flags.push("NO_BUSINESS_REP");
      } else if (!personNamesMatch(legalName, input.businessRepresentativeName)) {
        flags.push("NAME_BUSINESS_REP_MISMATCH");
      }
    }
  } else if (input.idType === "PASSPORT" && input.idNumber.trim().length < 6) {
    flags.push("PASSPORT_FORMAT_WEAK");
  }

  if (isKycDevAutoPass() && flags.length === 0) {
    return {
      status: "VERIFIED",
      notes: `자동 검증 완료 · ${input.idType} · dev`,
      flags: [],
      autoApproved: true,
    };
  }

  if (flags.length === 0) {
    return {
      status: "VERIFIED",
      notes: `자동 검증 완료 · ${input.idType} · OCR·명의 일치`,
      flags: [],
      autoApproved: true,
    };
  }

  const flagLabel = flags.join(", ");
  return {
    status: "PENDING",
    notes: `자동 검증 플래그 · ${flagLabel} · 예외 수동 검수`,
    flags,
    autoApproved: false,
  };
}

import { sanitizeRecord } from "@/lib/safe-log";

const NTS_BASE = "https://api.odcloud.kr/api/nts-businessman/v1";

type NtsStatusCode = "OK" | string;

type NtsBusinessStatus = {
  b_no?: string;
  b_stt?: string;
  b_stt_cd?: string;
  tax_type?: string;
  tax_type_cd?: string;
  end_dt?: string;
};

type NtsValidationItem = {
  b_no?: string;
  valid?: "01" | "02";
  valid_msg?: string;
  status?: NtsBusinessStatus;
};

type NtsStatusResponse = {
  status_code?: NtsStatusCode;
  request_cnt?: number;
  match_cnt?: number;
  data?: NtsBusinessStatus[];
};

type NtsValidateResponse = {
  status_code?: NtsStatusCode;
  request_cnt?: number;
  valid_cnt?: number;
  data?: NtsValidationItem[];
};

export type NtsBusinessVerifyInput = {
  regNo: string;
  representativeName: string;
  startDate: string;
  businessName?: string;
};

export type NtsBusinessVerifyResult =
  | {
      ok: true;
      regNo: string;
      statusCode: string;
      taxType: string | null;
      dev?: boolean;
    }
  | { ok: false; error: string };

function ntsServiceKey(): string | null {
  return process.env.NTS_BUSINESSMAN_SERVICE_KEY?.trim() || null;
}

function isNtsDevMode() {
  // Never in production: a missing service key plus a stray NTS_DEV_SKIP would
  // otherwise stamp sellers as 국세청-verified without any verification.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return false;
  }
  return (
    !ntsServiceKey() &&
    (process.env.NODE_ENV === "development" || process.env.NTS_DEV_SKIP === "true")
  );
}

export function normalizeBusinessRegNo(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return null;
  return digits;
}

export function normalizeBusinessStartDate(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return digits;
}

async function ntsPost<T>(path: "validate" | "status", body: unknown): Promise<T | null> {
  const key = ntsServiceKey();
  if (!key) throw new Error("NTS_NOT_CONFIGURED");

  const url = `${NTS_BASE}/${path}?serviceKey=${encodeURIComponent(key)}&returnType=JSON`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as T | null;
  if (!json) return null;
  return json;
}

/** 국세청 사업자등록 진위확인 + 상태조회 (계속사업자만 허용) */
export async function verifyNtsBusinessRegistration(
  input: NtsBusinessVerifyInput
): Promise<NtsBusinessVerifyResult> {
  const regNo = normalizeBusinessRegNo(input.regNo);
  if (!regNo) {
    return { ok: false, error: "사업자등록번호는 10자리 숫자여야 합니다." };
  }

  const startDate = normalizeBusinessStartDate(input.startDate);
  if (!startDate) {
    return { ok: false, error: "개업일자는 YYYYMMDD 형식으로 입력해 주세요." };
  }

  const representativeName = input.representativeName.trim();
  if (!representativeName) {
    return { ok: false, error: "대표자명을 입력해 주세요." };
  }

  if (isNtsDevMode()) {
    console.info("[NTS dev] skip business verification", sanitizeRecord({ regNo, startDate }));
    return {
      ok: true,
      regNo,
      statusCode: "01",
      taxType: "부가가치세 일반과세자",
      dev: true,
    };
  }

  try {
    const validateBody = {
      businesses: [
        {
          b_no: regNo,
          start_dt: startDate,
          p_nm: representativeName,
          ...(input.businessName?.trim() ? { b_nm: input.businessName.trim() } : {}),
        },
      ],
    };

    const validateRes = await ntsPost<NtsValidateResponse>("validate", validateBody);
    if (!validateRes || validateRes.status_code !== "OK") {
      return { ok: false, error: "사업자등록 확인 API 호출에 실패했습니다." };
    }

    const item = validateRes.data?.[0];
    if (!item || item.valid !== "01") {
      return {
        ok: false,
        error: item?.valid_msg?.trim() || "입력하신 사업자 정보가 국세청 등록 정보와 일치하지 않습니다.",
      };
    }

    const statusRes = await ntsPost<NtsStatusResponse>("status", { b_no: [regNo] });
    if (!statusRes || statusRes.status_code !== "OK") {
      return { ok: false, error: "사업자 상태 조회 API 호출에 실패했습니다." };
    }

    const status = statusRes.data?.[0];
    if (!status?.b_stt_cd) {
      return { ok: false, error: "국세청에 등록되지 않은 사업자등록번호입니다." };
    }

    if (status.b_stt_cd === "02") {
      return { ok: false, error: "휴업 상태의 사업자는 판매자 등록이 불가합니다." };
    }
    if (status.b_stt_cd === "03") {
      return { ok: false, error: "폐업 상태의 사업자는 판매자 등록이 불가합니다." };
    }
    if (status.b_stt_cd !== "01") {
      return { ok: false, error: "사업자 상태를 확인할 수 없습니다." };
    }

    return {
      ok: true,
      regNo,
      statusCode: status.b_stt_cd,
      taxType: status.tax_type ?? null,
    };
  } catch (e) {
    if (e instanceof Error && e.message === "NTS_NOT_CONFIGURED") {
      return {
        ok: false,
        error: "사업자 확인 설정이 없습니다. NTS_BUSINESSMAN_SERVICE_KEY를 설정해 주세요.",
      };
    }
    return { ok: false, error: "사업자등록 확인 중 오류가 발생했습니다." };
  }
}

export function isNtsBusinessVerificationConfigured(): boolean {
  return !!ntsServiceKey() || isNtsDevMode();
}

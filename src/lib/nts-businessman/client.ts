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
    return { ok: false, error: "Business registration number must be 10 digits." };
  }

  const startDate = normalizeBusinessStartDate(input.startDate);
  if (!startDate) {
    return { ok: false, error: "Enter the opening date in YYYYMMDD format." };
  }

  const representativeName = input.representativeName.trim();
  if (!representativeName) {
    return { ok: false, error: "Enter the representative's name." };
  }

  if (isNtsDevMode()) {
    console.info("[NTS dev] skip business verification", sanitizeRecord({ regNo, startDate }));
    return {
      ok: true,
      regNo,
      statusCode: "01",
      taxType: "General VAT taxpayer",
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
      return { ok: false, error: "Business registration verification API call failed." };
    }

    const item = validateRes.data?.[0];
    if (!item || item.valid !== "01") {
      return {
        ok: false,
        error: item?.valid_msg?.trim() || "The business information you entered does not match National Tax Service records.",
      };
    }

    const statusRes = await ntsPost<NtsStatusResponse>("status", { b_no: [regNo] });
    if (!statusRes || statusRes.status_code !== "OK") {
      return { ok: false, error: "Business status lookup API call failed." };
    }

    const status = statusRes.data?.[0];
    if (!status?.b_stt_cd) {
      return { ok: false, error: "This business registration number is not registered with the National Tax Service." };
    }

    if (status.b_stt_cd === "02") {
      return { ok: false, error: "Businesses in temporary closure cannot register as Sellers." };
    }
    if (status.b_stt_cd === "03") {
      return { ok: false, error: "Closed businesses cannot register as Sellers." };
    }
    if (status.b_stt_cd !== "01") {
      return { ok: false, error: "Could not verify business status." };
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
        error: "Business verification is not configured. Set NTS_BUSINESSMAN_SERVICE_KEY.",
      };
    }
    return { ok: false, error: "An error occurred while verifying business registration." };
  }
}

export function isNtsBusinessVerificationConfigured(): boolean {
  return !!ntsServiceKey() || isNtsDevMode();
}

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { normalizeBankAccountNum } from "@/lib/apick/bank-codes";

const APICK_BASE = "https://apick.app/rest";

type ApickApiMeta = {
  success?: boolean;
  cost?: number;
  ms?: number;
  pl_id?: number;
};

type ApickResponse<T> = {
  data?: T;
  result?: { error?: string; [key: string]: unknown };
  api?: ApickApiMeta;
};

function apickPayloadError(json: ApickResponse<unknown>): string | null {
  const resultErr = json.result?.error;
  if (typeof resultErr === "string" && resultErr.trim()) return resultErr.trim();
  if (json.api?.success === false) return t("lib.apick.apick_api");
  return null;
}

function apickDataError(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const err = data.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  return null;
}

function apickSuccessData(json: ApickResponse<Record<string, unknown>>) {
  const payloadErr = apickPayloadError(json);
  if (payloadErr) return { ok: false as const, error: payloadErr };

  const data = json.data ?? (json.result as Record<string, unknown> | undefined);
  const dataErr = apickDataError(data);
  if (dataErr) return { ok: false as const, error: dataErr };
  if (!data || data.success !== 1) {
    return { ok: false as const, error: t("lib.apick.apick") };
  }
  return { ok: true as const, data };
}

export type ApickRealnameResult =
  | {
      ok: true;
      bankCode: string;
      bankName: string;
      accountNum: string;
      holderName: string;
      dev?: boolean;
    }
  | { ok: false; error: string };

export type ApickTransfer1WonResult =
  | {
      ok: true;
      bankCode: string;
      bankName: string;
      accountNum: string;
      memo: string;
      dev?: boolean;
    }
  | { ok: false; error: string };

function apickAuthKey(): string | null {
  return process.env.APICK_API_KEY?.trim() || null;
}

function isApickDevMode() {
  return (
    !apickAuthKey() &&
    (process.env.NODE_ENV === "development" || process.env.APICK_DEV_LOG === "true")
  );
}

async function apickPost<T>(
  path: string,
  data: Record<string, string>
): Promise<ApickResponse<T>> {
  const key = apickAuthKey();
  if (!key) {
    throw new Error("APICK_NOT_CONFIGURED");
  }

  const form = new FormData();
  for (const [k, v] of Object.entries(data)) {
    form.append(k, v);
  }

  const res = await fetch(`${APICK_BASE}${path}`, {
    method: "POST",
    headers: { CL_AUTH_KEY: key },
    body: form,
  });

  const json = (await res.json().catch(() => null)) as ApickResponse<T> | null;
  if (!json) {
    return { api: { success: false } } as ApickResponse<T>;
  }
  // Apick returns HTTP 400 with { data: { error, success: 0 }, api: { success: true } }
  if (!res.ok && !json.data && !json.result) {
    return { api: { success: false } } as ApickResponse<T>;
  }
  return json;
}

/** 예금주 실명 조회 — account_realname */
export async function apickAccountRealname(input: {
  bankCode: string;
  accountNum: string;
}): Promise<ApickRealnameResult> {
  const accountNum = normalizeBankAccountNum(input.accountNum);
  if (!accountNum) return { ok: false, error: t("lib.apick.s1f33m8u") };

  if (isApickDevMode()) {
    console.info(`[Apick dev] account_realname ${input.bankCode} ${accountNum}`);
    return {
      ok: true,
      bankCode: input.bankCode,
      bankName: t("lib.apick.sub28"),
      accountNum,
      holderName: t("lib.apick.s1m9p9wg"),
      dev: true,
    };
  }

  try {
    const json = await apickPost<Record<string, unknown>>("/account_realname", {
      account_num: accountNum,
      bank_code: input.bankCode,
    });

    const parsed = apickSuccessData(json as ApickResponse<Record<string, unknown>>);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const data = parsed.data;
    const holderName = String(data[t("lib.apick.smmsbc9")] ?? data.account_name ?? "").trim();
    if (!holderName) {
      return { ok: false, error: t("lib.apick.shkod8z") };
    }

    return {
      ok: true,
      bankCode: String(data[t("lib.apick.sq102z5")] ?? input.bankCode),
      bankName: String(data[t("lib.apick.su7zh8")] ?? ""),
      accountNum: String(data[t("lib.apick.smmrdvc")] ?? accountNum),
      holderName,
    };
  } catch (e) {
    if (e instanceof Error && e.message === "APICK_NOT_CONFIGURED") {
      return {
        ok: false,
        error: t("lib.apick.apick_api_key"),
      };
    }
    return { ok: false, error: e instanceof Error ? e.message : t("lib.apick.suawl5g") };
  }
}

/** 1원 송금 + 입금통장메모 인증코드 — transfer_1won */
export async function apickTransfer1Won(input: {
  bankCode: string;
  accountNum: string;
  memo: string;
}): Promise<ApickTransfer1WonResult> {
  const accountNum = normalizeBankAccountNum(input.accountNum);
  const memo = input.memo.trim().slice(0, 14);
  if (!accountNum) return { ok: false, error: t("lib.apick.s1f33m8u") };
  if (!memo) return { ok: false, error: t("lib.apick.sshw6vo") };

  if (isApickDevMode()) {
    console.info(`[Apick dev] transfer_1won ${input.bankCode} ${accountNum} memo=${memo}`);
    return {
      ok: true,
      bankCode: input.bankCode,
      bankName: t("lib.apick.sub28"),
      accountNum,
      memo,
      dev: true,
    };
  }

  try {
    const json = await apickPost<Record<string, unknown>>("/transfer_1won", {
      account_num: accountNum,
      bank_code: input.bankCode,
      memo,
    });

    const parsed = apickSuccessData(json as ApickResponse<Record<string, unknown>>);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const data = parsed.data;
    return {
      ok: true,
      bankCode: String(data[t("lib.apick.sq102z5")] ?? input.bankCode),
      bankName: String(data[t("lib.apick.su7zh8")] ?? ""),
      accountNum: String(data[t("lib.apick.smmrdvc")] ?? accountNum),
      memo: String(data[t("lib.apick.sujtfyf")] ?? memo),
    };
  } catch (e) {
    if (e instanceof Error && e.message === "APICK_NOT_CONFIGURED") {
      return {
        ok: false,
        error: t("lib.apick.apick_api_key"),
      };
    }
    return { ok: false, error: e instanceof Error ? e.message : t("lib.apick.s85k098") };
  }
}

export function isApickConfigured(): boolean {
  return !!apickAuthKey() || isApickDevMode();
}

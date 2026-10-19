import { db } from "@/lib/db";

export type PayoutReadiness = {
  tax: { formType: "W9" | "W8BEN"; status: "PENDING" | "VERIFIED" | "REJECTED" } | null;
  method: { kind: string; hint: string } | null;
  canRequest: boolean;
  code: string | null;
};

const BLOCK_COPY: Record<string, string> = {
  TAX_FORM_REQUIRED:
    "Upload a tax form (W-9 or W-8BEN) and register a payout email (Payoneer, Wise, or bank).",
  TAX_FORM_PENDING: "Your tax form is waiting for review. Payout requests open after it is verified.",
  TAX_FORM_REJECTED: "Your tax form was rejected. Upload a corrected W-9 or W-8BEN.",
  PAYOUT_METHOD_REQUIRED: "Register a payout email (Payoneer, Wise) or bank account before requesting a payout.",
};

export async function getPayoutReadiness(userId: string): Promise<PayoutReadiness> {
  const [tax, method] = await Promise.all([
    db.creatorTaxInfo.findUnique({
      where: { userId },
      select: { taxFormType: true, status: true },
    }),
    db.payoutMethod.findUnique({
      where: { userId },
      select: { kind: true, destinationHint: true },
    }),
  ]);

  const taxView = tax
    ? { formType: tax.taxFormType, status: tax.status }
    : null;
  const methodView =
    method && method.kind !== "UNSPECIFIED"
      ? { kind: method.kind, hint: method.destinationHint }
      : null;

  let code: string | null = null;
  if (!taxView) code = "TAX_FORM_REQUIRED";
  else if (taxView.status === "PENDING") code = "TAX_FORM_PENDING";
  else if (taxView.status === "REJECTED") code = "TAX_FORM_REJECTED";
  else if (!methodView) code = "PAYOUT_METHOD_REQUIRED";

  return {
    tax: taxView,
    method: methodView,
    canRequest: code === null,
    code,
  };
}

export async function assertManualPayoutReady(userId: string): Promise<
  | { ok: true; method: { kind: "PAYONEER" | "WISE" | "BANK"; hint: string } }
  | { ok: false; code: string; message: string; status: number }
> {
  const readiness = await getPayoutReadiness(userId);
  if (!readiness.canRequest || !readiness.method) {
    const code = readiness.code ?? "TAX_FORM_REQUIRED";
    return {
      ok: false,
      code,
      message: BLOCK_COPY[code] ?? BLOCK_COPY.TAX_FORM_REQUIRED,
      status: 403,
    };
  }
  if (readiness.method.kind !== "PAYONEER" && readiness.method.kind !== "WISE" && readiness.method.kind !== "BANK") {
    return {
      ok: false,
      code: "PAYOUT_METHOD_REQUIRED",
      message: BLOCK_COPY.PAYOUT_METHOD_REQUIRED,
      status: 403,
    };
  }
  return {
    ok: true,
    method: { kind: readiness.method.kind, hint: readiness.method.hint },
  };
}

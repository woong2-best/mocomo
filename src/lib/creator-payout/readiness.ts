import { db } from "@/lib/db";

export type TaxReviewStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

export type PayoutReadiness = {
  tax: {
    formType: "W9" | "W8BEN";
    status: TaxReviewStatus;
    expiresAt: string | null;
    countryCode: string | null;
  } | null;
  method: { kind: string; hint: string; countryCode: string | null } | null;
  canRequest: boolean;
  code: string | null;
};

const BLOCK_COPY: Record<string, string> = {
  TAX_FORM_REQUIRED: "Complete a W-9 or W-8BEN and save where the payout should be sent.",
  TAX_FORM_PENDING: "Your tax form is waiting for review. Payout requests open after it is verified.",
  TAX_FORM_REJECTED: "Your tax form was rejected. Submit a corrected W-9 or W-8BEN.",
  TAX_FORM_EXPIRED: "Your tax form has expired. Submit a new W-9 or W-8BEN before requesting a payout.",
  TAX_COUNTRY_MISMATCH: "Save a payout destination in the same country as this tax form.",
  PAYOUT_METHOD_REQUIRED: "Save a Payoneer, Wise, or bank destination before requesting a payout.",
};

export async function getPayoutReadiness(userId: string): Promise<PayoutReadiness> {
  const [tax, method] = await Promise.all([
    db.creatorTaxInfo.findUnique({
      where: { userId },
      select: { taxFormType: true, status: true, expiresAt: true, countryCode: true },
    }),
    db.payoutMethod.findUnique({
      where: { userId },
      select: { kind: true, destinationHint: true, countryCode: true },
    }),
  ]);

  let status: TaxReviewStatus | null = tax?.status ?? null;
  const now = new Date();
  const countryMismatch = Boolean(
    tax?.countryCode && method?.countryCode && tax.countryCode !== method.countryCode,
  );
  const pastExpiry = Boolean(tax?.expiresAt && tax.expiresAt.getTime() <= now.getTime());
  if (tax && status === "VERIFIED" && pastExpiry) {
    await db.creatorTaxInfo.update({
      where: { userId },
      data: { status: "EXPIRED" },
    });
    status = "EXPIRED";
  }

  const taxView = tax && status
    ? {
        formType: tax.taxFormType,
        status,
        expiresAt: tax.expiresAt?.toISOString() ?? null,
        countryCode: tax.countryCode,
      }
    : null;
  const methodView =
    method && method.kind !== "UNSPECIFIED"
      ? { kind: method.kind, hint: method.destinationHint, countryCode: method.countryCode }
      : null;

  let code: string | null = null;
  if (!taxView) code = "TAX_FORM_REQUIRED";
  else if (taxView.status === "PENDING") code = "TAX_FORM_PENDING";
  else if (taxView.status === "REJECTED") code = "TAX_FORM_REJECTED";
  else if (taxView.status === "EXPIRED") code = "TAX_FORM_EXPIRED";
  else if (taxView.status !== "VERIFIED") code = "TAX_FORM_REQUIRED";
  else if (countryMismatch) code = "TAX_COUNTRY_MISMATCH";
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
  if (!readiness.canRequest || !readiness.method || readiness.tax?.status !== "VERIFIED") {
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

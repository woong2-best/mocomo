import type { GooglePurchaseDetails } from "./iap-types";

export type GooglePlayVerifyInput = {
  packageName: string;
  productId: string;
  purchaseToken: string;
};

export type GooglePlayVerifyResult =
  | { ok: true; details: GooglePurchaseDetails }
  | { ok: false; error: string };

function devVerifyEnabled(): boolean {
  return process.env.APT_IAP_DEV_VERIFY === "true";
}

export function readGooglePlayPackageName(): string {
  return process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "net.mocomo.app";
}

async function getAndroidPublisher() {
  const credJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!credJson) {
    throw new Error("Google Play 서비스 계정이 설정되지 않았습니다.");
  }
  const { google } = await import("googleapis");
  const credentials = JSON.parse(credJson) as Record<string, unknown>;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return google.androidpublisher({ version: "v3", auth });
}

async function verifyWithGoogleApi(
  input: GooglePlayVerifyInput
): Promise<GooglePlayVerifyResult> {
  try {
    const androidpublisher = await getAndroidPublisher();
    const res = await androidpublisher.purchases.products.get({
      packageName: input.packageName,
      productId: input.productId,
      token: input.purchaseToken,
    });
    const data = res.data;
    if (data.purchaseState !== 0) {
      return { ok: false, error: "결제가 완료되지 않았습니다." };
    }
    const orderId = data.orderId ?? input.purchaseToken;
    return {
      ok: true,
      details: {
        orderId,
        purchaseState: data.purchaseState ?? 0,
        acknowledgementState: data.acknowledgementState ?? 0,
        consumptionState: data.consumptionState ?? undefined,
        priceMicros: undefined,
        currency: undefined,
        regionCode: data.regionCode ?? undefined,
        purchaseTimeMillis: data.purchaseTimeMillis ?? undefined,
        raw: data as Record<string, unknown>,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google Play 검증 실패";
    return { ok: false, error: msg };
  }
}

/** Google Play 인앱 상품 서버 검증 */
export async function verifyGooglePlayPurchase(
  input: Omit<GooglePlayVerifyInput, "packageName"> & { packageName?: string }
): Promise<GooglePlayVerifyResult> {
  const packageName = input.packageName ?? readGooglePlayPackageName();

  if (devVerifyEnabled() && input.purchaseToken.startsWith("dev:")) {
    return {
      ok: true,
      details: {
        orderId: input.purchaseToken.slice(4) || `dev-${Date.now()}`,
        purchaseState: 0,
        acknowledgementState: 0,
        raw: { dev: true },
      },
    };
  }

  return verifyWithGoogleApi({ ...input, packageName });
}

/** Fulfill 후 Google Ack — 미소비 인앱은 acknowledge 필수 */
export async function acknowledgeGooglePlayPurchase(input: {
  packageName?: string;
  productId: string;
  purchaseToken: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const packageName = input.packageName ?? readGooglePlayPackageName();

  if (devVerifyEnabled() && input.purchaseToken.startsWith("dev:")) {
    return { ok: true };
  }

  try {
    const androidpublisher = await getAndroidPublisher();
    await androidpublisher.purchases.products.acknowledge({
      packageName,
      productId: input.productId,
      token: input.purchaseToken,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google Play Ack 실패";
    return { ok: false, error: msg };
  }
}

/** RTDN / 환불 폴링 — voided purchases */
export async function listVoidedGooglePurchases(input?: {
  packageName?: string;
  startTimeMs?: number;
}): Promise<
  { ok: true; voided: { orderId: string; purchaseToken: string; productId?: string }[] } | { ok: false; error: string }
> {
  const packageName = input?.packageName ?? readGooglePlayPackageName();
  try {
    const androidpublisher = await getAndroidPublisher();
    const res = await androidpublisher.purchases.voidedpurchases.list({
      packageName,
      startTime: input?.startTimeMs != null ? String(input.startTimeMs) : undefined,
    });
    const voided =
      res.data.voidedPurchases?.map((v: { orderId?: string | null; purchaseToken?: string | null }) => ({
        orderId: v.orderId ?? "",
        purchaseToken: v.purchaseToken ?? "",
        productId: undefined,
      })) ?? [];
    return { ok: true, voided: voided.filter((v) => v.orderId && v.purchaseToken) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Voided purchases 조회 실패";
    return { ok: false, error: msg };
  }
}

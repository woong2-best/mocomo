"use client";

import Script from "next/script";

declare global {
  interface Window {
    PortOne?: {
      requestIdentityVerification: (opts: {
        storeId: string;
        identityVerificationId: string;
        channelKey: string;
      }) => Promise<{ code?: string; message?: string; identityVerificationId?: string }>;
    };
  }
}

export function PortOneIdentityScript() {
  return <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="lazyOnload" />;
}

export async function requestPortOneIdentityVerification(scope: "DM_PAID" | "USED_MARKET" | "GLOBAL") {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim();
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY?.trim();
  if (!storeId || !channelKey) {
    throw new Error("본인인증이 설정되지 않았습니다.");
  }
  if (!window.PortOne?.requestIdentityVerification) {
    throw new Error("본인인증 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  const identityVerificationId = `identity-verification-${crypto.randomUUID()}`;
  const sdkResult = await window.PortOne.requestIdentityVerification({
    storeId,
    identityVerificationId,
    channelKey,
  });

  if (sdkResult.code) {
    throw new Error(sdkResult.message ?? "본인인증에 실패했습니다.");
  }

  const res = await fetch("/api/adult-verification/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identityVerificationId, scope }),
  });
  const data = (await res.json()) as { error?: string; success?: boolean };
  if (!res.ok) {
    throw new Error(data.error ?? "인증 확인에 실패했습니다.");
  }

  return true;
}

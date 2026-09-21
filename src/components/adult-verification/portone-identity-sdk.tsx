"use client";

import Script from "next/script";
import type { AdultVerificationScope } from "@prisma/client";

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

function ensurePortOneSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("본인인증은 브라우저에서만 가능합니다."));
  }
  if (window.PortOne?.requestIdentityVerification) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-portone-sdk]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("본인인증 모듈을 불러오지 못했습니다.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.portone.io/v2/browser-sdk.js";
    script.async = true;
    script.dataset.portoneSdk = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("본인인증 모듈을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export async function requestPortOneIdentityVerification(scope: AdultVerificationScope = "GLOBAL") {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim();
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY?.trim();
  if (!storeId || !channelKey) {
    throw new Error("본인인증이 설정되지 않았습니다.");
  }
  await ensurePortOneSdk();
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

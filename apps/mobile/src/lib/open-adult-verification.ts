import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { AdultVerificationScope } from "@/lib/adult-verification-messages";

WebBrowser.maybeCompleteAuthSession();

const RETURN_URI = Linking.createURL("adult-verification/success");

function adultVerifyWebPath(scope: AdultVerificationScope) {
  return `/auth/mobile/adult-verify?scope=${scope}`;
}

/**
 * 앱 Bearer 로그인 → 웹 세션 → PortOne 본인인증 페이지 → mocomo:// 콜백
 */
export async function openAdultVerificationSession(scope: AdultVerificationScope = "DM_PAID") {
  const { url } = await apiRequest<{ url: string; redirect: string }>(MobileApi.webSession, {
    method: "POST",
    body: { redirect: adultVerifyWebPath(scope) },
    auth: true,
  });

  const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URI, {
    preferEphemeralSession: false,
    showInRecents: true,
  });

  if (result.type !== "success") {
    throw new Error("본인인증이 취소되었습니다.");
  }

  return true;
}

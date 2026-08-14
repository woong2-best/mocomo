import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

WebBrowser.maybeCompleteAuthSession();

/** 앱 Bearer 로그인 → 웹 세션 쿠키 후 해당 페이지 오픈 (판매자 등록 등) */
export async function openMobileWebSession(redirect: string) {
  const { url } = await apiRequest<{ url: string; redirect: string }>(MobileApi.webSession, {
    method: "POST",
    body: { redirect },
    auth: true,
  });
  await WebBrowser.openBrowserAsync(url, {
    showInRecents: true,
    enableBarCollapsing: true,
  });
}

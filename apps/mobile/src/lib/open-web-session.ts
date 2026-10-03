import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

WebBrowser.maybeCompleteAuthSession();

/** App Bearer login → web session cookie, then open the page (seller register, etc.). */
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

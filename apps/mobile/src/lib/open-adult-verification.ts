import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { AdultVerificationScope } from "@/lib/adult-verification-messages";
import { translate } from "@/i18n/runtime";

WebBrowser.maybeCompleteAuthSession();

const RETURN_URI = Linking.createURL("adult-verification/success");

function adultVerifyWebPath(scope: AdultVerificationScope) {
  return `/auth/mobile/adult-verify?scope=${scope}`;
}

/**
 * App Bearer login → web session → PortOne identity page → mocomo:// callback.
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
    throw new Error(translate("m.lib.identity_verification_was_canceled"));
  }

  return true;
}

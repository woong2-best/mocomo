/**
 * Mobile login helper used by the RN app.
 */
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import { setTokens } from "@/auth/token-store";
import type { MobileAuthUser } from "@/auth/types";

export async function loginWithPassword(input: {
  login: string;
  password: string;
  platform: "android" | "ios";
  deviceId?: string;
}): Promise<MobileAuthUser> {
  const data = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: MobileAuthUser;
  }>(MobileApi.auth.login, {
    method: "POST",
    auth: false,
    body: {
      login: input.login,
      password: input.password,
      platform: input.platform,
      deviceId: input.deviceId,
    },
  });

  await setTokens(data.accessToken, data.refreshToken);
  return data.user;
}

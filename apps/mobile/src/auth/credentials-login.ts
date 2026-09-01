import { Platform } from "react-native";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { MobileAuthUser } from "@/auth/types";

export function normalizeLoginId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("@")) return trimmed.slice(1).trim();
  return trimmed;
}

export async function loginWithCredentials(
  login: string,
  password: string
): Promise<{ user: MobileAuthUser; accessToken: string; refreshToken: string }> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  return apiRequest(MobileApi.auth.login, {
    method: "POST",
    auth: false,
    body: {
      login: normalizeLoginId(login),
      password,
      platform,
    },
  });
}

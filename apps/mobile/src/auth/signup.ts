import { Platform } from "react-native";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import { setTokens } from "@/auth/token-store";
import type { MobileAuthUser } from "@/auth/types";

const platform = Platform.OS === "ios" ? "ios" : "android";

export type SignupPayload = {
  email: string;
  username: string;
  password: string;
  name?: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  countryCode?: string;
  timeZone?: string;
  locale?: string;
};

export async function checkSignupAvailability(email: string, username: string, name?: string) {
  return apiRequest<{ ok: boolean; error?: string; canResume?: boolean; message?: string }>(
    MobileApi.auth.signupCheck,
    { method: "POST", auth: false, body: { email, username, name } }
  );
}

export async function registerAccount(payload: SignupPayload) {
  return apiRequest<{ success?: boolean; needsVerification?: boolean; email?: string; error?: string }>(
    MobileApi.auth.signupRegister,
    {
      method: "POST",
      auth: false,
      body: { ...payload, platform, countryCode: payload.countryCode ?? "KR", locale: payload.locale ?? "ko", timeZone: payload.timeZone ?? "Asia/Seoul" },
    }
  );
}

export async function verifySignupAndLogin(email: string, code: string, password: string) {
  const data = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: MobileAuthUser;
  }>(MobileApi.auth.signupVerify, {
    method: "POST",
    auth: false,
    body: { email, code, password, platform },
  });
  await setTokens(data.accessToken, data.refreshToken, data.user);
  return data.user;
}

export async function sendEmailAuthCode(email: string, mode: "signup" | "reset") {
  return apiRequest<{ success?: boolean; message?: string; error?: string; code?: string }>(
    MobileApi.auth.emailCodeSend,
    { method: "POST", auth: false, body: { email, mode } }
  );
}

export async function completePasswordReset(email: string, code: string, newPassword: string) {
  const data = await apiRequest<{
    accessToken?: string;
    refreshToken?: string;
    user?: MobileAuthUser;
    success?: boolean;
    message?: string;
    error?: string;
  }>(MobileApi.auth.passwordResetComplete, {
    method: "POST",
    auth: false,
    body: { email, code, newPassword, platform },
  });

  if (data.accessToken && data.refreshToken && data.user) {
    await setTokens(data.accessToken, data.refreshToken, data.user);
  }
  return data;
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  applyBirthDateIfMissing,
  createOAuthUserWithConsent,
  linkOAuthSignupAccount,
  parseOAuthSignupCompletion,
} from "@/lib/oauth-signup-completion";
import {
  clearWebOAuthPendingSignupCookie,
  establishWebSessionForUser,
  readWebOAuthPendingSignup,
} from "@/lib/web-oauth-pending-signup";
import { findOAuthAccountBySub } from "@/lib/oauth-vault";
import { db } from "@/lib/db";
import { markSignupNeedsRole, signupRoleEntryPath } from "@/lib/signup-role-onboarding";

export async function completeWebOAuthSignup(input: {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  dest?: string;
}): Promise<{ error?: string }> {
  const ticket = await readWebOAuthPendingSignup();
  if (!ticket) {
    return { error: "가입 인증이 만료되었습니다. 다시 로그인해 주세요." };
  }

  const parsed = parseOAuthSignupCompletion(input);
  if (!parsed.ok) return { error: parsed.error };

  const dest = input.dest?.trim();
  const safeDest = dest && dest.startsWith("/") && !dest.startsWith("//") ? dest : "/";

  try {
    const linked =
      ticket.provider === "naver"
        ? await db.account.findFirst({
            where: { provider: "naver", providerAccountId: ticket.sub },
            select: { userId: true },
          })
        : await findOAuthAccountBySub(
            ticket.provider === "google" ? "google" : ticket.provider,
            ticket.sub
          );

    if (linked?.userId) {
      const existing = await db.user.findUnique({
        where: { id: linked.userId },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          email: true,
          locale: true,
          countryCode: true,
          timeZone: true,
          role: true,
          premiumTier: true,
          supportTierSent: true,
          earnedMocoTier: true,
          isBanned: true,
          accountStatus: true,
          birthDate: true,
        },
      });
      if (existing) {
        if (!existing.birthDate) {
          await applyBirthDateIfMissing(existing.id, parsed.birthDate);
        }
        const sessionOk = await establishWebSessionForUser(existing);
        await clearWebOAuthPendingSignupCookie();
        if (!sessionOk) return { error: "세션을 만들지 못했습니다. 다시 시도해 주세요." };
        await markSignupNeedsRole();
        redirect(signupRoleEntryPath(safeDest));
      }
    }

    const user = await createOAuthUserWithConsent({
      profile: ticket.profile,
      birthDate: parsed.birthDate,
    });
    await linkOAuthSignupAccount({
      provider: ticket.provider,
      sub: ticket.sub,
      userId: user.id,
      profile: ticket.profile,
    });

    const sessionOk = await establishWebSessionForUser(user);
    await clearWebOAuthPendingSignupCookie();
    if (!sessionOk) return { error: "세션을 만들지 못했습니다. 다시 시도해 주세요." };

    revalidatePath("/");
    await markSignupNeedsRole();
    redirect(signupRoleEntryPath(safeDest));
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { error: e instanceof Error ? e.message : "가입에 실패했습니다." };
  }
}

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/auth";
import { parseBirthDateInput } from "@/lib/birth-date";
import { birthDateCollectionMeta } from "@/lib/age-policy";

export async function completeBirthDateOnboarding(input: {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  dest?: string;
}): Promise<{ error?: string }> {
  const user = await requireAuthForAction();
  const birthDate = parseBirthDateInput(input.birthYear, input.birthMonth, input.birthDay);
  if (!birthDate) {
    return { error: t("actions.shi8acd") };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      birthDate,
      ...birthDateCollectionMeta("OAUTH_COMPLETE"),
    },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/");

  const dest = input.dest?.trim();
  const safeDest =
    dest && dest.startsWith("/") && !dest.startsWith("//") ? dest : "/";

  const { markSignupNeedsIdentity, signupIdentityEntryPath } = await import(
    "@/lib/signup-identity-onboarding"
  );
  await markSignupNeedsIdentity();
  redirect(signupIdentityEntryPath(safeDest));
}

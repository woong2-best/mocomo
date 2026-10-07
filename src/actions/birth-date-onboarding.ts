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
  const existing = await db.user.findUnique({
    where: { id: user.id },
    select: { birthDate: true },
  });
  if (existing?.birthDate) {
    return { error: "Date of birth is already on file and cannot be changed." };
  }

  const { assertSignupAgeAllowed, isSignupAgeBlocked, SIGNUP_AGE_BLOCKED_MESSAGE } = await import(
    "@/lib/signup-age-block"
  );
  if (await isSignupAgeBlocked()) {
    return { error: SIGNUP_AGE_BLOCKED_MESSAGE };
  }

  const birthDate = parseBirthDateInput(input.birthYear, input.birthMonth, input.birthDay);
  if (!birthDate) {
    return { error: "actions.shi8acd" };
  }
  const ageBlock = await assertSignupAgeAllowed(birthDate);
  if (ageBlock) return ageBlock;

  const collected = birthDateCollectionMeta("OAUTH_COMPLETE");
  const { recordBirthDateChange } = await import("@/lib/birth-date-change-log");
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        birthDate,
        ...collected,
      },
    });
    await recordBirthDateChange(tx, {
      userId: user.id,
      previousValue: null,
      newValue: birthDate,
      source: "OAUTH_COMPLETE",
      createdAt: collected.birthDateCollectedAt,
      changedBy: "user",
    });
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

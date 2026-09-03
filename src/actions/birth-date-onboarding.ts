"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/auth";
import { parseBirthDateInput } from "@/lib/birth-date";

export async function completeBirthDateOnboarding(input: {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  dest?: string;
}): Promise<{ error?: string }> {
  const user = await requireAuthForAction();
  const birthDate = parseBirthDateInput(input.birthYear, input.birthMonth, input.birthDay);
  if (!birthDate) {
    return { error: "올바른 생년월일을 입력해 주세요." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { birthDate },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/");

  const dest = input.dest?.trim();
  if (dest && dest.startsWith("/") && !dest.startsWith("//")) {
    redirect(dest);
  }
  redirect("/");
}

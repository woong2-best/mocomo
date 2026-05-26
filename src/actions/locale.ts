"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  COUNTRY_COOKIE,
  LOCALE_COOKIE,
  isLocale,
  normalizeLocale,
} from "@/lib/i18n/config";

const localeSchema = z.object({
  locale: z.string().refine((v) => isLocale(v), "Invalid locale"),
  countryCode: z.string().min(2).max(8),
});

export async function updateUserLocale(data: { locale: string; countryCode: string }) {
  const parsed = localeSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const locale = normalizeLocale(parsed.data.locale);
  const countryCode = parsed.data.countryCode.toUpperCase();

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  cookieStore.set(COUNTRY_COOKIE, countryCode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await db.user.update({
      where: { id: session.user.id },
      data: { locale, countryCode },
    });
  }

  revalidatePath("/", "layout");
  return { success: true as const, locale, countryCode };
}

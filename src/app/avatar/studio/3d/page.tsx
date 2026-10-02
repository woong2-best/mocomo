import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { redirect } from "next/navigation";

export const metadata = {
  title: t("app.avatar.2d_mocomo"),
  description: t("app.avatar.mocomo_2d"),
};

export default async function Avatar3dStudioPage() {
  redirect("/avatar/studio/2d");
}

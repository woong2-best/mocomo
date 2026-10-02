import { redirect } from "next/navigation";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { AppealForm } from "@/components/appeal/appeal-form";
import { getAppealContext } from "@/actions/appeal";

export default async function AppealPage() {
  const ctx = await getAppealContext();
  if ("error" in ctx) {
    if (ctx.error === "common.error.authRequired") redirect("/auth/signin?callbackUrl=/appeal");
    redirect("/");
  }

  return (
    <AppPageChrome maxWidth="3xl" className="py-8">
      <AppealForm user={ctx.user} openAppeal={ctx.openAppeal} />
    </AppPageChrome>
  );
}

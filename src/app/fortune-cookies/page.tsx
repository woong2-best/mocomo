import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listMyFortuneCookies } from "@/lib/fortune-cookie/service";
import { FortuneCookieCollection } from "@/components/fortune-cookie/fortune-cookie-collection";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { getServerTranslator } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("tower.metaTitle"),
    description: t("tower.metaDesc"),
  };
}

export const dynamic = "force-dynamic";

export default async function FortuneCookiesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/fortune-cookies");
  }

  const { t } = await getServerTranslator();
  const { cookies } = await listMyFortuneCookies(session.user.id, { limit: 80 });

  return (
    <main className="min-h-[70vh] bg-[#f6f3ec]">
      <AppPageChrome maxWidth="lg" spacing="sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#bd8038]">Collection</p>
        <NativePageTitle>
          <h1 className="text-2xl font-bold text-[#3a2a18]">{t("cookie.title")}</h1>
        </NativePageTitle>
        <p className="mb-6 max-w-xl text-sm leading-relaxed text-[#3a2a18]/75">{t("cookie.lead")}</p>
        <FortuneCookieCollection cookies={cookies} />
      </AppPageChrome>
    </main>
  );
}

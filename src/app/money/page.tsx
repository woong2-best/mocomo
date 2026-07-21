import { Banknote } from "lucide-react";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { MoneyHubLinks } from "@/components/money/money-hub-links";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function MoneyPage() {
  const t = await getServerTranslator();

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <NativePageTitle>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-7 w-7 text-muted-foreground" />
          {t("nav.money")}
        </h1>
      </NativePageTitle>
      <MoneyHubLinks />
    </AppPageChrome>
  );
}

import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { SupportTiersPanel } from "@/features/support/SupportTiersPanel";
import { useI18n } from "@/i18n/I18nProvider";

/** Standalone stack route — same content as the wallet tiers tab. */
export function SupportScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();

  return (
    <Screen>
      <AppHeader title={t("m.support.ore_tiers")} leftLabel={t("m.common.back")} onLeftPress={() => navigation.goBack()} />
      <SupportTiersPanel />
    </Screen>
  );
}

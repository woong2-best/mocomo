import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { SupportTiersPanel } from "@/features/support/SupportTiersPanel";

/** Standalone stack route — same content as wallet «등급» tab. */
export function SupportScreen() {
  const navigation = useNavigation();

  return (
    <Screen>
      <AppHeader title="광석 등급" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <SupportTiersPanel />
    </Screen>
  );
}

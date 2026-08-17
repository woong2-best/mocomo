import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/ui/Screen";
import { AppHeader } from "@/ui/AppHeader";
import type { RootStackParamList } from "@/navigation/types";

/** @deprecated 계좌 등록은 지갑 → 수익 탭으로 통합됨 */
export function UsedPhoneVerifyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    navigation.replace("Wallet", { initialTab: "earnings", returnScreen: "UsedCreate" });
  }, [navigation]);

  return (
    <Screen>
      <AppHeader title="중고거래" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <ActivityIndicator />
        <Text style={{ fontWeight: "600", color: "#666" }}>지갑으로 이동 중…</Text>
      </View>
    </Screen>
  );
}

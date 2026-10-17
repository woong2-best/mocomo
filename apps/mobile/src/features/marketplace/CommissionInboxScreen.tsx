import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { answerCommission, fetchCommissions, type CommissionItem } from "@/api/commissions";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/ui/Screen";
import { showIslandError } from "@/ui/IslandToast";

export function CommissionInboxScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["commissions"], queryFn: fetchCommissions });
  const [price, setPrice] = useState<Record<string, string>>({});
  const [days, setDays] = useState<Record<string, string>>({});

  async function answer(item: CommissionItem, action: "accept" | "decline") {
    try {
      const result = await answerCommission({
        id: item.id,
        action,
        price: Number(price[item.id] || 0),
        estimatedDays: Number(days[item.id] || 0),
      });
      await queryClient.invalidateQueries({ queryKey: ["commissions"] });
      if (result.roomId) {
        navigation.navigate("MessageRoom", { roomId: result.roomId, title: item.buyer.username });
      }
    } catch (error) {
      showIslandError(t("m.commission.inbox"), error instanceof Error ? error.message : t("m.common.request_failed"));
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>{t("m.commission.inbox")}</Text>
      {query.isLoading ? <ActivityIndicator /> : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.meta}>{item.mine === "seller" ? item.buyer.username : item.seller.username} · {item.status}</Text>
              <Text style={styles.brief}>{item.brief}</Text>
              {item.mine === "seller" && item.status === "REQUESTED" ? (
                <>
                  <TextInput style={styles.input} keyboardType="number-pad" placeholder={t("m.marketplace.price")} value={price[item.id] ?? ""} onChangeText={(value) => setPrice((prev) => ({ ...prev, [item.id]: value }))} />
                  <TextInput style={styles.input} keyboardType="number-pad" placeholder={t("m.commission.days")} value={days[item.id] ?? ""} onChangeText={(value) => setDays((prev) => ({ ...prev, [item.id]: value }))} />
                  <View style={styles.row}>
                    <Pressable style={styles.accept} onPress={() => void answer(item, "accept")}><Text style={styles.acceptText}>{t("m.commission.accept")}</Text></Pressable>
                    <Pressable style={styles.decline} onPress={() => void answer(item, "decline")}><Text>{t("m.commission.decline")}</Text></Pressable>
                  </View>
                </>
              ) : null}
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", padding: 16 },
  card: { borderWidth: 1, borderColor: "#e6e0d6", borderRadius: 14, padding: 12, gap: 8, backgroundColor: "#fff" },
  meta: { fontSize: 12, fontWeight: "700", color: "#6b645b" },
  brief: { fontSize: 15 },
  input: { borderWidth: 1, borderColor: "#e6e0d6", borderRadius: 10, padding: 8 },
  row: { flexDirection: "row", gap: 8 },
  accept: { backgroundColor: "#1b4a8c", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  acceptText: { color: "#fff", fontWeight: "800" },
  decline: { borderWidth: 1, borderColor: "#d9d1c5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});

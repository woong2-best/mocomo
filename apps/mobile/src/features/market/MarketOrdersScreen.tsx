import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMarketOrders } from "@/api/commerce-market";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { formatUsd } from "@/lib/money";

export function MarketOrdersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

  const query = useQuery({
    queryKey: ["mobile-market-orders", role],
    queryFn: () => fetchMarketOrders(role),
  });

  return (
    <Screen>
      <AppHeader title="내 주문" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={styles.tabs}>
        {(["buyer", "seller"] as const).map((r) => (
          <Pressable
            key={r}
            style={[styles.tab, role === r && styles.tabActive]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.tabText, role === r && styles.tabTextActive]}>
              {r === "buyer" ? "구매" : "판매"}
            </Text>
          </Pressable>
        ))}
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : (
        <FlatList
          data={query.data?.orders ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {role === "buyer" ? "구매 내역이 없습니다." : "판매 주문이 없습니다."}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.status}>{item.status}</Text>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                </Text>
              </View>
              {item.items.map((line, i) => (
                <Text key={`${item.id}-${i}`} style={styles.line} numberOfLines={2}>
                  {line.title} × {line.quantity} · {formatUsd(line.unitPrice)}
                </Text>
              ))}
              <Text style={styles.total}>
                합계 {formatUsd(item.subtotalAmount + item.shippingAmount)}
              </Text>
              {role === "buyer" && item.seller ? (
                <Text style={styles.party}>판매자 @{item.seller.username}</Text>
              ) : null}
              {role === "seller" && item.buyer ? (
                <Text style={styles.party}>구매자 @{item.buyer.username}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tabs: {
      flexDirection: "row",
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      overflow: "hidden",
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
    tabActive: { backgroundColor: colors.terracotta },
    tabText: { fontWeight: "800", color: colors.cobalt },
    tabTextActive: { color: colors.textOnAccent },
    empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl, fontWeight: "600" },
    card: {
      padding: 14,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      backgroundColor: colors.surfaceRaised,
      gap: 4,
    },
    cardHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    status: { fontWeight: "800", color: colors.terracotta },
    date: { fontSize: 12, color: colors.textMuted },
    line: { fontSize: 14, color: colors.text },
    total: { marginTop: 6, fontWeight: "800", color: colors.cobalt },
    party: { fontSize: 12, color: colors.textMuted },
  });
}

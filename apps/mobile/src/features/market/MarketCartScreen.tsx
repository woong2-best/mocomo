import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import {
  getMarketplaceCart,
  removeFromMarketplaceCart,
  updateMarketplaceCartQuantity,
  type MarketplaceCartItem,
} from "@/lib/marketplace-cart";
import type { MarketplaceCheckoutBody } from "@/api/star-market";
import { MarketplacePaymentSheet } from "@/payments/MarketplacePaymentSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function formatPrice(amount: number, currency: string) {
  if (currency === "KRW" || !currency) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }
  return `${amount.toLocaleString()} ${currency}`;
}

export function MarketCartScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MarketplaceCartItem[]>([]);
  const [payItem, setPayItem] = useState<MarketplaceCartItem | null>(null);
  const [payVisible, setPayVisible] = useState(false);

  const reload = useCallback(() => {
    void getMarketplaceCart().then(setItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  function checkout(item: MarketplaceCartItem) {
    setPayItem(item);
    setPayVisible(true);
  }

  async function handlePaySuccess(item: MarketplaceCartItem) {
    await removeFromMarketplaceCart(item.listingId);
    reload();
    Alert.alert("결제 완료", "주문이 접수되었습니다.");
  }

  return (
    <Screen>
      <AppHeader title="장바구니" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.listingId}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: 12 }}
        ListEmptyComponent={
          <Text style={styles.empty}>장바구니가 비어 있습니다.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.coverUrl ? (
              <Image
                source={{ uri: item.coverUrl }}
                style={styles.thumb}
                cachePolicy={IMAGE_CACHE_POLICY}
              />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]} />
            )}
            <View style={styles.meta}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.price}>
                {formatPrice(item.priceAmount * item.quantity, item.currency)}
              </Text>
              <View style={styles.qtyRow}>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() =>
                    void updateMarketplaceCartQuantity(item.listingId, item.quantity - 1).then(reload)
                  }
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{item.quantity}</Text>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() =>
                    void updateMarketplaceCartQuantity(item.listingId, item.quantity + 1).then(reload)
                  }
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
                <Pressable
                  onPress={() => void removeFromMarketplaceCart(item.listingId).then(reload)}
                  hitSlop={8}
                >
                  <Text style={styles.remove}>삭제</Text>
                </Pressable>
              </View>
              <FolkButton
                label="결제하기"
                onPress={() => checkout(item)}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        )}
      />
      {payItem ? (
        <MarketplacePaymentSheet
          visible={payVisible}
          listingId={payItem.listingId}
          body={{ quantity: payItem.quantity }}
          onClose={() => setPayVisible(false)}
          onSuccess={() => {
            void handlePaySuccess(payItem);
            setPayVisible(false);
            setPayItem(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl, fontWeight: "600" },
    row: {
      flexDirection: "row",
      gap: 12,
      padding: 12,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      backgroundColor: colors.surfaceRaised,
    },
    thumb: { width: 80, height: 80, borderRadius: radii.md },
    thumbFallback: { backgroundColor: colors.muted },
    meta: { flex: 1 },
    title: { fontSize: 15, fontWeight: "800", color: colors.text },
    price: { marginTop: 4, fontSize: 14, fontWeight: "800", color: colors.cobalt },
    qtyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    qtyBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    qtyBtnText: { fontSize: 16, fontWeight: "800", color: colors.text },
    qty: { fontWeight: "800", minWidth: 20, textAlign: "center" },
    remove: { marginLeft: "auto", color: colors.danger, fontWeight: "700", fontSize: 13 },
  });
}

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
import {
  fetchMarketCartSummary,
  prepareCartCheckout,
  type CartCheckoutGroup,
} from "@/api/commerce-market";
import { MarketplacePaymentSheet } from "@/payments/MarketplacePaymentSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { formatUsd } from "@/lib/money";
import {
  MARKETPLACE_SHIP_COUNTRIES,
  shipCountryLabel,
} from "@/lib/marketplace-shipping";

function formatPrice(amount: number) {
  return formatUsd(amount);
}

export function MarketCartScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MarketplaceCartItem[]>([]);
  const [groups, setGroups] = useState<CartCheckoutGroup[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [payGroup, setPayGroup] = useState<CartCheckoutGroup | null>(null);
  const [payVisible, setPayVisible] = useState(false);
  const [shipName, setShipName] = useState("");
  const [shipCountry, setShipCountry] = useState("US");
  const [shipPostal, setShipPostal] = useState("");
  const [shipAddress1, setShipAddress1] = useState("");
  const [shipAddress2, setShipAddress2] = useState("");
  const [shipPhone, setShipPhone] = useState("");

  const reload = useCallback(() => {
    void getMarketplaceCart().then(async (cart) => {
      setItems(cart);
      if (cart.length === 0) {
        setGroups([]);
        return;
      }
      try {
        const summary = await fetchMarketCartSummary(
          cart.map((c) => ({ listingId: c.listingId, quantity: c.quantity }))
        );
        setGroups(summary.groups);
        setDisclaimer(summary.disclaimer);
        setBlocked(!!summary.blocked || summary.checkoutMode === "BLOCKED");
      } catch {
        setGroups([]);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  function startGroupCheckout(group: CartCheckoutGroup) {
    if (blocked) {
      Alert.alert("이용 불가", disclaimer || "해당 지역에서 이용할 수 없습니다.");
      return;
    }
    setPayGroup(group);
    setPayVisible(true);
  }

  async function handlePaySuccess(group: CartCheckoutGroup) {
    for (const line of group.lines) {
      await removeFromMarketplaceCart(line.listingId);
    }
    reload();
    Alert.alert("결제 완료", "주문이 접수되었습니다.");
  }

  const checkoutListingId = payGroup?.lines[0]?.listingId ?? "";

  return (
    <Screen>
      <AppHeader title="장바구니" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {disclaimer ? (
        <Text style={[styles.disclaimer, blocked && { color: colors.terracotta }]}>{disclaimer}</Text>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.listingId}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 24, gap: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>장바구니가 비어 있습니다.</Text>}
        ListFooterComponent={
          groups.length > 0 ? (
            <View style={styles.checkoutBlock}>
              <Text style={styles.checkoutTitle}>판매자별 결제 (웹과 동일)</Text>
              <Text style={styles.shipTitle}>배송지 (실물 상품)</Text>
              <TextInput
                style={styles.input}
                placeholder="이름"
                placeholderTextColor={colors.textMuted}
                value={shipName}
                onChangeText={setShipName}
              />
              <View style={styles.chipRow}>
                {MARKETPLACE_SHIP_COUNTRIES.map((c) => (
                  <Pressable
                    key={c.code}
                    style={[styles.chip, shipCountry === c.code && styles.chipActive]}
                    onPress={() => setShipCountry(c.code)}
                  >
                    <Text style={styles.chipText}>{shipCountryLabel(c.code)}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="우편번호 · 주소 · 연락처"
                placeholderTextColor={colors.textMuted}
                value={shipAddress1}
                onChangeText={setShipAddress1}
              />
              {groups.map((g) => (
                <View key={g.sellerId} style={styles.groupCard}>
                  <Text style={styles.groupSeller}>{g.sellerDisplayName}</Text>
                  <Text style={styles.groupMeta}>
                    {g.itemCount}종 · {formatPrice(g.total)}
                  </Text>
                  <FolkButton label="이 판매자 상품 결제" onPress={() => startGroupCheckout(g)} />
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.thumb} cachePolicy={IMAGE_CACHE_POLICY} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]} />
            )}
            <View style={styles.meta}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.price}>{formatPrice(item.priceAmount * item.quantity)}</Text>
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
                <Pressable onPress={() => void removeFromMarketplaceCart(item.listingId).then(reload)} hitSlop={8}>
                  <Text style={styles.remove}>삭제</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {payGroup && checkoutListingId ? (
          <MarketplacePaymentSheet
            visible={payVisible}
            listingId={checkoutListingId}
            body={{
              shipName: shipName.trim() || undefined,
              shipCountry,
              shipPostal: shipPostal.trim() || undefined,
              shipAddress1: shipAddress1.trim() || undefined,
              shipAddress2: shipAddress2.trim() || undefined,
              shipPhone: shipPhone.trim() || undefined,
            }}
            prepareCheckout={() =>
              prepareCartCheckout(payGroup.sellerId, {
                items: payGroup.lines.map((l) => ({
                  listingId: l.listingId,
                  quantity: l.quantity,
                })),
                shipName: shipName.trim() || undefined,
                shipCountry,
                shipPostal: shipPostal.trim() || undefined,
                shipAddress1: shipAddress1.trim() || undefined,
                shipAddress2: shipAddress2.trim() || undefined,
                shipPhone: shipPhone.trim() || undefined,
              })
            }
            onClose={() => setPayVisible(false)}
            onSuccess={() => {
              void handlePaySuccess(payGroup);
              setPayVisible(false);
              setPayGroup(null);
            }}
          />
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl, fontWeight: "600" },
    disclaimer: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
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
    checkoutBlock: { marginTop: spacing.lg, gap: 10 },
    checkoutTitle: { fontWeight: "800", fontSize: 16, color: colors.text },
    groupCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: 8,
      backgroundColor: colors.surface,
    },
    groupSeller: { fontWeight: "800", color: colors.text },
    groupMeta: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    shipPanel: { padding: spacing.md, gap: 8 },
    shipTitle: { fontWeight: "800", color: colors.textMuted, fontSize: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    chipText: { fontSize: 12, fontWeight: "700", color: colors.text },
  });
}

import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMarketplaceDetail,
  placeMarketplaceBid,
  startMarketplaceTradeChat,
  toggleMarketplaceFavorite,
} from "@/api/marketplace";
import { UsedAuctionBidHoldSheet } from "@/payments/UsedAuctionBidHoldSheet";
import { ApiError } from "@/api/client";
import { UsedMeetMapCard } from "@/features/marketplace/UsedMeetMapCard";
import { formatUsedPrice } from "@/features/marketplace/used-catalog";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function apiErrMessage(err: unknown, fallback: string) {
  if (
    err instanceof ApiError &&
    err.body &&
    typeof err.body === "object" &&
    "error" in err.body &&
    typeof (err.body as { error: unknown }).error === "string"
  ) {
    return (err.body as { error: string }).error;
  }
  return fallback;
}

export function MarketplaceDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "MarketplaceDetail">>();
  const queryClient = useQueryClient();
  const [bidText, setBidText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [holdSheet, setHoldSheet] = useState<{ amount: number } | null>(null);

  const query = useQuery({
    queryKey: ["mobile-marketplace", route.params.id],
    queryFn: () => fetchMarketplaceDetail(route.params.id),
  });
  const item = query.data?.item;
  const nsfwGate = !!item?.isNsfw && !item?.isOwner;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["mobile-marketplace", route.params.id] });

  const favorite = useMutation({
    mutationFn: () => toggleMarketplaceFavorite(route.params.id),
    onSuccess: async (res) => {
      setMsg(res.favorited ? "관심 등록" : "관심 해제");
      await invalidate();
    },
    onError: (err) => setMsg(apiErrMessage(err, "관심 등록에 실패했습니다.")),
  });

  const trade = useMutation({
    mutationFn: () => startMarketplaceTradeChat(route.params.id),
    onSuccess: (res) => {
      navigation.navigate("MessageRoom", { roomId: res.roomId, title: "거래 문의" });
    },
    onError: (err) => setMsg(apiErrMessage(err, "채팅을 열 수 없습니다.")),
  });

  const bid = useMutation({
    mutationFn: (amount: number) =>
      placeMarketplaceBid(route.params.id, amount, { termsAccepted: true }),
    onSuccess: async (res) => {
      if (res.error) {
        if (res.needsBidHold) {
          setHoldSheet({ amount: Number(bidText.replace(/,/g, "")) || 0 });
          return;
        }
        setMsg(res.error);
        return;
      }
      if (!res.amount) {
        setMsg("입찰에 실패했습니다.");
        return;
      }
      setMsg(`입찰 완료 · ${formatUsedPrice(res.amount, item?.currency)}`);
      setBidText("");
      await invalidate();
    },
    onError: (err) => {
      const body =
        err instanceof ApiError &&
        err.body &&
        typeof err.body === "object" &&
        "needsBidHold" in err.body &&
        (err.body as { needsBidHold?: boolean }).needsBidHold;
      if (body) {
        setHoldSheet({ amount: Number(bidText.replace(/,/g, "")) || 0 });
        return;
      }
      setMsg(apiErrMessage(err, "입찰에 실패했습니다."));
    },
  });

  const onBid = () => {
    const amount = Number(bidText.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("입찰가", "올바른 금액을 입력해 주세요.");
      return;
    }
    bid.mutate(amount);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>뒤로</Text>
        </Pressable>
        <Text style={styles.heading}>상품</Text>
      </View>
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : query.isError || !item ? (
        <Text style={styles.error}>상품을 불러오지 못했습니다.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <SensitiveContentGate enabled={nsfwGate}>
            {item.images?.[0] ? (
              <Image
                source={{ uri: item.images[0] }}
                style={styles.hero}
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={0}
              />
            ) : (
              <View style={[styles.hero, styles.heroFallback]} />
            )}
          </SensitiveContentGate>
          <View style={styles.body}>
            <Text style={styles.price}>
              {item.saleType === "AUCTION" && item.currentBidAmount != null
                ? `현재가 ${formatUsedPrice(item.currentBidAmount, item.currency)}`
                : formatUsedPrice(Number(item.price ?? 0), item.currency)}
            </Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>
              {item.region || "지역 미정"}
              {item.seller?.username ? ` · @${item.seller.username}` : ""}
            </Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

            {item.map &&
            Number.isFinite(item.map.lat) &&
            Number.isFinite(item.map.lng) &&
            item.map.kakaoMapUrl ? (
              <UsedMeetMapCard map={item.map} />
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={styles.btnSecondary}
                disabled={favorite.isPending}
                onPress={() => favorite.mutate()}
              >
                <Text style={styles.btnSecondaryText}>
                  {item.favorited ? "관심 해제" : "관심"}
                </Text>
              </Pressable>
              {!item.isOwner && !item.auctionLive ? (
                <Pressable
                  style={styles.btn}
                  disabled={trade.isPending}
                  onPress={() => {
                    if (item.buyerChatRoomId) {
                      navigation.navigate("MessageRoom", {
                        roomId: item.buyerChatRoomId,
                        title: "거래 문의",
                      });
                    } else {
                      trade.mutate();
                    }
                  }}
                >
                  <Text style={styles.btnText}>채팅하기</Text>
                </Pressable>
              ) : null}
            </View>

            {item.auctionLive && !item.isOwner ? (
              <View style={styles.bidBox}>
                <Text style={styles.bidLabel}>
                  최소 입찰 {item.minNextBid != null ? formatUsedPrice(item.minNextBid, item.currency) : "-"}
                  {item.bidCount != null ? ` · 입찰 ${item.bidCount}회` : ""}
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="입찰가"
                  placeholderTextColor={colors.textMuted}
                  value={bidText}
                  onChangeText={setBidText}
                />
                <Pressable
                  style={[styles.btn, bid.isPending && styles.btnDisabled]}
                  disabled={bid.isPending}
                  onPress={onBid}
                >
                  <Text style={styles.btnText}>입찰하기</Text>
                </Pressable>
              </View>
            ) : null}

            {msg ? <Text style={styles.note}>{msg}</Text> : null}
          </View>
        </ScrollView>
      )}
      {holdSheet ? (
        <UsedAuctionBidHoldSheet
          visible
          listingId={route.params.id}
          bidAmount={holdSheet.amount}
          currency={item?.currency}
          onClose={() => setHoldSheet(null)}
          onSuccess={async (res) => {
            setHoldSheet(null);
            setMsg(`입찰 완료 · ${formatUsedPrice(res.amount, item?.currency)}`);
            setBidText("");
            await invalidate();
          }}
        />
      ) : null}
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { color: colors.accent, fontWeight: "600" },
  heading: { fontSize: 20, fontWeight: "800", color: colors.text },
  hero: { width: "100%", aspectRatio: 1, backgroundColor: colors.border },
  heroFallback: {},
  body: { padding: spacing.md, backgroundColor: colors.surface },
  price: { fontSize: 22, fontWeight: "800", color: colors.text },
  title: { marginTop: 8, fontSize: 18, fontWeight: "700", color: colors.text },
  sub: { marginTop: 6, color: colors.textMuted },
  desc: { marginTop: spacing.md, color: colors.text, lineHeight: 22 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  btnSecondary: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  btnSecondaryText: { color: colors.text, fontWeight: "700" },
  bidBox: { marginTop: spacing.lg, gap: spacing.sm },
  bidLabel: { color: colors.textMuted, fontWeight: "600" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.background,
  },
  note: { marginTop: spacing.md, color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.danger, padding: spacing.lg },
});
}


import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  confirmAuctionTrade,
  fetchMarketplaceDetail,
  placeMarketplaceBid,
  startMarketplaceTradeChat,
  toggleMarketplaceFavorite,
} from "@/api/marketplace";
import {
  AUCTION_INSUFFICIENT_WALLET_MSG,
  fetchAuctionDepositStatus,
} from "@/api/auction-deposit";
import { UsedAuctionBidHoldSheet } from "@/payments/UsedAuctionBidHoldSheet";
import { ApiError } from "@/api/client";
import { UsedMeetMapCard } from "@/features/marketplace/UsedMeetMapCard";
import {
  SubcultureMetaChips,
  UsedSaleStatsCard,
} from "@/features/marketplace/UsedSubcultureDetailCards";
import { UsedWtbAlertCard } from "@/features/marketplace/UsedWtbAlertCard";
import { AuctionCountdown } from "@/features/marketplace/AuctionCountdown";
import {
  displayUsedRegion,
  formatUsedPrice,
  parseListingPriceInput,
  USED_CURRENCY_META,
  usedPriceInputValue,
} from "@/features/marketplace/used-catalog";
import { rememberViewedListing } from "@/features/marketplace/market-memory";
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

function auctionQuickBids(item: {
  minNextBid: number | null;
  bidIncrement: number | null;
  currency?: string | null;
}) {
  const base = item.minNextBid ?? 0;
  if (base <= 0) return [];
  const inc =
    item.bidIncrement && item.bidIncrement > 0
      ? item.bidIncrement
      : (item.currency ?? "krw") === "usd"
        ? 100
        : 1000;
  return [0, 1, 2, 4]
    .map((n) => base + n * inc)
    .filter((value, index, all) => all.indexOf(value) === index);
}

function mineTradeConfirmed(item: {
  isOwner?: boolean;
  isWinningBidder?: boolean;
  sellerTradeConfirmed?: boolean;
  buyerTradeConfirmed?: boolean;
}) {
  if (item.isOwner) return !!item.sellerTradeConfirmed;
  if (item.isWinningBidder) return !!item.buyerTradeConfirmed;
  return false;
}

export function MarketplaceDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "MarketplaceDetail" | "AuctionDetail">>();
  const queryClient = useQueryClient();
  const [bidText, setBidText] = useState("");
  const bidPrefilled = useRef(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [holdSheet, setHoldSheet] = useState<{ amount: number } | null>(null);

  const query = useQuery({
    queryKey: ["mobile-marketplace", route.params.id],
    queryFn: () => fetchMarketplaceDetail(route.params.id),
  });
  const item = query.data?.item;

  useEffect(() => {
    if (route.params.id) void rememberViewedListing(route.params.id);
  }, [route.params.id]);

  useEffect(() => {
    if (bidPrefilled.current || item?.minNextBid == null) return;
    bidPrefilled.current = true;
    setBidText(usedPriceInputValue(item.minNextBid, item.currency));
  }, [item?.minNextBid, item?.currency]);

  const depositQuery = useQuery({
    queryKey: ["mobile-auction-deposit", route.params.id],
    queryFn: () => fetchAuctionDepositStatus(route.params.id),
    enabled: !!item?.auctionLive && !item?.isOwner,
  });
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

  const tradeComplete = useMutation({
    mutationFn: () => confirmAuctionTrade(route.params.id),
    onSuccess: async (res) => {
      setMsg(
        res.completed
          ? "거래가 완료되어 보증금 2 MOCO가 돌아왔습니다."
          : "거래 완료를 남겼습니다. 상대방도 누르면 보증금이 돌아옵니다."
      );
      await invalidate();
    },
    onError: (err) => setMsg(apiErrMessage(err, "거래 완료 처리에 실패했습니다.")),
  });

  const bid = useMutation({
    mutationFn: (amount: number) =>
      placeMarketplaceBid(route.params.id, amount, { termsAccepted: true }),
    onSuccess: async (res) => {
      if (res.error) {
        if (res.needsBidHold) {
          setHoldSheet({ amount: parseListingPriceInput(bidText, item?.currency ?? "krw") });
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
        setHoldSheet({ amount: parseListingPriceInput(bidText, item?.currency ?? "krw") });
        return;
      }
      setMsg(apiErrMessage(err, "입찰에 실패했습니다."));
    },
  });

  const onBid = async () => {
    try {
      const deposit =
        depositQuery.data ?? (await fetchAuctionDepositStatus(route.params.id));
      if (!deposit.canParticipate) {
        showIslandError("경매 참여 불가", AUCTION_INSUFFICIENT_WALLET_MSG);
        return;
      }
    } catch {
      showIslandError("경매 참여 불가", "지갑 잔액을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const amount = parseListingPriceInput(bidText, item?.currency ?? "krw");
    if (!Number.isFinite(amount) || amount <= 0) {
      showIslandError("입찰가", "올바른 금액을 입력해 주세요.");
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
        <Text style={styles.heading}>{item?.saleType === "AUCTION" ? "경매" : "상품"}</Text>
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
            {item.saleType === "AUCTION" && item.auctionEndsAt ? (
              <AuctionCountdown endsAt={item.auctionEndsAt} variant="clock" />
            ) : null}
            <Text style={styles.title}>{item.title}</Text>
            <SubcultureMetaChips
              workTitle={item.workTitle}
              productType={item.productType}
              characterName={item.characterName}
              conditionGrade={item.conditionGrade}
              tradeMode={item.tradeMode}
            />
            <Text style={styles.sub}>
              {displayUsedRegion(item.region || "") || "지역 미정"}
              {item.seller?.username ? ` · @${item.seller.username}` : ""}
            </Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

            <UsedSaleStatsCard
              workTitle={item.workTitle}
              animeSlug={item.animeSlug}
              productType={item.productType}
              characterName={item.characterName}
            />

            {!item.isOwner ? (
              <UsedWtbAlertCard
                workTitle={item.workTitle}
                animeSlug={item.animeSlug}
                productType={item.productType}
                characterName={item.characterName}
                currency={item.currency}
                isOwner={item.isOwner}
                status={item.status}
              />
            ) : null}

            {item.map && Number.isFinite(item.map.lat) && Number.isFinite(item.map.lng) ? (
              <UsedMeetMapCard map={item.map} title={item.title} />
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

            {item.saleType === "AUCTION" &&
            !item.auctionLive &&
            item.winningBidderId &&
            item.status !== "SOLD" &&
            (item.isOwner || item.isWinningBidder) ? (
              <View style={styles.bidBox}>
                <Text style={styles.bidLabel}>
                  거래가 끝나면 판매자와 낙찰자가 각각 거래 완료를 눌러 주세요. 둘 다 누르면 보증금 2 MOCO가 각각 돌아옵니다.
                </Text>
                <Pressable
                  style={[styles.btn, (tradeComplete.isPending || mineTradeConfirmed(item)) && styles.btnDisabled]}
                  disabled={tradeComplete.isPending || mineTradeConfirmed(item)}
                  onPress={() => tradeComplete.mutate()}
                >
                  <Text style={styles.btnText}>
                    {mineTradeConfirmed(item) ? "상대방 확인 대기" : "거래 완료"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {item.auctionLive && !item.isOwner ? (
              <View style={styles.bidBox}>
                <Text style={styles.bidLabel}>
                  최소 입찰 {item.minNextBid != null ? formatUsedPrice(item.minNextBid, item.currency) : "-"}
                  {item.bidCount != null ? ` · 입찰 ${item.bidCount}회` : ""}
                </Text>
                <View style={styles.quickRow}>
                  {auctionQuickBids(item).map((amount) => (
                    <Pressable
                      key={amount}
                      style={styles.quickChip}
                      onPress={() => setBidText(usedPriceInputValue(amount, item.currency))}
                    >
                      <Text style={styles.quickChipText}>{formatUsedPrice(amount, item.currency)}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.pricePrefix}>
                    {(USED_CURRENCY_META[item.currency ?? "krw"] ?? USED_CURRENCY_META.krw).symbol}
                  </Text>
                  <TextInput
                    style={styles.priceInput}
                    keyboardType={(item.currency ?? "krw") === "usd" ? "decimal-pad" : "number-pad"}
                    placeholder={(item.currency ?? "krw") === "usd" ? "달러로 입력" : "금액 입력"}
                    placeholderTextColor={colors.textMuted}
                    value={bidText}
                    onChangeText={setBidText}
                  />
                </View>
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
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: {
    borderWidth: 1.5,
    borderColor: "rgba(27, 74, 140, 0.35)",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickChipText: { color: colors.cobalt, fontWeight: "800", fontSize: 13 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(27, 74, 140, 0.28)",
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
  },
  pricePrefix: { color: colors.cobalt, fontWeight: "900", fontSize: 18, marginRight: 6 },
  priceInput: { flex: 1, paddingVertical: 12, color: colors.text, fontWeight: "800", fontSize: 18 },
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


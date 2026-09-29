import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
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
  toggleMarketplaceStar,
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
import { AuctionCountdown } from "@/features/marketplace/AuctionCountdown";
import { USED_AUCTION_RETIRED, USED_AUCTION_RETIRED_MSG } from "@/lib/retired-product-features";
import {
  displayUsedRegion,
  formatUsedPrice,
  parseListingPriceInput,
  USED_CURRENCY_META,
  usedListingMediaItems,
  usedPriceInputValue,
} from "@/features/marketplace/used-catalog";
import { rememberViewedListing } from "@/features/marketplace/market-memory";
import { FeedImageLightbox } from "@/features/feed/FeedImageLightbox";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";

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

function HeroVideoSlide({ url, width, active }: { url: string; width: number; active: boolean }) {
  const player = useVideoPlayer(active ? url : null, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    if (!active) player.pause();
  }, [active, player]);
  return (
    <VideoView
      player={player}
      style={{ width, aspectRatio: 1, backgroundColor: "#000" }}
      contentFit="contain"
      nativeControls
    />
  );
}

export function MarketplaceDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "MarketplaceDetail" | "AuctionDetail">>();
  const queryClient = useQueryClient();
  const { status: authStatus } = useAuth();
  const screenWidth = Dimensions.get("window").width;
  const [bidText, setBidText] = useState("");
  const bidPrefilled = useRef(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [holdSheet, setHoldSheet] = useState<{ amount: number } | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const keyboardHeight = useKeyboardBottomInset();
  const { height: windowHeight } = useWindowDimensions();
  const relaxedHeightRef = useRef(windowHeight);
  if (keyboardHeight === 0) relaxedHeightRef.current = windowHeight;
  const resizedBy =
    Platform.OS === "android" && keyboardHeight > 0
      ? Math.max(0, relaxedHeightRef.current - windowHeight)
      : 0;
  const keyboardLift =
    Platform.OS === "ios"
      ? keyboardHeight
      : Math.max(0, keyboardHeight - resizedBy);
  const keyboardOpen = keyboardLift > 0;

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
  const mediaItems = useMemo(
    () => usedListingMediaItems(item?.images ?? []),
    [item?.images]
  );

  useEffect(() => {
    setHeroIndex(0);
  }, [route.params.id, mediaItems.length]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const onHeroScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / screenWidth);
      if (next >= 0 && next < mediaItems.length) setHeroIndex(next);
    },
    [mediaItems.length, screenWidth]
  );

  const renderHeroSlide: ListRenderItem<(typeof mediaItems)[number]> = useCallback(
    ({ item: slide, index }) => {
      const isVideo = slide.kind === "video";
      return (
        <Pressable
          style={{ width: screenWidth, aspectRatio: 1 }}
          onPress={() => openLightbox(index)}
          accessibilityRole="button"
          accessibilityLabel="사진 크게 보기"
        >
          {isVideo ? (
            <HeroVideoSlide url={slide.url} width={screenWidth} active={heroIndex === index && !lightboxOpen} />
          ) : (
            <Image
              source={{ uri: slide.url }}
              style={styles.hero}
              cachePolicy={IMAGE_CACHE_POLICY}
              transition={0}
            />
          )}
        </Pressable>
      );
    },
    [heroIndex, lightboxOpen, openLightbox, screenWidth, styles.hero]
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["mobile-marketplace", route.params.id] });

  const star = useMutation({
    mutationFn: () => toggleMarketplaceStar(route.params.id),
    onSuccess: async (res) => {
      setMsg(res.starred ? "STAR에 저장했습니다." : "STAR에서 뺐습니다.");
      await invalidate();
      void queryClient.invalidateQueries({ queryKey: ["mobile-star-market"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-star-hub"] });
    },
    onError: (err) => setMsg(apiErrMessage(err, "STAR 저장에 실패했습니다.")),
  });

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
      navigation.navigate("MessageRoom", { roomId: res.roomId, title: "거래 메시지" });
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
    if (USED_AUCTION_RETIRED) {
      showIslandError("경매 종료", USED_AUCTION_RETIRED_MSG);
      return;
    }
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
        <Text style={styles.heading}>
          {item?.saleType === "AUCTION" && !USED_AUCTION_RETIRED ? "경매" : "상품"}
        </Text>
        <View style={styles.topActions}>
          {item ? (
            <Pressable
              style={styles.topHeart}
              disabled={star.isPending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={item.starred ? "STAR 해제" : "STAR 저장"}
              onPress={() => {
                if (authStatus !== "signedIn") {
                  showIslandError("로그인 필요", "STAR 저장은 로그인 후 이용할 수 있습니다.");
                  return;
                }
                star.mutate();
              }}
            >
              <Ionicons
                name={item.starred ? "star" : "star-outline"}
                size={24}
                color={item.starred ? colors.gold : colors.textMuted}
              />
            </Pressable>
          ) : (
            <View style={styles.topHeartSpacer} />
          )}
          {item && !item.isOwner ? (
            <Pressable
              style={styles.topHeart}
              disabled={favorite.isPending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={item.favorited ? "관심 해제" : "관심 등록"}
              onPress={() => {
                if (authStatus !== "signedIn") {
                  showIslandError("로그인 필요", "관심 등록은 로그인 후 이용할 수 있습니다.");
                  return;
                }
                favorite.mutate();
              }}
            >
              <Ionicons
                name={item.favorited ? "heart" : "heart-outline"}
                size={24}
                color={item.favorited ? colors.like : colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : query.isError || !item ? (
        <Text style={styles.error}>상품을 불러오지 못했습니다.</Text>
      ) : (
        <View style={[styles.flex, { marginBottom: keyboardLift }]}>
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: item.auctionLive && !item.isOwner ? spacing.sm : insets.bottom + 24,
          }}
        >
          <SensitiveContentGate enabled={nsfwGate}>
            {mediaItems.length > 0 ? (
              <View>
                <FlatList
                  data={mediaItems}
                  keyExtractor={(slide) => slide.id}
                  renderItem={renderHeroSlide}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onHeroScrollEnd}
                  getItemLayout={(_, i) => ({
                    length: screenWidth,
                    offset: screenWidth * i,
                    index: i,
                  })}
                />
                {mediaItems.length > 1 ? (
                  <Text style={styles.heroCounter}>
                    {heroIndex + 1}/{mediaItems.length}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={[styles.hero, styles.heroFallback]} />
            )}
          </SensitiveContentGate>
          <View style={styles.body}>
            {item.saleType === "AUCTION" && USED_AUCTION_RETIRED ? (
              <View style={styles.retiredBanner}>
                <Text style={styles.retiredBannerText}>{USED_AUCTION_RETIRED_MSG}</Text>
              </View>
            ) : null}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>
              {item.saleType === "AUCTION"
                ? `최소 입찰 ${
                    item.minNextBid != null
                      ? formatUsedPrice(item.minNextBid, item.currency)
                      : formatUsedPrice(Number(item.price ?? 0), item.currency)
                  }${item.bidCount != null ? ` · 입찰 ${item.bidCount}회` : ""}`
                : formatUsedPrice(Number(item.price ?? 0), item.currency)}
            </Text>
            {item.saleType === "AUCTION" && item.auctionEndsAt && !USED_AUCTION_RETIRED ? (
              <View style={styles.timer}>
                <AuctionCountdown endsAt={item.auctionEndsAt} variant="clock" />
              </View>
            ) : null}
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
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
            {item.meetPlace?.trim() ? (
              <Text style={styles.meetPlace}>거래 희망 장소 · {item.meetPlace.trim()}</Text>
            ) : null}

            <UsedSaleStatsCard
              workTitle={item.workTitle}
              animeSlug={item.animeSlug}
              productType={item.productType}
              characterName={item.characterName}
            />

            {item.map && Number.isFinite(item.map.lat) && Number.isFinite(item.map.lng) ? (
              <UsedMeetMapCard
                map={item.map}
                region={item.region}
                meetPlace={item.meetPlace}
              />
            ) : null}

            {!item.auctionLive &&
            item.status !== "SOLD" &&
            (item.saleType === "AUCTION"
              ? !!item.winningBidderId && (item.isOwner || item.isWinningBidder)
              : !item.isOwner) ? (
              <View style={styles.actions}>
                <Pressable
                  style={styles.btn}
                  disabled={trade.isPending}
                  onPress={() => {
                    if (item.buyerChatRoomId) {
                      navigation.navigate("MessageRoom", {
                        roomId: item.buyerChatRoomId,
                        title: item.title,
                      });
                    } else {
                      trade.mutate();
                    }
                  }}
                >
                  <Text style={styles.btnText}>메시지 보내기</Text>
                </Pressable>
              </View>
            ) : null}

            {item.saleType === "AUCTION" &&
            item.meetLat != null &&
            item.meetLng != null &&
            !item.auctionLive &&
            item.winningBidderId &&
            item.status !== "SOLD" &&
            (item.isOwner || item.isWinningBidder) ? (
              <View style={styles.bidBox}>
                <Text style={styles.bidLabel}>
                  약속 시간에 거래 메시지에서 현장 도착 인증을 눌러 주세요. 양쪽이 인증되면 암호코드로 거래를 끝냅니다.
                </Text>
              </View>
            ) : null}

            {item.saleType === "AUCTION" &&
            (item.meetLat == null || item.meetLng == null) &&
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

            {msg && !(item.auctionLive && !item.isOwner) ? (
              <Text style={styles.note}>{msg}</Text>
            ) : null}
          </View>
        </ScrollView>
        {item.auctionLive && !item.isOwner && !USED_AUCTION_RETIRED ? (
          <View
            style={[
              styles.bidDock,
              { paddingBottom: keyboardOpen ? spacing.sm : Math.max(insets.bottom, spacing.sm) },
            ]}
          >
            {msg ? <Text style={styles.dockNote}>{msg}</Text> : null}
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
        </View>
      )}
      {lightboxOpen && mediaItems.length > 0 ? (
        <FeedImageLightbox
          visible={lightboxOpen}
          images={mediaItems.map((slide) => ({
            id: slide.id,
            url: slide.url,
            kind: slide.kind,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
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
  flex: { flex: 1 },
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
  heading: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.text },
  topActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  topHeart: { padding: 4 },
  topHeartSpacer: { width: 32 },
  hero: { width: "100%", aspectRatio: 1, backgroundColor: colors.border },
  heroCounter: {
    position: "absolute",
    bottom: 10,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  heroFallback: {},
  body: { padding: spacing.md, backgroundColor: colors.surface },
  retiredBanner: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.gold + "22",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold + "66",
  },
  retiredBannerText: { fontSize: 13, lineHeight: 18, color: colors.text },
  price: { marginTop: 8, fontSize: 22, fontWeight: "800", color: colors.text },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  timer: { marginTop: spacing.sm },
  sub: { marginTop: 6, color: colors.textMuted },
  meetPlace: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
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
  bidDock: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  dockNote: { color: colors.textMuted, lineHeight: 20 },
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


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
import { fetchAuctionDepositStatus } from "@/api/auction-deposit";
import { UsedAuctionBidHoldSheet } from "@/payments/UsedAuctionBidHoldSheet";
import { ApiError } from "@/api/client";
import { UsedMeetMapCard } from "@/features/marketplace/UsedMeetMapCard";
import {
  SubcultureMetaChips,
  UsedSaleStatsCard,
} from "@/features/marketplace/UsedSubcultureDetailCards";
import { AuctionCountdown } from "@/features/marketplace/AuctionCountdown";
import { USED_AUCTION_RETIRED } from "@/lib/retired-product-features";
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
import { useI18n } from "@/i18n/I18nProvider";
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
  const { t } = useI18n();
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
          accessibilityLabel={t("m.common.view_photo_full_screen")}
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
      setMsg(
        res.starred
          ? t("m.marketplace.saved_to_star")
          : t("m.marketplace.removed_from_star")
      );
      await invalidate();
      void queryClient.invalidateQueries({ queryKey: ["mobile-star-market"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-star-hub"] });
    },
    onError: (err) => setMsg(apiErrMessage(err, t("m.marketplace.could_not_update_star"))),
  });

  const favorite = useMutation({
    mutationFn: () => toggleMarketplaceFavorite(route.params.id),
    onSuccess: async (res) => {
      setMsg(res.favorited ? t("m.marketplace.added_to_favorites") : t("m.marketplace.removed_from_favorites"));
      await invalidate();
    },
    onError: (err) => setMsg(apiErrMessage(err, t("m.marketplace.could_not_update_favorites"))),
  });

  const trade = useMutation({
    mutationFn: () => startMarketplaceTradeChat(route.params.id),
    onSuccess: (res) => {
      navigation.navigate("MessageRoom", {
        roomId: res.roomId,
        title: t("m.marketplace.trade_chat"),
      });
    },
    onError: (err) => setMsg(apiErrMessage(err, t("m.common.could_not_open_chat"))),
  });

  const tradeComplete = useMutation({
    mutationFn: () => confirmAuctionTrade(route.params.id),
    onSuccess: async (res) => {
      setMsg(
        res.completed
          ? t("m.marketplace.trade_complete_your_2_moco_deposit")
          : t("m.marketplace.you_marked_the_trade_complete_when")
      );
      await invalidate();
    },
    onError: (err) => setMsg(apiErrMessage(err, t("m.marketplace.could_not_confirm_trade"))),
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
        setMsg(t("m.common.bid_failed"));
        return;
      }
      setMsg(`${t("m.marketplace.bid_placed")} · ${formatUsedPrice(res.amount, item?.currency, t)}`);
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
      setMsg(apiErrMessage(err, t("m.common.bid_failed")));
    },
  });

  const onBid = async () => {
    if (USED_AUCTION_RETIRED) {
      showIslandError(t("m.marketplace.auctions_ended"), t("m.marketplace.auction_retired_msg"));
      return;
    }
    try {
      const deposit =
        depositQuery.data ?? (await fetchAuctionDepositStatus(route.params.id));
      if (!deposit.canParticipate) {
        showIslandError(t("m.marketplace.cannot_bid"), t("m.marketplace.need_min_moco_to_bid"));
        return;
      }
    } catch {
      showIslandError(
        t("m.marketplace.cannot_bid"),
        t("m.marketplace.could_not_verify_wallet_balance_try")
      );
      return;
    }
    const amount = parseListingPriceInput(bidText, item?.currency ?? "krw");
    if (!Number.isFinite(amount) || amount <= 0) {
      showIslandError(t("m.marketplace.bid_amount"), t("m.marketplace.enter_a_valid_amount"));
      return;
    }
    bid.mutate(amount);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>{t("common.back")}</Text>
        </Pressable>
        <Text style={styles.heading}>
          {item?.saleType === "AUCTION" && !USED_AUCTION_RETIRED ? t("m.marketplace.auction") : t("m.marketplace.listing")}
        </Text>
        <View style={styles.topActions}>
          {item ? (
            <Pressable
              style={styles.topHeart}
              disabled={star.isPending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                item.starred ? t("m.marketplace.remove_from_star") : t("m.common.save_to_star")
              }
              onPress={() => {
                if (authStatus !== "signedIn") {
                  showIslandError(
                    t("m.common.sign_in_required"),
                    t("m.common.sign_in_to_save_to_star")
                  );
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
              accessibilityLabel={
                item.favorited
                  ? t("m.marketplace.remove_favorite")
                  : t("m.marketplace.add_to_favorites")
              }
              onPress={() => {
                if (authStatus !== "signedIn") {
                  showIslandError(
                    t("m.common.sign_in_required"),
                    t("m.marketplace.sign_in_to_save_favorites")
                  );
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
        <Text style={styles.error}>{t("m.marketplace.could_not_load_listing")}</Text>
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
                <Text style={styles.retiredBannerText}>{t("m.marketplace.auction_retired_msg")}</Text>
              </View>
            ) : null}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>
              {item.saleType === "AUCTION"
                ? `${t("m.marketplace.min_bid")} ${
                    item.minNextBid != null
                      ? formatUsedPrice(item.minNextBid, item.currency, t)
                      : formatUsedPrice(Number(item.price ?? 0), item.currency, t)
                  }${
                    item.bidCount != null
                      ? ` · ${t("m.marketplace.bidcount_bids", { bidCount: String(item.bidCount) })}`
                      : ""
                  }`
                : formatUsedPrice(Number(item.price ?? 0), item.currency, t)}
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
              {displayUsedRegion(item.region || "", t) || t("m.marketplace.location_tbd")}
              {item.seller?.username ? ` · @${item.seller.username}` : ""}
            </Text>
            {item.meetPlace?.trim() ? (
              <Text style={styles.meetPlace}>
                {t("m.marketplace.meetup")} · {item.meetPlace.trim()}
              </Text>
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
            (item.saleType === "AUCTION"
              ? !!item.winningBidderId && (item.isOwner || item.isWinningBidder)
              : !item.isOwner) ? (
              item.status === "SOLD" ? (
                <View style={styles.actions}>
                  <Pressable style={[styles.btn, styles.btnDisabled]} disabled>
                    <Text style={styles.btnTextMuted}>{t("m.marketplace.trade_completed")}</Text>
                  </Pressable>
                </View>
              ) : item.status === "RESERVED" && !(item as { reservedTradeParticipant?: boolean }).reservedTradeParticipant ? (
                <View style={styles.actions}>
                  <Pressable style={[styles.btn, styles.btnDisabled]} disabled>
                    <Text style={styles.btnTextMuted}>{t("m.common.reserved")}</Text>
                  </Pressable>
                </View>
              ) : item.status !== "SOLD" ? (
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
                    <Text style={styles.btnText}>{t("m.common.message")}</Text>
                  </Pressable>
                </View>
              ) : null
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
                  {t("m.marketplace.at_meetup_time_confirm_arrival_in")}
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
                  {t("m.marketplace.when_done_seller_and_winning_bidder")}
                </Text>
                <Pressable
                  style={[styles.btn, (tradeComplete.isPending || mineTradeConfirmed(item)) && styles.btnDisabled]}
                  disabled={tradeComplete.isPending || mineTradeConfirmed(item)}
                  onPress={() => tradeComplete.mutate()}
                >
                  <Text style={styles.btnText}>
                    {mineTradeConfirmed(item)
                      ? t("m.marketplace.waiting_for_other_party")
                      : t("m.marketplace.mark_complete")}
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
                  <Text style={styles.quickChipText}>{formatUsedPrice(amount, item.currency, t)}</Text>
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
                placeholder={
                  (item.currency ?? "krw") === "usd"
                    ? t("m.marketplace.amount_in_usd")
                    : t("m.marketplace.enter_amount")
                }
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
              <Text style={styles.btnText}>{t("m.marketplace.place_bid")}</Text>
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
            setMsg(`${t("m.marketplace.bid_placed")} · ${formatUsedPrice(res.amount, item?.currency, t)}`);
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
  btnDisabled: { backgroundColor: "#9ca3af", opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  btnTextMuted: { color: "#f3f4f6", fontWeight: "700" },
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


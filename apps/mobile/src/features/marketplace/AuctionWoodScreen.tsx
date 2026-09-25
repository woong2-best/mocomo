import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import type { MarketplaceListItem } from "@/api/marketplace";
import { formatPrice } from "@/lib/money";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { FolkButton } from "@/ui/FolkButton";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { Screen } from "@/ui/Screen";

const cabinetBg = require("../../../assets/auction-cabinet.png");
const needleSprite = require("../../../assets/auction-needle.png");

/** Source photo is 468×1024. Overlays use the same scale as that image. */
const SRC_W = 468;
const SRC_H = 1024;
const HUB_X = 233;
const HUB_Y = 137;
const LABEL_R = 82;
const NEEDLE_HALF = 90;
const HIT = { x: 62, y: 32, w: 344, h: 112 };
const MY = { x: 15, y: 123, w: 40, h: 33 };
const SELL = { x: 411, y: 122, w: 41, h: 36 };

const NEEDLE_SPRING = { damping: 13, stiffness: 170, mass: 0.42, overshootClamping: false };

/** Fixed on the arch, left to right. The photo needle is the only piece that turns. */
const STOPS = [
  { id: "ALL", label: "ALL", angle: -72 },
  { id: "FIGURE", label: "Figure", angle: -48 },
  { id: "TCG", label: "TCG", angle: -24 },
  { id: "GOODS", label: "Goods", angle: 0 },
  { id: "BOOK", label: "Book", angle: 24 },
  { id: "COSPLAY_FASHION", label: "Cosplay", angle: 48 },
  { id: "DIGITAL", label: "Digital", angle: 72 },
] as const;

const MIN_A = STOPS[0].angle;
const MAX_A = STOPS[STOPS.length - 1].angle;

const CITIES = [
  { id: "seoul", label: "Seoul" },
  { id: "busan", label: "Busan" },
  { id: "daegu", label: "Daegu" },
  { id: "incheon", label: "Incheon" },
  { id: "gwangju", label: "Gwangju" },
  { id: "daejeon", label: "Daejeon" },
  { id: "ulsan", label: "Ulsan" },
  { id: "sejong", label: "Sejong" },
  { id: "gyeonggi", label: "Gyeonggi" },
  { id: "gangwon", label: "Gangwon" },
  { id: "chungbuk", label: "N. Chungcheong" },
  { id: "chungnam", label: "S. Chungcheong" },
  { id: "jeonbuk", label: "N. Jeolla" },
  { id: "jeonnam", label: "S. Jeolla" },
  { id: "gyeongbuk", label: "N. Gyeongsang" },
  { id: "gyeongnam", label: "S. Gyeongsang" },
  { id: "jeju", label: "Jeju" },
] as const;

const CONDITIONS = [
  { id: "NEW", label: "NEW / SEALED" },
  { id: "LIKE_NEW", label: "LIKE NEW" },
  { id: "NM", label: "NM (NEAR MINT)" },
  { id: "LP", label: "LP (LIGHT PLAYED)" },
  { id: "MP", label: "MP (MODERATE PLAYED)" },
  { id: "HP", label: "HP (HEAVY PLAYED)" },
  { id: "POOR", label: "DAMAGED" },
  { id: "UNKNOWN", label: "UNSPECIFIED" },
] as const;

const LIMITED = [
  { id: "EVENT_EXCLUSIVE", label: "EVENT EXCLUSIVE" },
  { id: "VENUE_ONLY", label: "VENUE ONLY" },
  { id: "PREORDER", label: "PRE-ORDER" },
  { id: "COLLAB", label: "COLLAB EXCLUSIVE" },
  { id: "LIMITED_RUN", label: "LIMITED QTY" },
  { id: "LOTTERY", label: "LOTTERY / KUJI" },
  { id: "PROMO", label: "PROMO / BONUS" },
] as const;

const DEALS = [
  { id: "TRADE", label: "TRADE ONLY (WTT)" },
  { id: "SELL_OR_TRADE", label: "SELL / WTS" },
] as const;

type PickerKind = "city" | "cond" | "limited" | "deal";

type Props = {
  items: MarketplaceListItem[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  bottomPad: number;
  sidoId: string | null;
  condition: string | null;
  limited: string | null;
  trade: string | null;
  onSido: (id: string | null) => void;
  onCondition: (id: string | null) => void;
  onLimited: (id: string | null) => void;
  onTrade: (id: string | null) => void;
  onCategory: (id: string) => void;
  onOpen: (id: string) => void;
  onMy: () => void;
  onSell: () => void;
  onBack: () => void;
  viewerId?: string | null;
};

function clamp(v: number, a: number, b: number) {
  "worklet";
  return Math.max(a, Math.min(b, v));
}

function nearestIndex(angle: number) {
  "worklet";
  let best = 0;
  let bestD = 1e9;
  for (let i = 0; i < STOPS.length; i++) {
    const d = Math.abs(STOPS[i].angle - angle);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function rubberAngle(v: number) {
  "worklet";
  if (v < MIN_A) return MIN_A + (v - MIN_A) * 0.18;
  if (v > MAX_A) return MAX_A + (v - MAX_A) * 0.18;
  return v;
}

function auctionAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins}M`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}D`;
  return `${Math.floor(days / 7)}W`;
}

function auctionStatus(status: string) {
  if (status === "SELLING") return "LIVE";
  if (status === "RESERVED") return "HELD";
  if (status === "SOLD") return "SOLD";
  return status;
}

export function AuctionWoodScreen(props: Props) {
  const { width } = useWindowDimensions();
  const scale = width / SRC_W;
  const cabinetH = 228 * scale;
  const needleBox = NEEDLE_HALF * 2 * scale;

  const needle = useSharedValue(STOPS[0].angle);
  const needleVel = useSharedValue(0);
  const armed = useSharedValue(0);
  const hubSX = useSharedValue((HUB_X - HIT.x) * scale);
  const hubSY = useSharedValue((HUB_Y - HIT.y) * scale);
  useEffect(() => {
    hubSX.value = (HUB_X - HIT.x) * scale;
    hubSY.value = (HUB_Y - HIT.y) * scale;
  }, [hubSX, hubSY, scale]);

  const [picker, setPicker] = useState<PickerKind | null>(null);

  const tick = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);
  const settleHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  const onCategory = props.onCategory;
  const pick = useCallback(
    (index: number) => {
      onCategory(STOPS[index]?.id ?? "ALL");
    },
    [onCategory]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .minDistance(1)
        .onBegin(() => {
          cancelAnimation(needle);
          needleVel.value = 0;
        })
        .onUpdate((e) => {
          const dx = e.x - hubSX.value;
          const dy = e.y - hubSY.value;
          if (dx * dx + dy * dy < 20 * 20) return;
          const a = Math.atan2(dx, -dy) * (180 / Math.PI);
          const next = rubberAngle(a);
          needleVel.value = needleVel.value * 0.35 + ((next - needle.value) / 0.016) * 0.65;
          needle.value = next;
          const idx = nearestIndex(needle.value);
          if (idx !== armed.value) {
            armed.value = idx;
            runOnJS(tick)();
          }
        })
        .onFinalize(() => {
          const glide = clamp(needleVel.value * 0.035, -22, 22);
          const idx = nearestIndex(clamp(needle.value + glide, MIN_A, MAX_A));
          armed.value = idx;
          needle.value = withSpring(STOPS[idx].angle, NEEDLE_SPRING);
          needleVel.value = 0;
          runOnJS(pick)(idx);
          runOnJS(settleHaptic)();
        }),
    [armed, hubSX, hubSY, needle, needleVel, pick, settleHaptic, tick]
  );

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needle.value}deg` }],
  }));

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceListItem }) => {
      if (!item?.id) return null;
      const price = item.currentBidAmount && item.currentBidAmount > 0 ? item.currentBidAmount : item.price;
      const nsfwGate = !!item.isNsfw && item.sellerId !== props.viewerId;
      return (
        <Pressable style={styles.card} onPress={() => props.onOpen(item.id)}>
          <View style={styles.thumbWrap}>
            <SensitiveContentGate enabled={nsfwGate} style={styles.thumb}>
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={StyleSheet.absoluteFill}
                  cachePolicy={IMAGE_CACHE_POLICY}
                  transition={0}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.thumbFallback]}>
                  <Text style={styles.thumbFallbackText}>NO PHOTO</Text>
                </View>
              )}
            </SensitiveContentGate>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{auctionStatus(item.status)}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title || "UNTITLED"}
          </Text>
          <Text style={styles.cardPrice}>BID {price ? formatPrice(price, item.currency ?? "krw") : "—"}</Text>
          {item.bidCount != null ? <Text style={styles.auctionMeta}>{item.bidCount} BIDS</Text> : null}
          <Text style={styles.cardMeta} numberOfLines={1}>
            {(item.region || "ANYWHERE").toUpperCase()} · {auctionAgo(item.createdAt)}
          </Text>
        </Pressable>
      );
    },
    [props]
  );

  const pickerOptions = pickerSheet(picker, props.sidoId);

  return (
    <Screen style={styles.screen}>
      <Image
        source={cabinetBg}
        style={{ position: "absolute", top: 0, left: 0, width, height: width * (SRC_H / SRC_W) }}
        contentFit="fill"
      />
      <View style={{ height: cabinetH }}>
        {STOPS.map((stop) => (
          <FixedLabel key={stop.id} stop={stop} scale={scale} needle={needle} />
        ))}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: needleBox,
              height: needleBox,
              left: (HUB_X - NEEDLE_HALF) * scale,
              top: (HUB_Y - NEEDLE_HALF) * scale,
              zIndex: 3,
            },
            needleStyle,
          ]}
        >
          <Image source={needleSprite} style={{ width: needleBox, height: needleBox }} contentFit="fill" />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <View
            style={{
              position: "absolute",
              left: HIT.x * scale,
              top: HIT.y * scale,
              width: HIT.w * scale,
              height: HIT.h * scale,
              zIndex: 4,
            }}
            accessibilityRole="adjustable"
            accessibilityLabel="Category dial"
          />
        </GestureDetector>

        <Pressable
          onPress={props.onBack}
          hitSlop={10}
          style={[styles.backHit, { top: 4, left: 8 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backMark}>‹</Text>
        </Pressable>

        <Pressable
          onPress={props.onMy}
          style={{
            position: "absolute",
            left: MY.x * scale,
            top: MY.y * scale,
            width: MY.w * scale,
            height: MY.h * scale,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel="My auctions"
        >
          <Text style={[styles.sideLabel, { fontSize: Math.max(10, 12 * scale) }]}>My</Text>
        </Pressable>
        <Pressable
          onPress={props.onSell}
          style={{
            position: "absolute",
            left: SELL.x * scale,
            top: SELL.y * scale,
            width: SELL.w * scale,
            height: SELL.h * scale,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel="Sell"
        >
          <Text style={[styles.sideLabel, { fontSize: Math.max(10, 12 * scale) }]}>Sell</Text>
        </Pressable>

        <View style={[styles.filterRow, { top: 176 * scale, paddingHorizontal: 18 * scale }]}>
          <FilterKey label="CITY" active={!!props.sidoId} onPress={() => setPicker("city")} />
          <FilterKey label="COND." active={!!props.condition} onPress={() => setPicker("cond")} />
          <FilterKey label="LIMITED" active={!!props.limited} onPress={() => setPicker("limited")} />
          <FilterKey label="DEAL" active={!!props.trade} onPress={() => setPicker("deal")} />
        </View>
      </View>

      <FlatList
        data={props.isError ? [] : props.items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={props.items.length > 0 ? styles.gridRow : undefined}
        contentContainerStyle={{ paddingBottom: props.bottomPad, flexGrow: 1, paddingTop: 8 }}
        style={styles.list}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={props.isFetching && !props.isLoading}
            onRefresh={props.onRefresh}
            tintColor="#e7c27a"
            colors={["#e7c27a"]}
          />
        }
        ListEmptyComponent={
          props.isLoading && props.items.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 28 }} color="#e7c27a" />
          ) : props.isError ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Couldn't load auctions.</Text>
              <FolkButton label="Try again" onPress={props.onRefresh} />
            </View>
          ) : (
            <Text style={styles.emptyText}>No auctions match.</Text>
          )
        }
      />

      <WoodPicker
        visible={picker != null}
        title={pickerTitle(picker)}
        options={pickerOptions}
        selected={selectedId(picker, props)}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          if (picker === "city") props.onSido(id || null);
          else if (picker === "cond") props.onCondition(id || null);
          else if (picker === "limited") props.onLimited(id || null);
          else if (picker === "deal") props.onTrade(id || null);
          setPicker(null);
        }}
      />
    </Screen>
  );
}

function pickerTitle(kind: PickerKind | null) {
  if (kind === "city") return "CITY";
  if (kind === "cond") return "CONDITION";
  if (kind === "limited") return "LIMITED";
  if (kind === "deal") return "DEAL";
  return "";
}

function selectedId(kind: PickerKind | null, props: Props) {
  if (kind === "city") return props.sidoId ?? "";
  if (kind === "cond") return props.condition ?? "";
  if (kind === "limited") return props.limited ?? "";
  if (kind === "deal") return props.trade ?? "";
  return "";
}

function pickerSheet(kind: PickerKind | null, sidoId: string | null) {
  void sidoId;
  if (kind === "city") return [{ id: "", label: "ALL CITIES" }, { id: "__shipping__", label: "NATIONWIDE" }, ...CITIES];
  if (kind === "cond") return [{ id: "", label: "ALL CONDITIONS" }, ...CONDITIONS];
  if (kind === "limited") return [{ id: "", label: "ALL EDITIONS" }, ...LIMITED];
  if (kind === "deal") return [{ id: "", label: "ALL TYPES" }, ...DEALS];
  return [];
}

function FixedLabel({
  stop,
  scale,
  needle,
}: {
  stop: (typeof STOPS)[number];
  scale: number;
  needle: SharedValue<number>;
}) {
  const rad = (stop.angle * Math.PI) / 180;
  const x = HUB_X * scale + LABEL_R * scale * Math.sin(rad);
  const y = HUB_Y * scale - LABEL_R * scale * Math.cos(rad);
  const slot = 46 * scale;
  const style = useAnimatedStyle(() => {
    const hot = Math.abs(stop.angle - needle.value) < 13;
    return {
      opacity: hot ? 1 : 0.72,
      transform: [{ rotate: `${stop.angle}deg` }, { scale: hot ? 1.05 : 1 }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x - slot / 2,
          top: y - 9 * scale,
          width: slot,
          zIndex: 2,
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text
        style={[styles.dialWord, { fontSize: Math.max(8, 9 * scale) }]}
        allowFontScaling={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {stop.label}
      </Text>
    </Animated.View>
  );
}

function FilterKey({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.filterKey} accessibilityRole="button">
      <Text style={[styles.filterLabel, active ? styles.filterLabelOn : null]} allowFontScaling={false}>
        {label} ▾
      </Text>
      <View style={[styles.filterLine, active ? styles.filterLineOn : null]} />
    </Pressable>
  );
}

function WoodPicker({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerRoot}>
        <Pressable style={styles.pickerScrim} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((o) => {
              const on = o.id === selected;
              return (
                <Pressable key={o.id || "all"} style={styles.pickerRow} onPress={() => onSelect(o.id)}>
                  <Text style={[styles.pickerRowText, on ? styles.pickerRowOn : null]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#140c08" },
  list: { backgroundColor: "transparent" },
  backHit: { position: "absolute", zIndex: 7, paddingHorizontal: 6, paddingVertical: 2 },
  backMark: { color: "#e8d7b0", fontSize: 28, fontWeight: "500", lineHeight: 30 },
  sideLabel: { color: "#f7f4ee", fontWeight: "700", letterSpacing: 0.2 },
  filterRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 6,
  },
  filterKey: { alignItems: "center", paddingHorizontal: 2, minWidth: 64 },
  filterLabel: {
    color: "#f3ead7",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  filterLabelOn: { color: "#ffe7b0" },
  filterLine: {
    marginTop: 4,
    height: 1.5,
    alignSelf: "stretch",
    backgroundColor: "rgba(196, 164, 106, 0.85)",
  },
  filterLineOn: { backgroundColor: "#ffe3a3", height: 2 },
  dialWord: {
    color: "#f6efe2",
    fontWeight: "700",
    fontSize: 9,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  gridRow: { paddingHorizontal: 12, gap: 10, marginBottom: 10 },
  card: {
    flex: 1,
    maxWidth: "48.5%",
    backgroundColor: "rgba(16, 9, 6, 0.78)",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(214, 176, 112, 0.38)",
  },
  thumbWrap: { aspectRatio: 1, backgroundColor: "#2a1a12" },
  thumb: { width: "100%", height: "100%" },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  thumbFallbackText: { color: "rgba(243,234,215,0.45)", fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(20,12,8,0.82)",
    borderWidth: 1,
    borderColor: "rgba(214,176,112,0.45)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: { color: "#f3ead7", fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  cardTitle: {
    paddingHorizontal: 8,
    paddingTop: 8,
    fontWeight: "700",
    color: "#f6efe2",
    fontSize: 13,
    minHeight: 36,
  },
  cardPrice: {
    paddingHorizontal: 8,
    marginTop: 2,
    fontWeight: "800",
    color: "#e7c27a",
    fontSize: 13,
  },
  auctionMeta: {
    paddingHorizontal: 8,
    color: "#e7c27a",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  cardMeta: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 2,
    color: "rgba(243,234,215,0.62)",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: {
    color: "#f3ead7",
    padding: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  pickerRoot: { flex: 1, justifyContent: "flex-end" },
  pickerScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  pickerSheet: {
    backgroundColor: "#1a100c",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: "rgba(214,176,112,0.4)",
    padding: 16,
    paddingBottom: 28,
  },
  pickerTitle: { color: "#e7c27a", fontSize: 13, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 },
  pickerRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(214,176,112,0.25)",
  },
  pickerRowText: { color: "#f6efe2", fontWeight: "600", fontSize: 14 },
  pickerRowOn: { color: "#ffe3a3" },
});

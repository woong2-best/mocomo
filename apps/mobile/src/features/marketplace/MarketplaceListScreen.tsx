import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchMarketplaceList,
  fetchUsedPhoneStatus,
  type MarketplaceListItem,
} from "@/api/marketplace";
import {
  formatUsedPrice,
  formatUsedRegion,
  formatUsedTimeAgo,
  KOREA_SIDO,
  KOREA_SIGUNGU_BY_SIDO,
  USED_CATEGORIES,
  USED_PRODUCT_TYPES,
  USED_SHIPPING_REGION,
  usedStatusLabel,
} from "@/features/marketplace/used-catalog";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { SensitiveContentGate } from "@/ui/SensitiveContentGate";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";

type Props = { mode?: "tab" | "stack" };

export function MarketplaceListScreen({ mode = "stack" }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const isTab = mode === "tab" || route.name === "Used";
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | "ALL" | "AUCTION">("ALL");
  const [sidoId, setSidoId] = useState<string | null>(null);
  const [sigungu, setSigungu] = useState<string | null>(null);
  const [workDraft, setWorkDraft] = useState("");
  const [work, setWork] = useState("");
  const [product, setProduct] = useState<string | null>(null);
  const [sidoPickerOpen, setSidoPickerOpen] = useState(false);
  const [sigunguPickerOpen, setSigunguPickerOpen] = useState(false);

  const listQuery = useMemo(() => {
    const region =
      sidoId && sigungu && sidoId !== "__shipping__"
        ? formatUsedRegion(KOREA_SIDO.find((s) => s.id === sidoId)?.short ?? "", sigungu)
        : undefined;
    return {
      q: q || undefined,
      category: category !== "ALL" && category !== "AUCTION" ? category : undefined,
      mode: category === "AUCTION" ? ("auction" as const) : undefined,
      sido: !region && sidoId ? sidoId : undefined,
      region,
      work: work || undefined,
      product: product || undefined,
      take: 48,
    };
  }, [q, category, sidoId, sigungu, work, product]);

  const query = useQuery({
    queryKey: ["mobile-marketplace", listQuery],
    queryFn: () => fetchMarketplaceList(listQuery),
    staleTime: 90_000,
    placeholderData: (previous) => previous,
  });
  const loading = query.isLoading && !query.data;

  const bottomPad = isTab ? floatingTabClearance(insets.bottom) + 56 : insets.bottom + 80;
  const items = query.data?.items ?? [];

  const openWrite = useCallback(async () => {
    try {
      const status = await fetchUsedPhoneStatus();
      if (status.eligible) {
        navigation.navigate("UsedCreate");
      } else {
        navigation.navigate("Wallet", { initialTab: "earnings", returnScreen: "UsedCreate" });
      }
    } catch {
      navigation.navigate("Wallet", { initialTab: "earnings", returnScreen: "UsedCreate" });
    }
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceListItem }) => {
      if (!item?.id) return null;
      const auction = item.saleType === "AUCTION";
      const price = auction
        ? item.currentBidAmount && item.currentBidAmount > 0
          ? item.currentBidAmount
          : item.price
        : item.price;
      const nsfwGate = !!item.isNsfw && item.sellerId !== user?.id;
      return (
        <Pressable
          style={styles.card}
          onPress={() => {
            try {
              navigation.navigate("MarketplaceDetail", { id: item.id });
            } catch {
              /* ignore */
            }
          }}
        >
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
                  <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                </View>
              )}
            </SensitiveContentGate>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{usedStatusLabel(item.status)}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title || "상품"}
          </Text>
          <Text style={[styles.cardPrice, auction && { color: colors.terracotta }]}>
            {auction ? `현재 ${formatUsedPrice(price)}` : formatUsedPrice(price)}
          </Text>
          {auction && item.bidCount != null ? (
            <Text style={styles.auctionMeta}>입찰 {item.bidCount}회</Text>
          ) : null}
          <Text style={styles.cardMeta} numberOfLines={1}>
            📍 {item.region || "지역 미정"} · {formatUsedTimeAgo(item.createdAt)}
          </Text>
        </Pressable>
      );
    },
    [colors.terracotta, colors.textMuted, navigation, styles, user?.id]
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      {!isTab ? (
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={colors.cobalt} />
          <Text style={styles.backText}>뒤로</Text>
        </Pressable>
      ) : null}

      <View style={styles.titleRow}>
        <Ionicons name="pricetag" size={22} color={colors.brand} />
        <Text style={styles.pageTitle}>중고거래</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.outlineBtn, category === "AUCTION" && styles.outlineBtnOn]}
          onPress={() => setCategory((c) => (c === "AUCTION" ? "ALL" : "AUCTION"))}
        >
          <Text style={styles.outlineBtnText}>경매</Text>
        </Pressable>
        <Pressable
          style={styles.outlineBtn}
          onPress={() => navigation.navigate("UsedMy")}
        >
          <Text style={styles.outlineBtnText}>내 거래</Text>
        </Pressable>
        <Pressable style={styles.writeBtn} onPress={() => void openWrite()}>
          <Text style={styles.writeBtnText}>글쓰기</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={qDraft}
          onChangeText={setQDraft}
          placeholder="어떤 상품을 찾으세요?"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={() => setQ(qDraft.trim())}
        />
        <Pressable style={styles.searchBtn} onPress={() => setQ(qDraft.trim())}>
          <Text style={styles.searchBtnText}>검색</Text>
        </Pressable>
      </View>

      <View style={styles.detailBox}>
        <Text style={styles.detailHint}>작품(IP)·상품 종류(피규어 등)로 좁혀 보기</Text>
        <View style={styles.detailRow}>
          <TextInput
            style={[styles.detailInput, { flex: 1 }]}
            value={workDraft}
            onChangeText={setWorkDraft}
            placeholder="작품명"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={[styles.detailInput, styles.productPick]}
            onPress={() => {
              const idx = product
                ? USED_PRODUCT_TYPES.findIndex((p) => p.id === product)
                : -1;
              const next = USED_PRODUCT_TYPES[(idx + 1) % USED_PRODUCT_TYPES.length];
              setProduct(next.id);
            }}
          >
            <Text
              style={{ color: product ? colors.text : colors.textMuted, fontWeight: "600" }}
              numberOfLines={1}
            >
              {product
                ? USED_PRODUCT_TYPES.find((p) => p.id === product)?.label
                : "상품 종류"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.detailSearchBtn}
          onPress={() => setWork(workDraft.trim())}
        >
          <Text style={styles.detailSearchText}>상세 검색</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        <Chip
          label="전체"
          active={category === "ALL"}
          onPress={() => setCategory("ALL")}
          colors={colors}
        />
        <Chip
          label="🔨 경매"
          active={category === "AUCTION"}
          onPress={() => setCategory("AUCTION")}
          colors={colors}
        />
        {USED_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            active={category === c.id}
            onPress={() => setCategory(c.id)}
            colors={colors}
          />
        ))}
      </ScrollView>

      <View style={styles.regionRow}>
        <Pressable style={styles.regionBtn} onPress={() => setSidoPickerOpen(true)}>
          <Text style={styles.regionBtnText} numberOfLines={1}>
            {sidoId === "__shipping__"
              ? USED_SHIPPING_REGION
              : sidoId
                ? KOREA_SIDO.find((s) => s.id === sidoId)?.label
                : "시·도 전체"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.brand} />
        </Pressable>
        <Pressable
          style={[styles.regionBtn, !sidoId || sidoId === "__shipping__" ? styles.regionDisabled : null]}
          disabled={!sidoId || sidoId === "__shipping__"}
          onPress={() => setSigunguPickerOpen(true)}
        >
          <Text style={styles.regionBtnText} numberOfLines={1}>
            {sigungu || "시·군·구 전체"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.brand} />
        </Pressable>
      </View>

      <Text style={styles.listLabel}>
        상품 목록{"\n"}
        <Text style={styles.listCount}>{items.length}개</Text>
      </Text>
    </View>
  );

  return (
    <Screen>
      {query.isLoading && !query.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>상품 목록을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={items.length > 0 ? styles.gridRow : undefined}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          removeClippedSubviews={false}
          ListEmptyComponent={
            <Text style={styles.muted}>조건에 맞는 상품이 없습니다.</Text>
          }
        />
      )}

      <Pressable style={[styles.fab, { bottom: isTab ? floatingTabClearance(insets.bottom) + 8 : 24 }]} onPress={() => void openWrite()}>
        <Ionicons name="add" size={28} color={colors.brand} />
      </Pressable>

      <PickerModal
        visible={sidoPickerOpen}
        title="시·도 선택"
        onClose={() => setSidoPickerOpen(false)}
        colors={colors}
        options={[
          { id: "", label: "시·도 전체" },
          { id: "__shipping__", label: USED_SHIPPING_REGION },
          ...KOREA_SIDO.map((s) => ({ id: s.id, label: s.label })),
        ]}
        onSelect={(id) => {
          setSidoId(id || null);
          setSigungu(null);
          setSidoPickerOpen(false);
        }}
      />
      <PickerModal
        visible={sigunguPickerOpen}
        title="시·군·구 선택"
        onClose={() => setSigunguPickerOpen(false)}
        colors={colors}
        options={[
          { id: "", label: "시·군·구 전체" },
          ...(sidoId ? (KOREA_SIGUNGU_BY_SIDO[sidoId] ?? []).map((g) => ({ id: g, label: g })) : []),
        ]}
        onSelect={(id) => {
          setSigungu(id || null);
          setSigunguPickerOpen(false);
        }}
      />
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        {
          backgroundColor: active ? colors.brand : colors.surfaceRaised,
          borderColor: active ? colors.brand : "rgba(27, 74, 140, 0.2)",
        },
      ]}
    >
      <Text style={{ fontWeight: "700", fontSize: 12, color: active ? "#fff" : colors.brand }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PickerModal({
  visible,
  title,
  options,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  title: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  onClose: () => void;
  colors: ThemeColors;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.root}>
        <Pressable style={pickerStyles.scrim} onPress={onClose} />
        <View style={[pickerStyles.sheet, { backgroundColor: colors.background }]}>
          <Text style={[pickerStyles.title, { color: colors.brand }]}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((o) => (
              <Pressable key={o.id || "all"} style={pickerStyles.row} onPress={() => onSelect(o.id)}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>{o.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    marginRight: 6,
  },
});

const pickerStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.md,
    paddingBottom: 28,
  },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ddd" },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    backRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    backText: { color: colors.cobalt, fontWeight: "700" },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    pageTitle: { fontSize: 22, fontWeight: "800", color: colors.brand },
    actionRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
    outlineBtn: {
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.28)",
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surfaceRaised,
    },
    outlineBtnOn: { borderColor: colors.terracotta, backgroundColor: "rgba(196,92,62,0.08)" },
    outlineBtnText: { fontWeight: "700", color: colors.brand, fontSize: 13 },
    writeBtn: {
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.muted,
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.18)",
    },
    writeBtnText: { fontWeight: "800", color: colors.brand, fontSize: 13 },
    searchRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    searchInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontWeight: "600",
    },
    searchBtn: {
      borderRadius: radii.md,
      paddingHorizontal: 14,
      justifyContent: "center",
      backgroundColor: colors.muted,
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.18)",
    },
    searchBtnText: { fontWeight: "800", color: colors.brand },
    detailBox: {
      backgroundColor: colors.muted,
      borderRadius: radii.lg,
      padding: 12,
      marginBottom: 12,
      gap: 8,
    },
    detailHint: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    detailRow: { flexDirection: "row", gap: 8 },
    detailInput: {
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.18)",
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
    },
    productPick: { flex: 1, justifyContent: "center" },
    detailSearchBtn: {
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.muted,
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.22)",
    },
    detailSearchText: { fontWeight: "800", color: colors.brand },
    catRow: { paddingVertical: 4, paddingRight: 12, marginBottom: 10 },
    regionRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
    regionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: colors.surfaceRaised,
      gap: 4,
    },
    regionDisabled: { opacity: 0.45 },
    regionBtnText: { flex: 1, fontWeight: "600", color: colors.text, fontSize: 13 },
    listLabel: { fontWeight: "800", color: colors.brand, marginBottom: 8, fontSize: 14 },
    listCount: { fontWeight: "600", color: colors.textMuted, fontSize: 12 },
    gridRow: { paddingHorizontal: spacing.md, gap: 10, marginBottom: 10 },
    card: {
      flex: 1,
      maxWidth: "48.5%",
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(27, 74, 140, 0.12)",
      ...shadows.folkSm,
    },
    thumbWrap: { aspectRatio: 1, backgroundColor: colors.muted },
    thumb: { width: "100%", height: "100%" },
    thumbFallback: { alignItems: "center", justifyContent: "center" },
    badge: {
      position: "absolute",
      top: 6,
      left: 6,
      backgroundColor: "rgba(40,40,40,0.75)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    cardTitle: {
      paddingHorizontal: 8,
      paddingTop: 8,
      fontWeight: "700",
      color: colors.brand,
      fontSize: 13,
      minHeight: 36,
    },
    cardPrice: {
      paddingHorizontal: 8,
      marginTop: 2,
      fontWeight: "800",
      color: colors.brand,
      fontSize: 15,
    },
    auctionMeta: {
      paddingHorizontal: 8,
      color: colors.terracotta,
      fontSize: 11,
      fontWeight: "700",
    },
    cardMeta: {
      paddingHorizontal: 8,
      paddingBottom: 10,
      paddingTop: 2,
      color: colors.textMuted,
      fontSize: 11,
    },
    muted: { color: colors.textMuted, padding: spacing.lg, fontWeight: "600" },
    error: { color: colors.danger, fontWeight: "600", marginBottom: 12 },
    center: { padding: spacing.lg, alignItems: "center" },
    fab: {
      position: "absolute",
      right: 18,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.muted,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.25)",
      alignItems: "center",
      justifyContent: "center",
      ...shadows.folkSm,
    },
  });
}

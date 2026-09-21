import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { fetchEventsMap, type MapEventPin } from "@/api/events";
import { eventPinColor } from "@/features/events/event-map-colors";
import { EventsNativeMap } from "@/features/events/EventsNativeMap";
import {
  ESRI_ATTRIBUTION,
  ESRI_ATTRIBUTION_URL,
} from "@/maps/map-styles";
import type { RootStackParamList } from "@/navigation/types";

type PanelTab = "venue" | "maid_cafe" | "recommendation";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "venue", label: "행사장" },
  { id: "maid_cafe", label: "메이드 카페" },
  { id: "recommendation", label: "추천" },
];

const PHASE_LABEL: Record<string, string> = {
  ongoing: "진행 중",
  upcoming: "예정",
  permanent: "상설",
};

function filterListPins(pins: MapEventPin[], tab: PanelTab) {
  if (tab === "maid_cafe") return pins.filter((p) => p.category === "maid_cafe");
  if (tab === "recommendation") {
    return pins.filter((p) => p.category === "user_recommendation");
  }
  return pins.filter(
    (p) => p.category !== "maid_cafe" && p.category !== "user_recommendation"
  );
}

function filterMapPins(pins: MapEventPin[], tab: PanelTab) {
  if (tab === "maid_cafe") return pins.filter((p) => p.category === "maid_cafe");
  if (tab === "recommendation") {
    return pins.filter((p) => p.category === "user_recommendation");
  }
  return pins.filter((p) => p.category !== "user_recommendation");
}

function normalizeCountry(country: string | null | undefined) {
  return (country ?? "").trim().toLowerCase();
}

/** User ISO (KR) ↔ event pin country (kr) */
function matchesUserCountry(pinCountry: string, userCountryCode: string) {
  const pin = normalizeCountry(pinCountry);
  const user = normalizeCountry(userCountryCode);
  if (!pin || !user) return false;
  if (pin === user) return true;
  if (pin === "kr" && (user === "kr" || /korea/.test(user))) return true;
  if (pin === "jp" && (user === "jp" || /japan/.test(user))) return true;
  return false;
}

function sortPinsByUserCountryThenDate(pins: MapEventPin[], userCountryCode: string) {
  const dateMs = (p: MapEventPin) => {
    const t = new Date(p.startsAt).getTime();
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
  };
  return [...pins].sort((a, b) => {
    const aLocal = matchesUserCountry(a.country, userCountryCode) ? 0 : 1;
    const bLocal = matchesUserCountry(b.country, userCountryCode) ? 0 : 1;
    if (aLocal !== bLocal) return aLocal - bLocal;
    return dateMs(a) - dateMs(b);
  });
}

function countryCode(country: string) {
  const raw = country.trim();
  if (!raw) return "—";
  if (raw.length <= 3) return raw.toUpperCase();
  if (/korea/i.test(raw)) return "KR";
  if (/japan/i.test(raw)) return "JP";
  if (/spain/i.test(raw)) return "ES";
  return raw.slice(0, 2).toUpperCase();
}

function googleSearchUrlForEvent(pin: MapEventPin) {
  const parts = [
    pin.venueName,
    pin.title,
    pin.country && pin.country !== "other" ? pin.country.toUpperCase() : null,
  ].filter(Boolean);
  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(" "))}`;
}

function externalMapLink(pin: MapEventPin) {
  const country = pin.country ?? "";
  if (country === "KR" || country === "kr" || /korea/i.test(country)) {
    return {
      label: "카카오맵",
      url: `https://map.kakao.com/link/map/${encodeURIComponent(pin.venueName ?? pin.title)},${pin.lat},${pin.lng}`,
    };
  }
  const q = encodeURIComponent(`${pin.venueName ?? pin.title} ${pin.lat},${pin.lng}`);
  return {
    label: "Google 지도",
    url: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}

function formatEventDates(pin: MapEventPin) {
  if (pin.category === "user_recommendation") return "유저 추천";
  if (pin.category === "maid_cafe") return "상설 영업";
  const start = new Date(pin.startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const startLabel = start.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  if (!pin.endsAt) return startLabel;
  const end = new Date(pin.endsAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  const endLabel = end.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  return `${startLabel} — ${endLabel}`;
}

function formatPopupDate(pin: MapEventPin) {
  if (pin.category === "user_recommendation") return "추천";
  if (pin.category === "maid_cafe") return "상설";
  const start = new Date(pin.startsAt);
  if (Number.isNaN(start.getTime())) return "";
  return start.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function MapAttributionButton() {
  const [open, setOpen] = useState(false);

  return (
    <View style={attrStyles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        hitSlop={10}
        style={attrStyles.btn}
        accessibilityLabel="지도 타일 저작권 정보"
        accessibilityRole="button"
      >
        <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.88)" />
      </Pressable>
      {open ? (
        <Pressable
          style={attrStyles.popover}
          onPress={() => void Linking.openURL(ESRI_ATTRIBUTION_URL)}
        >
          <Text style={attrStyles.popoverText}>{ESRI_ATTRIBUTION}</Text>
          <Ionicons name="open-outline" size={12} color="rgba(255,255,255,0.7)" />
        </Pressable>
      ) : null}
    </View>
  );
}

function PinPopupCard({
  pin,
  onClose,
}: {
  pin: MapEventPin;
  onClose: () => void;
}) {
  const mapLink = externalMapLink(pin);
  const searchUrl = googleSearchUrlForEvent(pin);
  const phase =
    pin.phase && PHASE_LABEL[pin.phase] ? PHASE_LABEL[pin.phase] : null;
  const phaseOngoing = pin.phase === "ongoing";
  const isOfficial = pin.source === "official" || pin.source === "auto";
  const isMaid = pin.category === "maid_cafe";
  const isUserRec = pin.category === "user_recommendation";

  return (
    <View style={popupStyles.card}>
      <Pressable
        style={popupStyles.close}
        onPress={onClose}
        hitSlop={8}
        accessibilityLabel="팝업 닫기"
      >
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.75)" />
      </Pressable>

      {pin.imageUrl ? (
        <Image source={{ uri: pin.imageUrl }} style={popupStyles.image} resizeMode="cover" />
      ) : null}
      {pin.roadViewImageUrl ? (
        <View style={popupStyles.roadViewWrap}>
          <Image
            source={{ uri: pin.roadViewImageUrl }}
            style={popupStyles.roadView}
            resizeMode="cover"
          />
          <Text style={popupStyles.roadViewCaption}>로드뷰</Text>
        </View>
      ) : null}

      <View style={popupStyles.badgeRow}>
        {phase ? (
          <View
            style={[
              popupStyles.badge,
              phaseOngoing ? popupStyles.badgeOngoing : popupStyles.badgeUpcoming,
            ]}
          >
            <Text
              style={[
                popupStyles.badgeText,
                phaseOngoing ? popupStyles.badgeTextOngoing : popupStyles.badgeTextUpcoming,
              ]}
            >
              {phase}
            </Text>
          </View>
        ) : null}
        {isOfficial ? (
          <View style={[popupStyles.badge, popupStyles.badgeOfficial]}>
            <Text style={[popupStyles.badgeText, popupStyles.badgeTextOfficial]}>공식 자동</Text>
          </View>
        ) : isMaid ? (
          <View style={[popupStyles.badge, popupStyles.badgeMaid]}>
            <Text style={[popupStyles.badgeText, popupStyles.badgeTextMaid]}>메이드 카페</Text>
          </View>
        ) : isUserRec ? (
          <View style={[popupStyles.badge, popupStyles.badgeOngoing]}>
            <Text style={[popupStyles.badgeText, popupStyles.badgeTextOngoing]}>유저 추천</Text>
          </View>
        ) : null}
      </View>

      <Text style={popupStyles.title}>{pin.title}</Text>

      <Text style={popupStyles.meta}>
        {countryCode(pin.country)} {formatPopupDate(pin)}
        {pin.venueName ? " · " : ""}
        {pin.venueName ? (
          <Text
            style={popupStyles.venueLink}
            onPress={() => void Linking.openURL(searchUrl)}
          >
            {pin.venueName}
          </Text>
        ) : null}
      </Text>

      <View style={popupStyles.actions}>
        <Pressable
          style={popupStyles.link}
          onPress={() => void Linking.openURL(searchUrl)}
          hitSlop={6}
        >
          <Text style={popupStyles.linkText}>Google 검색</Text>
          <Ionicons name="search-outline" size={12} color="#93C5FD" />
        </Pressable>
        <Pressable
          style={popupStyles.link}
          onPress={() => void Linking.openURL(mapLink.url)}
          hitSlop={6}
        >
          <Text style={popupStyles.linkText}>{mapLink.label}</Text>
          <Ionicons name="open-outline" size={12} color="#93C5FD" />
        </Pressable>
        {pin.sourceUrl ? (
          <Pressable
            style={popupStyles.link}
            onPress={() => void Linking.openURL(pin.sourceUrl!)}
            hitSlop={6}
          >
            <Text style={popupStyles.linkText}>공식</Text>
            <Ionicons name="open-outline" size={12} color="#93C5FD" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EventPinCard({
  pin,
  selected,
  onPress,
}: {
  pin: MapEventPin;
  selected: boolean;
  onPress: () => void;
}) {
  const mapLink = externalMapLink(pin);
  const searchUrl = googleSearchUrlForEvent(pin);
  const phase =
    pin.phase && PHASE_LABEL[pin.phase] ? PHASE_LABEL[pin.phase] : null;
  const phaseOngoing = pin.phase === "ongoing";

  return (
    <Pressable
      onPress={onPress}
      style={[cardStyles.card, selected && cardStyles.cardSelected]}
    >
      <View style={cardStyles.titleRow}>
        <View
          style={[cardStyles.dot, { backgroundColor: eventPinColor(pin.category) }]}
        />
        <Text style={cardStyles.cc}>{countryCode(pin.country)}</Text>
        <Text style={cardStyles.title} numberOfLines={2}>
          {pin.title}
        </Text>
        {phase ? (
          <View
            style={[
              cardStyles.badge,
              phaseOngoing ? cardStyles.badgeOngoing : cardStyles.badgeUpcoming,
            ]}
          >
            <Text
              style={[
                cardStyles.badgeText,
                phaseOngoing ? cardStyles.badgeTextOngoing : cardStyles.badgeTextUpcoming,
              ]}
            >
              {phase}
            </Text>
          </View>
        ) : null}
      </View>

      {pin.description ? (
        <Text style={cardStyles.desc} numberOfLines={2}>
          {pin.description}
        </Text>
      ) : null}

      <Text style={cardStyles.meta}>{formatEventDates(pin)}</Text>

      {pin.venueName ? (
        <View style={cardStyles.venueRow}>
          <Ionicons name="location" size={13} color="#F87171" />
          <Text style={cardStyles.venue} numberOfLines={1}>
            {pin.venueName}
          </Text>
        </View>
      ) : null}

      <View style={cardStyles.actions}>
        <Pressable
          style={cardStyles.link}
          onPress={() => void Linking.openURL(searchUrl)}
          hitSlop={6}
        >
          <Text style={cardStyles.linkText}>Google 검색</Text>
          <Ionicons name="search-outline" size={12} color="#93C5FD" />
        </Pressable>
        <Pressable
          style={cardStyles.link}
          onPress={() => void Linking.openURL(mapLink.url)}
          hitSlop={6}
        >
          <Text style={cardStyles.linkText}>{mapLink.label}</Text>
          <Ionicons name="open-outline" size={12} color="#93C5FD" />
        </Pressable>
        {pin.sourceUrl ? (
          <Pressable
            style={cardStyles.link}
            onPress={() => void Linking.openURL(pin.sourceUrl!)}
            hitSlop={6}
          >
            <Text style={cardStyles.linkText}>공식</Text>
            <Ionicons name="open-outline" size={12} color="#93C5FD" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export function EventsMapScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<PanelTab>("venue");
  const [selected, setSelected] = useState<MapEventPin | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const userCountry = (user?.countryCode ?? "KR").toUpperCase();

  const query = useQuery({
    queryKey: ["mobile-events-map", true],
    queryFn: () => fetchEventsMap({ global: true }),
  });

  const pins = query.data?.pins ?? [];
  const listPins = useMemo(
    () => sortPinsByUserCountryThenDate(filterListPins(pins, tab), userCountry),
    [pins, tab, userCountry]
  );
  const mapPins = useMemo(() => filterMapPins(pins, tab), [pins, tab]);
  const hasPins = pins.some((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#E8ECF8" />
          <Text style={styles.back}>뒤로</Text>
        </Pressable>
        <Text style={styles.heading}>서브컬처 맵</Text>
        <Pressable
          onPress={() => setPanelOpen((v) => !v)}
          hitSlop={8}
          style={[styles.splitBtn, panelOpen && styles.splitBtnActive]}
          accessibilityLabel={panelOpen ? "목록 접기" : "목록으로 반 나누기"}
          accessibilityRole="button"
        >
          <Ionicons
            name={panelOpen ? "map-outline" : "list-outline"}
            size={17}
            color={panelOpen ? "#0B1020" : "rgba(255,255,255,0.9)"}
          />
        </Pressable>
        <MapAttributionButton />
      </View>

      {query.isLoading && !query.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#A78BFA" />
      ) : query.isError && !query.data ? (
        <Text style={styles.error}>지도를 불러오지 못했습니다.</Text>
      ) : !hasPins ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>표시할 행사가 없습니다</Text>
          <Text style={styles.emptySub}>등록된 서브컬처 행사 핀이 없습니다.</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.mapPane}>
            <EventsNativeMap
              style={StyleSheet.absoluteFill}
              pins={mapPins}
              global
              selectedId={selected?.id ?? null}
              focusPinId={selected?.id ?? null}
              onSelectPin={(pin) => {
                setSelected(pin);
              }}
            />
            {selected ? (
              <View
                style={[
                  styles.popupAnchor,
                  { bottom: panelOpen ? 12 : Math.max(insets.bottom, 12) + 8 },
                ]}
                pointerEvents="box-none"
              >
                <PinPopupCard pin={selected} onClose={() => setSelected(null)} />
              </View>
            ) : null}
          </View>

          {panelOpen ? (
            <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <View style={styles.tabRow}>
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      style={[styles.tab, active && styles.tabActive]}
                      onPress={() => {
                        setTab(t.id);
                        setSelected(null);
                      }}
                    >
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <FlatList
                data={listPins}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={
                  listPins.length === 0 ? styles.listEmpty : styles.listContent
                }
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyList}>이 탭에 표시할 항목이 없습니다</Text>
                }
                renderItem={({ item }) => (
                  <EventPinCard
                    pin={item}
                    selected={selected?.id === item.id}
                    onPress={() => setSelected(item)}
                  />
                )}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070B16" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0B1020",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, minWidth: 56 },
  back: { color: "#C4B5FD", fontWeight: "700", fontSize: 15 },
  heading: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#F3F4F6",
    letterSpacing: -0.2,
  },
  splitBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  splitBtnActive: {
    backgroundColor: "#E8ECF8",
    borderColor: "#E8ECF8",
  },
  body: { flex: 1 },
  mapPane: {
    flex: 1,
    minHeight: 180,
    backgroundColor: "#0B1020",
  },
  popupAnchor: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 4,
  },
  panel: {
    height: "48%",
    maxHeight: 420,
    backgroundColor: "rgba(11,16,32,0.96)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    paddingTop: 6,
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  tabActive: { backgroundColor: "rgba(255,255,255,0.14)" },
  tabText: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#FFFFFF" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 10, paddingBottom: 8, gap: 8 },
  listEmpty: { flexGrow: 1, justifyContent: "center", padding: 24 },
  emptyList: {
    textAlign: "center",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#F3F4F6" },
  emptySub: { fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center" },
  error: { color: "#F87171", padding: 20, fontWeight: "600" },
});

const attrStyles = StyleSheet.create({
  wrap: { position: "relative", zIndex: 5 },
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  popover: {
    position: "absolute",
    right: 0,
    top: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 118,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#121826",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
  },
  popoverText: {
    color: "#F3F4F6",
    fontSize: 11,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});

const popupStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    paddingTop: 14,
    backgroundColor: "rgba(11,16,32,0.94)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  close: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  image: {
    width: "100%",
    height: 110,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  roadViewWrap: { gap: 4 },
  roadView: {
    width: "100%",
    height: 72,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  roadViewCaption: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "600",
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingRight: 28 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeUpcoming: { backgroundColor: "rgba(139,92,246,0.22)" },
  badgeOngoing: { backgroundColor: "rgba(16,185,129,0.22)" },
  badgeOfficial: { backgroundColor: "rgba(124,58,237,0.2)" },
  badgeMaid: { backgroundColor: "rgba(236,72,153,0.2)" },
  badgeText: { fontSize: 10, fontWeight: "700" },
  badgeTextUpcoming: { color: "#C4B5FD" },
  badgeTextOngoing: { color: "#6EE7B7" },
  badgeTextOfficial: { color: "#C4B5FD" },
  badgeTextMaid: { color: "#F9A8D4" },
  title: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    paddingRight: 28,
  },
  meta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  venueLink: {
    color: "#93C5FD",
    textDecorationLine: "underline",
    fontWeight: "700",
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 4 },
  link: { flexDirection: "row", alignItems: "center", gap: 3 },
  linkText: { color: "#93C5FD", fontSize: 12, fontWeight: "700" },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 6,
  },
  cardSelected: {
    borderColor: "rgba(167,139,250,0.55)",
    backgroundColor: "rgba(167,139,250,0.12)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    flexWrap: "wrap",
  },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  cc: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  title: {
    flex: 1,
    minWidth: 120,
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeUpcoming: { backgroundColor: "rgba(139,92,246,0.22)" },
  badgeOngoing: { backgroundColor: "rgba(16,185,129,0.22)" },
  badgeText: { fontSize: 10, fontWeight: "700" },
  badgeTextUpcoming: { color: "#C4B5FD" },
  badgeTextOngoing: { color: "#6EE7B7" },
  desc: { color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 15 },
  meta: { color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: "600" },
  venueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  venue: { flex: 1, color: "rgba(255,255,255,0.78)", fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 2 },
  link: { flexDirection: "row", alignItems: "center", gap: 3 },
  linkText: { color: "#93C5FD", fontSize: 12, fontWeight: "700" },
});

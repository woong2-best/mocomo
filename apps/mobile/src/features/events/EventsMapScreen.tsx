import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import {
  createEventMapRecommendation,
  fetchEventsMap,
  type MapEventPin,
} from "@/api/events";
import { eventPinColor } from "@/features/events/event-map-colors";
import { EventsNativeMap } from "@/features/events/EventsNativeMap";
import {
  ESRI_ATTRIBUTION,
  ESRI_ATTRIBUTION_URL,
} from "@/maps/map-styles";
import type { RootStackParamList } from "@/navigation/types";
import { googleMapsExternalUrl } from "@/maps/google-external-url";
import { useI18n } from "@/i18n/I18nProvider";
import { eventsUi, type EventsUi } from "@/features/events/events-ui";
import { googleSearchUrlForMapPin } from "@/features/events/map-pin-google-search";

type PanelTab = "venue" | "maid_cafe" | "recommendation";

function mapPhaseLabel(phase: string | undefined, copy: EventsUi): string | null {
  if (phase === "ongoing") return copy.statusOngoing;
  if (phase === "upcoming") return copy.statusUpcoming;
  if (phase === "permanent") return copy.statusPermanent;
  return null;
}

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

/** User ISO (KR) vs event pin country (kr). */
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
  if (!raw) return "";
  if (raw.length <= 3) return raw.toUpperCase();
  if (/korea/i.test(raw)) return "KR";
  if (/japan/i.test(raw)) return "JP";
  if (/spain/i.test(raw)) return "ES";
  return raw.slice(0, 2).toUpperCase();
}

function googleSearchUrlForEvent(pin: MapEventPin) {
  return googleSearchUrlForMapPin(pin);
}

function externalMapLink(pin: MapEventPin, mapsLabel: string) {
  return {
    label: mapsLabel,
    url: googleMapsExternalUrl({
      place: pin.venueName ?? pin.title,
      coords: { lat: pin.lat, lng: pin.lng },
    }),
  };
}

function formatEventDates(pin: MapEventPin, copy: EventsUi, locale: string) {
  if (pin.category === "user_recommendation") return copy.pinUserRec;
  if (pin.category === "maid_cafe") return copy.pinMaidOpen;
  const start = new Date(pin.startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const dateLoc = locale === "ko" ? "ko-KR" : "en-US";
  const startLabel = start.toLocaleDateString(dateLoc, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  if (!pin.endsAt) return startLabel;
  const end = new Date(pin.endsAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  const endLabel = end.toLocaleDateString(dateLoc, { month: "long", day: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function formatPopupDate(pin: MapEventPin, copy: EventsUi, locale: string) {
  if (pin.category === "user_recommendation") return copy.pinRecShort;
  if (pin.category === "maid_cafe") return copy.pinMaidShort;
  const start = new Date(pin.startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const dateLoc = locale === "ko" ? "ko-KR" : "en-US";
  return start.toLocaleDateString(dateLoc, { month: "numeric", day: "numeric" });
}

function MapAttributionButton({ a11yLabel }: { a11yLabel: string }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={attrStyles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        hitSlop={10}
        style={attrStyles.btn}
        accessibilityLabel={a11yLabel}
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
  copy,
  locale,
}: {
  pin: MapEventPin;
  onClose: () => void;
  copy: EventsUi;
  locale: string;
}) {
  const mapLink = externalMapLink(pin, copy.googleMaps);
  const searchUrl = googleSearchUrlForEvent(pin);
  const phase = mapPhaseLabel(pin.phase, copy);
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
        accessibilityLabel={copy.closePopupA11y}
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
          <Text style={popupStyles.roadViewCaption}>{copy.roadView}</Text>
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
            <Text style={[popupStyles.badgeText, popupStyles.badgeTextOfficial]}>{copy.badgeOfficial}</Text>
          </View>
        ) : isMaid ? (
          <View style={[popupStyles.badge, popupStyles.badgeMaid]}>
            <Text style={[popupStyles.badgeText, popupStyles.badgeTextMaid]}>{copy.badgeMaid}</Text>
          </View>
        ) : isUserRec ? (
          <View style={[popupStyles.badge, popupStyles.badgeOngoing]}>
            <Text style={[popupStyles.badgeText, popupStyles.badgeTextOngoing]}>{copy.badgeUserRec}</Text>
          </View>
        ) : null}
      </View>

      <Text style={popupStyles.title}>{pin.title}</Text>

      <Text style={popupStyles.meta}>
        {countryCode(pin.country)} {formatPopupDate(pin, copy, locale)}
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
          <Text style={popupStyles.linkText}>{copy.googleSearch}</Text>
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
            <Text style={popupStyles.linkText}>{copy.official}</Text>
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
  copy,
  locale,
}: {
  pin: MapEventPin;
  selected: boolean;
  onPress: () => void;
  copy: EventsUi;
  locale: string;
}) {
  const mapLink = externalMapLink(pin, copy.googleMaps);
  const searchUrl = googleSearchUrlForEvent(pin);
  const phase = mapPhaseLabel(pin.phase, copy);
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

      <Text style={cardStyles.meta}>{formatEventDates(pin, copy, locale)}</Text>

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
          <Text style={cardStyles.linkText}>{copy.googleSearch}</Text>
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
            <Text style={cardStyles.linkText}>{copy.official}</Text>
            <Ionicons name="open-outline" size={12} color="#93C5FD" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export function EventsMapScreen() {
  const { t, locale } = useI18n();
  const copy = useMemo(() => eventsUi(t), [t]);
  const tabs = useMemo(
    (): { id: PanelTab; label: string }[] => [
      { id: "venue", label: copy.mapTabVenue },
      { id: "maid_cafe", label: copy.mapTabMaid },
      { id: "recommendation", label: copy.mapTabRec },
    ],
    [copy]
  );
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<PanelTab>("venue");
  const [selected, setSelected] = useState<MapEventPin | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [recTitle, setRecTitle] = useState("");
  const [recNote, setRecNote] = useState("");
  const [formError, setFormError] = useState("");
  const userCountry = (user?.countryCode ?? "KR").toUpperCase();

  const query = useQuery({
    queryKey: ["mobile-events-map", true],
    queryFn: () => fetchEventsMap({ global: true }),
  });

  const createRec = useMutation({
    mutationFn: createEventMapRecommendation,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["mobile-events-map", true] });
      setSelected(data.pin);
      setPendingCoords(null);
      setRecTitle("");
      setRecNote("");
      setAddMode(false);
      setFormError("");
    },
    onError: (err: Error) => {
      setFormError(err.message || copy.saveFail);
    },
  });

  const pins = query.data?.pins ?? [];
  const pickMode = addMode && tab === "recommendation";
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
          <Text style={styles.back}>{copy.back}</Text>
        </Pressable>
        <Text style={styles.heading}>{copy.mapTitle}</Text>
        <Pressable
          onPress={() => setPanelOpen((v) => !v)}
          hitSlop={8}
          style={[styles.splitBtn, panelOpen && styles.splitBtnActive]}
          accessibilityLabel={copy.panelToggle(panelOpen)}
          accessibilityRole="button"
        >
          <Ionicons
            name={panelOpen ? "map-outline" : "list-outline"}
            size={17}
            color={panelOpen ? "#0B1020" : "rgba(255,255,255,0.9)"}
          />
        </Pressable>
        <MapAttributionButton a11yLabel={copy.mapAttributionA11y} />
      </View>

      {query.isLoading && !query.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#A78BFA" />
      ) : query.isError && !query.data ? (
        <Text style={styles.error}>{copy.loadMapError}</Text>
      ) : !hasPins ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{copy.noPinsTitle}</Text>
          <Text style={styles.emptySub}>{copy.noPinsSub}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.mapPane}>
            <EventsNativeMap
              style={StyleSheet.absoluteFill}
              pins={mapPins}
              global
              userCountryCode={userCountry}
              selectedId={selected?.id ?? null}
              focusPinId={selected?.id ?? null}
              pickMode={pickMode}
              onMapPick={(coords) => {
                if (!pickMode) return;
                setPendingCoords(coords);
                setFormError("");
              }}
              onSelectPin={(pin) => {
                setSelected(pin);
              }}
            />
            {pickMode && !pendingCoords ? (
              <View style={styles.pickHint} pointerEvents="none">
                <Text style={styles.pickHintText}>{copy.pickOnMap}</Text>
              </View>
            ) : null}
            {selected ? (
              <View
                style={[
                  styles.popupAnchor,
                  { bottom: panelOpen ? 12 : Math.max(insets.bottom, 12) + 8 },
                ]}
                pointerEvents="box-none"
              >
                <PinPopupCard
                  pin={selected}
                  onClose={() => setSelected(null)}
                  copy={copy}
                  locale={locale}
                />
              </View>
            ) : null}
          </View>

          {panelOpen ? (
            <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <View style={styles.tabRow}>
                {tabs.map((t) => {
                  const active = tab === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      style={[styles.tab, active && styles.tabActive]}
                      onPress={() => {
                        setTab(t.id);
                        setSelected(null);
                        if (t.id !== "recommendation") {
                          setAddMode(false);
                          setPendingCoords(null);
                          setFormError("");
                        }
                        if (t.id === "recommendation") {
                          setPanelOpen(true);
                        }
                      }}
                    >
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {tab === "recommendation" ? (
                <View style={styles.recToolbar}>
                  <Text style={styles.recHint}>{copy.recHint}</Text>
                  <Pressable
                    style={[styles.recAddBtn, addMode && styles.recAddBtnActive]}
                    onPress={() => {
                      if (addMode) {
                        setAddMode(false);
                        setPendingCoords(null);
                        setFormError("");
                        return;
                      }
                      if (!user?.id) {
                        setFormError(copy.loginToRec);
                        return;
                      }
                      setFormError("");
                      setAddMode(true);
                    }}
                  >
                    <Ionicons
                      name={addMode ? "close" : "add"}
                      size={14}
                      color={addMode ? "#0B1020" : "#ECFDF5"}
                    />
                    <Text style={[styles.recAddText, addMode && styles.recAddTextActive]}>
                      {addMode ? copy.cancel : copy.add}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {pendingCoords && tab === "recommendation" ? (
                <View style={styles.recForm}>
                  <Text style={styles.recCoords}>
                    {copy.selectedCoords(pendingCoords.lat, pendingCoords.lng)}
                  </Text>
                  <TextInput
                    value={recTitle}
                    onChangeText={setRecTitle}
                    placeholder={copy.placeNamePh}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    maxLength={80}
                    style={styles.recInput}
                  />
                  <TextInput
                    value={recNote}
                    onChangeText={setRecNote}
                    placeholder={copy.memoPh}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    maxLength={200}
                    style={styles.recInput}
                  />
                  {formError ? <Text style={styles.recFormError}>{formError}</Text> : null}
                  <View style={styles.recFormActions}>
                    <Pressable
                      style={[
                        styles.recSubmit,
                        createRec.isPending && styles.recSubmitDisabled,
                      ]}
                      disabled={createRec.isPending}
                      onPress={() => {
                        if (!pendingCoords || !recTitle.trim()) {
                          setFormError(copy.placeNameRequired);
                          return;
                        }
                        setFormError("");
                        createRec.mutate({
                          title: recTitle.trim(),
                          description: recNote.trim() || undefined,
                          lat: pendingCoords.lat,
                          lng: pendingCoords.lng,
                        });
                      }}
                    >
                      <Text style={styles.recSubmitText}>
                        {createRec.isPending ? copy.saving : copy.register}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.recCancel}
                      onPress={() => {
                        setPendingCoords(null);
                        setRecTitle("");
                        setRecNote("");
                      }}
                    >
                      <Text style={styles.recCancelText}>{copy.cancel}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {!pendingCoords && formError && tab === "recommendation" ? (
                <Text style={styles.recFormErrorBanner}>{formError}</Text>
              ) : null}

              <FlatList
                data={listPins}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={
                  listPins.length === 0 ? styles.listEmpty : styles.listContent
                }
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyList}>
                    {tab === "recommendation" ? copy.emptyRec : copy.emptyTab}
                  </Text>
                }
                renderItem={({ item }) => (
                  <EventPinCard
                    pin={item}
                    selected={selected?.id === item.id}
                    onPress={() => setSelected(item)}
                    copy={copy}
                    locale={locale}
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
  pickHint: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    alignItems: "center",
    zIndex: 3,
  },
  pickHintText: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "rgba(6,78,59,0.82)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  recToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  recHint: { color: "rgba(167,243,208,0.9)", fontSize: 10, fontWeight: "600" },
  recAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(5,150,105,0.9)",
  },
  recAddBtnActive: { backgroundColor: "#E8ECF8" },
  recAddText: { color: "#ECFDF5", fontSize: 12, fontWeight: "800" },
  recAddTextActive: { color: "#0B1020" },
  recForm: {
    marginHorizontal: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(6,78,59,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(167,243,208,0.2)",
    gap: 8,
  },
  recCoords: { color: "rgba(167,243,208,0.9)", fontSize: 11, fontWeight: "600" },
  recInput: {
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "600",
  },
  recFormError: { color: "#FCA5A5", fontSize: 11, fontWeight: "600" },
  recFormErrorBanner: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  recFormActions: { flexDirection: "row", gap: 8 },
  recSubmit: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
  },
  recSubmitDisabled: { opacity: 0.6 },
  recSubmitText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  recCancel: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  recCancelText: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "700" },
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

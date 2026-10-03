import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/config/env";
import { getCurrentMeetCoords, meetLocationErrorMessage } from "@/maps/location";
import { UsedSatelliteMap, type UsedMapPin } from "@/maps/UsedSatelliteMap";
import type { MeetCoords } from "@/maps/types";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import { isShippingRegionValue, KOREA_SIDO } from "@/data/server-values/korea-regions";

const REGION_COORDS_BY_SIDO: Record<string, MeetCoords & { zoom: number }> = {
  default: { lat: 37.5665, lng: 126.978, zoom: 14 },
  seoul: { lat: 37.5665, lng: 126.978, zoom: 14 },
  busan: { lat: 35.1796, lng: 129.0756, zoom: 14 },
  gyeonggi: { lat: 37.4138, lng: 127.5183, zoom: 12 },
};

function regionCenter(region: string) {
  for (const sido of KOREA_SIDO) {
    const coords = REGION_COORDS_BY_SIDO[sido.id];
    if (coords && region.includes(sido.short)) return coords;
  }
  return REGION_COORDS_BY_SIDO.default;
}

type Props = {
  mode: "view" | "pick";
  country: string;
  region: string;
  /** District (KR) — limits map search to the selected area */
  district?: string;
  meetPlace?: string;
  coords?: MeetCoords | null;
  onCoordsChange?: (coords: MeetCoords | null) => void;
  /** Reverse-geocode label (current location / pin) for syncing region pickers */
  onGeocodeLabel?: (label: string) => void;
  /** @deprecated Map search and address details are separate; unused in pick mode */
  onMeetPlaceChange?: (text: string) => void;
  height?: number;
  pinTitle?: string;
  pinSearchUrl?: string;
  pinMapUrl?: string;
};

export function MeetMap({
  mode,
  country,
  region,
  district = "",
  meetPlace = "",
  coords,
  onCoordsChange,
  onGeocodeLabel,
  height = 220,
  pinTitle,
  pinSearchUrl,
  pinMapUrl,
}: Props) {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const mapChrome = isDark ? "#0F1524" : "#1B2838";
  const styles = useMemo(() => createStyles(colors, mapChrome), [colors, mapChrome]);
  const shipping = isShippingRegionValue(region) || region === "Shipping";
  const resolvedPinTitle = pinTitle ?? t("m.maps.meetup_place");
  const [box, setBox] = useState({ w: 0, h: 0 });

  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [displayCoords, setDisplayCoords] = useState<MeetCoords | null>(coords ?? null);
  const active = coords ?? displayCoords;
  const centerBase = regionCenter(region);
  const center = active ?? { lat: centerBase.lat, lng: centerBase.lng };
  const zoom = active ? 16 : centerBase.zoom;
  const pinPlace = mode === "pick" ? searchQ.trim() : meetPlace.trim();
  const pins = useMemo<UsedMapPin[]>(() => {
    if (!active) return [];
    return [
      {
        id: "meet",
        lat: active.lat,
        lng: active.lng,
        color: "#F97316",
        title: resolvedPinTitle,
        place: mode === "pick" ? pinPlace || t("m.maps.search_for_an_address") : undefined,
        searchUrl: mode === "view" ? pinSearchUrl : undefined,
        mapUrl: mode === "view" ? pinMapUrl : undefined,
      },
    ];
  }, [active, mode, pinPlace, resolvedPinTitle, pinSearchUrl, pinMapUrl, t]);

  useEffect(() => {
    setDisplayCoords(coords ?? null);
  }, [coords]);

  const reverse = useCallback(async (lat: number, lng: number) => {
    try {
      const url = `${API_BASE_URL}/api/used/reverse-geocode?lat=${lat}&lng=${lng}&country=${encodeURIComponent(country)}`;
      const res = await fetch(url);
      const body = (await res.json()) as { label?: string };
      if (res.ok && body.label) {
        setSearchQ(body.label);
        onGeocodeLabel?.(body.label);
      }
    } catch {
      /* ignore */
    }
  }, [country, onGeocodeLabel]);

  const handlePick = useCallback(
    (next: MeetCoords) => {
      if (mode !== "pick") return;
      onCoordsChange?.(next);
      setDisplayCoords(next);
      void reverse(next.lat, next.lng);
    },
    [mode, onCoordsChange, reverse]
  );

  async function searchPlace() {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    try {
      const params = new URLSearchParams({ q, country, region });
      const districtTrim = district.trim();
      if (districtTrim) params.set("place", districtTrim);
      const res = await fetch(`${API_BASE_URL}/api/used/geocode?${params}`);
      const body = (await res.json()) as {
        lat?: number;
        lng?: number;
        label?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || body.lat == null || body.lng == null) {
        setError(body.error ?? t("m.maps.could_not_find_that_place"));
        return;
      }
      const next = { lat: body.lat, lng: body.lng };
      onCoordsChange?.(next);
      const label = body.label?.trim() || q;
      setSearchQ(label);
      if (label) onGeocodeLabel?.(label);
      setDisplayCoords(next);
      setError("");
    } catch {
      setError(t("m.search.search_failed"));
    } finally {
      setSearching(false);
    }
  }

  async function useMyLocation() {
    setError("");
    try {
      const next = await getCurrentMeetCoords();
      onCoordsChange?.(next);
      setDisplayCoords(next);
      void reverse(next.lat, next.lng);
    } catch (e) {
      setError(meetLocationErrorMessage(e));
    }
  }

  if (shipping) {
    return (
      <Text style={styles.shipping}>{t("m.maps.nationwide_shipping_trades_are_completed")}</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {mode === "pick" ? (
        <View style={styles.toolbar}>
          <TextInput
            style={styles.input}
            value={searchQ}
            onChangeText={setSearchQ}
            placeholder={t("m.maps.address_or_place_name_map_search")}
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => void searchPlace()}
            returnKeyType="search"
          />
          <Pressable style={styles.btn} onPress={() => void searchPlace()} disabled={searching}>
            {searching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>{t("m.common.search")}</Text>
            )}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => void useMyLocation()}>
            <Ionicons name="navigate" size={18} color={colors.cobalt} />
          </Pressable>
        </View>
      ) : null}

      <View
        style={[styles.mapBox, { height }]}
        onLayout={(event) => {
          const { width, height: layoutH } = event.nativeEvent.layout;
          setBox((prev) => (prev.w === width && prev.h === layoutH ? prev : { w: width, h: layoutH }));
        }}
      >
        <UsedSatelliteMap
          backgroundColor={mapChrome}
          width={box.w}
          height={box.h || height}
          center={center}
          zoom={zoom}
          pins={pins}
          onPick={mode === "pick" ? handlePick : undefined}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {mode === "pick" ? (
        <Text style={styles.caption}>
          {t("m.maps.the_field_above_is_for_map")}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors, mapChrome: string) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
    input: {
      flex: 1,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontWeight: "600",
      fontSize: 13,
    },
    btn: {
      backgroundColor: colors.cobalt,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 52,
      alignItems: "center",
    },
    btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    iconBtn: {
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      padding: 10,
      backgroundColor: colors.muted,
    },
    mapBox: {
      borderRadius: radii.md,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: mapChrome,
    },
    error: { fontSize: 12, color: colors.danger ?? "#DC2626", fontWeight: "600" },
    caption: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
    shipping: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600",
      textAlign: "center",
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderStyle: "dashed",
    },
  });
}

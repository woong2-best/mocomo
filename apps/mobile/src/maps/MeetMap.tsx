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

const REGION_CENTERS: Record<string, MeetCoords & { zoom: number }> = {
  default: { lat: 37.5665, lng: 126.978, zoom: 14 },
  "서울": { lat: 37.5665, lng: 126.978, zoom: 14 },
  "부산": { lat: 35.1796, lng: 129.0756, zoom: 14 },
  "경기": { lat: 37.4138, lng: 127.5183, zoom: 12 },
};

function regionCenter(region: string) {
  for (const key of Object.keys(REGION_CENTERS)) {
    if (key !== "default" && region.includes(key)) return REGION_CENTERS[key]!;
  }
  return REGION_CENTERS.default!;
}

type Props = {
  mode: "view" | "pick";
  country: string;
  region: string;
  meetPlace?: string;
  coords?: MeetCoords | null;
  onCoordsChange?: (coords: MeetCoords | null) => void;
  /** @deprecated 지도 검색과 주소 상세는 분리됨. pick 모드에서는 사용하지 않음 */
  onMeetPlaceChange?: (text: string) => void;
  height?: number;
  pinTitle?: string;
};

export function MeetMap({
  mode,
  country,
  region,
  meetPlace = "",
  coords,
  onCoordsChange,
  height = 220,
  pinTitle = "거래 장소",
}: Props) {
  const { colors, isDark } = useTheme();
  const mapChrome = isDark ? "#0F1524" : "#1B2838";
  const styles = useMemo(() => createStyles(colors, mapChrome), [colors, mapChrome]);
  const shipping =
    region.includes("전국 배송") ||
    region.includes("전국 택배") ||
    region === "Shipping";
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
        title: pinTitle,
        place: pinPlace || "주소를 검색해 주세요",
      },
    ];
  }, [active, pinPlace, pinTitle]);

  useEffect(() => {
    setDisplayCoords(coords ?? null);
  }, [coords]);

  const reverse = useCallback(async (lat: number, lng: number) => {
    try {
      const url = `${API_BASE_URL}/api/used/reverse-geocode?lat=${lat}&lng=${lng}&country=${encodeURIComponent(country)}`;
      const res = await fetch(url);
      const body = (await res.json()) as { label?: string };
      if (res.ok && body.label) setSearchQ(body.label);
    } catch {
      /* ignore */
    }
  }, [country]);

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
      const res = await fetch(`${API_BASE_URL}/api/used/geocode?${params}`);
      const body = (await res.json()) as {
        lat?: number;
        lng?: number;
        label?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || body.lat == null || body.lng == null) {
        setError(body.error ?? "장소를 찾지 못했습니다.");
        return;
      }
      const next = { lat: body.lat, lng: body.lng };
      onCoordsChange?.(next);
      setSearchQ(body.label?.trim() || q);
      setDisplayCoords(next);
      setError("");
    } catch {
      setError("검색에 실패했습니다.");
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
      <Text style={styles.shipping}>전국 배송 거래는 지도 없이 배송으로 진행해 주세요.</Text>
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
            placeholder="주소 또는 장소 이름 (지도 검색)"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => void searchPlace()}
            returnKeyType="search"
          />
          <Pressable style={styles.btn} onPress={() => void searchPlace()} disabled={searching}>
            {searching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>검색</Text>
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
          위 칸은 지도 검색용입니다. 건물·출입구 등 상세는 아래 주소 상세에만 적어 주세요.
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

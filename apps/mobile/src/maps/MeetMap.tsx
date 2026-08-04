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
import { MapProvider } from "@/maps/MapProvider";
import { getCurrentMeetCoords, meetLocationErrorMessage } from "@/maps/location";
import { selectMapEngine } from "@/maps/select-engine";
import type { MeetCoords } from "@/maps/types";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const REGION_CENTERS: Record<string, MeetCoords & { zoom: number }> = {
  default: { lat: 37.5665, lng: 126.978, zoom: 11 },
  "서울": { lat: 37.5665, lng: 126.978, zoom: 11 },
  "부산": { lat: 35.1796, lng: 129.0756, zoom: 11 },
  "경기": { lat: 37.4138, lng: 127.5183, zoom: 10 },
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
  onMeetPlaceChange?: (text: string) => void;
  height?: number;
};

export function MeetMap({
  mode,
  country,
  region,
  meetPlace = "",
  coords,
  onCoordsChange,
  onMeetPlaceChange,
  height = 220,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const engine = selectMapEngine(country);
  const shipping = region.includes("전국 택배");

  const [searchQ, setSearchQ] = useState(meetPlace);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [displayCoords, setDisplayCoords] = useState<MeetCoords | null>(coords ?? null);
  const active = coords ?? displayCoords;
  const centerBase = regionCenter(region);
  const center = active ?? { lat: centerBase.lat, lng: centerBase.lng };
  const zoom = active ? 16 : centerBase.zoom;

  useEffect(() => {
    setSearchQ(meetPlace);
  }, [meetPlace]);

  useEffect(() => {
    setDisplayCoords(coords ?? null);
  }, [coords]);

  const reverse = useCallback(
    async (lat: number, lng: number) => {
      try {
        const url = `${API_BASE_URL}/api/used/reverse-geocode?lat=${lat}&lng=${lng}&country=${encodeURIComponent(country)}`;
        const res = await fetch(url);
        const body = (await res.json()) as { label?: string };
        if (res.ok && body.label) onMeetPlaceChange?.(body.label);
      } catch {
        /* ignore */
      }
    },
    [country, onMeetPlaceChange]
  );

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
      onMeetPlaceChange?.(body.label?.trim() || q);
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
      <Text style={styles.shipping}>전국 택배 거래는 지도 없이 택배로 진행해 주세요.</Text>
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
            placeholder={
              engine === "kakao" ? "카카오맵 장소 검색" : "Search place (OSM)"
            }
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

      <View style={[styles.mapBox, { height }]}>
        <MapProvider
          country={country}
          mode={mode}
          center={center}
          zoom={zoom}
          marker={active}
          onPick={mode === "pick" ? handlePick : undefined}
          style={StyleSheet.absoluteFillObject}
        />
        {mode === "pick" && !active ? (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>지도를 탭하거나 검색해서 핀을 찍어 주세요</Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {mode === "pick" ? (
        <Text style={styles.caption}>
          {engine === "kakao"
            ? "한국은 카카오맵 Native로 표시됩니다."
            : "MapLibre Native + OpenStreetMap으로 표시됩니다."}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
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
      backgroundColor: colors.muted,
    },
    hint: {
      position: "absolute",
      left: 8,
      right: 8,
      bottom: 8,
      backgroundColor: "rgba(255,255,255,0.92)",
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    hintText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
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

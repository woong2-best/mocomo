import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MeetMap } from "@/maps/MeetMap";
import { normalizeMeetCountry, selectMapEngine } from "@/maps/select-engine";
import type { MeetMapPayload } from "@/maps/types";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export type UsedMeetMapInfo = Omit<MeetMapPayload, "country" | "externalMapUrl"> & {
  country?: string;
  externalMapUrl?: string;
};

/**
 * Buyer meet-location card — same MapProvider path as seller picker.
 * KR → Kakao Native · else → MapLibre Native. No WebView.
 */
export function UsedMeetMapCard({ map }: { map: UsedMeetMapInfo }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!Number.isFinite(map.lat) || !Number.isFinite(map.lng)) {
    return null;
  }

  const country = normalizeMeetCountry(map.country);
  const engine = selectMapEngine(country);
  const externalUrl =
    map.externalMapUrl ||
    map.kakaoMapUrl ||
    (engine === "kakao"
      ? `https://map.kakao.com/link/map/${map.lat},${map.lng}`
      : `https://www.openstreetmap.org/?mlat=${map.lat}&mlon=${map.lng}#map=16/${map.lat}/${map.lng}`);
  const linkLabel = engine === "kakao" ? "카카오맵" : "OpenStreetMap";

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="location" size={16} color={colors.brand} />
          <Text style={styles.title} numberOfLines={2}>
            거래 희망 장소 · {map.label}
          </Text>
        </View>
        {externalUrl ? (
          <Pressable
            onPress={() => void Linking.openURL(externalUrl).catch(() => undefined)}
            hitSlop={8}
            style={styles.linkBtn}
          >
            <Text style={styles.link}>{linkLabel}</Text>
            <Ionicons name="open-outline" size={13} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <MeetMap
        mode="view"
        country={country}
        region={map.label}
        meetPlace={map.label}
        coords={map.hasPin ? { lat: map.lat, lng: map.lng } : { lat: map.lat, lng: map.lng }}
        height={220}
      />

      <Text style={styles.caption}>{map.caption}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginTop: spacing.md },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 8,
    },
    titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
    title: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.text },
    linkBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    link: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    caption: {
      marginTop: 8,
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
      lineHeight: 16,
    },
  });
}

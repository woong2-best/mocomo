import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MeetMap } from "@/maps/MeetMap";
import { normalizeMeetCountry } from "@/maps/select-engine";
import type { MeetMapPayload } from "@/maps/types";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export type UsedMeetMapInfo = Omit<MeetMapPayload, "country" | "externalMapUrl"> & {
  country?: string;
  externalMapUrl?: string;
};

/** Buyer meet-location card — 2D Esri satellite, seller-entered address. */
export function UsedMeetMapCard({ map, title }: { map: UsedMeetMapInfo; title?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!Number.isFinite(map.lat) || !Number.isFinite(map.lng)) {
    return null;
  }

  const country = normalizeMeetCountry(map.country);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="location" size={16} color={colors.brand} />
          <Text style={styles.title} numberOfLines={2}>
            거래 희망 장소 · {map.label}
          </Text>
        </View>
      </View>

      <MeetMap
        mode="view"
        country={country}
        region={map.label}
        meetPlace={map.label}
        coords={{ lat: map.lat, lng: map.lng }}
        height={220}
        pinTitle={title || "거래 장소"}
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
    caption: {
      marginTop: 8,
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
      lineHeight: 16,
    },
  });
}

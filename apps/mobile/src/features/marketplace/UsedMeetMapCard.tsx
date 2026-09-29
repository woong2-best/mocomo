import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MeetMap } from "@/maps/MeetMap";
import {
  googleSearchUrlForMeet,
  marketplaceMeetLocationQuery,
  marketplaceMeetMapUrl,
} from "@/maps/google-external-url";
import { normalizeMeetCountry } from "@/maps/select-engine";
import type { MeetMapPayload } from "@/maps/types";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export type UsedMeetMapInfo = Omit<MeetMapPayload, "country" | "externalMapUrl"> & {
  country?: string;
  externalMapUrl?: string;
};

/** Buyer meet-location card — 2D Esri satellite, seller-entered address. */
export function UsedMeetMapCard({
  map,
  region,
  meetPlace,
}: {
  map: UsedMeetMapInfo;
  region?: string | null;
  meetPlace?: string | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!Number.isFinite(map.lat) || !Number.isFinite(map.lng)) {
    return null;
  }

  const country = normalizeMeetCountry(map.country);
  const regionLabel = region?.trim() || "";
  const placeLabel = meetPlace?.trim() || "";
  const locationQuery = marketplaceMeetLocationQuery({ region: regionLabel, place: placeLabel });
  const coords = { lat: map.lat, lng: map.lng };
  const searchUrl = locationQuery
    ? googleSearchUrlForMeet({ place: placeLabel, region: regionLabel })
    : undefined;
  const mapUrl = marketplaceMeetMapUrl({ place: placeLabel, region: regionLabel, coords });

  return (
    <View style={styles.wrap}>
      <MeetMap
        mode="view"
        country={country}
        region={regionLabel || map.label}
        meetPlace={placeLabel || undefined}
        coords={coords}
        height={220}
        pinTitle={locationQuery || "거래 장소"}
        pinSearchUrl={searchUrl}
        pinMapUrl={mapUrl}
      />

      <Text style={styles.caption}>{map.caption}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginTop: spacing.md },
    caption: {
      marginTop: 8,
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
      lineHeight: 16,
    },
  });
}

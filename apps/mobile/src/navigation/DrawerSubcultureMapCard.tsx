import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { fetchEventsMap, type MapEventPin } from "@/api/events";
import { ESRI_ATTRIBUTION, ESRI_ATTRIBUTION_URL } from "@/maps/map-styles";
import { DrawerMapLibreGlobe, globeCenterForCountry } from "@/navigation/DrawerMapLibreGlobe";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  active: boolean;
  showGlobe: boolean;
  height: number;
  onExpand: () => void;
  onExpandPressIn?: () => void;
};

export function DrawerSubcultureMapCard({
  active,
  showGlobe,
  height,
  onExpand,
  onExpandPressIn,
}: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const mapH = Math.max(180, height);
  const backgroundColor = isDark ? "#0F1524" : colors.background;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [attribOpen, setAttribOpen] = useState(false);

  const userCountry = user?.countryCode ?? "KR";

  const query = useQuery({
    queryKey: ["mobile-events-map", true],
    queryFn: () => fetchEventsMap({ global: true }),
    staleTime: 60_000,
    enabled: active && !!user?.id,
  });

  const pins = useMemo(() => (query.data?.pins ?? []) as MapEventPin[], [query.data?.pins]);
  const center = globeCenterForCountry(userCountry);
  const mapReady = showGlobe && box.w > 2 && box.h > 2;

  return (
    <View
      collapsable={false}
      onLayout={(event) => {
        const { width, height: layoutH } = event.nativeEvent.layout;
        setBox((prev) => (prev.w === width && prev.h === layoutH ? prev : { w: width, h: layoutH }));
      }}
      style={[styles.card, { height: mapH, backgroundColor }]}
    >
      {mapReady ? (
        <>
          <DrawerMapLibreGlobe
            pins={pins}
            backgroundColor={backgroundColor}
            width={box.w}
            height={box.h}
            center={center}
            onOpen={onExpand}
            onOpenPressIn={onExpandPressIn}
          />
          <View style={styles.attribWrap} pointerEvents="box-none">
            <Pressable
              style={[styles.attribBtn, { borderColor: isDark ? "rgba(255,255,255,0.28)" : colors.hairline }]}
              onPress={() => setAttribOpen((open) => !open)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="지도 타일 저작권 정보"
            >
              <Ionicons name="information" size={10} color={isDark ? "rgba(245,240,232,0.8)" : colors.textMuted} />
            </Pressable>
            {attribOpen ? (
              <Pressable
                style={[styles.attribPop, { backgroundColor: isDark ? "#1A2030" : colors.background }]}
                onPress={() => void Linking.openURL(ESRI_ATTRIBUTION_URL)}
                accessibilityRole="link"
              >
                <Text style={[styles.attribText, { color: isDark ? "#F5F0E8" : colors.text }]}>
                  {ESRI_ATTRIBUTION}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexShrink: 0,
    marginHorizontal: -spacing.md,
    overflow: "hidden",
  },
  attribWrap: {
    position: "absolute",
    top: 8,
    left: 10,
    zIndex: 12,
    elevation: 12,
    alignItems: "flex-start",
  },
  attribBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    backgroundColor: "rgba(15,21,36,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  attribPop: {
    marginTop: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  attribText: {
    fontSize: 11,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

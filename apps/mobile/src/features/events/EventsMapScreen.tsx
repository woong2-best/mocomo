import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchEventsMap, type MapEventPin } from "@/api/events";
import { EventsNativeMap } from "@/features/events/EventsNativeMap";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function externalMapLink(pin: MapEventPin) {
  const country = pin.country ?? "";
  if (country === "KR" || country === "Korea" || country.startsWith("KR")) {
    return {
      label: "카카오맵",
      url: `https://map.kakao.com/link/map/${pin.lat},${pin.lng}`,
    };
  }
  const q = encodeURIComponent(`${pin.venueName ?? pin.title} ${pin.lat},${pin.lng}`);
  return {
    label: "Google 지도",
    url: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}

export function EventsMapScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selected, setSelected] = useState<MapEventPin | null>(null);
  const [global, setGlobal] = useState(false);

  const query = useQuery({
    queryKey: ["mobile-events-map", global],
    queryFn: () => fetchEventsMap({ global }),
  });

  const pins = query.data?.pins ?? [];
  const hasPins = pins.some((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>뒤로</Text>
        </Pressable>
        <Text style={styles.heading}>행사 지도</Text>
        <Pressable onPress={() => setGlobal((v) => !v)} hitSlop={8}>
          <Text style={styles.toggle}>{global ? "내 지역" : "전 세계"}</Text>
        </Pressable>
      </View>

      {query.isLoading && !query.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : query.isError && !query.data ? (
        <Text style={styles.error}>지도를 불러오지 못했습니다.</Text>
      ) : !hasPins ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>표시할 행사가 없습니다</Text>
          <Text style={styles.emptySub}>
            {global ? "전 세계 행사 데이터가 없습니다." : "내 지역 행사가 없습니다. 전 세계 보기를 눌러 보세요."}
          </Text>
        </View>
      ) : (
        <>
          <EventsNativeMap
            style={styles.map}
            pins={pins}
            global={global}
            selectedId={selected?.id ?? null}
            onSelectPin={setSelected}
          />
          {selected ? (
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
              <Text style={styles.sheetTitle}>{selected.title}</Text>
              <Text style={styles.sheetSub}>
                {selected.categoryLabel}
                {selected.venueName ? ` · ${selected.venueName}` : ""}
              </Text>
              <Text style={styles.sheetSub}>
                {new Date(selected.startsAt).toLocaleString("ko-KR")}
              </Text>
              <View style={styles.sheetActions}>
                <Pressable
                  style={styles.sheetBtn}
                  onPress={() => {
                    const link = externalMapLink(selected);
                    void Linking.openURL(link.url);
                  }}
                >
                  <Text style={styles.sheetBtnText}>{externalMapLink(selected).label}</Text>
                </Pressable>
                {selected.sourceUrl ? (
                  <Pressable
                    style={styles.sheetBtnSecondary}
                    onPress={() => void Linking.openURL(selected.sourceUrl!)}
                  >
                    <Text style={styles.sheetBtnSecondaryText}>상세</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.sheetBtnSecondary} onPress={() => setSelected(null)}>
                  <Text style={styles.sheetBtnSecondaryText}>닫기</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.hintWrap}>
              <Text style={styles.hint}>{pins.length}개 핀 · 탭하면 상세</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    back: { color: colors.accent, fontWeight: "600" },
    heading: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.text },
    toggle: { color: colors.accent, fontWeight: "700" },
    map: { flex: 1 },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm,
    },
    emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    emptySub: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sheetTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    sheetSub: { marginTop: 4, color: colors.textMuted, fontSize: 13 },
    sheetActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
    sheetBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    sheetBtnText: { color: "#fff", fontWeight: "700" },
    sheetBtnSecondary: {
      paddingHorizontal: 14,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sheetBtnSecondaryText: { color: colors.text, fontWeight: "700" },
    hintWrap: {
      position: "absolute",
      bottom: 24,
      alignSelf: "center",
      backgroundColor: "rgba(255,255,255,0.92)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    hint: {
      color: colors.textMuted,
    },
    error: { color: colors.danger, padding: spacing.lg },
  });
}

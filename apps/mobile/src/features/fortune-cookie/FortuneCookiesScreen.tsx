import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { fetchFortuneCookies } from "@/api/fortune-cookies";
import { FortuneCookieVisual } from "@/features/fortune-cookie/FortuneCookieVisual";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";
import { Screen } from "@/ui/Screen";
import { FolkCard } from "@/ui/FolkCard";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export function FortuneCookiesScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "FortuneCookies">>();
  const openLatest = route.params?.openLatest === true;

  const query = useQuery({
    queryKey: ["mobile-fortune-cookies"],
    queryFn: () => fetchFortuneCookies(),
    staleTime: 30_000,
  });

  const cookies = query.data?.cookies ?? [];
  const latest = cookies[0];

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={26} color={colors.brand} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t("m.cookie.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      {query.isLoading && cookies.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : cookies.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FolkCard>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("m.cookie.empty_title")}</Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>{t("m.cookie.empty_body")}</Text>
          </FolkCard>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={[styles.lead, { color: colors.textMuted }]}>{t("m.cookie.lead")}</Text>
          {latest && openLatest ? (
            <View style={styles.hero}>
              <Text style={[styles.status, { color: colors.textSecondary }]}>
                {t("m.cookie.opening")}
              </Text>
              <FortuneCookieVisual
                nickname={latest.nickname}
                serial={latest.serial}
                fortuneText={latest.fortuneText}
                mode="auto-open"
                size={300}
              />
              <Text style={[styles.saved, { color: colors.textSecondary }]}>{t("m.cookie.saved")}</Text>
            </View>
          ) : null}
          {cookies.map((cookie, index) => {
            if (openLatest && index === 0) return null;
            return (
              <FolkCard key={cookie.id} style={styles.card}>
                <FortuneCookieVisual
                  nickname={cookie.nickname}
                  serial={cookie.serial}
                  fortuneText={cookie.fortuneText}
                  mode="opened"
                  size={240}
                />
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {cookie.theme} · {new Date(cookie.createdAt).toLocaleDateString()}
                </Text>
              </FolkCard>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.surfaceRaised,
    },
    title: {
      fontSize: 17,
      fontWeight: "900",
    },
    lead: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "600",
      paddingHorizontal: 4,
    },
    list: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: 40,
    },
    emptyWrap: {
      padding: spacing.md,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "900",
    },
    emptyBody: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "600",
    },
    hero: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
    },
    status: {
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
    },
    saved: {
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
    },
    card: {
      alignItems: "center",
      paddingVertical: 16,
    },
    meta: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
  });
}

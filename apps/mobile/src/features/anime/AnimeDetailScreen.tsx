import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchAnimeDetail } from "@/api/discovery";
import { genreLabel } from "@/features/anime/anime-genres";
import {
  characterNames,
  continueSectionNumbers,
  parseWikiArticle,
  type WikiArticleSection,
} from "@/features/anime/wiki-article";
import { WikiContent } from "@/features/anime/WikiContent";
import { WikiInfobox } from "@/features/anime/WikiInfobox";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function WikiSectionBlock({
  section,
  styles,
  colors,
  defaultOpen,
  onLayoutY,
}: {
  section: WikiArticleSection;
  styles: ReturnType<typeof createThemedStyles>;
  colors: ThemeColors;
  defaultOpen: boolean;
  onLayoutY: (y: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
      style={[styles.bodyPad, styles.section]}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.sectionHead}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.sectionNum}>{section.number}.</Text>
        <Text style={styles.sectionTitle} numberOfLines={2}>
          {section.label}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>
      {open && section.body ? (
        <View style={styles.sectionBody}>
          <WikiContent source={section.body} />
        </View>
      ) : null}
    </View>
  );
}

export function AnimeDetailScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AnimeDetail">>();
  const scrollRef = useRef<ScrollView>(null);
  const yMap = useRef<Record<string, number>>({});

  const query = useQuery({
    queryKey: ["mobile-anime-detail", route.params.slug],
    queryFn: () => fetchAnimeDetail(route.params.slug),
  });
  const item = query.data?.item;
  const photoUrl = item?.coverUrl || item?.bannerUrl || null;
  const cast = useMemo(() => characterNames(item?.characters), [item?.characters]);

  const article = useMemo(() => {
    const syn = parseWikiArticle(item?.synopsis, "syn");
    const world = parseWikiArticle(item?.worldInfo, "world");
    const worldNumbered = continueSectionNumbers(world.sections, syn.sections);
    const sections = [...syn.sections, ...worldNumbered];
    const leftoverLead = [syn.lead, world.lead].filter(Boolean).join("\n\n");
    if (sections.length === 0 && leftoverLead) {
      sections.push({
        id: "syn-overview",
        label: "개요",
        level: 1,
        number: "1",
        body: leftoverLead,
      });
    }
    if (cast.length > 0) {
      let n1 = 0;
      for (const s of sections) {
        if (s.level === 1) n1 = Math.max(n1, Number(s.number.split(".")[0]) || 0);
      }
      sections.push({
        id: "characters",
        label: "등장인물",
        level: 1,
        number: String(n1 + 1),
        body: "",
      });
    }
    const lead = sections.some((s) => s.id === "syn-overview") ? "" : leftoverLead;
    return { lead, sections };
  }, [cast.length, item?.synopsis, item?.worldInfo]);

  const scrollTo = useCallback((id: string) => {
    const y = yMap.current[id];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 6), animated: true });
  }, []);

  const fallbackRows = useMemo(() => {
    if (!item) return [];
    const rows: { label: string; value: string }[] = [];
    const genre = genreLabel(item.genre);
    if (genre) rows.push({ label: "분류", value: genre });
    if (item.studio) rows.push({ label: "스튜디오", value: item.studio });
    if (item.tags?.length) rows.push({ label: "태그", value: item.tags.slice(0, 12).join(" · ") });
    return rows;
  }, [item]);

  return (
    <Screen>
      <AppHeader
        title={item?.title ?? "작품"}
        leftLabel="뒤로"
        onLeftPress={() => navigation.goBack()}
      />

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError || !item ? (
        <View style={styles.center}>
          <Text style={styles.error}>작품을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <View style={styles.bodyPad}>
              <WikiInfobox
                title={item.title}
                titleEn={item.titleEn}
                photoUrl={photoUrl}
                infobox={item.infobox}
                fallbackRows={fallbackRows}
              />
            </View>

            {article.sections.length > 0 ? (
              <View style={styles.toc}>
                <Text style={styles.tocTitle}>목차</Text>
                {article.sections.map((sec) => (
                  <Pressable
                    key={sec.id}
                    onPress={() => scrollTo(sec.id)}
                    style={[styles.tocRow, sec.level === 2 && styles.tocSub]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.tocNum}>{sec.number}.</Text>
                    <Text style={styles.tocLabel} numberOfLines={1}>
                      {sec.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {article.lead ? (
              <View style={[styles.bodyPad, styles.lead]}>
                <WikiContent source={article.lead} />
              </View>
            ) : null}

            {article.sections.map((sec, i) =>
              sec.id === "characters" ? (
                <View
                  key={sec.id}
                  onLayout={(e) => {
                    yMap.current[sec.id] = e.nativeEvent.layout.y;
                  }}
                  style={[styles.bodyPad, styles.section]}
                >
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionNum}>{sec.number}.</Text>
                    <Text style={styles.sectionTitle}>{sec.label}</Text>
                  </View>
                  <View style={styles.castChips}>
                    {cast.map((name) => (
                      <View key={name} style={styles.castChip}>
                        <Text style={styles.castChipText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <WikiSectionBlock
                  key={sec.id}
                  section={sec}
                  styles={styles}
                  colors={colors}
                  defaultOpen={i < 3}
                  onLayoutY={(y) => {
                    yMap.current[sec.id] = y;
                  }}
                />
              )
            )}

            {!article.lead && article.sections.length === 0 && !item.infobox ? (
              <Text style={[styles.bodyPad, styles.emptyHint]}>등록된 본문이 없습니다.</Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors, isDark: boolean) {
  const line = isDark ? "rgba(255,255,255,0.12)" : "rgba(20,40,72,0.12)";
  return StyleSheet.create({
    scroll: { flex: 1 },
    scrollContent: {
      paddingBottom: 48,
    },
    bodyPad: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    toc: {
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: line,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(20,40,72,0.04)",
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    tocTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
      marginBottom: 8,
    },
    tocRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
      gap: 6,
    },
    tocSub: { paddingLeft: 16 },
    tocNum: { color: colors.terracotta, fontWeight: "800", fontSize: 13, minWidth: 28 },
    tocLabel: { flex: 1, color: colors.brand, fontWeight: "700", fontSize: 14 },
    lead: { paddingTop: 4 },
    section: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: line,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
    },
    sectionNum: {
      color: colors.terracotta,
      fontWeight: "800",
      fontSize: 18,
    },
    sectionTitle: {
      flex: 1,
      color: colors.text,
      fontWeight: "800",
      fontSize: 18,
    },
    sectionBody: { paddingBottom: 14, paddingLeft: 4 },
    castChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingBottom: 14,
    },
    castChip: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    castChipText: { color: colors.text, fontWeight: "700", fontSize: 13 },
    emptyHint: { color: colors.textMuted, fontWeight: "600", marginTop: spacing.md },
    center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
    error: { color: colors.danger, fontWeight: "700" },
  });
}

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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchAnimeDetail, toggleAnimeStar } from "@/api/discovery";
import { useAuth } from "@/auth/AuthContext";
import { showIslandError } from "@/ui/IslandToast";
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
import { useI18n } from "@/i18n/I18nProvider";
import { animeUi } from "@/features/anime/anime-ui";

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
  const { t, locale  } = useI18n();
  const copy = useMemo(() => animeUi(t), [t]);
  const dateLocale = locale === "ko" ? "ko-KR" : "en-US";
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AnimeDetail">>();
  const queryClient = useQueryClient();
  const { status: authStatus } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const yMap = useRef<Record<string, number>>({});

  const query = useQuery({
    queryKey: ["mobile-anime-detail", route.params.slug],
    queryFn: () => fetchAnimeDetail(route.params.slug),
  });
  const star = useMutation({
    mutationFn: () => toggleAnimeStar(route.params.slug),
    onSuccess: (res) => {
      queryClient.setQueryData(["mobile-anime-detail", route.params.slug], (old: unknown) => {
        if (!old || typeof old !== "object" || !("item" in old)) return old;
        const row = old as { item: { starred?: boolean } };
        return { ...row, item: { ...row.item, starred: res.starred } };
      });
      void queryClient.invalidateQueries({ queryKey: ["mobile-star-wiki"] });
    },
    onError: () => {
      showIslandError("STAR", copy.starFail);
    },
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
        label: copy.overview,
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
        label: copy.characters,
        level: 1,
        number: String(n1 + 1),
        body: "",
      });
    }
    const lead = sections.some((s) => s.id === "syn-overview") ? "" : leftoverLead;
    return { lead, sections };
  }, [cast.length, copy.characters, copy.overview, item?.synopsis, item?.worldInfo]);

  const scrollTo = useCallback((id: string) => {
    const y = yMap.current[id];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 6), animated: true });
  }, []);

  const fallbackRows = useMemo(() => {
    if (!item) return [];
    const rows: { label: string; value: string }[] = [];
    const genre = genreLabel(item.genre, locale);
    if (genre) rows.push({ label: copy.infoboxCategory, value: genre });
    if (item.studio) rows.push({ label: copy.studio, value: item.studio });
    if (item.tags?.length) rows.push({ label: copy.tags, value: item.tags.slice(0, 12).join(" · ") });
    return rows;
  }, [copy, item, locale]);

  return (
    <Screen>
      <AppHeader
        title={item?.title ?? copy.work}
        leftLabel={copy.back}
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          item ? (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => navigation.navigate("AnimeHistory", { slug: item.slug })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={copy.historyA11y}
              >
                <Ionicons name="time-outline" size={22} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (authStatus !== "signedIn") {
                    showIslandError(copy.loginRequired, copy.editLoginMsg);
                    return;
                  }
                  navigation.navigate("AnimeEdit", { slug: item.slug });
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={copy.editA11y}
              >
                <Ionicons name="create-outline" size={22} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (authStatus !== "signedIn") {
                    showIslandError(copy.loginRequired, copy.starLoginMsg);
                    return;
                  }
                  star.mutate();
                }}
                disabled={star.isPending}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={item.starred ? copy.starRemoveA11y : copy.starAddA11y}
              >
                <Ionicons
                  name={item.starred ? "star" : "star-outline"}
                  size={22}
                  color={item.starred ? colors.gold : colors.textMuted}
                />
              </Pressable>
            </View>
          ) : null
        }
      />

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError || !item ? (
        <View style={styles.center}>
          <Text style={styles.error}>{copy.loadError}</Text>
          <FolkButton label={copy.retry} onPress={() => void query.refetch()} />
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
              {item.creator?.username || item.createdAt || item.updatedAt ? (
                <View style={styles.metaBox}>
                  {item.creator?.username ? (
                    <Text style={styles.metaText}>{copy.author(item.creator.username)}</Text>
                  ) : null}
                  {item.createdAt ? (
                    <Text style={styles.metaText}>
                      {copy.createdAt(new Date(item.createdAt).toLocaleString(dateLocale))}
                    </Text>
                  ) : null}
                  {item.updatedAt ? (
                    <Text style={styles.metaText}>
                      {copy.updatedAt(new Date(item.updatedAt).toLocaleString(dateLocale))}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.actionRow}>
                <FolkButton
                  label={copy.edit}
                  variant="secondary"
                  style={styles.actionBtn}
                  onPress={() => {
                    if (authStatus !== "signedIn") {
                      showIslandError(copy.loginRequired, copy.editLoginMsg);
                      return;
                    }
                    navigation.navigate("AnimeEdit", { slug: item.slug });
                  }}
                />
                <FolkButton
                  label={copy.history}
                  variant="secondary"
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate("AnimeHistory", { slug: item.slug })}
                />
              </View>
            </View>

            {article.sections.length > 0 ? (
              <View style={styles.toc}>
                <Text style={styles.tocTitle}>{copy.toc}</Text>
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
              <Text style={[styles.bodyPad, styles.emptyHint]}>{copy.emptyBody}</Text>
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
    headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    metaBox: { marginTop: spacing.sm, gap: 2 },
    metaText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    actionRow: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
    actionBtn: { flex: 1 },
  });
}

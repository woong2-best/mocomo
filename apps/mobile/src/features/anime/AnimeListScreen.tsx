import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchAnimeList, type AnimeListItem } from "@/api/discovery";
import {
  MOBILE_ANIME_GENRES,
  genreToApiParam,
  type MobileAnimeGenreId,
} from "@/features/anime/anime-genres";
import { WikiCoverImage } from "@/features/anime/WikiCoverImage";
import { Screen } from "@/ui/Screen";
import type { RootStackParamList } from "@/navigation/types";

const WOOD_PANEL = require("../../../assets/culture-wiki/wood-panel.png");
const SHELF_LEFT = require("../../../assets/culture-wiki/shelf-left.png");
const SHELF_RIGHT = require("../../../assets/culture-wiki/shelf-right.png");

const WIKI = {
  woodDeep: "#1A100C",
  woodHeader: "#241610",
  woodPanel: "#2E1C14",
  inputBg: "#14110F",
  inputBorder: "#4A3A32",
  searchBtn: "#C45A1A",
  categoryIdle: "#3D2A1E",
  categoryIdleBorder: "#5C4030",
  categoryActive: "#8B1A1A",
  categoryActiveBorder: "#A52828",
  text: "#F5F0E8",
  textMuted: "#A89888",
} as const;

const SIDE_W = 26;
const H_PAD = 12;
const GRID_GAP = 14;

/**
 * Culture Wiki — opaque fixed header + scrollable wood panel with framed posters.
 */
export function AnimeListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [genre, setGenre] = useState<MobileAnimeGenreId | null>(null);

  const query = useQuery({
    queryKey: ["mobile-anime", submitted, genre],
    queryFn: () =>
      fetchAnimeList({
        q: submitted || undefined,
        genre: genre ? genreToApiParam(genre) : undefined,
      }),
    staleTime: 60_000,
  });

  const posters = query.data?.items ?? [];
  const contentW = winW - SIDE_W * 2;
  const cardW = (contentW - H_PAD * 2 - GRID_GAP) / 2;
  const scrollMinH = Math.max(winH * 0.72, 520);
  const woodTileH = Math.round(winH * 0.7);
  const estimatedRows = Math.max(1, Math.ceil(Math.max(posters.length, 1) / 2));
  const contentH = Math.max(scrollMinH, estimatedRows * (cardW * (4 / 3) + 56) + 48);
  const woodTiles = useMemo(
    () => Math.max(2, Math.ceil(contentH / woodTileH) + 1),
    [contentH, woodTileH]
  );

  const onSearch = () => setSubmitted(q.trim());

  return (
    <Screen safeTop={false} style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backHit}
            accessibilityRole="button"
            accessibilityLabel="뒤로"
          >
            <Ionicons name="chevron-back" size={26} color={WIKI.text} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            컬쳐 위키
          </Text>
          <View style={styles.backHit} />
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="작품 검색"
            placeholderTextColor={WIKI.textMuted}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            selectionColor={WIKI.searchBtn}
          />
          <Pressable
            onPress={onSearch}
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityLabel="검색"
          >
            <Text style={styles.searchBtnLabel}>검색</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          <CategoryPlaque label="전체" active={genre === null} onPress={() => setGenre(null)} />
          {MOBILE_ANIME_GENRES.map((g) => (
            <CategoryPlaque
              key={g.id}
              label={g.label}
              active={genre === g.id}
              onPress={() => setGenre(g.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.body}>
        <Image source={SHELF_LEFT} style={styles.shelfLeft} contentFit="cover" pointerEvents="none" />

        <View style={styles.scrollShell}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ flexGrow: 1, minHeight: scrollMinH }}
            showsVerticalScrollIndicator={false}
            bounces
          >
            <View style={[styles.woodStage, { minHeight: Math.max(scrollMinH, contentH) }]}>
              {/* Wood scrolls with content (behind posters) */}
              <View style={styles.woodBack} pointerEvents="none">
                {Array.from({ length: woodTiles }, (_, i) => (
                  <Image
                    key={`wood-${i}`}
                    source={WOOD_PANEL}
                    style={{ width: "100%", height: woodTileH }}
                    contentFit="cover"
                    contentPosition="center"
                  />
                ))}
              </View>

              <View style={styles.gridPad}>
                {query.isLoading && !query.data ? (
                  <View style={styles.centerState}>
                    <ActivityIndicator color={WIKI.searchBtn} />
                  </View>
                ) : query.isError && !query.data ? (
                  <View style={styles.centerState}>
                    <Text style={styles.errorText}>목록을 불러오지 못했습니다.</Text>
                    <Pressable onPress={() => void query.refetch()} style={styles.retryBtn}>
                      <Text style={styles.retryLabel}>다시 시도</Text>
                    </Pressable>
                  </View>
                ) : posters.length > 0 ? (
                  <View style={styles.grid}>
                    {posters.map((item) => (
                      <CultureWikiPosterCard
                        key={item.slug}
                        item={item}
                        width={cardW}
                        onPress={() => navigation.navigate("AnimeDetail", { slug: item.slug })}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.centerState}>
                    <Text style={styles.emptyHint}>작품을 불러오면 여기에 포스터가 표시됩니다</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <LinearGradient
            colors={[WIKI.woodHeader, "transparent"]}
            style={styles.fadeTop}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["transparent", WIKI.woodDeep]}
            style={[styles.fadeBottom, { height: 24 + insets.bottom }]}
            pointerEvents="none"
          />
        </View>

        <Image source={SHELF_RIGHT} style={styles.shelfRight} contentFit="cover" pointerEvents="none" />
      </View>
    </Screen>
  );
}

function CategoryPlaque({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.categoryPlaque, active ? styles.categoryActive : styles.categoryIdle]}
    >
      <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/** Picture-frame poster card (액자). */
export function CultureWikiPosterCard({
  item,
  width,
  onPress,
}: {
  item: AnimeListItem;
  width: number;
  onPress?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!item.coverUrl && !failed;

  return (
    <Pressable style={{ width }} onPress={onPress} disabled={!onPress}>
      {/* Outer shadow lift */}
      <View style={styles.frameShadow}>
        {/* Beveled metallic/wood frame */}
        <View style={styles.frameBevel}>
          <View style={styles.frameRecess}>
            {showImage ? (
              <WikiCoverImage
                url={item.coverUrl!}
                style={styles.posterImage}
                contentFit="cover"
                variant="poster"
                onFailed={() => setFailed(true)}
              />
            ) : (
              <View style={styles.posterFallback}>
                <Text style={styles.posterFallbackIcon}>📺</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <Text style={styles.posterTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {item.titleEn ? (
        <Text style={styles.posterSub} numberOfLines={1}>
          {item.titleEn}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WIKI.woodDeep,
  },
  header: {
    backgroundColor: WIKI.woodHeader,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
    elevation: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  backHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: WIKI.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: H_PAD + SIDE_W * 0.15,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: WIKI.inputBg,
    borderWidth: 1,
    borderColor: WIKI.inputBorder,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderRightWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: WIKI.text,
    fontSize: 14,
    fontWeight: "600",
  },
  searchBtn: {
    backgroundColor: WIKI.searchBtn,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 1,
    borderColor: "#A34A12",
  },
  searchBtnLabel: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  categoryRow: {
    paddingHorizontal: H_PAD + SIDE_W * 0.15,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryPlaque: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryIdle: {
    backgroundColor: WIKI.categoryIdle,
    borderColor: WIKI.categoryIdleBorder,
  },
  categoryActive: {
    backgroundColor: WIKI.categoryActive,
    borderColor: WIKI.categoryActiveBorder,
  },
  categoryLabel: {
    color: WIKI.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryLabelActive: {
    color: WIKI.text,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: WIKI.woodDeep,
  },
  shelfLeft: {
    width: SIDE_W,
    height: "100%",
  },
  shelfRight: {
    width: SIDE_W,
    height: "100%",
  },
  scrollShell: {
    flex: 1,
    position: "relative",
    backgroundColor: WIKI.woodPanel,
  },
  scroll: {
    flex: 1,
  },
  woodStage: {
    position: "relative",
    backgroundColor: WIKI.woodPanel,
  },
  woodBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  gridPad: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 36,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "space-between",
  },
  centerState: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyHint: {
    color: "rgba(245,240,232,0.4)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  errorText: {
    color: "#E8A090",
    fontWeight: "700",
    fontSize: 13,
  },
  retryBtn: {
    backgroundColor: WIKI.searchBtn,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryLabel: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 18,
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  /* ── Picture frame ── */
  frameShadow: {
    borderRadius: 2,
    backgroundColor: "#0A0705",
    shadowColor: "#000",
    shadowOpacity: 0.65,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  frameBevel: {
    borderWidth: 5,
    borderTopColor: "#5A4638",
    borderLeftColor: "#4A382C",
    borderBottomColor: "#120E0A",
    borderRightColor: "#1A1410",
    backgroundColor: "#2A1E16",
    padding: 2,
  },
  frameRecess: {
    borderWidth: 1.5,
    borderTopColor: "#0A0806",
    borderLeftColor: "#0A0806",
    borderBottomColor: "#3A2E24",
    borderRightColor: "#3A2E24",
    overflow: "hidden",
    aspectRatio: 2 / 3,
    backgroundColor: "#12100E",
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  posterFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1612",
  },
  posterFallbackIcon: {
    fontSize: 28,
    opacity: 0.7,
  },
  posterTitle: {
    marginTop: 7,
    color: WIKI.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  posterSub: {
    marginTop: 2,
    color: "rgba(245,240,232,0.72)",
    fontSize: 11,
    fontWeight: "500",
  },
});

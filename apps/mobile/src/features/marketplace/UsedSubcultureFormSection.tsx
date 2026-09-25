import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL } from "@/config/env";
import { MarketCheckOption } from "@/features/marketplace/MarketCheckOption";
import { USED_SELL_KINDS } from "@/features/marketplace/used-catalog";
import { spacing } from "@/theme/tokens";

const CONDITION_OPTIONS = [
  { id: "NEW", label: "NEW" },
  { id: "NM", label: "NM" },
  { id: "LP", label: "LP" },
  { id: "MP", label: "MP" },
  { id: "HP", label: "HP" },
  { id: "POOR", label: "DMG" },
] as const;

export type MobileSubcultureFormState = {
  workTitle: string;
  animeSlug: string | null;
  productType: string;
  characterName: string;
  conditionGrade: string;
  limitedKind: string;
  listingFormat: string;
  tradeMode: string;
};

export const EMPTY_MOBILE_SUBCULTURE: MobileSubcultureFormState = {
  workTitle: "",
  animeSlug: null,
  productType: "",
  characterName: "",
  conditionGrade: "NEW",
  limitedKind: "",
  listingFormat: "",
  tradeMode: "SELL",
};

type AnimeHit = {
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
};

export function UsedSubcultureFormSection({
  value,
  onChange,
  ink,
  paper,
  muted,
  line,
}: {
  value: MobileSubcultureFormState;
  onChange: (next: MobileSubcultureFormState) => void;
  ink: string;
  paper: string;
  muted: string;
  line: string;
}) {
  const styles = useMemo(() => createStyles(ink, paper, muted, line), [ink, paper, muted, line]);
  const [hits, setHits] = useState<AnimeHit[]>([]);

  useEffect(() => {
    const q = value.workTitle.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      void fetch(`${API_BASE_URL}/api/subculture/anime-suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { items?: AnimeHit[] }) => setHits(d.items ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [value.workTitle]);

  function patch(p: Partial<MobileSubcultureFormState>) {
    onChange({ ...value, ...p });
  }

  return (
    <View style={{ gap: 18 }}>
      <View>
        <Text style={styles.label}>작품명</Text>
        <TextInput
          style={styles.input}
          value={value.workTitle}
          onChangeText={(t) => patch({ workTitle: t, animeSlug: null })}
          placeholder="블루아카이브, 원신…"
          placeholderTextColor={muted}
        />
        {hits.length > 0 ? (
          <FlatList
            horizontal
            data={hits}
            keyExtractor={(item) => item.slug}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, marginTop: 8 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.suggestCard}
                onPress={() => patch({ workTitle: item.title, animeSlug: item.slug })}
              >
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.suggestCover} />
                ) : (
                  <View style={[styles.suggestCover, { backgroundColor: muted }]} />
                )}
                <Text style={styles.suggestTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </Pressable>
            )}
          />
        ) : null}
      </View>

      <View>
        <Text style={styles.label}>상품 종류</Text>
        <View style={styles.checkWrap}>
          {USED_SELL_KINDS.map((p) => (
            <MarketCheckOption
              key={p.id}
              label={p.label}
              checked={value.productType === p.id}
              onPress={() => patch({ productType: p.id })}
              ink={ink}
              paper={paper}
              line={line}
            />
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.label}>상태</Text>
        <View style={styles.checkWrap}>
          {CONDITION_OPTIONS.map((o) => (
            <MarketCheckOption
              key={o.id}
              label={o.label}
              checked={value.conditionGrade === o.id}
              onPress={() => patch({ conditionGrade: o.id })}
              ink={ink}
              paper={paper}
              line={line}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function createStyles(ink: string, paper: string, muted: string, line: string) {
  return StyleSheet.create({
    label: { fontWeight: "700", color: ink, fontSize: 15, marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderColor: line,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: paper,
      color: ink,
      fontSize: 15,
    },
    checkWrap: { flexDirection: "row", flexWrap: "wrap" },
    suggestCard: { width: 72 },
    suggestCover: { width: 72, height: 90, borderRadius: 8 },
    suggestTitle: { fontSize: 10, fontWeight: "600", color: ink, marginTop: 4 },
  });
}

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
import { SUBCULTURE_LOT_TEMPLATES } from "@/features/marketplace/lot-templates";
import { USED_PRODUCT_TYPES } from "@/features/marketplace/used-catalog";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const CONDITION_OPTIONS = [
  { id: "", label: "상태 미지정" },
  { id: "MINT", label: "MINT" },
  { id: "NM", label: "NM" },
  { id: "LP", label: "LP" },
  { id: "MP", label: "MP" },
  { id: "HP", label: "HP" },
  { id: "DMG", label: "DMG" },
] as const;

const TRADE_OPTIONS = [
  { id: "SELL", label: "판매" },
  { id: "TRADE", label: "교환" },
  { id: "SELL_OR_TRADE", label: "판매·교환" },
] as const;

const LIMITED_OPTIONS = [
  { id: "STANDARD", label: "일반" },
  { id: "LIMITED", label: "한정" },
  { id: "EVENT", label: "행사" },
  { id: "PREORDER", label: "예약" },
] as const;

const FORMAT_OPTIONS = [
  { id: "SINGLE", label: "단품" },
  { id: "SET", label: "세트" },
  { id: "LOT", label: "Lot" },
  { id: "BINDER", label: "바인더" },
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
  conditionGrade: "",
  limitedKind: "STANDARD",
  listingFormat: "SINGLE",
  tradeMode: "SELL",
};

type AnimeHit = {
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
};

function ChipRow({
  label,
  options,
  value,
  onChange,
  styles,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  styles: ReturnType<typeof createThemedStyles>;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <Pressable
            key={o.id || "empty"}
            style={[styles.chip, value === o.id && styles.chipOn]}
            onPress={() => onChange(o.id)}
          >
            <Text style={[styles.chipText, value === o.id && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function UsedSubcultureFormSection({
  value,
  onChange,
  onTitleHint,
  onDescriptionHint,
}: {
  value: MobileSubcultureFormState;
  onChange: (next: MobileSubcultureFormState) => void;
  onTitleHint?: (hint: string) => void;
  onDescriptionHint?: (hint: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
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
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.sectionTitle}>서브컬처 정보</Text>

      <Text style={styles.label}>작품명 (애니/게임/IP)</Text>
      <TextInput
        style={styles.input}
        value={value.workTitle}
        onChangeText={(t) => patch({ workTitle: t, animeSlug: null })}
        placeholder="블루아카이브, 원신…"
        placeholderTextColor={colors.textMuted}
      />
      {hits.length > 0 && (
        <FlatList
          horizontal
          data={hits}
          keyExtractor={(item) => item.slug}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.suggestCard}
              onPress={() => patch({ workTitle: item.title, animeSlug: item.slug })}
            >
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={styles.suggestCover} />
              ) : (
                <View style={[styles.suggestCover, { backgroundColor: colors.muted }]} />
              )}
              <Text style={styles.suggestTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
          )}
        />
      )}
      {value.animeSlug ? (
        <Text style={styles.wikiLink}>위키: /anime/{value.animeSlug}</Text>
      ) : null}

      <Text style={styles.label}>상품 종류</Text>
      <View style={styles.chips}>
        {USED_PRODUCT_TYPES.slice(0, 12).map((p) => (
          <Pressable
            key={p.id}
            style={[styles.chip, value.productType === p.id && styles.chipOn]}
            onPress={() => patch({ productType: p.id })}
          >
            <Text style={[styles.chipText, value.productType === p.id && styles.chipTextOn]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Lot·세트 템플릿</Text>
      <View style={styles.chips}>
        {SUBCULTURE_LOT_TEMPLATES.map((t) => (
          <Pressable
            key={t.id}
            style={styles.chip}
            onPress={() => {
              patch({
                listingFormat: t.listingFormat,
                productType: t.productType ?? value.productType,
              });
              onTitleHint?.(t.titleHint);
              onDescriptionHint?.(t.descriptionHint);
            }}
          >
            <Text style={styles.chipText}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>캐릭터·멤버 (선택)</Text>
      <TextInput
        style={styles.input}
        value={value.characterName}
        onChangeText={(t) => patch({ characterName: t })}
        placeholderTextColor={colors.textMuted}
      />

      <ChipRow
        label="상태"
        options={CONDITION_OPTIONS}
        value={value.conditionGrade}
        onChange={(id) => patch({ conditionGrade: id })}
        styles={styles}
      />
      <ChipRow
        label="한정 종류"
        options={LIMITED_OPTIONS}
        value={value.limitedKind}
        onChange={(id) => patch({ limitedKind: id })}
        styles={styles}
      />
      <ChipRow
        label="등록 형식"
        options={FORMAT_OPTIONS}
        value={value.listingFormat}
        onChange={(id) => patch({ listingFormat: id })}
        styles={styles}
      />
      <ChipRow
        label="거래 방식"
        options={TRADE_OPTIONS}
        value={value.tradeMode}
        onChange={(id) => patch({ tradeMode: id })}
        styles={styles}
      />
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionTitle: { fontWeight: "900", color: colors.cobalt, fontSize: 16, marginTop: spacing.sm },
    label: { fontWeight: "800", color: colors.cobalt, marginTop: spacing.xs },
    input: {
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 12,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontWeight: "600",
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      backgroundColor: colors.muted,
    },
    chipOn: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    chipText: { fontWeight: "700", color: colors.cobalt, fontSize: 12 },
    chipTextOn: { color: "#fff" },
    suggestCard: { width: 88 },
    suggestCover: { width: 88, height: 110, borderRadius: radii.sm },
    suggestTitle: { fontSize: 10, fontWeight: "700", color: colors.text, marginTop: 4 },
    wikiLink: { fontSize: 11, color: colors.cobalt, fontWeight: "700" },
  });
}

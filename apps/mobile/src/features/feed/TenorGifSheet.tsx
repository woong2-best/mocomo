import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { searchTenorGifs, type TenorGifItem } from "@/api/social";
import { useI18n } from "@/i18n/I18nProvider";
import { colors, radii, spacing } from "@/theme/tokens";

export function TenorGifSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<TenorGifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const handle = setTimeout(() => {
      void load(q);
    }, q.trim() ? 250 : 0);
    return () => clearTimeout(handle);
  }, [visible, q]);

  async function load(query: string) {
    setLoading(true);
    setError("");
    try {
      const res = await searchTenorGifs(query);
      setItems(res.items ?? []);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : t("m.feed.gif_unavailable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.top}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.search}
            value={q}
            onChangeText={setQ}
            placeholder={t("m.feed.gif_search")}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        {loading && items.length === 0 ? (
          <ActivityIndicator color={colors.terracotta} style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.muted}>{error}</Text>
        ) : (
          <FlatList
            data={items}
            numColumns={2}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={{ gap: 6 }}
            contentContainerStyle={{ padding: 8, gap: 6 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.cell}
                onPress={() => {
                  onPick(item.playUrl);
                  onClose();
                }}
              >
                <Image source={{ uri: item.previewUrl }} style={styles.gif} />
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.muted}>{t("m.feed.gif_empty")}</Text>}
          />
        )}
        <Text style={styles.powered}>{t("m.feed.gif_powered")}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background, paddingTop: 48 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  search: { flex: 1, minHeight: 40, color: colors.text, fontSize: 16 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
  },
  gif: { width: "100%", height: "100%" },
  muted: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: spacing.md,
  },
  powered: {
    textAlign: "right",
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});

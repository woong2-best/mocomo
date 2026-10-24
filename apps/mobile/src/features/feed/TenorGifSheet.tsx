import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { searchGiphyGifs, type GiphyGifItem } from "@/api/social";
import { useI18n } from "@/i18n/I18nProvider";

const PICKER = {
  bg: "#12141A",
  cell: "#1E222B",
  text: "#F4F6F8",
  muted: "rgba(244,246,248,0.48)",
  line: "rgba(255,255,255,0.08)",
};

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
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<GiphyGifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const handle = setTimeout(() => {
      void load(q);
    }, q.trim() ? 250 : 0);
    return () => clearTimeout(handle);
  }, [visible, q]);

  useEffect(() => {
    if (visible) return;
    setQ("");
    setError("");
  }, [visible]);

  async function load(query: string) {
    setLoading(true);
    setError("");
    try {
      const res = await searchGiphyGifs(query);
      setItems(res.items ?? []);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : t("m.feed.gif_unavailable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.dock}
        >
          <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <View style={styles.top}>
              <Ionicons name="search" size={18} color={PICKER.muted} />
              <TextInput
                style={styles.search}
                value={q}
                onChangeText={setQ}
                placeholder={t("m.feed.gif_search")}
                placeholderTextColor={PICKER.muted}
                autoFocus
                returnKeyType="search"
              />
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel={t("m.common.close")}
              >
                <Ionicons name="close" size={18} color={PICKER.muted} />
              </Pressable>
            </View>
            {loading && items.length === 0 ? (
              <ActivityIndicator color="#F4F6F8" style={styles.spinner} />
            ) : error ? (
              <Text style={styles.muted}>{error}</Text>
            ) : (
              <FlatList
                style={styles.list}
                data={items}
                numColumns={2}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.grid}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.cell}
                    onPress={() => {
                      onPick(item.playUrl);
                      onClose();
                    }}
                  >
                    <Image
                      source={{ uri: item.previewUrl }}
                      style={styles.gif}
                      contentFit="cover"
                      recyclingKey={item.id}
                      cachePolicy="memory-disk"
                      autoplay
                    />
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={styles.muted}>{t("m.feed.gif_empty")}</Text>}
              />
            )}
            <Text style={styles.powered}>{t("m.feed.gif_powered")}</Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** @deprecated Use TenorGifSheet — same Giphy picker. */
export const GiphyGifSheet = TenorGifSheet;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  dock: {
    width: "100%",
    maxHeight: "78%",
  },
  card: {
    height: 560,
    maxHeight: "100%",
    backgroundColor: PICKER.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#1C2028",
  },
  search: {
    flex: 1,
    minHeight: 40,
    color: PICKER.text,
    fontSize: 16,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flex: 1 },
  row: { gap: 6 },
  grid: { paddingHorizontal: 8, paddingBottom: 8, gap: 6, flexGrow: 1 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: PICKER.cell,
  },
  gif: { width: "100%", height: "100%" },
  spinner: { marginTop: 40 },
  muted: {
    color: PICKER.muted,
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 16,
  },
  powered: {
    textAlign: "right",
    color: PICKER.muted,
    fontSize: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
});

import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  gifTitleKeywords,
  giphyCreatorQuery,
  type CommentGifMeta,
} from "@/lib/giphy-meta";
import { openGiphySearch } from "@/lib/giphy-search-events";
import { useI18n } from "@/i18n/I18nProvider";

export function GiphyCreatorSheet({
  visible,
  meta,
  onClose,
}: {
  visible: boolean;
  meta?: CommentGifMeta | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const creator = meta?.user ?? null;
  const tags = creator ? [] : gifTitleKeywords(meta?.title);

  function search(query: string) {
    if (!query.trim()) return;
    onClose();
    openGiphySearch(query.trim());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.top}>
            <Text style={styles.title}>{t("m.feed.gif_creator")}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={18} color="rgba(244,246,248,0.55)" />
            </Pressable>
          </View>
          {creator ? (
            <Pressable
              onPress={() => search(giphyCreatorQuery(creator.username))}
              style={styles.creator}
              accessibilityRole="button"
              accessibilityLabel={t("m.feed.gif_creator_search", { username: creator.username })}
            >
              {creator.avatarUrl ? (
                <Image source={{ uri: creator.avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{creator.displayName.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.creatorText}>
                <Text style={styles.name} numberOfLines={1}>
                  {creator.displayName}
                </Text>
                <Text style={styles.handle} numberOfLines={1}>
                  @{creator.username}
                </Text>
              </View>
            </Pressable>
          ) : tags.length > 0 ? (
            <View>
              <Text style={styles.tagsLabel}>{t("m.feed.gif_tags")}</Text>
              <View style={styles.tags}>
                {tags.map((tag) => (
                  <Pressable key={tag} onPress={() => search(tag)} style={styles.chip}>
                    <Text style={styles.chipText}>#{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.fallback}>{meta?.title?.trim() || t("m.feed.gif_powered")}</Text>
          )}
          <Text style={styles.powered}>{t("m.feed.gif_powered")}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#12141A",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { color: "#F4F6F8", fontSize: 15, fontWeight: "700" },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  creator: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#1E222B" },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E222B",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#F4F6F8", fontSize: 16, fontWeight: "700" },
  creatorText: { flex: 1 },
  name: { color: "#F4F6F8", fontSize: 16, fontWeight: "700" },
  handle: { color: "rgba(244,246,248,0.55)", fontSize: 13, marginTop: 2 },
  tagsLabel: { color: "rgba(244,246,248,0.48)", fontSize: 12, marginBottom: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    backgroundColor: "#1E222B",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: "#F4F6F8", fontSize: 13, fontWeight: "600" },
  fallback: { color: "rgba(244,246,248,0.7)", fontSize: 14 },
  powered: {
    textAlign: "right",
    color: "rgba(244,246,248,0.4)",
    fontSize: 10,
    marginTop: 16,
  },
});

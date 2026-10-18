import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { uploadLocalFile } from "@/api/upload-file";
import {
  MAX_STUDIO_BLOCKS,
  parseVideoEmbed,
  type StudioPortfolioBlock,
} from "@/features/marketplace/studio-portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { KeyboardAwareTextInput } from "@/ui/KeyboardAwareScrollView";
import { showIslandError } from "@/ui/IslandToast";

function rid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function StudioPortfolioEditor({
  coverUrl,
  blocks,
  busy,
  onCover,
  onBlocks,
  onBusy,
}: {
  coverUrl: string;
  blocks: StudioPortfolioBlock[];
  busy: boolean;
  onCover: (url: string) => void;
  onBlocks: (blocks: StudioPortfolioBlock[]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();

  async function pickImage(onUrl: (url: string) => void) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(t("m.studio.cover"), t("m.marketplace.allow_access_to_your_photo_library"));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    onBusy(true);
    try {
      onUrl(
        await uploadLocalFile({
          uri: asset.uri,
          filename: asset.fileName || "studio.jpg",
          contentType: asset.mimeType || "image/jpeg",
          category: "image",
        })
      );
    } catch (error) {
      showIslandError(t("m.studio.gallery"), error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      onBusy(false);
    }
  }

  function move(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    onBlocks(next);
  }

  function addText() {
    if (blocks.length >= MAX_STUDIO_BLOCKS) return;
    onBlocks([...blocks, { id: rid("text"), type: "text", text: "" }]);
  }

  function addEmbed() {
    if (blocks.length >= MAX_STUDIO_BLOCKS) return;
    onBlocks([...blocks, { id: rid("embed"), type: "embed", url: "", provider: "youtube", videoId: "" }]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>{t("m.studio.cover")}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{t("m.studio.cover_hint")}</Text>
      {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.cover} /> : <View style={[styles.cover, { backgroundColor: colors.surface }]} />}
      <Pressable onPress={() => void pickImage(onCover)} disabled={busy}>
        <Text style={[styles.link, { color: colors.terracotta }]}>{t("m.studio.cover_pick")}</Text>
      </Pressable>

      <Text style={[styles.title, { color: colors.text }]}>{t("m.studio.blocks")}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{t("m.studio.embed_hint")}</Text>
      {blocks.map((block, index) => (
        <View key={block.id} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.row}>
            <Pressable onPress={() => move(index, -1)} hitSlop={8}>
              <Ionicons name="chevron-up" size={18} color={colors.brand} />
            </Pressable>
            <Pressable onPress={() => move(index, 1)} hitSlop={8}>
              <Ionicons name="chevron-down" size={18} color={colors.brand} />
            </Pressable>
            <Pressable onPress={() => onBlocks(blocks.filter((item) => item.id !== block.id))} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {block.type === "text" ? (
            <KeyboardAwareTextInput
              value={block.text}
              onChangeText={(text) => onBlocks(blocks.map((item) => (item.id === block.id ? { ...item, text } : item)))}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder={t("m.studio.block_text_ph")}
              placeholderTextColor={colors.textMuted}
              multiline
            />
          ) : null}
          {block.type === "image" ? <Image source={{ uri: block.url }} style={styles.blockImage} /> : null}
          {block.type === "embed" ? (
            <KeyboardAwareTextInput
              value={block.url}
              onChangeText={(url) => {
                const embed = parseVideoEmbed(url);
                onBlocks(
                  blocks.map((item) =>
                    item.id === block.id
                      ? embed
                        ? { id: item.id, type: "embed", url: embed.url, provider: embed.provider, videoId: embed.videoId }
                        : { ...item, type: "embed", url, videoId: "" }
                      : item
                  )
                );
              }}
              style={[styles.input, { borderColor: colors.border, color: colors.text, minHeight: 48 }]}
              placeholder={t("m.studio.embed_ph")}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          ) : null}
        </View>
      ))}
      {busy ? <ActivityIndicator color={colors.brand} /> : null}
      <View style={styles.actions}>
        <Pressable style={[styles.chip, { borderColor: colors.border }]} onPress={addText}>
          <Text style={[styles.chipText, { color: colors.text }]}>{t("m.studio.add_text")}</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, { borderColor: colors.border }]}
          onPress={() => void pickImage((url) => onBlocks([...blocks, { id: rid("img"), type: "image", url }]))}
        >
          <Text style={[styles.chipText, { color: colors.text }]}>{t("m.studio.add_image_block")}</Text>
        </Pressable>
        <Pressable style={[styles.chip, { borderColor: colors.border }]} onPress={addEmbed}>
          <Text style={[styles.chipText, { color: colors.text }]}>{t("m.studio.add_embed")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 15, fontWeight: "800" },
  hint: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  cover: { width: "100%", aspectRatio: 4 / 3, borderRadius: 16 },
  link: { fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 16, padding: 10, gap: 8 },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 110, padding: 10, textAlignVertical: "top" },
  blockImage: { width: "100%", aspectRatio: 1, borderRadius: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontWeight: "800", fontSize: 12 },
});

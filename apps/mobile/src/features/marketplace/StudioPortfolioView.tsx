import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { parseVideoEmbed, type StudioPortfolioBlock } from "@/features/marketplace/studio-portfolio";
import { useTheme } from "@/theme/ThemeContext";

export function StudioPortfolioView({
  coverUrl,
  blocks,
}: {
  coverUrl?: string;
  blocks?: StudioPortfolioBlock[];
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const mediaWidth = Math.max(0, width);
  const embedHeight = Math.round(mediaWidth * (9 / 16));

  return (
    <View style={styles.wrap}>
      {coverUrl ? <Image source={{ uri: coverUrl }} style={[styles.cover, { width: mediaWidth }]} /> : null}
      {(blocks ?? []).map((block) => {
        if (block.type === "text") {
          return (
            <Text key={block.id} style={[styles.text, { color: colors.text }]}>
              {block.text}
            </Text>
          );
        }
        if (block.type === "image") {
          return <Image key={block.id} source={{ uri: block.url }} style={[styles.image, { width: mediaWidth }]} />;
        }
        const embed = parseVideoEmbed(block.url);
        if (!embed) return null;
        return (
          <WebView
            key={block.id}
            source={{ uri: embed.embedSrc }}
            style={{ width: mediaWidth, height: embedHeight, backgroundColor: "#000" }}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  cover: { aspectRatio: 4 / 3, backgroundColor: "#111" },
  image: { aspectRatio: 1, backgroundColor: "#111" },
  text: { paddingHorizontal: 16, fontSize: 15, lineHeight: 22, fontWeight: "600" },
});

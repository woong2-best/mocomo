import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { AttachSelectionOverlay } from "@/features/compose/AttachSelectionOverlay";

export type ComposeAttachPreview = {
  uri: string;
  type: "IMAGE" | "VIDEO";
};

/** Portrait tile. One photo and many photos share this frame. */
export function AttachImageCard({
  item,
  width,
  height,
  onRemove,
  removeLabel,
  previewLabel,
}: {
  item: ComposeAttachPreview;
  width: number;
  height: number;
  onRemove: () => void;
  removeLabel: string;
  previewLabel: string;
}) {
  return (
    <View
      style={[styles.card, { width, height }]}
      accessibilityLabel={previewLabel}
    >
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      {item.type === "VIDEO" ? (
        <View style={styles.videoBadge} pointerEvents="none">
          <Ionicons name="play" size={14} color="#fff" />
        </View>
      ) : null}
      <AttachSelectionOverlay onPress={onRemove} accessibilityLabel={removeLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#12161c",
  },
  videoBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
});

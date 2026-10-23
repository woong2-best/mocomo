import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import type { CommentMediaType } from "@/api/social";

function isVideoUrl(url: string) {
  const lower = url.toLowerCase();
  return /\.(mp4|webm)(\?|$)/.test(lower) || lower.includes("/mp4") || lower.includes("/webm");
}

function LoopVideo({
  uri,
  style,
  contentFit = "cover",
}: {
  uri: string;
  style: object;
  contentFit?: "cover" | "contain";
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });
  return <VideoView player={player} style={style} contentFit={contentFit} nativeControls={false} />;
}

export function CommentMediaBlock({
  mediaType,
  mediaUrl,
}: {
  mediaType?: CommentMediaType | null;
  mediaUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  if ((mediaType !== "PHOTO" && mediaType !== "GIF") || !mediaUrl) return null;
  const video = mediaType === "GIF" && isVideoUrl(mediaUrl);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.thumbWrap}>
        {video ? (
          <LoopVideo uri={mediaUrl} style={styles.thumb} />
        ) : (
          <Image source={{ uri: mediaUrl }} style={styles.thumb} />
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.close} onPress={() => setOpen(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <View style={styles.fullWrap} pointerEvents="box-none">
            {video ? (
              <LoopVideo uri={mediaUrl} style={styles.full} contentFit="contain" />
            ) : (
              <Image source={{ uri: mediaUrl }} style={styles.full} resizeMode="contain" />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumbWrap: {
    marginTop: 8,
    width: 220,
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  thumb: { width: "100%", height: "100%" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    position: "absolute",
    top: 48,
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  fullWrap: { width: "90%", height: "80%" },
  full: { width: "100%", height: "100%" },
});

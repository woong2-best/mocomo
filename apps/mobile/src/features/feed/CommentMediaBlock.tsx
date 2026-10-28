import { useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import type { CommentMediaType } from "@/api/social";

const COMMENT_MEDIA = {
  width: 220,
  height: 140,
};

const PREVIEW_MEDIA = {
  width: 120,
  height: 80,
};

function displayGifUrl(url: string) {
  if (/\.mp4(\?|$)/i.test(url) && /giphy\.com/i.test(url)) {
    return url.replace(/\.mp4(\?|$)/i, ".gif$1");
  }
  return url;
}

function isVideoUrl(url: string) {
  const lower = url.toLowerCase();
  return /\.(mp4|webm)(\?|$)/.test(lower) || lower.includes("/mp4") || lower.includes("/webm");
}

function LoopVideo({
  uri,
  width,
  height,
  contentFit = "cover",
}: {
  uri: string;
  width: number;
  height: number;
  contentFit?: "cover" | "contain";
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width, height }}
      contentFit={contentFit}
      nativeControls={false}
    />
  );
}

export function CommentMediaBlock({
  mediaType,
  mediaUrl,
  variant = "comment",
}: {
  mediaType?: CommentMediaType | null;
  mediaUrl?: string | null;
  variant?: "comment" | "preview";
}) {
  const [open, setOpen] = useState(false);
  if ((mediaType !== "PHOTO" && mediaType !== "GIF") || !mediaUrl) return null;
  const source = mediaType === "GIF" ? displayGifUrl(mediaUrl) : mediaUrl;
  const video = mediaType === "GIF" && isVideoUrl(source);
  const box = variant === "preview" ? PREVIEW_MEDIA : COMMENT_MEDIA;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.thumbWrap, { width: box.width, height: box.height }]}
      >
        {video ? (
          <LoopVideo uri={source} width={box.width} height={box.height} />
        ) : (
          <Image
            source={{ uri: source }}
            style={{ width: box.width, height: box.height }}
            contentFit="cover"
            autoplay
          />
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.close} onPress={() => setOpen(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <View style={styles.fullWrap} pointerEvents="box-none">
            {video ? (
              <LoopVideo
                uri={source}
                width={Math.round(Dimensions.get("window").width * 0.9)}
                height={Math.round(Dimensions.get("window").height * 0.7)}
                contentFit="contain"
              />
            ) : (
              <Image source={{ uri: source }} style={styles.full} contentFit="contain" autoplay />
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
    marginBottom: 4,
    maxWidth: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#222",
    alignSelf: "flex-start",
  },
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
  fullWrap: { width: "90%", height: "80%", alignItems: "center", justifyContent: "center" },
  full: { width: "100%", height: "100%" },
});

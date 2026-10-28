import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { IMAGE_CACHE_POLICY, avatarImageSource } from "@/perf/image";

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

/** Circular comment avatar — Instagram Reels style, with letter fallback. */
export function CommentAvatar({ uri, name, size = 36 }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [uri]);
  const letter = (name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const showPhoto = Boolean(uri?.trim()) && !failed;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {showPhoto ? (
        <Image
          source={avatarImageSource(uri!.trim())}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={uri!.trim()}
          transition={0}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>{letter}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "#3A3A3A",
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: "#fff",
    fontWeight: "800",
  },
});

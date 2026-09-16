import { memo, useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import type { FeedAd } from "@/api/feed";
import { API_BASE_URL } from "@/config/env";

type Props = {
  ad: FeedAd;
  width: number;
  height: number;
};

function resolveAdUrl(linkUrl: string): string {
  if (linkUrl.startsWith("http") || linkUrl.startsWith("data:")) return linkUrl;
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}${linkUrl.startsWith("/") ? linkUrl : `/${linkUrl}`}`;
}

function ReelSponsoredSlideInner({ ad, width, height }: Props) {
  const styles = useMemo(() => createStyles(width, height), [width, height]);
  const cta = ad.ctaLabel?.trim() || "참가하기";
  const imageUri = resolveAdUrl(ad.imageUrl);

  const onPress = () => {
    void Linking.openURL(resolveAdUrl(ad.linkUrl));
  };

  return (
    <Pressable style={styles.root} onPress={onPress}>
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE_POLICY}
        transition={0}
      />
      <View style={styles.topScrim} pointerEvents="none" />
      <View style={styles.bottomScrim} pointerEvents="none" />

      <View style={styles.topBar}>
        <View style={styles.sponsoredRow}>
          <Ionicons name="megaphone-outline" size={16} color="#D4A017" />
          <Text style={styles.sponsoredLabel}>Sponsored</Text>
        </View>
        <Text style={styles.adCategory}>{ad.adCategory || "광고"}</Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>
          {ad.title}
        </Text>
        {ad.sponsorName ? (
          <Text style={styles.sponsor} numberOfLines={1}>
            {ad.sponsorName}
          </Text>
        ) : null}
        <View style={styles.ctaBtn}>
          <Text style={styles.ctaText}>{cta} →</Text>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(width: number, height: number) {
  return StyleSheet.create({
    root: {
      width,
      height,
      backgroundColor: "#0a0a0f",
      justifyContent: "flex-end",
    },
    image: {
      ...StyleSheet.absoluteFill,
      width,
      height,
    },
    topScrim: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: height * 0.28,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    bottomScrim: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: height * 0.42,
      backgroundColor: "rgba(0,0,0,0.62)",
    },
    topBar: {
      position: "absolute",
      top: 56,
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sponsoredRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sponsoredLabel: {
      color: "#D4A017",
      fontWeight: "800",
      fontSize: 14,
      letterSpacing: 0.3,
    },
    adCategory: {
      color: "rgba(255,255,255,0.65)",
      fontSize: 12,
      fontWeight: "600",
    },
    bottom: {
      paddingHorizontal: 20,
      paddingBottom: 48,
      gap: 8,
      zIndex: 1,
    },
    title: {
      color: "#fff",
      fontSize: 22,
      fontWeight: "800",
      lineHeight: 28,
    },
    sponsor: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 14,
      fontWeight: "600",
    },
    ctaBtn: {
      alignSelf: "flex-start",
      marginTop: 8,
      backgroundColor: "#D4A017",
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
    },
    ctaText: {
      color: "#1a1208",
      fontWeight: "800",
      fontSize: 15,
    },
  });
}

export const ReelSponsoredSlide = memo(ReelSponsoredSlideInner);

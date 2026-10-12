import { memo, useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import type { FeedAd } from "@/api/feed";
import { API_BASE_URL } from "@/config/env";
import { useI18n } from "@/i18n/I18nProvider";
import { reelsUi } from "@/features/reels/reels-ui";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type Props = {
  ad: FeedAd;
  width: number;
  height: number;
  stageWidth?: number;
  stageLeft?: number;
};

function resolveAdUrl(linkUrl: string): string {
  if (linkUrl.startsWith("http") || linkUrl.startsWith("data:")) return linkUrl;
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}${linkUrl.startsWith("/") ? linkUrl : `/${linkUrl}`}`;
}

function ReelSponsoredSlideInner({
  ad,
  width,
  height,
  stageWidth: stageWidthProp,
  stageLeft: stageLeftProp,
}: Props) {
  const { t } = useI18n();
  const copy = useMemo(() => reelsUi(t), [t]);
  const insets = useSafeAreaInsets();
  const stageWidth = stageWidthProp ?? width;
  const stageLeft = stageLeftProp ?? 0;
  const styles = useMemo(() => createStyles(stageWidth, height), [stageWidth, height]);
  const imageUri = resolveAdUrl(ad.imageUrl);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openDestination = () => {
    const postId = ad.postId?.trim() || ad.linkUrl.match(/^\/post\/([^/?#]+)/)?.[1];
    if (postId) {
      navigation.navigate("PostDetail", { id: postId });
      return;
    }
    const href = ad.linkUrl?.trim();
    if (!href) return;
    void Linking.openURL(resolveAdUrl(href));
  };

  return (
    <View style={{ width, height, backgroundColor: "#0a0a0f", overflow: "hidden" }}>
    <View style={[styles.root, { left: stageLeft }]}>
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE_POLICY}
        transition={0}
        pointerEvents="none"
      />
      <View style={styles.topScrim} pointerEvents="none" />
      <View style={styles.bottomScrim} pointerEvents="none" />

      <View style={styles.topBar} pointerEvents="none">
        <View style={styles.sponsoredRow}>
          <Ionicons name="megaphone-outline" size={16} color="#D4A017" />
          <Text style={styles.sponsoredLabel}>Sponsored</Text>
        </View>
        <Text style={styles.adCategory}>{ad.adCategory || copy.adCategory}</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View pointerEvents="none" style={styles.copyBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {ad.title}
          </Text>
          {ad.sponsorName ? (
            <Text style={styles.sponsor} numberOfLines={1}>
              {ad.sponsorName}
            </Text>
          ) : null}
        </View>
        <Pressable
          style={styles.ctaBar}
          onPress={openDestination}
          accessibilityRole="link"
          accessibilityLabel={copy.learnMore}
        >
          <Text style={styles.ctaText}>{copy.learnMore}</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFBF5" />
        </Pressable>
      </View>
    </View>
    </View>
  );
}

function createStyles(width: number, height: number) {
  return StyleSheet.create({
    root: {
      position: "absolute",
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
      zIndex: 1,
      gap: 12,
    },
    copyBlock: {
      paddingHorizontal: 20,
      gap: 6,
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
    ctaBar: {
      minHeight: 48,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#C5522A",
    },
    ctaText: {
      color: "#FFFBF5",
      fontWeight: "800",
      fontSize: 16,
    },
  });
}

export const ReelSponsoredSlide = memo(ReelSponsoredSlideInner);

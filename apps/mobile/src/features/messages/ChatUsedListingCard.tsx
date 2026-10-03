import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { UsedListingChatCard } from "@/api/messages";
import { resolveAbsolutePlaybackUrl } from "@/api/watermark";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const CARD_W = 248;

export function ChatUsedListingCard({
  listingId,
  card,
  onLongPress,
}: {
  listingId: string;
  card?: UsedListingChatCard | null;
  onLongPress?: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loaded, setLoaded] = useState<UsedListingChatCard | null>(card ?? null);

  useEffect(() => {
    if (card) {
      setLoaded(card);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    void apiRequest<{ ok?: boolean; listing?: UsedListingChatCard }>(
      MobileApi.marketplaceShareCard(listingId),
      { auth: true, signal: ac.signal }
    )
      .then((res) => {
        if (!cancelled && res.listing) setLoaded(res.listing);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [card, listingId]);

  const title = loaded?.title ?? t("m.messages.view_listing");
  const imageUrl = loaded?.imageUrl ? resolveAbsolutePlaybackUrl(loaded.imageUrl) : null;

  return (
    <Pressable
      onPress={() => navigation.navigate("MarketplaceDetail", { id: listingId })}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={t("m.messages.title_listing_page", { title: String(title) })}
    >
      <View style={styles.photo}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            transition={0}
          />
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: CARD_W,
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: colors.terracotta,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.terracotta,
    },
    photo: {
      width: CARD_W,
      height: CARD_W,
      backgroundColor: colors.muted,
    },
    name: {
      color: colors.textOnAccent,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 20,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
    },
  });
}

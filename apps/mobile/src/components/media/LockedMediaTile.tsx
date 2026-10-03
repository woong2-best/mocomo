import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import type { FeedMedia } from "@/api/feed";
import { LockedMediaPaywallOverlay } from "@/components/media/LockedMediaPaywallOverlay";
import { PurchasePostMediaButton } from "@/components/media/PurchasePostMediaButton";
import {
  normalizeLockReason,
  resolvePurchasePriceKrw,
  type PaidMediaMonetization,
} from "@/components/media/paid-media-types";
import { useTheme } from "@/theme/ThemeContext";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  media: FeedMedia;
  monetization: PaidMediaMonetization;
  style?: object;
};

export function LockedMediaTile({ media, monetization, style }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const lockReason = normalizeLockReason(media.lockReason);
  const purchasePrice = resolvePurchasePriceKrw(
    media,
    monetization.postInstantPurchasePriceKrw
  );
  const subscriptionPrice = monetization.subscriptionPriceKrw ?? 0;

  const overlay = useMemo(() => {
    if (lockReason === "subscription" && monetization.authorId && subscriptionPrice > 0) {
      if (monetization.subscribedToAuthor) {
        return <LockedMediaPaywallOverlay label={t("m.media.subscribed")} />;
      }
      return (
        <LockedMediaPaywallOverlay label={t("m.media.subscribers_only")}>
          <Text style={styles.ctaHint}>{t("m.media.recurring_support_has_ended_so_this")}</Text>
        </LockedMediaPaywallOverlay>
      );
    }

    if (lockReason === "purchase" && purchasePrice > 0) {
      return (
        <LockedMediaPaywallOverlay>
          <PurchasePostMediaButton
            mediaId={media.id}
            priceKrw={purchasePrice}
            paymentsEnabled={monetization.paymentsEnabled}
            username={monetization.authorUsername}
            postId={monetization.postId}
            label={t("m.media.pay")}
            variant="label"
            onPurchaseSuccess={monetization.onPurchaseSuccess}
          />
        </LockedMediaPaywallOverlay>
      );
    }

    return <LockedMediaPaywallOverlay label={t("m.media.you_do_not_have_access_to")} />;
  }, [
    lockReason,
    media.id,
    monetization,
    purchasePrice,
    subscriptionPrice,
  ]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.muted }, style]}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.overlayHost} pointerEvents="box-none">
        {overlay}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  overlayHost: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    elevation: 10,
  },
  ctaStack: {
    alignItems: "center",
    gap: 8,
    maxWidth: 240,
  },
  ctaTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  ctaHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    textAlign: "center",
  },
});

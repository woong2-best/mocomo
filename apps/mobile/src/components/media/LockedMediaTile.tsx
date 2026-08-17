import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import type { FeedMedia } from "@/api/feed";
import { LockedMediaPaywallOverlay } from "@/components/media/LockedMediaPaywallOverlay";
import { PurchasePostMediaButton } from "@/components/media/PurchasePostMediaButton";
import { PayButton } from "@/payments/PayButton";
import {
  normalizeLockReason,
  resolvePurchasePriceKrw,
  type PaidMediaMonetization,
} from "@/components/media/paid-media-types";
import { useTheme } from "@/theme/ThemeContext";
import { formatUsd } from "@/lib/money";

type Props = {
  media: FeedMedia;
  monetization: PaidMediaMonetization;
  style?: object;
};

export function LockedMediaTile({ media, monetization, style }: Props) {
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
        return <LockedMediaPaywallOverlay label="구독 중" />;
      }
      return (
        <LockedMediaPaywallOverlay label="구독하기">
          <View style={styles.ctaStack}>
            <Text style={styles.ctaTitle}>구독하기</Text>
            {monetization.paymentsEnabled ? (
              <PayButton
                type="CREATOR_SUBSCRIPTION"
                amount={subscriptionPrice}
                orderName={`@${monetization.authorUsername} 구독`}
                metadata={{
                  creatorId: monetization.authorId,
                  username: monetization.authorUsername,
                }}
                label={`${formatUsd(subscriptionPrice)}/월 구독`}
                variant="secondary"
                onSuccess={monetization.onPurchaseSuccess}
              />
            ) : (
              <Text style={styles.ctaHint}>결제 연동 후 구독할 수 있습니다.</Text>
            )}
          </View>
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
            label="결제하기"
            variant="label"
            onPurchaseSuccess={monetization.onPurchaseSuccess}
          />
        </LockedMediaPaywallOverlay>
      );
    }

    return <LockedMediaPaywallOverlay label="열람 권한이 없습니다." />;
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

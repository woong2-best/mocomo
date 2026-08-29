import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LockedMediaPaywallOverlay } from "@/components/media/LockedMediaPaywallOverlay";
import { PurchaseMessageMediaButton } from "@/components/media/PurchaseMessageMediaButton";
import { useTheme } from "@/theme/ThemeContext";

type Props = {
  attachmentId: string;
  priceKrw: number;
  sellerUsername?: string;
  paymentsEnabled?: boolean;
  onPurchaseSuccess?: () => void;
  style?: object;
};

export function LockedMessageMediaTile({
  attachmentId,
  priceKrw,
  sellerUsername,
  paymentsEnabled = true,
  onPurchaseSuccess,
  style,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.muted }, style]}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.overlayHost} pointerEvents="box-none">
        <LockedMediaPaywallOverlay>
          <PurchaseMessageMediaButton
            attachmentId={attachmentId}
            priceKrw={priceKrw}
            sellerUsername={sellerUsername}
            paymentsEnabled={paymentsEnabled}
            onPurchaseSuccess={onPurchaseSuccess}
          />
        </LockedMediaPaywallOverlay>
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
});

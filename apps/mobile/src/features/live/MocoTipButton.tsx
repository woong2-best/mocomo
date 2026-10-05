import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { liveUi } from "@/features/live/live-ui";

/** Orange circular $ donation button. */
const CHEESE_ORANGE = "#FF7608";

type Props = {
  onPress: () => void;
  disabled?: boolean;
  size?: number;
};

function MocoTipButtonInner({ onPress, disabled, size = 36 }: Props) {
  const { t } = useI18n();
  const copy = liveUi(t);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.mocoDonation}
      disabled={disabled}
      onPress={onPress}
      style={[styles.hit, { width: size, height: size, opacity: disabled ? 0.45 : 1 }]}
    >
      <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.dollar, { fontSize: size * 0.48, lineHeight: size * 0.52 }]}>$</Text>
      </View>
    </Pressable>
  );
}

export const MocoTipButton = memo(MocoTipButtonInner);

const styles = StyleSheet.create({
  hit: { alignItems: "center", justifyContent: "center" },
  coin: {
    backgroundColor: CHEESE_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },
  dollar: {
    color: "#FFFFFF",
    fontWeight: "700",
    includeFontPadding: false,
    textAlign: "center",
  },
});

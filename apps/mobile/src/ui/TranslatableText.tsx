import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n/I18nProvider";
import { useAutoClientTranslation } from "@/hooks/useAutoClientTranslation";
import { needsClientTranslation } from "@/lib/translate/detect-source";
import { LinkifiedText } from "@/ui/LinkifiedText";
import { useTheme } from "@/theme/ThemeContext";
type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  linkStyle?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  lightLinks?: boolean;
  onBackgroundPress?: () => void;
  /** Kept for callers; translation only runs after the reader taps. */
  translateActive?: boolean;
};

export function TranslatableText({
  text,
  style,
  numberOfLines,
  linkStyle,
  mentionStyle,
  lightLinks,
  onBackgroundPress,
  translateActive = true,
}: Props) {
  const { locale, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const showTranslate = useMemo(
    () => translateActive && needsClientTranslation(text, locale),
    [translateActive, text, locale]
  );

  const {
    displayText,
    translated,
    sourceLang,
    loading,
    failed,
    showOriginal,
    setShowOriginal,
    requestTranslation,
  } = useAutoClientTranslation(text, locale, showTranslate);

  if (!showTranslate) {
    return (
      <LinkifiedText
        text={text}
        style={style}
        numberOfLines={numberOfLines}
        linkStyle={linkStyle}
        mentionStyle={mentionStyle}
        lightLinks={lightLinks}
        onBackgroundPress={onBackgroundPress}
      />
    );
  }

  const showingTranslation = Boolean(translated) && !showOriginal;

  return (
    <View>
      <View style={styles.metaRow}>
        <Ionicons name="language-outline" size={14} color={colors.textMuted} />
        {showingTranslation && sourceLang ? (
          <>
            <Pressable onPress={() => setShowOriginal(true)} hitSlop={8}>
              <Text style={styles.metaAction}>{t("translate.viewOriginal")}</Text>
            </Pressable>
          </>
        ) : showOriginal && translated ? (
          <Pressable onPress={() => setShowOriginal(false)} hitSlop={8}>
            <Text style={styles.metaAction}>{t("translate.viewTranslation")}</Text>
          </Pressable>
        ) : loading ? (
          <Text style={styles.metaText}>{t("translate.loading")}</Text>
        ) : (
          <>
            {failed ? <Text style={styles.failed}>{t("translate.failed")}</Text> : null}
            <Pressable onPress={requestTranslation} hitSlop={8} disabled={loading}>
              <Text style={styles.metaAction}>{t("translate.viewTranslation")}</Text>
            </Pressable>
          </>
        )}
      </View>
      <LinkifiedText
        text={displayText}
        style={style}
        numberOfLines={numberOfLines}
        linkStyle={linkStyle}
        mentionStyle={mentionStyle}
        lightLinks={lightLinks}
        onBackgroundPress={onBackgroundPress}
      />
    </View>
  );
}

function createStyles(colors: { textMuted: string; brand: string; danger: string }) {
  return StyleSheet.create({
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
      marginBottom: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    metaAction: {
      fontSize: 12,
      color: colors.brand,
      fontWeight: "600",
    },
    failed: {
      fontSize: 12,
      color: colors.danger,
    },
  });
}

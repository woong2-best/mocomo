import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n/I18nProvider";
import { useAutoClientTranslation } from "@/hooks/useAutoClientTranslation";
import { needsClientTranslation } from "@/lib/translate/detect-source";
import { LinkifiedText } from "@/ui/LinkifiedText";
import { useTheme } from "@/theme/ThemeContext";
import type { Locale } from "@/i18n";

const SOURCE_LABELS: Partial<Record<Locale, Partial<Record<Locale, string>>>> = {
  ko: { ko: "한국어", en: "영어", ja: "일본어", zh: "중국어" },
  en: { ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese" },
  ja: { ko: "韓国語", en: "英語", ja: "日本語", zh: "中国語" },
  zh: { ko: "韩语", en: "英语", ja: "日语", zh: "中文" },
};

function sourceLanguageLabel(source: Locale, uiLocale: Locale): string {
  const table = SOURCE_LABELS[uiLocale] ?? SOURCE_LABELS.en;
  return table?.[source] ?? source;
}

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  linkStyle?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  lightLinks?: boolean;
  onBackgroundPress?: () => void;
  /** Feed cards pass false until scrolled into view. */
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
            <Text style={styles.metaText}>
              {t("translate.sourceLanguage", {
                language: sourceLanguageLabel(sourceLang, locale),
              })}
            </Text>
            <Text style={styles.metaDot}>·</Text>
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
        ) : failed ? (
          <Text style={styles.failed}>{t("translate.failed")}</Text>
        ) : null}
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

function createStyles(colors: { textMuted: string; cobalt: string; danger: string }) {
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
    metaDot: {
      fontSize: 12,
      color: colors.textMuted,
    },
    metaAction: {
      fontSize: 12,
      color: colors.cobalt,
      fontWeight: "600",
    },
    failed: {
      fontSize: 12,
      color: colors.danger,
    },
  });
}

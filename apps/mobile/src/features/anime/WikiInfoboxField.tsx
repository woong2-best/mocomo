import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { parseWikiInfobox, WIKI_INFOBOX_HELP } from "@/features/anime/wiki-infobox";
import { WikiInline } from "@/features/anime/WikiInline";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
};

const BOX_HEIGHT = 220;
const PARENT_SYNC_MS = 160;

/**
 * Isolated infobox editor. Parent re-renders (cover, genre chips, keyboard)
 * must not reset iOS IME mid-composition, and the box must stay a fixed
 * height so KeyboardAvoidingView cannot open a huge empty gap.
 */
export function WikiInfoboxField({ label, value, onChange, placeholder }: Props) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [local, setLocal] = useState(value);
  const [previewOpen, setPreviewOpen] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setLocal(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  function emit(next: string) {
    lastEmitted.current = next;
    onChange(next);
  }

  function handleChange(next: string) {
    setLocal(next);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => emit(next), PARENT_SYNC_MS);
  }

  function handleBlur() {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }
    emit(local);
  }

  const sections = parseWikiInfobox(local, locale);

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          onPress={() => setPreviewOpen((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("m.common.preview")}
        >
          <Text style={styles.previewToggle}>
            {previewOpen ? t("m.anime.collapse") : t("m.common.preview")}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.help}>{WIKI_INFOBOX_HELP}</Text>
      <View style={styles.box}>
        <TextInput
          style={styles.input}
          value={local}
          onChangeText={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          scrollEnabled
          nestedScrollEnabled
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
          blurOnSubmit={false}
          underlineColorAndroid="transparent"
        />
      </View>
      {previewOpen ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>{t("m.common.preview")}</Text>
          {sections.length === 0 ? (
            <Text style={styles.previewEmpty}>{placeholder}</Text>
          ) : (
            <ScrollView style={styles.previewScroll} nestedScrollEnabled>
              {sections.map((section) => (
                <View key={section.title} style={styles.previewSection}>
                  <Text style={styles.previewSectionTitle}>{section.title}</Text>
                  {section.rows.map((row) => (
                    <View key={`${section.title}-${row.label}`} style={styles.previewRow}>
                      <Text style={styles.previewKey}>{row.label}</Text>
                      <View style={styles.previewVal}>
                        {row.value.split("\n").map((line, i) => (
                          <WikiInline
                            key={`${row.label}-${i}`}
                            text={line}
                            keyPrefix={`ib-edit-${section.title}-${row.label}-${i}`}
                            style={styles.previewValText}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    labelRow: {
      marginTop: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    previewToggle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.brand,
    },
    help: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
    },
    box: {
      marginTop: 6,
      height: BOX_HEIGHT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
    },
    input: {
      flex: 1,
      paddingHorizontal: 12,
      paddingTop: Platform.OS === "ios" ? 10 : 8,
      paddingBottom: 10,
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
      textAlignVertical: "top",
    },
    preview: {
      marginTop: 8,
      padding: 10,
      maxHeight: 220,
      borderRadius: radii.md,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      backgroundColor: colors.muted,
    },
    previewLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      marginBottom: 8,
    },
    previewEmpty: {
      fontSize: 12,
      color: colors.textMuted,
    },
    previewScroll: {
      maxHeight: 180,
    },
    previewSection: {
      marginBottom: 10,
    },
    previewSectionTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    previewRow: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
    },
    previewKey: {
      width: "34%",
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
    },
    previewVal: {
      flex: 1,
      minWidth: 0,
    },
    previewValText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.text,
    },
  });
}

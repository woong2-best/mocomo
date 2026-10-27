import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DEFAULT_WIKI_INFOBOX_TITLE,
  infoboxSectionsFromSource,
  serializeWikiInfobox,
  type WikiInfoboxSection,
} from "@/features/anime/wiki-infobox";
import { animeUi } from "@/features/anime/anime-ui";
import { KeyboardAwareTextInput } from "@/ui/KeyboardAwareScrollView";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type EditorRow = { id: string; label: string; value: string };
type EditorSection = { id: string; title: string; rows: EditorRow[] };

let infoboxSeq = 0;
function nextId(prefix: string) {
  infoboxSeq += 1;
  return `${prefix}-${infoboxSeq}`;
}

function toEditorSections(source: string): EditorSection[] {
  return infoboxSectionsFromSource(source).map((section) => ({
    id: nextId("sec"),
    title: section.title,
    rows:
      section.rows.length > 0
        ? section.rows.map((row) => ({ id: nextId("row"), label: row.label, value: row.value }))
        : [{ id: nextId("row"), label: "Studio", value: "" }],
  }));
}

function toSource(sections: EditorSection[]): string {
  const payload: WikiInfoboxSection[] = sections.map((section) => ({
    title: section.title,
    rows: section.rows.map((row) => ({ label: row.label, value: row.value })),
  }));
  return serializeWikiInfobox(payload);
}

export function WikiInfoboxEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { t } = useI18n();
  const copy = useMemo(() => animeUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sections, setSections] = useState(() => toEditorSections(value));

  function commit(next: EditorSection[]) {
    setSections(next);
    onChange(toSource(next));
  }

  return (
    <View style={styles.wrap}>
      {sections.map((section, si) => (
        <View key={section.id} style={styles.section}>
          <View style={styles.sectionHead}>
            <KeyboardAwareTextInput
              style={[styles.input, styles.sectionTitle]}
              value={section.title}
              onChangeText={(title) =>
                commit(sections.map((item) => (item.id === section.id ? { ...item, title } : item)))
              }
              placeholder={copy.infoboxSectionTitle}
              placeholderTextColor={colors.textMuted}
            />
            {sections.length > 1 ? (
              <Pressable
                onPress={() => commit(sections.filter((item) => item.id !== section.id))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={copy.infoboxRemoveSection}
                style={styles.iconBtn}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          {section.rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <KeyboardAwareTextInput
                style={[styles.input, styles.labelInput]}
                value={row.label}
                onChangeText={(label) =>
                  commit(
                    sections.map((item) =>
                      item.id !== section.id
                        ? item
                        : {
                            ...item,
                            rows: item.rows.map((current) =>
                              current.id === row.id ? { ...current, label } : current
                            ),
                          }
                    )
                  )
                }
                placeholder={copy.infoboxLabelPh}
                placeholderTextColor={colors.textMuted}
              />
              <KeyboardAwareTextInput
                style={[styles.input, styles.valueInput]}
                value={row.value}
                onChangeText={(nextValue) =>
                  commit(
                    sections.map((item) =>
                      item.id !== section.id
                        ? item
                        : {
                            ...item,
                            rows: item.rows.map((current) =>
                              current.id === row.id ? { ...current, value: nextValue } : current
                            ),
                          }
                    )
                  )
                }
                placeholder={copy.infoboxValuePh}
                placeholderTextColor={colors.textMuted}
              />
              <Pressable
                onPress={() =>
                  commit(
                    sections.map((item) =>
                      item.id !== section.id
                        ? item
                        : { ...item, rows: item.rows.filter((current) => current.id !== row.id) }
                    )
                  )
                }
                disabled={section.rows.length <= 1}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={copy.infoboxRemoveRow}
                style={styles.iconBtn}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={section.rows.length <= 1 ? colors.border : colors.textMuted}
                />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() =>
              commit(
                sections.map((item, index) =>
                  index !== si
                    ? item
                    : { ...item, rows: [...item.rows, { id: nextId("row"), label: "", value: "" }] }
                )
              )
            }
            style={styles.addBtn}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={16} color={colors.brand} />
            <Text style={styles.addBtnText}>{copy.infoboxAddRow}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={() =>
          commit([
            ...sections,
            {
              id: nextId("sec"),
              title: DEFAULT_WIKI_INFOBOX_TITLE,
              rows: [{ id: nextId("row"), label: "", value: "" }],
            },
          ])
        }
        style={styles.addBtn}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={16} color={colors.brand} />
        <Text style={styles.addBtnText}>{copy.infoboxAddSection}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    section: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.muted,
      padding: 10,
      gap: 8,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sectionTitle: {
      flex: 1,
      marginTop: 0,
      fontWeight: "700",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    input: {
      marginTop: 0,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 14,
    },
    labelInput: {
      width: 92,
    },
    valueInput: {
      flex: 1,
      minWidth: 0,
    },
    iconBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 2,
    },
    addBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.brand,
    },
  });
}

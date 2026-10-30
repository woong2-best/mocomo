import { useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AnimeUi } from "@/features/anime/anime-ui";
import { WikiContent } from "@/features/anime/WikiContent";
import {
  WIKI_COLOR_SWATCHES,
  WIKI_MORE_INSERTS,
  WIKI_SIZE_STEPS,
  colorTemplate,
  highlightTemplate,
  insertWikiTemplate,
  sizeTemplate,
} from "@/features/anime/wiki-insert";
import { applyYoutubePaste } from "@/features/anime/wiki-youtube";
import { useKeyboardLift } from "@/lib/use-keyboard-inset";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  title: string;
  body: string;
  busy?: boolean;
  copy: AnimeUi;
  onChangeBody: (next: string) => void;
  onClose: () => void;
  onPickImage: () => Promise<string | null>;
};

type Picker = "color" | "highlight" | "size" | null;

export function WikiArticleSourceEditor({
  visible,
  title,
  body,
  busy,
  copy,
  onChangeBody,
  onClose,
  onPickImage,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { keyboardLift } = useKeyboardLift();
  const inputRef = useRef<TextInput>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const undoRef = useRef<string[]>([]);
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [moreOpen, setMoreOpen] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);

  function remember(prev: string) {
    if (undoRef.current[undoRef.current.length - 1] === prev) return;
    undoRef.current.push(prev);
    if (undoRef.current.length > 40) undoRef.current.shift();
  }

  function applyTemplate(template: string) {
    const { start, end } = selectionRef.current;
    remember(body);
    const result = insertWikiTemplate(body, start, end, template);
    onChangeBody(result.next);
    selectionRef.current = { start: result.caret, end: result.caret };
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setNativeProps?.({
        selection: { start: result.caret, end: result.caret },
      });
    });
  }

  function undo() {
    const prev = undoRef.current.pop();
    if (prev == null) return;
    onChangeBody(prev);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function insertImage() {
    const url = await onPickImage();
    if (!url) return;
    applyTemplate(`![${copy.photoCaption}](${url})`);
  }

  const railItems: Array<{
    id: string;
    label: string;
    onPress: () => void;
    glyph?: string;
    italic?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
  }> = [
    { id: "image", label: copy.imageBtn, icon: "camera-outline", onPress: () => void insertImage() },
    { id: "link", label: copy.wikilinkBtn, icon: "link-outline", onPress: () => applyTemplate("[[|]]") },
    { id: "heading", label: copy.headingBtn, glyph: "A", onPress: () => applyTemplate("\n== | ==\n") },
    { id: "bold", label: copy.boldBtn, glyph: "B", onPress: () => applyTemplate("**|**") },
    { id: "italic", label: copy.italicBtn, glyph: "I", italic: true, onPress: () => applyTemplate("*|*") },
    { id: "strike", label: copy.strikeBtn, icon: "remove-outline", onPress: () => applyTemplate("~~|~~") },
    { id: "spoiler", label: copy.spoilerBtn, icon: "eye-off-outline", onPress: () => applyTemplate("\\|\\||\\|\\|") },
    { id: "fold", label: copy.foldBtn, icon: "layers-outline", onPress: () => applyTemplate("\n[fold:Title]\n|\n[/fold]\n") },
    { id: "quote", label: copy.quoteBtn, icon: "chatbox-ellipses-outline", onPress: () => applyTemplate("\n> |") },
    { id: "undo", label: copy.undoBtn, icon: "arrow-undo-outline", onPress: undo },
    { id: "table", label: copy.tableBtn, icon: "grid-outline", onPress: () => applyTemplate("\n| | | |\n| --- | --- |\n|  |  |\n") },
    {
      id: "color",
      label: copy.colorBtn,
      icon: "color-palette-outline",
      onPress: () => setPicker((v) => (v === "color" ? null : "color")),
    },
    { id: "list", label: copy.listBtn, icon: "list-outline", onPress: () => applyTemplate("\n- |") },
    {
      id: "more",
      label: copy.moreBtn,
      icon: "ellipsis-horizontal",
      onPress: () => {
        Keyboard.dismiss();
        setPicker(null);
        setMoreOpen(true);
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      onShow={() => {
        setPane("edit");
        setPicker(null);
        setMoreOpen(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }}
    >
      <Screen>
        <AppHeader
          title={title}
          onLeftPress={onClose}
          leftLabel={copy.back}
          rightSlot={
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={copy.articleDone}
            >
              <Text style={styles.done}>{copy.articleDone}</Text>
            </Pressable>
          }
        />
        <View style={styles.tabs} accessibilityRole="tablist">
          <Pressable
            onPress={() => setPane("edit")}
            style={[styles.tab, pane === "edit" && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: pane === "edit" }}
          >
            <Text style={[styles.tabText, pane === "edit" && styles.tabTextActive]}>{copy.editTab}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPane("preview");
              setPicker(null);
              Keyboard.dismiss();
            }}
            style={[styles.tab, pane === "preview" && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: pane === "preview" }}
          >
            <Text style={[styles.tabText, pane === "preview" && styles.tabTextActive]}>{copy.preview}</Text>
          </Pressable>
        </View>
        <View style={[styles.workspace, { paddingBottom: keyboardLift }]}>
          {pane === "edit" ? (
            <ScrollView
              style={styles.rail}
              contentContainerStyle={styles.railInner}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {railItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  disabled={busy}
                  style={styles.railBtn}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  {item.glyph ? (
                    <Text style={[styles.glyph, item.italic && styles.glyphItalic]}>{item.glyph}</Text>
                  ) : (
                    <Ionicons name={item.icon} size={20} color={colors.brand} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {pane === "preview" ? (
            <ScrollView
              style={styles.previewPane}
              contentContainerStyle={styles.previewInner}
              keyboardShouldPersistTaps="handled"
            >
              {body.trim() ? (
                <WikiContent source={body} />
              ) : (
                <Text style={styles.help}>{copy.previewEmpty}</Text>
              )}
            </ScrollView>
          ) : (
            <TextInput
              ref={inputRef}
              style={styles.source}
              value={body}
              onChangeText={(next) => onChangeBody(applyYoutubePaste(body, next))}
              onSelectionChange={(e) => {
                selectionRef.current = e.nativeEvent.selection;
              }}
              placeholder={copy.articlePlaceholder}
              placeholderTextColor={colors.textMuted}
              multiline
              scrollEnabled
              textAlignVertical="top"
              autoCorrect={false}
              spellCheck={false}
              blurOnSubmit={false}
              selectionColor={colors.brand}
            />
          )}
        </View>
        {picker ? (
          <View style={[styles.picker, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Text style={styles.pickerLabel}>
              {picker === "color" ? copy.colorBtn : picker === "highlight" ? copy.highlightBtn : copy.sizeBtn}
            </Text>
            <View style={styles.pickerRow}>
              {picker === "size"
                ? WIKI_SIZE_STEPS.map((size) => (
                    <Pressable
                      key={size.step}
                      onPress={() => {
                        applyTemplate(sizeTemplate(size.step));
                        setPicker(null);
                      }}
                      style={styles.sizeChip}
                    >
                      <Text style={styles.sizeChipText}>{size.label}</Text>
                    </Pressable>
                  ))
                : WIKI_COLOR_SWATCHES.map((swatch) => (
                    <Pressable
                      key={swatch.id}
                      onPress={() => {
                        applyTemplate(
                          picker === "highlight" ? highlightTemplate(swatch.id) : colorTemplate(swatch.id)
                        );
                        setPicker(null);
                      }}
                      style={[styles.swatch, { backgroundColor: swatch.value }]}
                      accessibilityLabel={swatch.id}
                    />
                  ))}
            </View>
          </View>
        ) : null}
        {moreOpen ? (
          <View style={styles.sheetRoot} pointerEvents="box-none">
            <Pressable style={styles.sheetBackdrop} onPress={() => setMoreOpen(false)} />
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{copy.moreTitle}</Text>
              <View style={styles.sheetGrid}>
                <Pressable
                  onPress={() => {
                    setMoreOpen(false);
                    setPicker("size");
                  }}
                  style={styles.sheetItem}
                  accessibilityRole="button"
                  accessibilityLabel={copy.sizeBtn}
                >
                  <Ionicons name="text-outline" size={22} color={colors.brand} />
                  <Text style={styles.sheetItemLabel}>{copy.sizeBtn}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMoreOpen(false);
                    setPicker("highlight");
                  }}
                  style={styles.sheetItem}
                  accessibilityRole="button"
                  accessibilityLabel={copy.highlightBtn}
                >
                  <Ionicons name="color-filter-outline" size={22} color={colors.brand} />
                  <Text style={styles.sheetItemLabel}>{copy.highlightBtn}</Text>
                </Pressable>
                {WIKI_MORE_INSERTS.filter((item) => item.id !== "highlight").map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      applyTemplate(item.template);
                      setMoreOpen(false);
                    }}
                    style={styles.sheetItem}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <Ionicons name={item.icon} size={22} color={colors.brand} />
                    <Text style={styles.sheetItemLabel}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </Screen>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    done: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.brand,
    },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.brand,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.text,
    },
    workspace: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.background,
    },
    rail: {
      width: 48,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    railInner: {
      alignItems: "center",
      paddingVertical: 6,
      gap: 2,
    },
    railBtn: {
      width: 44,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    glyph: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.brand,
    },
    glyphItalic: {
      fontStyle: "italic",
    },
    source: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 24,
      color: colors.text,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      fontSize: 15,
      lineHeight: 24,
    },
    previewPane: {
      flex: 1,
    },
    previewInner: {
      padding: 16,
      paddingBottom: 40,
    },
    help: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
    },
    picker: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 12,
      paddingTop: 10,
      gap: 8,
    },
    pickerLabel: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    pickerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sizeChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
    },
    sizeChipText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
    },
    sheetRoot: {
      ...StyleSheet.absoluteFill,
      justifyContent: "flex-end",
      zIndex: 30,
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 12,
    },
    sheetGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    sheetItem: {
      width: "23%",
      minWidth: 72,
      flexGrow: 1,
      alignItems: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
    },
    sheetItemLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
  });
}

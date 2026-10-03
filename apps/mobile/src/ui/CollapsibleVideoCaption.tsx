import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";
import { TranslatableText } from "@/ui/TranslatableText";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Reset expand when post/video changes. */
  resetKey?: string;
  onExpandedChange?: (expanded: boolean) => void;
};

export function buildVideoCaptionText(
  title: string | null | undefined,
  content: string
): string {
  return [title?.trim(), content.trim()].filter(Boolean).join("\n");
}

export function CollapsibleVideoCaption({
  text,
  style,
  resetKey,
  onExpandedChange,
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setCanExpand(text.includes("\n") || text.length > 48);
  }, [resetKey, text]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (expanded) return;
      setCanExpand(e.nativeEvent.lines.length > 1);
    },
    [expanded]
  );

  const toggle = useCallback(() => {
    if (!text.trim()) return;
    if (!expanded && !canExpand) return;
    setExpanded((prev) => !prev);
  }, [canExpand, expanded, text]);

  if (!text.trim()) return null;

  const caption = (
    <TranslatableText
      text={text}
      style={style}
      numberOfLines={expanded ? undefined : 1}
      lightLinks
    />
  );

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={expanded ? t("m.ui.collapse_description") : t("m.ui.expand_description")}
      accessibilityState={{ expanded }}
      hitSlop={4}
    >
      {expanded ? (
        <ScrollView
          style={collapsibleCaptionStyles.expandedCaption}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {caption}
        </ScrollView>
      ) : (
        caption
      )}
    </Pressable>
  );
}

export const collapsibleCaptionStyles = StyleSheet.create({
  expandedBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 4,
  },
  expandedMeta: {
    zIndex: 6,
  },
  expandedCaption: {
    maxHeight: 280,
  },
});

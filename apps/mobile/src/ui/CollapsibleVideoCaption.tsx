import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { TranslatableText } from "@/ui/TranslatableText";
import { useI18n } from "@/i18n/I18nProvider";
import { splitReelOverlayCaption } from "@/lib/post-hashtags";

export { buildVideoCaptionText } from "@/lib/post-hashtags";

type Props = {
  text: string;
  /** Hashtags shown only after the viewer opens the description. */
  description?: string;
  style?: StyleProp<TextStyle>;
  /** Reset expand when post/video changes. */
  resetKey?: string;
  onExpandedChange?: (expanded: boolean) => void;
};

export function splitVideoCaption(title: string | null | undefined, content: string) {
  return splitReelOverlayCaption(title, content);
}

export function CollapsibleVideoCaption({
  text,
  description,
  style,
  resetKey,
  onExpandedChange,
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const overlay = String(text ?? "").trim();
  const extra = String(description ?? "").trim();
  const display = expanded ? [overlay, extra].filter(Boolean).join("\n") : overlay;

  useEffect(() => {
    setExpanded(false);
    setCanExpand(extra.length > 0 || overlay.includes("\n") || overlay.length > 48);
  }, [resetKey, overlay, extra]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  const toggle = useCallback(() => {
    if (!overlay && !extra) return;
    if (!expanded && !canExpand) return;
    setExpanded((prev) => !prev);
  }, [canExpand, expanded, extra, overlay]);

  if (!overlay && !extra) return null;

  const caption = display ? (
    <TranslatableText
      text={display}
      style={style}
      numberOfLines={expanded ? undefined : 1}
      lightLinks
    />
  ) : (
    <TranslatableText text="…" style={style} lightLinks />
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

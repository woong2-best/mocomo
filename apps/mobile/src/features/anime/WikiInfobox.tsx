import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WikiCoverImage } from "@/features/anime/WikiCoverImage";
import { WikiInline } from "@/features/anime/WikiInline";
import {
  parseWikiInfobox,
  type WikiInfoboxSection,
} from "@/features/anime/wiki-infobox";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

type FallbackRow = { label: string; value: string };

type Props = {
  title: string;
  titleEn: string | null;
  photoUrl: string | null;
  infobox: string | null | undefined;
  fallbackRows: FallbackRow[];
};

function InfoboxTable({
  section,
  defaultOpen,
  styles,
  colors,
}: {
  section: WikiInfoboxSection;
  defaultOpen: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.sectionHead}
        accessibilityRole="button"
      >
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>
      {open
        ? section.rows.map((row) => (
            <View key={`${section.title}-${row.label}`} style={styles.row}>
              <View style={styles.labelCell}>
                <Text style={styles.labelText}>{row.label}</Text>
              </View>
              <View style={styles.valueCell}>
                {row.value.split("\n").map((line, li) => (
                  <WikiInline
                    key={`${row.label}-${li}`}
                    text={line}
                    keyPrefix={`ib-${section.title}-${row.label}-${li}`}
                    style={styles.valueText}
                  />
                ))}
              </View>
            </View>
          ))
        : null}
    </View>
  );
}

/**
 * Namu-style infobox: header + photo scaled to the phone content width
 * (full image, no crop) + data table.
 */
export function WikiInfobox({ title, titleEn, photoUrl, infobox, fallbackRows }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const parsed = useMemo(() => parseWikiInfobox(infobox), [infobox]);
  const [aspect, setAspect] = useState(3 / 4);
  const sections =
    parsed.length > 0
      ? parsed
      : fallbackRows.length > 0
        ? [{ title: "작품 정보", rows: fallbackRows }]
        : [];

  return (
    <View style={styles.card}>
      <View style={[styles.photoWrap, { aspectRatio: aspect }]}>
        {photoUrl ? (
          <WikiCoverImage
            url={photoUrl}
            style={styles.photo}
            contentFit="contain"
            variant="hero"
            onLoadSize={(w, h) => {
              if (w > 0 && h > 0) setAspect(w / h);
            }}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.photoEmoji}>📺</Text>
          </View>
        )}
        <View style={styles.photoHead} pointerEvents="none">
          <Text style={styles.headTitle} numberOfLines={2}>
            {title}
          </Text>
          {titleEn ? (
            <Text style={styles.headEn} numberOfLines={1}>
              {titleEn}
            </Text>
          ) : null}
        </View>
      </View>

      {sections.map((section, i) => (
        <InfoboxTable
          key={section.title}
          section={section}
          defaultOpen={i === 0}
          styles={styles}
          colors={colors}
        />
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const line = isDark ? "rgba(255,255,255,0.12)" : "rgba(20,40,72,0.12)";
  const labelBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(20,40,72,0.05)";
  return StyleSheet.create({
    card: {
      borderRadius: radii.md,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: line,
      backgroundColor: colors.surfaceRaised,
    },
    photoWrap: {
      width: "100%",
      backgroundColor: "#0b0d10",
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    photoFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
    },
    photoEmoji: { fontSize: 44 },
    photoHead: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: "rgba(8, 28, 42, 0.82)",
    },
    headTitle: {
      color: "#F4FBFF",
      fontSize: 16,
      fontWeight: "800",
    },
    headEn: {
      marginTop: 2,
      color: "rgba(244,251,255,0.78)",
      fontSize: 12,
      fontWeight: "600",
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(20,40,72,0.04)",
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 13,
    },
    row: {
      flexDirection: "row",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: line,
    },
    labelCell: {
      width: "34%",
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: labelBg,
      justifyContent: "center",
    },
    labelText: {
      color: colors.textMuted,
      fontWeight: "700",
      fontSize: 12,
      textAlign: "center",
    },
    valueCell: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 4,
    },
    valueText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
  });
}

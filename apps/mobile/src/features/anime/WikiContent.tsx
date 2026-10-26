import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ImageStyle } from "react-native";
import { Image } from "expo-image";
import { IMAGE_CACHE_POLICY, wikiMediaDecodeWidth } from "@/perf/image";
import { WebView } from "react-native-webview";
import { WikiInline, type FootnoteMap } from "@/features/anime/WikiInline";
import {
  extractWikiVideos,
  parseWikiVideoLine,
  wikiVideoLink,
  type WikiVideo,
} from "@/features/anime/wiki-youtube";
import { animeUi } from "@/features/anime/anime-ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

function WikiBodyImage({ uri, style }: { uri: string; style: StyleProp<ImageStyle> }) {
  const { width: winW } = useWindowDimensions();
  const decode = wikiMediaDecodeWidth(Math.max(1, winW - spacing.md * 2));
  const [ratio, setRatio] = useState<number | null>(null);
  return (
    <Image
      source={{ uri, width: decode, cacheKey: `wiki-body:${decode}:${uri}` }}
      style={[style, ratio ? { aspectRatio: ratio } : null]}
      contentFit="contain"
      cachePolicy={IMAGE_CACHE_POLICY}
      allowDownscaling={false}
      responsivePolicy="live"
      onLoad={(event) => {
        const width = event.source?.width;
        const height = event.source?.height;
        if (!width || !height) return;
        if (width === decode && height === decode) return;
        setRatio(width / height);
      }}
    />
  );
}

function parseFootnotes(source: string): { body: string; notes: FootnoteMap } {
  const notes: FootnoteMap = new Map();
  const lines = source.split("\n");
  const bodyLines: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\[\^(\d+)\]:\s*(.+)$/);
    if (m) {
      notes.set(m[1], m[2]);
      continue;
    }
    bodyLines.push(line);
  }
  return { body: bodyLines.join("\n"), notes };
}

function parseTableBlock(lines: string[]): string[][] | null {
  if (lines.length < 1 || !lines[0].includes("|")) return null;
  const rows = lines
    .filter((l) => l.includes("|"))
    .map((l) =>
      l
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    );
  if (rows.length < 1) return null;
  if (rows[1]?.every((c) => /^[-:]+$/.test(c))) rows.splice(1, 1);
  return rows;
}

function WikiVideoCard({ video, source }: { video: WikiVideo; source?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [playing, setPlaying] = useState(false);
  const label = video.kind === "file" ? "Video" : video.kind === "youtube" ? "YouTube" : "Vimeo";
  const link = source ? wikiVideoLink(source, video.url) : null;

  const card =
    video.kind === "file" ? (
      <View style={styles.video}>
        <WebView source={{ uri: video.url }} style={styles.videoInner} allowsFullscreenVideo />
      </View>
    ) : playing ? (
      <View style={styles.video}>
        <WebView
          source={{ uri: `${video.embedSrc}${video.embedSrc.includes("?") ? "&" : "?"}autoplay=1` }}
          style={styles.videoInner}
          allowsFullscreenVideo
        />
      </View>
    ) : (
      <Pressable
        onPress={() => setPlaying(true)}
        onLongPress={() => void Linking.openURL(video.url)}
        style={styles.video}
      >
        {video.kind === "youtube" ? (
          <Image source={{ uri: video.thumbnail }} style={styles.videoThumb} contentFit="cover" />
        ) : (
          <View style={styles.videoThumb} />
        )}
        <View style={styles.videoScrim} />
        <View style={styles.videoPlay}>
          <Text style={styles.videoPlayIcon}>▶</Text>
        </View>
        <Text style={styles.videoBadge}>{label}</Text>
      </Pressable>
    );

  if (!link) return card;
  return (
    <View>
      <Text style={styles.hyperlink} onPress={() => void Linking.openURL(link.href)}>
        {link.label}
      </Text>
      {card}
    </View>
  );
}

function CollapseBlock({ title, body }: { title: string; body: string }) {
  const { t } = useI18n();
  const copy = useMemo(() => animeUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.collapse}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.collapseHead} hitSlop={6}>
        <Text style={styles.collapseTitle}>
          {open ? "▾" : "▸"} {title}
        </Text>
        <Text style={styles.collapseHint}>{open ? copy.collapseClose : copy.collapseOpen}</Text>
      </Pressable>
      {open ? (
        <View style={styles.collapseBody}>
          <WikiContent source={body} />
        </View>
      ) : null}
    </View>
  );
}

export function WikiContent({ source }: { source: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { body, notes } = parseFootnotes(source);
  const blocks = body.split(/\n{2,}/);
  const rendered: React.ReactNode[] = [];

  blocks.forEach((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const collapse = trimmed.match(/^\{\{collapse\|([^|]+)\|([\s\S]+)\}\}$/);
    if (collapse) {
      rendered.push(<CollapseBlock key={`c-${bi}`} title={collapse[1]} body={collapse[2]} />);
      return;
    }

    const wholeVideo = parseWikiVideoLine(trimmed);
    if (wholeVideo) {
      rendered.push(<WikiVideoCard key={`yt-${bi}`} video={wholeVideo} source={trimmed} />);
      return;
    }

    const imageOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageOnly) {
      rendered.push(<WikiBodyImage key={`img-${bi}`} uri={imageOnly[2]} style={styles.inlineImage} />);
      return;
    }

    const table = parseTableBlock(trimmed.split("\n"));
    if (table && table.length > 0) {
      rendered.push(
        <View key={`tbl-${bi}`} style={styles.table}>
          {table.map((row, ri) => (
            <View
              key={ri}
              style={[styles.tableRow, ri === 0 && styles.tableHeader, ri > 0 && styles.tableRowBorder]}
            >
              {row.map((cell, ci) => (
                <View key={ci} style={styles.tableCell}>
                  <WikiInline
                    text={cell}
                    notes={notes}
                    keyPrefix={`t-${bi}-${ri}-${ci}`}
                    style={ri === 0 ? styles.tableHeadText : undefined}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
      return;
    }

    const eq2 = trimmed.match(/^==\s*(.+?)\s*==$/) && !trimmed.startsWith("===")
      ? trimmed.match(/^==\s*(.+?)\s*==$/)
      : null;
    if (eq2) {
      rendered.push(
        <Text key={`h2-${bi}`} style={styles.h2}>
          <WikiInline text={eq2[1]} notes={notes} keyPrefix={`h2-${bi}`} />
        </Text>
      );
      return;
    }

    const eq3 = trimmed.match(/^(={3,})\s*(.+?)\s*\1$/);
    if (eq3) {
      rendered.push(
        <Text key={`h-${bi}`} style={styles.h1}>
          <WikiInline text={eq3[2]} notes={notes} keyPrefix={`h-${bi}`} />
        </Text>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      rendered.push(
        <Text key={`h2-${bi}`} style={styles.h2}>
          <WikiInline text={trimmed.slice(3)} notes={notes} keyPrefix={`h2-${bi}`} />
        </Text>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      rendered.push(
        <Text key={`h-${bi}`} style={styles.h1}>
          <WikiInline text={trimmed.slice(2)} notes={notes} keyPrefix={`h-${bi}`} />
        </Text>
      );
      return;
    }

    const lines = trimmed.split("\n");
    const para: string[] = [];
    const flushPara = (suffix: string) => {
      const text = para.join("\n").trim();
      para.length = 0;
      if (!text) return;
      rendered.push(
        <Text key={`p-${bi}-${suffix}`} style={styles.para}>
          {text.split("\n").map((line, li) => (
            <Text key={li}>
              {li > 0 ? "\n" : ""}
              <WikiInline text={line} notes={notes} keyPrefix={`p-${bi}-${suffix}-${li}`} />
            </Text>
          ))}
        </Text>
      );
      extractWikiVideos(text).forEach((video, vi) => {
        rendered.push(<WikiVideoCard key={`pvid-${bi}-${suffix}-${vi}`} video={video} />);
      });
    };

    const matchLineHeading = (line: string) => {
      const value = line.trim();
      const eq2 = /^==\s*(.+?)\s*==$/.exec(value);
      if (eq2 && !value.startsWith("===")) return { level: 2 as const, label: eq2[1] };
      const eq3 = /^(={3,})\s*(.+?)\s*\1$/.exec(value);
      if (eq3) return { level: 3 as const, label: eq3[2] };
      if (value.startsWith("## ")) return { level: 2 as const, label: value.slice(3) };
      if (value.startsWith("# ")) return { level: 3 as const, label: value.slice(2) };
      return null;
    };

    lines.forEach((line, li) => {
      const lineVideo = parseWikiVideoLine(line);
      if (lineVideo) {
        flushPara(`pre-${li}`);
        rendered.push(<WikiVideoCard key={`lnvid-${bi}-${li}`} video={lineVideo} source={line} />);
        return;
      }
      const heading = matchLineHeading(line);
      if (heading) {
        flushPara(`pre-h-${li}`);
        rendered.push(
          <Text key={`h-${bi}-${li}`} style={heading.level === 2 ? styles.h2 : styles.h1}>
            <WikiInline text={heading.label} notes={notes} keyPrefix={`h-${bi}-${li}`} />
          </Text>
        );
        return;
      }
      para.push(line);
    });
    flushPara("tail");
  });

  if (notes.size > 0) {
    rendered.push(
      <View key="footnotes" style={styles.footnotes}>
        {[...notes.entries()]
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([id, text]) => (
            <Text key={id} style={styles.fnItem}>
              [{id}] {text}
            </Text>
          ))}
      </View>
    );
  }

  return <View style={styles.root}>{rendered}</View>;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { gap: spacing.sm },
    para: { color: colors.text, fontSize: 15, lineHeight: 24 },
    h1: {
      marginTop: spacing.sm,
      marginBottom: 2,
      color: colors.cobalt,
      fontSize: 17,
      fontWeight: "800",
    },
    h2: {
      marginTop: spacing.sm,
      marginBottom: 2,
      color: colors.cobalt,
      fontSize: 16,
      fontWeight: "800",
    },
    table: {
      marginVertical: 4,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    tableRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
    },
    tableHeader: { backgroundColor: colors.muted },
    tableRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    tableCell: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
    tableHeadText: { fontWeight: "800", color: colors.text },
    collapse: {
      marginVertical: 4,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
      overflow: "hidden",
    },
    collapseHead: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
    collapseTitle: { color: colors.text, fontWeight: "800", fontSize: 14 },
    collapseHint: { color: colors.textMuted, fontWeight: "600", fontSize: 11 },
    collapseBody: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      paddingTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    footnotes: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 4,
    },
    fnItem: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
    video: {
      marginVertical: 6,
      width: "100%",
      aspectRatio: 16 / 9,
      minHeight: 180,
      borderRadius: radii.md,
      overflow: "hidden",
      backgroundColor: "#000",
    },
    videoInner: { flex: 1, backgroundColor: "#000" },
    hyperlink: {
      color: colors.success,
      fontSize: 15,
      lineHeight: 24,
      fontWeight: "700",
      textDecorationLine: "underline",
      marginBottom: 6,
    },
    videoThumb: { ...StyleSheet.absoluteFillObject, backgroundColor: "#111" },
    videoScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
    videoPlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    videoPlayIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: "hidden",
      textAlign: "center",
      textAlignVertical: "center",
      lineHeight: 56,
      fontSize: 22,
      color: "#fff",
      backgroundColor: "rgba(0,0,0,0.7)",
    },
    videoBadge: {
      position: "absolute",
      left: 8,
      bottom: 8,
      color: "#fff",
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      backgroundColor: "rgba(0,0,0,0.7)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    inlineImage: {
      width: "100%",
      aspectRatio: 16 / 10,
      borderRadius: radii.md,
      marginVertical: 6,
    },
  });
}

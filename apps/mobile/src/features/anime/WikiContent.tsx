import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WikiInline, type FootnoteMap } from "@/features/anime/WikiInline";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

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

function CollapseBlock({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.collapse}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.collapseHead} hitSlop={6}>
        <Text style={styles.collapseTitle}>
          {open ? "▾" : "▸"} {title}
        </Text>
        <Text style={styles.collapseHint}>{open ? "접기" : "스포일러 · 탭하여 펼치기"}</Text>
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

    rendered.push(
      <Text key={`p-${bi}`} style={styles.para}>
        {trimmed.split("\n").map((line, li) => (
          <Text key={li}>
            {li > 0 ? "\n" : ""}
            <WikiInline text={line} notes={notes} keyPrefix={`p-${bi}-${li}`} />
          </Text>
        ))}
      </Text>
    );
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
  });
}

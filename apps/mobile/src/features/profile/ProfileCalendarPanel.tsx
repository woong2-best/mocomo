import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchCalendarMemos, saveCalendarMemo } from "@/api/calendar";
import { useAuth } from "@/auth/AuthContext";
import {
  buildMonthGrid,
  dateKey,
  monthEn,
  sexagenaryYear,
  todayPartsInTimeZone,
  weekdayLabels,
  type CalendarCell,
} from "@/lib/kr-calendar";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  countryCode?: string | null;
  timeZone?: string | null;
};

export function ProfileCalendarPanel({ countryCode, timeZone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tz = timeZone?.trim() || "Asia/Seoul";
  const showKrHolidays = (countryCode ?? "KR").toUpperCase() === "KR";
  const today = useMemo(() => todayPartsInTimeZone(tz), [tz]);

  const [year, setYear] = useState(today.y);
  const [month, setMonth] = useState(today.m);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<CalendarCell | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const cells = useMemo(
    () => buildMonthGrid(year, month, { holidays: showKrHolidays }),
    [year, month, showKrHolidays]
  );
  const weekdays = useMemo(() => weekdayLabels(), []);

  const loadMemos = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetchCalendarMemos(year, month);
      setMemos(res.memos ?? {});
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void loadMemos();
  }, [loadMemos]);

  function openDay(cell: CalendarCell) {
    if (!cell.inMonth) {
      setYear(cell.y);
      setMonth(cell.m);
    }
    setSelected(cell);
    setMemoDraft(memos[dateKey(cell.y, cell.m, cell.d)] ?? "");
  }

  async function saveMemo() {
    if (!selected) return;
    setSaving(true);
    const key = dateKey(selected.y, selected.m, selected.d);
    try {
      await saveCalendarMemo(key, memoDraft);
      const trimmed = memoDraft.trim();
      setMemos((prev) => {
        const next = { ...prev };
        if (trimmed) next[key] = trimmed;
        else delete next[key];
        return next;
      });
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  function goToday() {
    setYear(today.y);
    setMonth(today.m);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (month === 1) {
              setYear((y) => y - 1);
              setMonth(12);
            } else setMonth((m) => m - 1);
          }}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.monthNum}>{month}</Text>
          <Text style={styles.monthMeta}>
            {year} {monthEn(month)} · {sexagenaryYear(year)}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            if (month === 12) {
              setYear((y) => y + 1);
              setMonth(1);
            } else setMonth((m) => m + 1);
          }}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.tzLabel} numberOfLines={1}>
          {tz}
        </Text>
        <Pressable onPress={goToday} hitSlop={6}>
          <Text style={styles.todayBtn}>오늘</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekdays.map((w, i) => (
          <Text
            key={w.en}
            style={[
              styles.weekLabel,
              i === 0 && styles.redText,
              i === 6 && styles.blueText,
            ]}
          >
            {w.han}
          </Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.terracotta} style={{ marginVertical: 8 }} />
      ) : (
        <View style={styles.grid}>
          {cells.map((cell, idx) => {
            const key = dateKey(cell.y, cell.m, cell.d);
            const isToday =
              cell.y === today.y && cell.m === today.m && cell.d === today.d && cell.inMonth;
            const hasMemo = Boolean(memos[key]);
            return (
              <Pressable
                key={`${key}-${idx}`}
                style={styles.cell}
                onPress={() => openDay(cell)}
              >
                <View
                  style={[
                    styles.dayBubble,
                    isToday && styles.dayToday,
                    !cell.inMonth && styles.dayMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !cell.inMonth && styles.dayTextMuted,
                      cell.isRed && cell.inMonth && styles.redText,
                      cell.isBlue && cell.inMonth && styles.blueText,
                      isToday && styles.dayTextToday,
                    ]}
                  >
                    {cell.d}
                  </Text>
                  {hasMemo && cell.inMonth ? <View style={styles.memoDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {loadError ? <Text style={styles.errorText}>메모를 불러오지 못했습니다.</Text> : null}
      <Text style={styles.hint}>날짜를 탭해 메모 · 일정을 기록하세요</Text>

      <KeyboardSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        maxHeight="55%"
        sheetStyle={{ backgroundColor: colors.surfaceRaised }}
      >
        {selected ? (
          <>
            <Text style={styles.sheetTitle}>
              {selected.y}년 {selected.m}월 {selected.d}일
            </Text>
            {selected.holiday ? (
              <Text style={styles.sheetHoliday}>{selected.holiday}</Text>
            ) : null}
            <TextInput
              style={styles.memoInput}
              value={memoDraft}
              onChangeText={setMemoDraft}
              placeholder="이 날짜의 메모…"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
            />
            <View style={styles.sheetActions}>
              <FolkButton label="취소" variant="ghost" onPress={() => setSelected(null)} />
              <FolkButton
                label={saving ? "저장 중…" : "저장"}
                loading={saving}
                onPress={() => void saveMemo()}
              />
            </View>
          </>
        ) : null}
      </KeyboardSheet>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      padding: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceRaised,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerCenter: { alignItems: "center", flex: 1 },
    monthNum: {
      fontSize: 34,
      fontWeight: "900",
      color: "#c41e3a",
      lineHeight: 36,
    },
    monthMeta: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      marginTop: 2,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      marginBottom: 8,
    },
    tzLabel: { fontSize: 10, color: colors.textMuted, flex: 1, marginRight: 8 },
    todayBtn: { color: colors.cobalt, fontWeight: "800", fontSize: 12 },
    weekRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 10,
      fontWeight: "800",
      color: colors.textMuted,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 1,
    },
    dayBubble: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    dayToday: {
      backgroundColor: colors.terracotta,
    },
    dayMuted: { opacity: 0.35 },
    dayText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    dayTextMuted: { color: colors.textMuted },
    dayTextToday: { color: "#fff" },
    redText: { color: "#dc2626" },
    blueText: { color: "#2563eb" },
    memoDot: {
      position: "absolute",
      bottom: 2,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cobalt,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 4,
    },
    hint: {
      textAlign: "center",
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
      marginTop: 8,
    },
    sheetTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    sheetHoliday: { color: colors.terracotta, fontWeight: "700", marginTop: 4 },
    memoInput: {
      marginTop: spacing.sm,
      minHeight: 96,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: 12,
      color: colors.text,
      backgroundColor: colors.background,
      textAlignVertical: "top",
    },
    sheetActions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
  });
}

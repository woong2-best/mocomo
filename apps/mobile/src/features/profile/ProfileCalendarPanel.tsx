import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchCalendarMemos, saveCalendarMemo } from "@/api/calendar";
import { detectDeviceTimeZone } from "@/lib/device-timezone";
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

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

type MemoTarget =
  | { kind: "day"; cell: CalendarCell }
  | { kind: "weekday"; weekday: number };

type Props = {
  countryCode?: string | null;
  timeZone?: string | null;
};

function formatScheduleMemo(input: {
  weekdays: number[];
  time: string | null;
  note: string | null;
}): string {
  const days =
    input.weekdays.length > 0
      ? input.weekdays.map((d) => `매주 ${WEEKDAY_KO[d]}`).join(" · ")
      : "매주";
  const time = input.time ? `${input.time}` : "";
  const head = [days, time].filter(Boolean).join(" ");
  const note = input.note?.trim();
  if (note && head) return `📺 방송 ${head}\n${note}`;
  if (note) return `📺 방송\n${note}`;
  if (head) return `📺 방송 ${head}`;
  return "📺 방송 일정";
}

function chunkWeeks(cells: CalendarCell[]): CalendarCell[][] {
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function safeTimeZone(value?: string | null): string {
  const trimmed = value?.trim();
  if (trimmed) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: trimmed });
      return trimmed;
    } catch {
      /* fall through */
    }
  }
  return detectDeviceTimeZone();
}

export function ProfileCalendarPanel({ countryCode, timeZone }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const tz = safeTimeZone(timeZone);
  const showKrHolidays = (countryCode ?? "KR").toUpperCase() === "KR";
  const today = useMemo(() => todayPartsInTimeZone(tz), [tz]);

  const [year, setYear] = useState(today.y);
  const [month, setMonth] = useState(today.m);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [scheduleWeekdays, setScheduleWeekdays] = useState<Set<number>>(new Set());
  const [scheduleTime, setScheduleTime] = useState<string | null>(null);
  const [scheduleNote, setScheduleNote] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [target, setTarget] = useState<MemoTarget | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.y);

  const cells = useMemo(
    () => buildMonthGrid(year, month, { holidays: showKrHolidays }),
    [year, month, showKrHolidays]
  );
  const weeks = useMemo(() => chunkWeeks(cells), [cells]);
  const weekdays = useMemo(() => weekdayLabels(), []);

  const loadMemos = useCallback(async () => {
    setLoadError(false);
    setMemos({});
    setScheduleWeekdays(new Set());
    setScheduleTime(null);
    setScheduleNote(null);
    try {
      const res = await fetchCalendarMemos(year, month);
      setMemos(res.memos ?? {});
      setScheduleWeekdays(new Set(res.scheduleWeekdays ?? []));
      setScheduleTime(res.scheduleTime ?? null);
      setScheduleNote(res.scheduleNote ?? null);
    } catch {
      setLoadError(true);
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
    setTarget({ kind: "day", cell });
    setMemoDraft(memos[dateKey(cell.y, cell.m, cell.d)] ?? "");
  }

  function openWeekday(weekday: number) {
    setTarget({ kind: "weekday", weekday });
    setMemoDraft(
      formatScheduleMemo({
        weekdays: [...scheduleWeekdays].sort((a, b) => a - b),
        time: scheduleTime,
        note: scheduleNote,
      })
    );
  }

  async function saveMemo() {
    if (!target || target.kind !== "day") return;
    setSaving(true);
    const key = dateKey(target.cell.y, target.cell.m, target.cell.d);
    try {
      await saveCalendarMemo(key, memoDraft);
      const trimmed = memoDraft.trim();
      setMemos((prev) => {
        const next = { ...prev };
        if (trimmed) next[key] = trimmed;
        else delete next[key];
        return next;
      });
      setTarget(null);
    } finally {
      setSaving(false);
    }
  }

  function goToday() {
    setYear(today.y);
    setMonth(today.m);
  }

  function applyMonth(m: number) {
    setYear(pickerYear);
    setMonth(m);
    setMonthPickerOpen(false);
  }

  const editingDay = target?.kind === "day";
  const memoTitle =
    target?.kind === "day"
      ? `${target.cell.y}.${String(target.cell.m).padStart(2, "0")}.${String(target.cell.d).padStart(2, "0")}`
      : target?.kind === "weekday"
        ? `매주 ${WEEKDAY_KO[target.weekday]}`
        : "";
  const memoSubtitle =
    target?.kind === "day"
      ? (target.cell.holiday ?? null)
      : target?.kind === "weekday"
        ? "방송 일정 · 라이브 스튜디오에서 수정"
        : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            setPickerYear(year);
            setMonthPickerOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="월 선택"
          hitSlop={8}
        >
          <Text style={styles.monthNum}>{month}</Text>
        </Pressable>
        <Text style={styles.monthMeta}>
          {year} {monthEn(month)}{" "}
          <Text style={styles.sexagenary}>{sexagenaryYear(year)}</Text>
        </Text>
        <Text style={styles.tzLabel} numberOfLines={1}>
          {tz}
        </Text>
        <View style={styles.navRow}>
          <Pressable
            onPress={() => {
              if (month === 1) {
                setYear((y) => y - 1);
                setMonth(12);
              } else setMonth((m) => m - 1);
            }}
            hitSlop={8}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="이전 달"
          >
            <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={goToday} hitSlop={6} style={styles.todayHit}>
            <Text style={styles.todayBtn}>오늘</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (month === 12) {
                setYear((y) => y + 1);
                setMonth(1);
              } else setMonth((m) => m + 1);
            }}
            hitSlop={8}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="다음 달"
          >
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {weekdays.map((w, i) => {
          const isScheduleHeader = scheduleWeekdays.has(i);
          return (
            <Pressable
              key={w.en}
              onPress={() => openWeekday(i)}
              style={[
                styles.weekCell,
                i < 6 && styles.weekCellBorder,
                isScheduleHeader && styles.weekSchedule,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${w.han} ${w.en} 메모`}
            >
              <Text
                style={[
                  styles.weekHan,
                  i === 0 && styles.redText,
                  i === 6 && !isScheduleHeader && styles.blueText,
                  i === 6 && isScheduleHeader && styles.weekSatOnSchedule,
                ]}
              >
                {w.han}
              </Text>
              <Text
                style={[
                  styles.weekEn,
                  i === 0 && styles.redText,
                  i === 6 && !isScheduleHeader && styles.blueText,
                ]}
              >
                {w.en}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={`w-${year}-${month}-${wi}`} style={styles.weekGridRow}>
            {week.map((cell, di) => {
              const key = dateKey(cell.y, cell.m, cell.d);
              const isToday =
                cell.inMonth && cell.y === today.y && cell.m === today.m && cell.d === today.d;
              const isSelected =
                target?.kind === "day" &&
                dateKey(target.cell.y, target.cell.m, target.cell.d) === key &&
                target.cell.inMonth === cell.inMonth;
              return (
                <Pressable
                  key={`${key}-${cell.inMonth ? "cur" : "adj"}`}
                  style={[
                    styles.dayCell,
                    di < 6 && styles.dayCellBorder,
                    !cell.inMonth && styles.dayMutedBg,
                    isToday && styles.dayToday,
                    isSelected && styles.daySelected,
                  ]}
                  onPress={() => openDay(cell)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !cell.inMonth && styles.dayTextMuted,
                      cell.inMonth && cell.isRed && styles.redText,
                      cell.inMonth && cell.isBlue && styles.blueText,
                    ]}
                  >
                    {cell.d}
                  </Text>
                  {cell.inMonth && cell.holiday ? (
                    <Text
                      style={[styles.holiday, cell.isRed && styles.holidayRed]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {cell.holiday}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {loadError ? <Text style={styles.errorText}>메모를 불러오지 못했습니다.</Text> : null}

      <Modal
        visible={monthPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerOpen(false)}
      >
        <View style={styles.pickerRoot}>
          <Pressable
            style={styles.pickerScrim}
            onPress={() => setMonthPickerOpen(false)}
            accessibilityRole="button"
          />
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>월 선택</Text>
            <View style={styles.pickerYearRow}>
              <Pressable
                onPress={() => setPickerYear((y) => y - 1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="이전 해"
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <Text style={styles.pickerYear}>{pickerYear}</Text>
              <Pressable
                onPress={() => setPickerYear((y) => y + 1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="다음 해"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.pickerMonths}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const active = pickerYear === year && m === month;
                return (
                  <Pressable
                    key={m}
                    onPress={() => applyMonth(m)}
                    style={[styles.pickerMonth, active && styles.pickerMonthActive]}
                  >
                    <Text style={[styles.pickerMonthText, active && styles.pickerMonthTextActive]}>
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardSheet
        visible={!!target}
        onClose={() => setTarget(null)}
        maxHeight="55%"
        sheetStyle={{ backgroundColor: colors.surfaceRaised }}
      >
        {target ? (
          <>
            <Text style={styles.sheetTitle}>{memoTitle}</Text>
            {memoSubtitle ? <Text style={styles.sheetHoliday}>{memoSubtitle}</Text> : null}
            <TextInput
              style={[styles.memoInput, !editingDay && styles.memoInputReadonly]}
              value={memoDraft}
              onChangeText={setMemoDraft}
              placeholder={editingDay ? "이 날짜의 메모…" : undefined}
              placeholderTextColor={colors.textMuted}
              multiline
              editable={editingDay}
              autoFocus={editingDay}
            />
            <View style={styles.sheetActions}>
              <FolkButton
                label={editingDay ? "취소" : "닫기"}
                variant="ghost"
                onPress={() => setTarget(null)}
              />
              {editingDay ? (
                <FolkButton
                  label={saving ? "저장 중…" : "저장"}
                  loading={saving}
                  onPress={() => void saveMemo()}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </KeyboardSheet>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const red = isDark ? "#f87171" : "#c41e3a";
  const blue = isDark ? "#38bdf8" : "#1d4ed8";
  const scheduleBg = isDark ? "rgba(163, 230, 53, 0.25)" : "rgba(132, 204, 22, 0.35)";
  const todayBg = isDark ? "rgba(245, 240, 232, 0.08)" : "rgba(20, 40, 72, 0.08)";
  const selectedBg = isDark ? "rgba(207, 102, 64, 0.18)" : "rgba(197, 82, 42, 0.12)";
  const outMonthBg = isDark ? "rgba(245, 240, 232, 0.04)" : "rgba(20, 40, 72, 0.04)";
  const cellBorder = colors.hairline;

  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.background,
    },
    header: {
      alignItems: "center",
      paddingHorizontal: 6,
      paddingTop: 12,
      paddingBottom: 6,
    },
    monthNum: {
      fontSize: 44,
      fontWeight: "700",
      color: red,
      lineHeight: 48,
      letterSpacing: -1,
      fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: undefined }),
    },
    monthMeta: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: colors.text,
    },
    sexagenary: {
      fontWeight: "600",
      letterSpacing: 0,
      color: colors.textMuted,
    },
    tzLabel: {
      marginTop: 2,
      fontSize: 9,
      fontWeight: "500",
      color: colors.textMuted,
    },
    navRow: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    navBtn: {
      padding: 4,
      borderRadius: 6,
    },
    todayHit: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    todayBtn: {
      color: isDark ? colors.gold : colors.cobalt,
      fontWeight: "700",
      fontSize: 10,
    },
    weekRow: {
      flexDirection: "row",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: cellBorder,
    },
    weekCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 6,
    },
    weekCellBorder: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: cellBorder,
    },
    weekSchedule: {
      backgroundColor: scheduleBg,
    },
    weekHan: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      lineHeight: 16,
    },
    weekEn: {
      marginTop: 2,
      fontSize: 8,
      fontWeight: "700",
      letterSpacing: 0.4,
      color: colors.text,
      opacity: 0.7,
    },
    weekSatOnSchedule: {
      color: "#e0f2fe",
    },
    grid: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: cellBorder,
    },
    weekGridRow: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: cellBorder,
    },
    dayCell: {
      flex: 1,
      minHeight: 54,
      paddingHorizontal: 2,
      paddingTop: 3,
      paddingBottom: 2,
      alignItems: "center",
    },
    dayCellBorder: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: cellBorder,
    },
    dayMutedBg: {
      backgroundColor: outMonthBg,
    },
    dayToday: {
      backgroundColor: todayBg,
    },
    daySelected: {
      backgroundColor: selectedBg,
    },
    dayText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 16,
    },
    dayTextMuted: {
      color: colors.textMuted,
      opacity: 0.5,
    },
    redText: { color: red },
    blueText: { color: blue },
    holiday: {
      marginTop: 1,
      fontSize: 8,
      fontWeight: "500",
      lineHeight: 10,
      color: colors.textMuted,
      textAlign: "center",
      alignSelf: "stretch",
    },
    holidayRed: {
      color: isDark ? "rgba(248, 113, 113, 0.9)" : "rgba(196, 30, 58, 0.9)",
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      marginVertical: 6,
    },
    pickerRoot: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    pickerScrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    pickerCard: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    pickerYearRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    pickerYear: {
      fontSize: 18,
      fontWeight: "800",
      color: isDark ? colors.gold : colors.cobalt,
    },
    pickerMonths: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    pickerMonth: {
      width: "33.333%",
      padding: 4,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      alignItems: "center",
    },
    pickerMonthActive: {
      borderColor: "rgba(239, 68, 68, 0.5)",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
    },
    pickerMonthText: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    pickerMonthTextActive: {
      color: red,
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
    memoInputReadonly: {
      opacity: 0.85,
    },
    sheetActions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
  });
}

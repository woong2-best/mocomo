import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { patchMe } from "@/api/discovery";
import { useAuth } from "@/auth/AuthContext";
import {
  KOREA_SIDO,
  KOREA_SIGUNGU_BY_SIDO,
  formatUsedRegion,
  USED_SHIPPING_REGION,
} from "@/features/marketplace/used-catalog";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export function UsedServiceRegionCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, refreshMe } = useAuth();
  const countryCode = (user?.countryCode ?? "KR").toUpperCase();
  const isKr = countryCode === "KR";

  const [sidoId, setSidoId] = useState<string>(KOREA_SIDO[0]?.id ?? "seoul");
  const [sigungu, setSigungu] = useState<string>("종로구");
  const [globalRegion, setGlobalRegion] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const initial = user?.usedServiceRegion?.trim();
    if (!initial) return;
    if (isKr) {
      if (initial === USED_SHIPPING_REGION) {
        setSidoId("__shipping__");
        return;
      }
      const sido = KOREA_SIDO.find((s) => initial.startsWith(`${s.short} `));
      if (sido) {
        setSidoId(sido.id);
        setSigungu(initial.slice(`${sido.short} `.length));
      }
    } else {
      setGlobalRegion(initial);
    }
  }, [user?.usedServiceRegion, isKr]);

  const regionValue = isKr
    ? sidoId === "__shipping__"
      ? USED_SHIPPING_REGION
      : formatUsedRegion(KOREA_SIDO.find((s) => s.id === sidoId)?.short ?? "", sigungu)
    : globalRegion.trim();

  async function save() {
    if (!regionValue) {
      Alert.alert("입력 필요", "서비스 지역을 선택해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await patchMe({ usedServiceRegion: regionValue });
      await refreshMe();
      Alert.alert("저장됨", "중고거래 서비스 지역이 업데이트되었습니다.");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FolkCard style={styles.card}>
      <Text style={styles.title}>중고거래 서비스 지역</Text>
      <Text style={styles.desc}>
        같은 국가·동네 이웃과만 중고거래가 가능합니다. 이 설정에 맞는 물품만 표시됩니다.
      </Text>
      {isKr ? (
        <View style={styles.row}>
          <View style={styles.pickerCol}>
            {KOREA_SIDO.map((sido) => (
              <Pressable
                key={sido.id}
                style={[styles.chip, sidoId === sido.id && styles.chipActive]}
                onPress={() => {
                  setSidoId(sido.id);
                  const first = KOREA_SIGUNGU_BY_SIDO[sido.id]?.[0];
                  if (first) setSigungu(first);
                }}
              >
                <Text style={[styles.chipText, sidoId === sido.id && styles.chipTextActive]}>
                  {sido.short}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.chip, sidoId === "__shipping__" && styles.chipActive]}
              onPress={() => setSidoId("__shipping__")}
            >
              <Text style={[styles.chipText, sidoId === "__shipping__" && styles.chipTextActive]}>
                전국 택배
              </Text>
            </Pressable>
          </View>
          {sidoId !== "__shipping__" ? (
            <View style={styles.row}>
              {(KOREA_SIGUNGU_BY_SIDO[sidoId] ?? []).slice(0, 8).map((unit) => (
                <Pressable
                  key={unit}
                  style={[styles.chip, sigungu === unit && styles.chipActive]}
                  onPress={() => setSigungu(unit)}
                >
                  <Text style={[styles.chipText, sigungu === unit && styles.chipTextActive]}>
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <TextInput
          value={globalRegion}
          onChangeText={setGlobalRegion}
          placeholder="예: New Jersey, Tokyo Shibuku"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
        />
      )}
      <FolkButton label={busy ? "저장 중…" : "서비스 지역 저장"} onPress={save} disabled={busy} />
    </FolkCard>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { gap: spacing.md },
    title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
    desc: { fontSize: 13, lineHeight: 18, color: colors.mutedForeground },
    row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    pickerCol: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      backgroundColor: colors.card,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, color: colors.foreground },
    chipTextActive: { color: colors.primaryForeground },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.foreground,
      backgroundColor: colors.background,
    },
  });
}

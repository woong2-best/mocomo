import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { createCommunity } from "@/api/community";
import {
  COMMUNITY_CATEGORY_OPTIONS,
  type CommunityCategoryId,
} from "@/features/community/community-labels";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function CommunityCreateScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<CommunityCategoryId | "CUSTOM" | "">("");
  const [customCategoryLabel, setCustomCategoryLabel] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isNsfw, setIsNsfw] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      createCommunity({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        customCategoryLabel: category === "CUSTOM" ? customCategoryLabel.trim() : undefined,
        isNsfw,
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["mobile-community"] });
      navigation.replace("CommunityDetail", { slug: res.community.slug });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError &&
        err.body &&
        typeof err.body === "object" &&
        "error" in err.body &&
        typeof (err.body as { error: unknown }).error === "string"
          ? (err.body as { error: string }).error
          : "커뮤니티 생성에 실패했습니다.";
      Alert.alert("생성 실패", msg);
    },
  });

  const submit = () => {
    if (!category) {
      Alert.alert("카테고리", "커뮤니티가 속할 카테고리를 선택해 주세요.");
      return;
    }
    if (category === "CUSTOM" && customCategoryLabel.trim().length < 2) {
      Alert.alert("카테고리", "직접 입력한 카테고리 이름을 2자 이상 입력해 주세요.");
      return;
    }
    if (name.trim().length < 2) {
      Alert.alert("이름", "커뮤니티 이름은 2자 이상 입력해 주세요.");
      return;
    }
    create.mutate();
  };

  return (
    <Screen>
      <AppHeader title="새 커뮤니티" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 40, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>새 커뮤니티</Text>
          <Text style={styles.cardSub}>카테고리를 고른 뒤 이름을 정하면 커뮤니티 방이 만들어집니다.</Text>
        </View>

        <View>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              카테고리 <Text style={{ color: "#c80000" }}>*</Text>
            </Text>
            <Text style={styles.hint}>필수 · 하나 선택</Text>
          </View>
          <View style={styles.catGrid}>
            {COMMUNITY_CATEGORY_OPTIONS.filter((o) => o.id !== "ALL").map((opt) => {
              const selected = category === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  disabled={create.isPending}
                  onPress={() => {
                    setCategory(opt.id);
                    setCustomCategoryLabel("");
                  }}
                  style={[styles.catBtn, selected && styles.catBtnActive]}
                >
                  <Text style={styles.catEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.catLabel, selected && styles.catLabelActive]}>
                    {opt.shortLabel}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              disabled={create.isPending}
              onPress={() => setCategory("CUSTOM")}
              style={[styles.catBtn, styles.catBtnCustom, category === "CUSTOM" && styles.catBtnActive]}
            >
              <Text style={[styles.catLabel, category === "CUSTOM" && styles.catLabelActive]}>+</Text>
              <Text style={[styles.catLabel, category === "CUSTOM" && styles.catLabelActive]}>
                직접 입력
              </Text>
            </Pressable>
          </View>
          {category === "CUSTOM" && (
            <TextInput
              value={customCategoryLabel}
              onChangeText={setCustomCategoryLabel}
              placeholder="원하는 카테고리 이름 (2~24자)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { marginTop: 8 }]}
              maxLength={24}
              editable={!create.isPending}
            />
          )}
        </View>

        <View>
          <Text style={styles.label}>이름 *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="커뮤니티 이름"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={80}
            editable={!create.isPending}
          />
        </View>

        <View>
          <Text style={styles.label}>소개</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="어떤 커뮤니티인지 짧게 소개해 주세요"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.textarea]}
            multiline
            maxLength={500}
            editable={!create.isPending}
          />
        </View>

        <View style={styles.nsfwRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>NSFW</Text>
            <Text style={styles.hint}>성인 콘텐츠가 포함되면 켜 주세요</Text>
          </View>
          <Switch
            value={isNsfw}
            onValueChange={setIsNsfw}
            disabled={create.isPending}
            trackColor={{ true: "#c80000" }}
          />
        </View>

        <Pressable
          style={[styles.submit, create.isPending && { opacity: 0.6 }]}
          disabled={create.isPending}
          onPress={submit}
        >
          {create.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>커뮤니티 만들기</Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "#d5d5d5",
      backgroundColor: isDark ? colors.muted : "#f7f7f7",
      padding: 14,
    },
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    cardSub: { marginTop: 4, fontSize: 13, color: colors.textMuted },
    labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    label: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 8 },
    hint: { fontSize: 11, color: colors.textMuted },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    catBtn: {
      width: "31.5%",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 10,
      backgroundColor: colors.surfaceRaised,
    },
    catBtnCustom: {
      borderStyle: "dashed",
      justifyContent: "center",
    },
    catBtnActive: {
      borderColor: "#c80000",
      backgroundColor: "rgba(200,0,0,0.06)",
    },
    catEmoji: { fontSize: 14 },
    catLabel: { fontSize: 13, fontWeight: "600", color: colors.text, flexShrink: 1 },
    catLabelActive: { fontWeight: "800" },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
    },
    textarea: { minHeight: 96, textAlignVertical: "top" },
    nsfwRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    submit: {
      marginTop: 8,
      backgroundColor: "#c80000",
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: "center",
    },
    submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  });
}

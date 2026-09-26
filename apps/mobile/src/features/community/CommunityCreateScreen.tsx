import { useCallback, useMemo, useRef, useState } from "react";
import { showIslandError } from "@/ui/IslandToast";

import {
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNavigation } from "@react-navigation/native";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { Image } from "expo-image";

import * as ImagePicker from "expo-image-picker";

import { ApiError } from "@/api/client";

import { API_BASE_URL } from "@/config/env";

import {

  COMMUNITY_QNA_TERMS_LINK_LABEL,

  COMMUNITY_QNA_TERMS_NOTICE,

  COMMUNITY_QNA_TERMS_PATH,

} from "@/lib/community-qna-terms";

import { createCommunity } from "@/api/community";

import { publishQnaOpeningPost } from "@/features/community/publish-qna-post";

import { uploadLocalFile } from "@/api/upload-file";

import {

  COMMUNITY_CATEGORY_OPTIONS,

  QNA_NSFW_CATEGORY_ID,

  qnaCreateSelectionToApi,

  type QnaCreateCategorySelection,

} from "@/features/community/community-labels";

import { ensureQnaNsfwAccess } from "@/features/community/ensure-qna-nsfw-access";

import { useScrollFieldAboveKeyboard } from "@/lib/use-scroll-field-above-keyboard";

import { AppHeader } from "@/ui/AppHeader";

import { Screen } from "@/ui/Screen";

import { useTheme } from "@/theme/ThemeContext";

import { radii, spacing, type ThemeColors } from "@/theme/tokens";

import type { RootStackParamList } from "@/navigation/types";



const CREATE_CATEGORY_OPTIONS = COMMUNITY_CATEGORY_OPTIONS.filter(

  (o) => o.id !== "ALL" && o.id !== "INFO"

);

const WEB = API_BASE_URL.replace(/\/$/, "");



type DetailBlock =

  | { id: string; kind: "text"; text: string }

  | { id: string; kind: "image"; uri: string };



function newBlockId() {

  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

}



async function serializeDetailContent(

  blocks: DetailBlock[],

  trailingDraft: string

): Promise<string | undefined> {

  const sequence: DetailBlock[] = [...blocks];

  if (trailingDraft.trim()) {

    sequence.push({ id: "trail", kind: "text", text: trailingDraft });

  }

  if (sequence.length === 0) return undefined;



  const parts: string[] = [];

  for (const block of sequence) {

    if (block.kind === "text") {

      const t = block.text.trim();

      if (t) parts.push(t);

      continue;

    }

    const filename = `qna-detail-${Date.now()}.jpg`;

    const url = await uploadLocalFile({

      uri: block.uri,

      filename,

      contentType: "image/jpeg",

      category: "image",

    });

    parts.push(url);

  }

  const joined = parts.join("\n\n").trim();

  return joined || undefined;

}



export function CommunityCreateScreen() {

  const { colors, isDark } = useTheme();

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const queryClient = useQueryClient();



  const [category, setCategory] = useState<QnaCreateCategorySelection | "">("");

  const [name, setName] = useState("");

  const [detailBlocks, setDetailBlocks] = useState<DetailBlock[]>([]);

  const [detailDraft, setDetailDraft] = useState("");

  const nameRef = useRef<TextInput>(null);

  const detailRef = useRef<TextInput>(null);

  const { scrollRef, frameRef, keyboardLift, onScrollOffset, onInputFocus } =

    useScrollFieldAboveKeyboard();

  const pickCategory = useCallback((next: QnaCreateCategorySelection) => {
    void (async () => {
      const ok = await ensureQnaNsfwAccess(next);
      if (!ok) return;
      setCategory(next);
    })();
  }, []);



  const create = useMutation({

    mutationFn: async () => {

      const description = await serializeDetailContent(detailBlocks, detailDraft);

      if (!category) {
        throw new Error("category");
      }

      const payload = qnaCreateSelectionToApi(category);

      const community = await createCommunity({

        name: name.trim(),

        description,

        category: payload.category,

        customCategoryLabel: payload.customCategoryLabel,

        isNsfw: payload.isNsfw,

      });

      await publishQnaOpeningPost({

        communityId: community.community.id,

        name: name.trim(),

        description,

        isNsfw: payload.isNsfw,

      });

      return community;

    },

    onSuccess: async () => {

      await queryClient.invalidateQueries({ queryKey: ["mobile-community"] });

      await queryClient.invalidateQueries({ queryKey: ["mobile-qna-feed"] });

      await queryClient.refetchQueries({ queryKey: ["mobile-qna-feed"] });

      navigation.replace("CommunityList");

    },

    onError: (err) => {

      const msg =

        err instanceof ApiError &&

        err.body &&

        typeof err.body === "object" &&

        "error" in err.body &&

        typeof (err.body as { error: unknown }).error === "string"

          ? (err.body as { error: string }).error

          : "QnA 생성에 실패했습니다.";

      showIslandError("생성 실패", msg);

    },

  });



  const pickDetailImage = useCallback(async () => {

    if (create.isPending) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {

      showIslandError("권한 필요", "사진 접근 권한이 필요합니다.");

      return;

    }

    const result = await ImagePicker.launchImageLibraryAsync({

      mediaTypes: ["images"],

      quality: 0.85,

    });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;

    setDetailBlocks((prev) => {

      const next = [...prev];

      if (detailDraft.length > 0) {

        next.push({ id: newBlockId(), kind: "text", text: detailDraft });

      }

      next.push({ id: newBlockId(), kind: "image", uri });

      return next;

    });

    setDetailDraft("");

    detailRef.current?.focus();

  }, [create.isPending, detailDraft]);



  const removeDetailImage = useCallback(

    (blockId: string) => {

      if (create.isPending) return;

      setDetailBlocks((prev) => prev.filter((b) => b.id !== blockId));

    },

    [create.isPending]

  );



  const submit = () => {

    if (!category) {

      showIslandError("카테고리", "QnA가 속할 카테고리를 선택해 주세요.");

      return;

    }

    if (name.trim().length < 2) {

      showIslandError("Q", "질문은 2자 이상 입력해 주세요.");

      return;

    }

    create.mutate();

  };



  return (

    <Screen>

      <AppHeader title="새 QnA" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />

      <KeyboardAvoidingView

        style={styles.flex}

        behavior={Platform.OS === "ios" ? "padding" : undefined}

      >

        <View ref={frameRef} style={[styles.flex, { marginBottom: keyboardLift }]}>

          <ScrollView

            ref={scrollRef}

            style={styles.flex}

            contentContainerStyle={{

              padding: spacing.md,

              paddingBottom: insets.bottom + 48 + keyboardLift,

              gap: 18,

            }}

            keyboardShouldPersistTaps="handled"

            onScroll={(e) => onScrollOffset(e.nativeEvent.contentOffset.y)}

            scrollEventThrottle={16}

          >

            <View>

              <View style={styles.labelRow}>

                <Text style={styles.label}>

                  카테고리 <Text style={{ color: "#c80000" }}>*</Text>

                </Text>

                <Text style={styles.hint}>필수 · 하나 선택</Text>

              </View>

              <View style={styles.catGrid}>

                {CREATE_CATEGORY_OPTIONS.map((opt) => {

                  const selected = category === opt.id;

                  return (

                    <Pressable

                      key={opt.id}

                      disabled={create.isPending}

                      onPress={() => pickCategory(opt.id)}

                      style={[styles.catBtn, selected && styles.catBtnActive]}

                    >

                      <Text style={styles.catEmoji}>{opt.emoji}</Text>

                      <Text
                        style={[styles.catLabel, selected && styles.catLabelActive]}
                        numberOfLines={2}
                      >

                        {opt.shortLabel}

                      </Text>

                    </Pressable>

                  );

                })}

                <Pressable

                  disabled={create.isPending}

                  onPress={() => pickCategory(QNA_NSFW_CATEGORY_ID)}

                  style={[

                    styles.catBtn,

                    category === QNA_NSFW_CATEGORY_ID && styles.catBtnActive,

                  ]}

                >

                  <Text style={styles.catEmoji}>🔞</Text>

                  <Text

                    style={[

                      styles.catLabel,

                      category === QNA_NSFW_CATEGORY_ID && styles.catLabelActive,

                    ]}

                  >

                    NSFW

                  </Text>

                </Pressable>

              </View>

            </View>



            <View>

              <Text style={styles.label}>Q *</Text>

              <TextInput

                ref={nameRef}

                value={name}

                onChangeText={setName}

                onFocus={() => onInputFocus(nameRef.current)}

                placeholder="What should I ask?"

                placeholderTextColor={colors.textMuted}

                style={styles.input}

                maxLength={80}

                editable={!create.isPending}

              />

            </View>



            <View>

              <View style={styles.labelRow}>

                <Text style={styles.label}>detail</Text>

                <Pressable

                  onPress={() => void pickDetailImage()}

                  disabled={create.isPending}

                  hitSlop={8}

                  style={styles.attachBtn}

                  accessibilityRole="button"

                  accessibilityLabel="첨부파일 추가"

                >

                  <Ionicons name="image-outline" size={20} color={colors.cobalt} />

                  <Text style={styles.attachBtnText}>첨부</Text>

                </Pressable>

              </View>

              <View style={[styles.input, styles.detailComposer]}>

                {detailBlocks.map((block) =>

                  block.kind === "text" ? (

                    <Text key={block.id} style={styles.detailTextBlock}>

                      {block.text}

                    </Text>

                  ) : (

                    <View key={block.id} style={styles.detailImageWrap}>

                      <Image

                        source={{ uri: block.uri }}

                        style={styles.detailImageBlock}

                        contentFit="cover"

                      />

                      <Pressable

                        style={styles.detailImageRemove}

                        onPress={() => removeDetailImage(block.id)}

                        disabled={create.isPending}

                        hitSlop={8}

                        accessibilityRole="button"

                        accessibilityLabel="첨부 사진 삭제"

                      >

                        <Ionicons name="remove" size={20} color="#c80000" />

                      </Pressable>

                    </View>

                  )

                )}

                <TextInput

                  ref={detailRef}

                  value={detailDraft}

                  onChangeText={setDetailDraft}

                  onFocus={() => onInputFocus(detailRef.current)}

                  onContentSizeChange={() => {

                    if (detailRef.current?.isFocused()) onInputFocus(detailRef.current);

                  }}

                  placeholder="Type your question"

                  placeholderTextColor={colors.textMuted}

                  style={styles.detailInput}

                  multiline

                  maxLength={500}

                  editable={!create.isPending}

                />

              </View>

            </View>



            <Text style={styles.termsNotice}>{COMMUNITY_QNA_TERMS_NOTICE}</Text>

            <Pressable

              onPress={() => void Linking.openURL(`${WEB}${COMMUNITY_QNA_TERMS_PATH}`)}

              hitSlop={8}

            >

              <Text style={styles.termsLink}>{COMMUNITY_QNA_TERMS_LINK_LABEL}</Text>

            </Pressable>



            <Pressable

              style={[styles.submit, create.isPending && { opacity: 0.6 }]}

              disabled={create.isPending}

              onPress={submit}

            >

              {create.isPending ? (

                <ActivityIndicator color="#fff" />

              ) : (

                <Text style={styles.submitText}>QnA 만들기</Text>

              )}

            </Pressable>

          </ScrollView>

        </View>

      </KeyboardAvoidingView>

    </Screen>

  );

}



function createStyles(colors: ThemeColors, isDark: boolean) {

  return StyleSheet.create({

    flex: { flex: 1 },

    labelRow: {

      flexDirection: "row",

      justifyContent: "space-between",

      alignItems: "center",

      marginBottom: 8,

    },

    label: { fontSize: 14, fontWeight: "800", color: colors.text },

    hint: { fontSize: 11, color: colors.textMuted },

    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

    catBtn: {

      width: "31.5%",

      flexDirection: "column",

      alignItems: "flex-start",

      gap: 4,

      borderWidth: 1,

      borderColor: colors.border,

      borderRadius: 4,

      paddingHorizontal: 8,

      paddingVertical: 10,

      backgroundColor: colors.surfaceRaised,

    },

    catBtnActive: {

      borderColor: "#c80000",

      backgroundColor: "rgba(200,0,0,0.06)",

    },

    catEmoji: { fontSize: 14 },

    catLabel: { fontSize: 12, fontWeight: "600", color: colors.text, flexShrink: 0 },

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

    attachBtn: {

      flexDirection: "row",

      alignItems: "center",

      gap: 4,

      paddingVertical: 4,

      paddingHorizontal: 6,

    },

    attachBtnText: { fontSize: 13, fontWeight: "700", color: colors.cobalt },

    detailComposer: {

      minHeight: 180,

      paddingVertical: 12,

      gap: 10,

    },

    detailTextBlock: {

      fontSize: 15,

      lineHeight: 21,

      color: colors.text,

    },

    detailImageWrap: {

      width: "100%",

      position: "relative",

    },

    detailImageBlock: {

      width: "100%",

      height: 160,

      borderRadius: radii.sm,

      backgroundColor: isDark ? colors.muted : "#ececec",

    },

    detailImageRemove: {

      position: "absolute",

      top: 8,

      right: 8,

      width: 28,

      height: 28,

      borderRadius: 14,

      alignItems: "center",

      justifyContent: "center",

      backgroundColor: "#fff",

      shadowColor: "#000",

      shadowOffset: { width: 0, height: 1 },

      shadowOpacity: 0.2,

      shadowRadius: 2,

      elevation: 2,

    },

    detailInput: {

      minHeight: 120,

      fontSize: 15,

      lineHeight: 21,

      color: colors.text,

      textAlignVertical: "top",

      padding: 0,

    },

    termsNotice: {

      fontSize: 11,

      lineHeight: 16,

      color: colors.textMuted,

    },

    termsLink: {

      fontSize: 11,

      fontWeight: "700",

      color: colors.brand,

      textDecorationLine: "underline",

      marginBottom: 4,

    },

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


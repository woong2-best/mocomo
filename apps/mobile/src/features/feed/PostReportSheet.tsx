import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";
import { removeFollowingDmUser } from "@/api/following-dm-cache";
import { submitUsedListingReport } from "@/api/marketplace";
import { submitChatRoomReport } from "@/api/messages";
import { blockAndReportUser, submitPostReport } from "@/api/social";
import {
  formatReportPathLabel,
  getPostReportCopy,
  POST_REPORT_OTHER_DETAILS_MIN,
  type ReportPathStep,
  type ReportTaxonomyNode,
} from "@/lib/report-taxonomy";
import { useI18n } from "@/i18n/I18nProvider";
import { radii, spacing } from "@/theme/tokens";

type Phase = "browse" | "details" | "review" | "done";

function CategoryGrip({ color }: { color: string }) {
  const line = { width: 16, height: 2, borderRadius: 1, backgroundColor: color, opacity: 0.45 };
  return (
    <View style={{ gap: 3 }}>
      <View style={line} />
      <View style={line} />
      <View style={line} />
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  authorId: string;
  authorUsername?: string;
  /** report = report only; block-report = report + block user */
  mode?: "report" | "block-report";
  reportTarget?: "post" | "used_listing" | "chat_room";
  listingId?: string;
  roomId?: string;
  productId?: string;
  onSubmitted?: () => void;
};

export function PostReportSheet({
  visible,
  onClose,
  postId,
  authorId,
  authorUsername,
  mode = "report",
  reportTarget = "post",
  listingId,
  roomId,
  productId,
  onSubmitted,
}: Props) {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const reportCopy = useMemo(
    () => getPostReportCopy(locale, reportTarget === "chat_room" ? "chat" : "post"),
    [locale, reportTarget]
  );
  const sheetTitle =
    reportTarget === "chat_room"
      ? t("m.feed.report_chat")
      : t("report.title");
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("browse");
  const [stack, setStack] = useState<ReportTaxonomyNode[][]>([]);
  const [path, setPath] = useState<ReportPathStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState("");

  const currentNodes = stack.length > 0 ? stack[stack.length - 1]! : reportCopy.taxonomy;
  const currentQuestion =
    path.length > 0
      ? path[path.length - 1]!.node.childQuestion ?? reportCopy.rootQuestion
      : reportCopy.rootQuestion;

  const reset = useCallback(() => {
    setPhase("browse");
    setStack([]);
    setPath([]);
    setError("");
    setBusy(false);
    setDetails("");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const selectNode = useCallback(
    (node: ReportTaxonomyNode) => {
      const question =
        path.length === 0
          ? reportCopy.rootQuestion
          : path[path.length - 1]!.node.childQuestion ?? reportCopy.rootQuestion;
      const nextPath = [...path, { question, node }];
      setPath(nextPath);
      if (node.children && node.children.length > 0) {
        setStack((prev) => [...prev, node.children!]);
        return;
      }
      if (node.requiresDetails) {
        setPhase("details");
        return;
      }
      setPhase("review");
    },
    [path, reportCopy.rootQuestion]
  );

  const goBack = useCallback(() => {
    if (phase === "details") {
      setPhase("browse");
      setPath((prev) => prev.slice(0, -1));
      setDetails("");
      setError("");
      return;
    }
    if (phase === "review") {
      const leaf = path[path.length - 1]?.node;
      if (leaf?.requiresDetails) {
        setPhase("details");
        setError("");
        return;
      }
      setPhase("browse");
      setPath((prev) => {
        const nextPath = prev.slice(0, -1);
        const nextStack: ReportTaxonomyNode[][] = [];
        for (let i = 0; i < nextPath.length; i++) {
          const selected = nextPath[i]!.node;
          if (selected.children) nextStack.push(selected.children);
        }
        setStack(nextStack);
        return nextPath;
      });
      return;
    }
    if (stack.length === 0) {
      handleClose();
      return;
    }
    setStack((prev) => prev.slice(0, -1));
    setPath((prev) => prev.slice(0, -1));
  }, [handleClose, path, phase, stack.length]);

  const jumpToStep = useCallback(
    (index: number) => {
      setPhase("browse");
      setPath(path.slice(0, index));
      const nextStack: ReportTaxonomyNode[][] = [];
      for (let i = 0; i < index; i++) {
        const selected = path[i]!.node;
        if (selected.children) nextStack.push(selected.children);
      }
      setStack(nextStack);
    },
    [path]
  );

  const submit = useCallback(async () => {
    const leaf = path[path.length - 1];
    if (!leaf?.node.reasonId || busy) return;
    const trimmedDetails = details.trim();
    if (leaf.node.requiresDetails && trimmedDetails.length < POST_REPORT_OTHER_DETAILS_MIN) {
      setError(t("report.otherMinLength", { min: String(POST_REPORT_OTHER_DETAILS_MIN) }));
      setPhase("details");
      return;
    }
    setBusy(true);
    setError("");
    const reasonPath = formatReportPathLabel(path);
    try {
      if (mode === "block-report") {
        await blockAndReportUser({
          userId: authorId,
          username: authorUsername ?? "",
          postId,
          reason: leaf.node.reasonId,
          reasonPath,
          details: trimmedDetails || undefined,
        });
        void removeFollowingDmUser(queryClient, authorId);
      } else if (reportTarget === "chat_room" && roomId) {
        await submitChatRoomReport({
          roomId,
          reportedUserId: authorId,
          productId,
          reason: leaf.node.reasonId,
          reasonPath,
          details: trimmedDetails || undefined,
        });
      } else if (reportTarget === "used_listing" && listingId) {
        await submitUsedListingReport({
          listingId,
          reportedUserId: authorId,
          reason: leaf.node.reasonId,
          reasonPath,
          details: trimmedDetails || undefined,
        });
      } else {
        await submitPostReport({
          postId,
          reportedUserId: authorId,
          reason: leaf.node.reasonId,
          reasonPath,
          details: trimmedDetails || undefined,
        });
      }
      onSubmitted?.();
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("m.common.could_not_submit_report"));
    } finally {
      setBusy(false);
    }
  }, [
    authorId,
    authorUsername,
    busy,
    listingId,
    roomId,
    productId,
    mode,
    onSubmitted,
    path,
    postId,
    queryClient,
    reportTarget,
    details,
    t,
    t,
  ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            {phase !== "done" ? (
              <Pressable
                onPress={goBack}
                style={styles.backBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.backBtn} />
            )}
            <Text style={styles.title}>{phase === "done" ? t("common.done") : sheetTitle}</Text>
            <View style={styles.backBtn} />
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {phase === "browse" ? (
              <>
                <Text style={styles.question}>{currentQuestion}</Text>
                {path.length === 0 ? (
                  <Text style={styles.disclaimer}>{reportCopy.disclaimer}</Text>
                ) : null}
                {currentNodes.map((node) => (
                  <Pressable
                    key={node.id}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    onPress={() => selectNode(node)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.rowLabel}>{node.label}</Text>
                    {node.children?.length ? <CategoryGrip color={colors.cobalt} /> : null}
                  </Pressable>
                ))}
              </>
            ) : null}

            {phase === "details" ? (
              <>
                <Text style={styles.question}>{reportCopy.otherDetailsPrompt}</Text>
                <Text style={styles.disclaimer}>{t("report.detailsHelp")}</Text>
                <TextInput
                  style={styles.detailsInput}
                  value={details}
                  onChangeText={setDetails}
                  placeholder={t("report.detailsPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </>
            ) : null}

            {phase === "review" ? (
              <>
                <Text style={styles.reviewTitle}>{t("report.submitTitle")}</Text>
                <Text style={styles.hint}>{reportCopy.reviewHint}</Text>
                {mode === "block-report" ? (
                  <Text style={styles.disclaimer}>
                    {t("m.feed.this_user_will_be_blocked_after")}
                  </Text>
                ) : null}
                <Text style={styles.sectionTitle}>{t("report.detailsTitle")}</Text>
                {path.map((step, i) => (
                  <Pressable
                    key={`${step.node.id}-${i}`}
                    style={({ pressed }) => [styles.reviewStep, pressed && styles.reviewStepPressed]}
                    onPress={() => jumpToStep(i)}
                  >
                    <Text style={styles.reviewQ}>{step.question}</Text>
                    <Text style={styles.reviewA}>{step.node.label}</Text>
                  </Pressable>
                ))}
                {details.trim() ? (
                  <View style={styles.detailsPreview}>
                    <Text style={styles.reviewQ}>{t("report.extraDetails")}</Text>
                    <Text style={styles.reviewA}>{details.trim()}</Text>
                  </View>
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </>
            ) : null}

            {phase === "done" ? (
              <>
                <Text style={styles.reviewTitle}>{t("report.thankYou")}</Text>
                <Text style={styles.doneBody}>{t("report.thankYouBody")}</Text>
              </>
            ) : null}
          </ScrollView>

          {phase === "details" ? (
            <Pressable
              style={styles.submit}
              onPress={() => {
                if (details.trim().length < POST_REPORT_OTHER_DETAILS_MIN) {
                  setError(t("report.otherMinLength", { min: String(POST_REPORT_OTHER_DETAILS_MIN) }));
                  return;
                }
                setError("");
                setPhase("review");
              }}
            >
              <Text style={styles.submitText}>{t("common.next")}</Text>
            </Pressable>
          ) : null}

          {phase === "review" ? (
            <Pressable
              style={[styles.submit, busy && styles.submitDisabled]}
              onPress={() => void submit()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "block-report"
                    ? t("m.feed.block_and_submit")
                    : t("report.submit")}
                </Text>
              )}
            </Pressable>
          ) : null}

          {phase === "done" ? (
            <Pressable style={styles.submit} onPress={handleClose}>
              <Text style={styles.submitText}>{t("common.done")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(20, 40, 72, 0.45)" },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      maxHeight: "92%",
      paddingHorizontal: spacing.lg,
    },
    handle: {
      alignSelf: "center",
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textMuted,
      opacity: 0.35,
      marginTop: 10,
      marginBottom: 6,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { color: colors.text, fontSize: 16, fontWeight: "800" },
    body: { flexGrow: 0 },
    bodyContent: { paddingBottom: spacing.md },
    question: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
      marginBottom: 12,
      lineHeight: 28,
    },
    disclaimer: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 18,
      backgroundColor: colors.muted,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 8,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      backgroundColor: colors.surface,
    },
    rowPressed: {
      borderColor: colors.cobalt,
      backgroundColor: `${colors.cobalt}14`,
    },
    rowLabel: { color: colors.text, fontSize: 15, fontWeight: "700", flex: 1, paddingRight: 12 },
    reviewTitle: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 8 },
    hint: { color: colors.cobalt, fontSize: 13, lineHeight: 20, marginBottom: 20, fontWeight: "600" },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 12 },
    reviewStep: {
      marginBottom: 10,
      padding: 14,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      backgroundColor: colors.muted,
    },
    reviewStepPressed: {
      borderColor: colors.cobalt,
      backgroundColor: `${colors.cobalt}12`,
    },
    reviewQ: { color: colors.text, fontSize: 14, fontWeight: "700" },
    reviewA: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
    error: { color: colors.danger, fontSize: 13, marginTop: 8 },
    detailsInput: {
      minHeight: 120,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
    },
    detailsPreview: {
      marginTop: 12,
      padding: 14,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      backgroundColor: colors.muted,
    },
    doneBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    submit: {
      marginTop: 10,
      backgroundColor: colors.cobalt,
      borderRadius: radii.lg,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    submitDisabled: { opacity: 0.7 },
    submitText: { color: colors.textOnAccent, fontSize: 16, fontWeight: "800" },
  });
}

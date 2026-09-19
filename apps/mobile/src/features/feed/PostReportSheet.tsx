import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { blockAndReportUser, submitPostReport } from "@/api/social";
import {
  formatReportPathLabel,
  POST_REPORT_DISCLAIMER,
  POST_REPORT_REVIEW_HINT,
  POST_REPORT_ROOT_QUESTION,
  POST_REPORT_TAXONOMY,
  type ReportPathStep,
  type ReportTaxonomyNode,
} from "@/lib/report-taxonomy";
import { radii, spacing } from "@/theme/tokens";

type Phase = "browse" | "review" | "done";

type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  authorId: string;
  authorUsername?: string;
  /** report = report only; block-report = report + block user */
  mode?: "report" | "block-report";
  onSubmitted?: () => void;
};

export function PostReportSheet({
  visible,
  onClose,
  postId,
  authorId,
  authorUsername,
  mode = "report",
  onSubmitted,
}: Props) {
  const styles = useMemo(() => createStyles(), []);
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("browse");
  const [stack, setStack] = useState<ReportTaxonomyNode[][]>([]);
  const [path, setPath] = useState<ReportPathStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currentNodes = stack.length > 0 ? stack[stack.length - 1]! : POST_REPORT_TAXONOMY;
  const currentQuestion =
    path.length > 0
      ? path[path.length - 1]!.node.childQuestion ?? POST_REPORT_ROOT_QUESTION
      : POST_REPORT_ROOT_QUESTION;

  const reset = useCallback(() => {
    setPhase("browse");
    setStack([]);
    setPath([]);
    setError("");
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const selectNode = useCallback(
    (node: ReportTaxonomyNode) => {
      const question =
        path.length === 0
          ? POST_REPORT_ROOT_QUESTION
          : path[path.length - 1]!.node.childQuestion ?? POST_REPORT_ROOT_QUESTION;
      const nextPath = [...path, { question, node }];
      setPath(nextPath);
      if (node.children && node.children.length > 0) {
        setStack((prev) => [...prev, node.children!]);
        return;
      }
      setPhase("review");
    },
    [path]
  );

  const goBack = useCallback(() => {
    if (phase === "review") {
      setPhase("browse");
      setPath((prev) => prev.slice(0, -1));
      setStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : []));
      return;
    }
    if (stack.length === 0) {
      handleClose();
      return;
    }
    setStack((prev) => prev.slice(0, -1));
    setPath((prev) => prev.slice(0, -1));
  }, [handleClose, phase, stack.length]);

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
        });
      } else {
        await submitPostReport({
          postId,
          reportedUserId: authorId,
          reason: leaf.node.reasonId,
          reasonPath,
        });
      }
      onSubmitted?.();
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "신고 처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, [authorId, authorUsername, busy, mode, onSubmitted, path, postId]);

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
                accessibilityLabel="뒤로"
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
            ) : (
              <View style={styles.backBtn} />
            )}
            <Text style={styles.title}>{phase === "done" ? "완료" : "신고하기"}</Text>
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
                  <Text style={styles.disclaimer}>{POST_REPORT_DISCLAIMER}</Text>
                ) : null}
                {currentNodes.map((node) => (
                  <Pressable
                    key={node.id}
                    style={styles.row}
                    onPress={() => selectNode(node)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.rowLabel}>{node.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                ))}
              </>
            ) : null}

            {phase === "review" ? (
              <>
                <Text style={styles.reviewTitle}>신고를 제출합니다</Text>
                <Text style={styles.hint}>{POST_REPORT_REVIEW_HINT}</Text>
                {mode === "block-report" ? (
                  <Text style={styles.disclaimer}>제출 후 해당 사용자를 차단합니다.</Text>
                ) : null}
                <Text style={styles.sectionTitle}>신고 상세 정보</Text>
                {path.map((step, i) => (
                  <Pressable
                    key={`${step.node.id}-${i}`}
                    style={styles.reviewStep}
                    onPress={() => jumpToStep(i)}
                  >
                    <Text style={styles.reviewQ}>{step.question}</Text>
                    <Text style={styles.reviewA}>{step.node.label}</Text>
                  </Pressable>
                ))}
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </>
            ) : null}

            {phase === "done" ? (
              <>
                <Text style={styles.reviewTitle}>소중한 의견 감사합니다</Text>
                <Text style={styles.doneBody}>
                  회원님의 신고는 콘텐츠 검토에 반영되며, 비슷한 게시물이 덜 보일 수 있습니다.
                </Text>
              </>
            ) : null}
          </ScrollView>

          {phase === "review" ? (
            <Pressable
              style={[styles.submit, busy && styles.submitDisabled]}
              onPress={() => void submit()}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "block-report" ? "차단 및 신고 제출" : "제출"}
                </Text>
              )}
            </Pressable>
          ) : null}

          {phase === "done" ? (
            <Pressable style={styles.submit} onPress={handleClose}>
              <Text style={styles.submitText}>완료</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
    sheet: {
      backgroundColor: "#1c1c1e",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "92%",
      paddingHorizontal: spacing.lg,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.25)",
      marginTop: 8,
      marginBottom: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: { color: "#fff", fontSize: 15, fontWeight: "700" },
    body: { flexGrow: 0 },
    bodyContent: { paddingBottom: spacing.md },
    question: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 12, lineHeight: 28 },
    disclaimer: { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 19, marginBottom: 16 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "rgba(255,255,255,0.12)",
    },
    rowLabel: { color: "#fff", fontSize: 15, fontWeight: "600", flex: 1, paddingRight: 12 },
    reviewTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 8 },
    hint: { color: "rgba(10,132,255,0.95)", fontSize: 13, lineHeight: 19, marginBottom: 20 },
    sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 12 },
    reviewStep: { marginBottom: 16 },
    reviewQ: { color: "#fff", fontSize: 14, fontWeight: "700" },
    reviewA: { color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 2 },
    error: { color: "#ff6b6b", fontSize: 13, marginTop: 8 },
    doneBody: { color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 20 },
    submit: {
      marginTop: 8,
      backgroundColor: "#0A84FF",
      borderRadius: radii.lg,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    submitDisabled: { opacity: 0.7 },
    submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
}

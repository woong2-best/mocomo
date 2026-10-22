import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { postAiLiveChat } from "@/api/ai-live";
import { useAuth } from "@/auth/AuthContext";
import { AiLiveStage } from "@/features/live/ai/AiLiveStage";
import {
  createAiMotion,
  cueAngry,
  cueNod,
  cueSpeech,
  type AiMotionState,
} from "@/features/live/ai/ai-motion";
import { speakOnDevice, stopOnDeviceSpeech } from "@/features/live/ai/ai-speech";
import { localAiHostBlock } from "@/data/server-values/ai-live-blocklist";
import { useI18n } from "@/i18n/I18nProvider";
import { FolkButton } from "@/ui/FolkButton";

type Line = { id: string; from: "you" | "host"; text: string };

type Props = {
  topInset: number;
  between?: ReactNode;
  notice?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  onBack?: () => void;
};

let lineSeq = 0;
function nextId() {
  lineSeq += 1;
  return `ai-${Date.now().toString(36)}-${lineSeq}`;
}

export function AiLiveRoom({ topInset, between, notice, onRetry, retryLabel, onBack }: Props) {
  const { t } = useI18n();
  const { status } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const motionRef = useRef<AiMotionState | null>(null);
  const scroller = useRef<ScrollView>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  if (!motionRef.current) motionRef.current = createAiMotion(Date.now());

  useEffect(() => () => stopOnDeviceSpeech(), []);

  useEffect(() => {
    scroller.current?.scrollToEnd({ animated: true });
  }, [lines.length]);

  function push(line: Line) {
    setLines((prev) => [...prev, line].slice(-40));
  }

  function speak(motion: AiMotionState, text: string, angry: boolean) {
    const now = Date.now();
    if (angry) cueAngry(motion, now);
    else cueNod(motion);
    cueSpeech(motion, text, now);
    speakOnDevice(text);
  }

  async function send() {
    const text = draft.trim().slice(0, 200);
    const motion = motionRef.current;
    if (!text || pending || !motion) return;
    setDraft("");
    push({ id: nextId(), from: "you", text });
    cueNod(motion);

    const blocked = localAiHostBlock(text);
    if (blocked) {
      speak(motion, blocked.text, true);
      push({ id: nextId(), from: "host", text: blocked.text });
      return;
    }
    if (status !== "signedIn") {
      push({ id: nextId(), from: "host", text: t("m.live.ai_sign_in") });
      return;
    }

    setPending(true);
    try {
      const res = await postAiLiveChat(text);
      speak(motion, res.text, res.blocked);
      push({ id: nextId(), from: "host", text: res.text });
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 0;
      const fallback =
        code === 401 ? t("m.live.ai_sign_in") : code === 429 ? t("m.live.ai_rate_limit") : t("m.live.ai_unavailable");
      push({ id: nextId(), from: "host", text: fallback });
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: topInset, backgroundColor: "#000" }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.back} accessibilityLabel={t("m.common.back")}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
        ) : null}
        <AiLiveStage motionRef={motionRef as RefObject<AiMotionState | null>} width={width} />
        {between}
      </View>
      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
          {onRetry && retryLabel ? <FolkButton label={retryLabel} onPress={onRetry} /> : null}
        </View>
      ) : null}
      <ScrollView
        ref={scroller}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {lines.length === 0 ? (
          <Text style={styles.empty}>{t("m.live.ai_empty_chat")}</Text>
        ) : (
          lines.map((line) => (
            <Text key={line.id} style={styles.line}>
              <Text style={line.from === "host" ? styles.hostName : styles.youName}>
                {line.from === "host" ? t("m.live.ai_host_name") : t("m.live.ai_you")}{" "}
              </Text>
              <Text style={line.from === "host" ? styles.hostBody : styles.youBody}>{line.text}</Text>
            </Text>
          ))
        )}
      </ScrollView>
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          maxLength={200}
          placeholder={t("m.live.ai_chat_placeholder")}
          placeholderTextColor="rgba(255,255,255,0.4)"
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={() => void send()}
        />
        <Pressable
          onPress={() => void send()}
          disabled={pending || !draft.trim()}
          style={[styles.send, (pending || !draft.trim()) && styles.sendOff]}
          accessibilityLabel={t("m.live.ai_send")}
        >
          <Text style={styles.sendText}>{t("m.live.ai_send")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  back: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  noticeText: { color: "#f0b4a8", fontWeight: "700", textAlign: "center" },
  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexGrow: 1 },
  empty: {
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    fontWeight: "600",
    marginTop: 18,
    lineHeight: 20,
  },
  line: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
  hostName: { color: "#f6e7d4", fontWeight: "900" },
  youName: { color: "rgba(255,255,255,0.5)", fontWeight: "800" },
  hostBody: { fontWeight: "700" },
  youBody: { fontWeight: "500" },
  composer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#000",
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    fontWeight: "600",
  },
  send: {
    backgroundColor: "#c45c3e",
    borderRadius: 21,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: "#fff", fontWeight: "900" },
});

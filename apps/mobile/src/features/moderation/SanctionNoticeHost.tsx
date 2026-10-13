import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import {
  ackSanctionNotice,
  fetchSanctionNotice,
  submitSanctionAppeal,
} from "@/api/moderation";
import { useTheme } from "@/theme/ThemeContext";

type Notice = {
  id: string;
  kind: string;
  reason: string | null;
  endsAt: string | null;
  readOnly: boolean;
};

function copyFor(notice: Notice) {
  if (notice.kind === "CONTENT_REMOVE") {
    return {
      title: "A post was removed",
      body: "Operators removed one of your posts after judging that it violated MoCoMo's terms of service. You can appeal below.",
    };
  }
  if (notice.kind === "SUSPEND_PERMANENT") {
    return {
      title: "Account permanently restricted",
      body: "Your account is in read-only mode. You can browse, but writes are blocked. You can appeal below.",
    };
  }
  const until = notice.endsAt ? new Date(notice.endsAt).toLocaleString() : "the listed end time";
  return {
    title: "Account in read-only mode",
    body: `Your account is temporarily restricted until ${until}. You can browse, but writes are blocked.`,
  };
}

export function SanctionNoticeHost() {
  const { status, user } = useAuth();
  const { colors } = useTheme();
  const [notice, setNotice] = useState<Notice | null>(user?.pendingSanctionNotice ?? null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "signedIn") return;
    let cancelled = false;
    void fetchSanctionNotice()
      .then((res) => {
        if (!cancelled && res.notice) setNotice(res.notice);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== "signedIn" || !notice) return null;
  const copy = copyFor(notice);
  const cardBg = colors.surfaceRaised;

  function dismiss() {
    void ackSanctionNotice(notice.id).finally(() => setNotice(null));
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.scrim}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="warning" size={22} color={colors.terracotta} />
              <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={dismiss}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <Text style={[styles.body, { color: colors.textMuted }]}>{copy.body}</Text>
          {notice.reason ? (
            <Text style={[styles.reason, { color: colors.text }]}>{notice.reason}</Text>
          ) : null}
          {done ? (
            <>
              <Text style={[styles.body, { color: colors.text }]}>Your appeal was received.</Text>
              <Pressable style={styles.btn} onPress={() => setNotice(null)}>
                <Text style={styles.btnText}>Close</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Appeal title"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              />
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Why this should be reviewed (20+ characters)"
                placeholderTextColor={colors.textMuted}
                multiline
                style={[
                  styles.input,
                  styles.area,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Contact email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.row}>
                <Pressable
                  style={[styles.btn, styles.ghost]}
                  disabled={busy}
                  onPress={dismiss}
                >
                  <Text style={[styles.btnText, { color: colors.text }]}>Dismiss</Text>
                </Pressable>
                <Pressable
                  style={styles.btn}
                  disabled={busy || title.trim().length < 1 || content.trim().length < 20 || !email.trim()}
                  onPress={() => {
                    setBusy(true);
                    setError("");
                    void submitSanctionAppeal({
                      title,
                      content,
                      contactEmail: email,
                      sanctionId: notice.id,
                    })
                      .then(() => {
                        setDone(true);
                        return ackSanctionNotice(notice.id);
                      })
                      .catch((e) => {
                        setError(e instanceof Error ? e.message : "Could not submit appeal.");
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  <Text style={styles.btnText}>Submit appeal</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#1E2C45",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 18, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20 },
  reason: { fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  area: { minHeight: 88, textAlignVertical: "top" },
  error: { color: "#ef4444", fontSize: 12 },
  row: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#ccc" },
  btnText: { color: "#fff", fontWeight: "600" },
});

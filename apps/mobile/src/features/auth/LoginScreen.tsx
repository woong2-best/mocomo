import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { API_BASE_URL } from "@/config/env";
import { radii, spacing } from "@/theme/tokens";

const WEB = API_BASE_URL.replace(/\/$/, "");
const LOGO_URI = `${WEB}/mocomo-logo.png`;

/** Cream shell — auth forms live on the website; RN only launches AuthSession. */
const C = {
  bg: "#F3EEE6",
  card: "#FFFFFF",
  border: "rgba(27, 74, 140, 0.28)",
  text: "#1B4A8C",
  muted: "#6B7A90",
  primary: "#C5522A",
} as const;

export function LoginScreen() {
  const { openWebAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<"signup" | "signin" | null>(null);
  const [error, setError] = useState("");

  async function start(mode: "signup" | "signin") {
    setError("");
    setBusy(mode);
    try {
      await openWebAuth(mode);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "인증을 완료하지 못했습니다.";
      setError(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Image source={{ uri: LOGO_URI }} style={styles.logo} contentFit="contain" />
        </View>
        <Text style={styles.title}>MoCoMo</Text>
        <Text style={styles.sub}>
          회원가입·로그인은 웹사이트 인증 화면에서 진행됩니다.{"\n"}
          완료되면 앱으로 돌아와 자동 로그인됩니다.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, busy === "signup" && styles.btnDisabled]}
          disabled={busy !== null}
          onPress={() => void start("signup")}
        >
          {busy === "signup" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>회원가입</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, busy === "signin" && styles.btnDisabled]}
          disabled={busy !== null}
          onPress={() => void start("signin")}
        >
          {busy === "signin" ? (
            <ActivityIndicator color={C.primary} />
          ) : (
            <Text style={styles.secondaryBtnText}>로그인</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  card: {
    backgroundColor: C.card,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: spacing.lg,
    gap: 14,
  },
  logoWrap: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: 4,
  },
  logo: { width: 64, height: 64 },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
  },
  sub: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    color: C.muted,
    marginBottom: 8,
  },
  error: {
    color: "#B42318",
    backgroundColor: "rgba(180,35,24,0.08)",
    padding: 10,
    borderRadius: 12,
    fontSize: 13,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  secondaryBtnText: { color: C.primary, fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});

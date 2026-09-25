import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import type { SavedMobileAccountPublic } from "@/auth/account-store";
import {
  GoogleNativeCancelledError,
  GoogleNativeUnavailableError,
} from "@/auth/google-native";
import type { MobileAuthUser } from "@/auth/types";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { FolkAvatar } from "@/ui/FolkAvatar";
import {
  CRT_MONO,
  CrtFrame,
  PHOSPHOR,
  PHOSPHOR_DIM,
  PHOSPHOR_FAINT,
  PhosphorText,
} from "@/ui/CrtTerminal";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreateNew?: () => void;
  onAddExisting?: () => void;
  onLogout?: () => void;
};

function mergeAccounts(
  savedAccounts: SavedMobileAccountPublic[],
  user: MobileAuthUser | null
): SavedMobileAccountPublic[] {
  const map = new Map<string, SavedMobileAccountPublic>();
  for (const a of savedAccounts) map.set(a.userId, a);
  if (user && !map.has(user.id)) {
    map.set(user.id, {
      userId: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      savedAt: Date.now(),
    });
  }
  if (user?.id && user.image) {
    const cur = map.get(user.id);
    if (cur) map.set(user.id, { ...cur, image: user.image });
  }
  return [...map.values()].sort((a, b) => b.savedAt - a.savedAt);
}

function authErrorMessage(e: unknown): string {
  if (e instanceof GoogleNativeCancelledError) return "";
  if (e instanceof ApiError) return e.message;
  if (e instanceof GoogleNativeUnavailableError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return "login failed";
}

/** CRT terminal account switcher — phosphor green on tube black. */
export function AccountsBottomSheet({
  visible,
  onClose,
  onLogout,
}: Props) {
  const {
    user,
    savedAccounts,
    switchAccount,
    refreshSavedAccounts,
    prepareAddAccountSession,
    signInWithCredentials,
    signInWithGoogleNative,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const passwordRef = useRef<TextInputType>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const accounts = useMemo(() => mergeAccounts(savedAccounts, user), [savedAccounts, user]);

  useEffect(() => {
    if (!visible) return;
    setError("");
    setLoginId("");
    setPassword("");
    setBusy(false);
    void refreshSavedAccounts();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [refreshSavedAccounts, visible]);

  const pickAccount = useCallback(
    (userId: string) => {
      if (busy || userId === user?.id) return;
      Keyboard.dismiss();
      setBusy(true);
      setError("");
      void switchAccount(userId)
        .then(() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onClose();
        })
        .catch(() => setError("switch failed — try again"))
        .finally(() => setBusy(false));
    },
    [busy, onClose, switchAccount, user?.id]
  );

  const handleGoogle = useCallback(async () => {
    if (busy) return;
    Keyboard.dismiss();
    setBusy(true);
    setError("");
    try {
      await prepareAddAccountSession();
      const result = await signInWithGoogleNative({
        flow: "signin",
        forcePicker: true,
      });
      if (result.status === "needsSignup") {
        setError("that google account is not registered");
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshSavedAccounts();
    } catch (e) {
      const msg = authErrorMessage(e);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, prepareAddAccountSession, refreshSavedAccounts, signInWithGoogleNative]);

  const handleCredentials = useCallback(async () => {
    const id = loginId.trim();
    if (busy || !id || !password) return;
    Keyboard.dismiss();
    setBusy(true);
    setError("");
    try {
      await prepareAddAccountSession();
      await signInWithCredentials(id, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoginId("");
      setPassword("");
      await refreshSavedAccounts();
    } catch (e) {
      const msg = authErrorMessage(e);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    loginId,
    password,
    prepareAddAccountSession,
    refreshSavedAccounts,
    signInWithCredentials,
  ]);

  const handleLogout = useCallback(() => {
    Keyboard.dismiss();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onClose();
    onLogout?.();
  }, [onClose, onLogout]);

  const listMaxHeight = keyboardHeight > 80 ? 128 : 220;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button">
        <Pressable
          style={[
            styles.host,
            { paddingBottom: Math.max(insets.bottom, 12) + keyboardHeight },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <CrtFrame title="Terminal — mocomo accounts">
            <View style={styles.body}>
              <View style={styles.promptRow}>
                <PhosphorText glow style={styles.prompt}>
                  {">>"} lastlog
                </PhosphorText>
              </View>

              <ScrollView
                style={[styles.list, { maxHeight: listMaxHeight }]}
                contentContainerStyle={styles.listBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {accounts.map((account) => {
                  const active = account.userId === user?.id;
                  const label = account.name || account.username;
                  return (
                    <Pressable
                      key={account.userId}
                      disabled={busy}
                      onPress={() => pickAccount(account.userId)}
                      style={({ pressed }) => [styles.row, pressed && !active && styles.rowPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <FolkAvatar uri={account.image} name={label} size={36} framed={false} />
                      <View style={styles.rowMeta}>
                        <PhosphorText glow={!active} style={styles.rowName} numberOfLines={1}>
                          {label}
                        </PhosphorText>
                        <PhosphorText dim style={styles.rowHandle} numberOfLines={1}>
                          @{account.username}
                        </PhosphorText>
                      </View>
                      {active ? (
                        <PhosphorText style={styles.flag}>[ACTIVE]</PhosphorText>
                      ) : (
                        <PhosphorText faint style={styles.flag}>
                          [idle]
                        </PhosphorText>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                disabled={busy}
                onPress={() => void handleGoogle()}
                style={({ pressed }) => [styles.cmdRow, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel="Google로 계정 추가"
              >
                <PhosphorText glow style={styles.prompt}>
                  {">>"} login google
                </PhosphorText>
              </Pressable>

              <View style={styles.credBlock}>
                <PhosphorText glow style={styles.prompt}>
                  {">>"} login
                </PhosphorText>
                <View style={styles.fieldRow}>
                  <PhosphorText dim style={styles.fieldLabel}>
                    login:
                  </PhosphorText>
                  <TextInput
                    value={loginId}
                    onChangeText={(v) => {
                      setLoginId(v);
                      if (error) setError("");
                    }}
                    placeholder="id"
                    placeholderTextColor={PHOSPHOR_FAINT}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    editable={!busy}
                    underlineColorAndroid="transparent"
                    cursorColor={PHOSPHOR}
                    selectionColor="rgba(108,255,98,0.35)"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    style={styles.input}
                    accessibilityLabel="로그인 아이디"
                  />
                </View>
                <View style={styles.fieldRow}>
                  <PhosphorText dim style={styles.fieldLabel}>
                    password:
                  </PhosphorText>
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (error) setError("");
                    }}
                    placeholder="********"
                    placeholderTextColor={PHOSPHOR_FAINT}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="go"
                    editable={!busy}
                    underlineColorAndroid="transparent"
                    cursorColor={PHOSPHOR}
                    selectionColor="rgba(108,255,98,0.35)"
                    onSubmitEditing={() => void handleCredentials()}
                    style={styles.input}
                    accessibilityLabel="비밀번호"
                  />
                </View>
              </View>

              {busy ? <ActivityIndicator color={PHOSPHOR} style={{ marginTop: 8 }} /> : null}
              {error ? (
                <PhosphorText style={styles.err}>! {error}</PhosphorText>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.cmdRow, styles.logoutRow, pressed && styles.rowPressed]}
                onPress={handleLogout}
                accessibilityRole="button"
              >
                <PhosphorText dim style={styles.prompt}>
                  {">>"} logout
                </PhosphorText>
              </Pressable>
            </View>
          </CrtFrame>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
  },
  host: {
    paddingTop: 8,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  prompt: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  list: {},
  listBody: { gap: 4, paddingBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
  },
  rowPressed: { backgroundColor: "rgba(108,255,98,0.08)" },
  rowMeta: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15 },
  rowHandle: { marginTop: 2, fontSize: 12 },
  flag: { fontSize: 11, letterSpacing: 0.8 },
  cmdRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 6,
  },
  credBlock: {
    marginTop: 4,
    gap: 4,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 28,
    paddingVertical: 2,
  },
  fieldLabel: {
    fontSize: 13,
    width: 88,
  },
  input: {
    flex: 1,
    margin: 0,
    padding: 0,
    color: PHOSPHOR,
    fontFamily: CRT_MONO,
    fontSize: 13,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  logoutRow: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PHOSPHOR_DIM,
    paddingTop: 12,
  },
  err: { marginTop: 8, fontSize: 12 },
});

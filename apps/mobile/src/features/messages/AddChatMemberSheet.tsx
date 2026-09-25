import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addRoomMember, type ChatRoomMember } from "@/api/messages";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  roomId: string;
  members: ChatRoomMember[];
  onClose: () => void;
  onAdded: (member: ChatRoomMember) => void;
};

export function AddChatMemberSheet({ visible, roomId, members, onClose, onAdded }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okNote, setOkNote] = useState("");
  const [list, setList] = useState(members);

  useEffect(() => {
    if (!visible) return;
    setHandle("");
    setError("");
    setOkNote("");
    setList(members);
  }, [visible, members]);

  async function onAdd() {
    const next = handle.trim();
    if (!next || busy) return;
    setBusy(true);
    setError("");
    setOkNote("");
    try {
      const result = await addRoomMember(roomId, next);
      setList((prev) => (prev.some((m) => m.id === result.added.id) ? prev : [...prev, result.added]));
      setHandle("");
      setOkNote(`@${result.added.username} 님을 추가했습니다.`);
      onAdded(result.added);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추가하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.title}>사람 추가</Text>
          <Text style={styles.sub}>아이디를 한 명씩 입력해 이 대화에 추가합니다.</Text>
          {list.map((m) => {
            const label = m.name?.trim() || m.username;
            return (
              <View key={m.id} style={styles.memberRow}>
                <FolkAvatar uri={m.image} name={label} size={36} />
                <View style={styles.memberMeta}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.memberHandle} numberOfLines={1}>
                    @{m.username}
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={handle}
              onChangeText={setHandle}
              placeholder="아이디 입력"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              editable={!busy}
              onSubmitEditing={() => void onAdd()}
              returnKeyType="done"
            />
            {busy ? (
              <ActivityIndicator color={colors.terracotta} />
            ) : (
              <FolkButton label="추가" onPress={() => void onAdd()} disabled={!handle.trim()} />
            )}
          </View>
          {okNote ? <Text style={styles.ok}>{okNote}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <FolkButton label="닫기" variant="ghost" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.lg,
      gap: 10,
    },
    title: { fontSize: 20, fontWeight: "900", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, fontWeight: "600", marginBottom: 4 },
    memberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    memberMeta: { flex: 1, minWidth: 0 },
    memberName: { fontWeight: "800", color: colors.text },
    memberHandle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    input: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    ok: { fontSize: 12, fontWeight: "700", color: colors.cobalt },
    error: { fontSize: 12, fontWeight: "700", color: colors.danger },
  });
}

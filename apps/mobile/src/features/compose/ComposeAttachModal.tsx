import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { parseSpendableMoco, sanitizeMocoDecimalInput } from "@/lib/moco-amount";
import {
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  SALE_MEDIA_MIN_PRICE_USD_CENTS,
  saleCentsFromMoco,
} from "@/lib/money";
import { radii, type ThemeColors } from "@/theme/tokens";

export function ComposeAttachModal({
  visible,
  colors,
  busy,
  onClose,
  onPick,
  onConfirm,
  pickedLabel,
}: {
  visible: boolean;
  colors: ThemeColors;
  busy?: boolean;
  pickedLabel: string | null;
  onClose: () => void;
  onPick: () => void;
  onConfirm: (priceKrw: number) => void;
}) {
  const { t } = useI18n();
  const [moco, setMoco] = useState("");
  const [error, setError] = useState("");

  function close() {
    setMoco("");
    setError("");
    onClose();
  }

  function confirm() {
    const amount = parseSpendableMoco(moco);
    if (amount == null) {
      setError(t("m.compose.attach_need_moco"));
      return;
    }
    const cents = saleCentsFromMoco(amount);
    if (cents < SALE_MEDIA_MIN_PRICE_USD_CENTS) {
      setError(t("m.compose.attach_need_moco"));
      return;
    }
    if (cents > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
      setError(t("m.compose.attach_too_high"));
      return;
    }
    if (!pickedLabel) {
      setError(t("m.compose.attach_need_file"));
      return;
    }
    onConfirm(cents);
    setMoco("");
    setError("");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
          onPress={() => undefined}
        >
          <Text style={[styles.title, { color: colors.text }]}>{t("m.compose.attach_title")}</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t("m.compose.attach_hint")}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t("m.compose.attach_moco")}</Text>
          <TextInput
            value={moco}
            onChangeText={(value) => {
              setMoco(sanitizeMocoDecimalInput(value));
              setError("");
            }}
            placeholder="1"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            editable={!busy}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.background },
            ]}
          />
          <Pressable
            style={[styles.uploadBtn, { borderColor: colors.brand }]}
            disabled={busy}
            onPress={onPick}
          >
            <Text style={[styles.uploadText, { color: colors.brand }]}>
              {pickedLabel ?? t("m.compose.attach_upload")}
            </Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={close} hitSlop={8} disabled={busy}>
              <Text style={[styles.cancel, { color: colors.textMuted }]}>{t("m.common.cancel")}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirm, { backgroundColor: colors.terracotta }, busy && styles.disabled]}
              disabled={busy}
              onPress={confirm}
            >
              <Text style={styles.confirmText}>{t("m.compose.attach_confirm")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: "800" },
  hint: { fontSize: 12, lineHeight: 17 },
  label: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
  },
  uploadBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  uploadText: { fontSize: 14, fontWeight: "800" },
  error: { color: "#c80000", fontSize: 12, fontWeight: "600" },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
  },
  cancel: { fontSize: 14, fontWeight: "700" },
  confirm: {
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  disabled: { opacity: 0.45 },
});

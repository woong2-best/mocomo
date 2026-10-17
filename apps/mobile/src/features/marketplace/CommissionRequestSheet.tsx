import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { sendCommission } from "@/api/commissions";
import { useI18n } from "@/i18n/I18nProvider";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";

export function CommissionRequestSheet({
  visible,
  sellerId,
  onClose,
}: {
  visible: boolean;
  sellerId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [brief, setBrief] = useState("");
  const [purpose, setPurpose] = useState<"broadcast" | "personal">("personal");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await sendCommission({ sellerId, brief, purpose });
      showIslandSuccess(t("m.commission.request"), t("m.commission.sent"));
      setBrief("");
      onClose();
    } catch (error) {
      showIslandError(t("m.commission.request"), error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t("m.commission.request")}</Text>
          <TextInput
            style={styles.input}
            multiline
            value={brief}
            onChangeText={setBrief}
            placeholder={t("m.commission.brief")}
          />
          <View style={styles.row}>
            {(["personal", "broadcast"] as const).map((id) => (
              <Pressable key={id} style={[styles.chip, purpose === id && styles.chipOn]} onPress={() => setPurpose(id)}>
                <Text style={purpose === id ? styles.chipTextOn : styles.chipText}>
                  {t(id === "personal" ? "m.commission.personal" : "m.commission.broadcast")}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.send} disabled={busy || brief.trim().length < 8} onPress={() => void submit()}>
            <Text style={styles.sendText}>{t("m.commission.send")}</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={styles.cancel}>{t("common.back")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: "#fffaf3", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "800" },
  input: { minHeight: 120, borderWidth: 1, borderColor: "#e6e0d6", borderRadius: 12, padding: 12, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1.5, borderColor: "#d9d1c5", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: "#1b4a8c", borderColor: "#1b4a8c" },
  chipText: { fontWeight: "800", color: "#1b4a8c" },
  chipTextOn: { fontWeight: "800", color: "#fff" },
  send: { backgroundColor: "#c45c26", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  sendText: { color: "#fff", fontWeight: "800" },
  cancel: { textAlign: "center", color: "#6b645b", paddingVertical: 8 },
});

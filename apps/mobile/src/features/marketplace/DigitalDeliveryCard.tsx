import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { fetchDigitalDelivery, postDigitalDelivery, type DigitalDeliveryView } from "@/api/marketplace";
import { uploadLocalFile } from "@/api/upload-file";
import { useI18n } from "@/i18n/I18nProvider";

export function DigitalDeliveryCard({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const [digital, setDigital] = useState(false);
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [delivery, setDelivery] = useState<DigitalDeliveryView | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function reload() {
    try {
      const res = await fetchDigitalDelivery(listingId);
      setDigital(res.digital);
      setRole(res.role === "buyer" || res.role === "seller" ? res.role : null);
      setDelivery(res.delivery);
    } catch {
      setDigital(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [listingId]);

  if (!digital || !delivery) return null;

  async function run(action: "start" | "upload" | "approve" | "dispute", file?: { fileUrl: string; fileName: string }) {
    setBusy(true);
    setNote("");
    try {
      const res = await postDigitalDelivery(listingId, { action, ...file });
      if (res.delivery) setDelivery(res.delivery);
      else await reload();
    } catch (error) {
      setNote(error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function pickFile() {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.7 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setBusy(true);
    try {
      const fileUrl = await uploadLocalFile({
        uri: asset.uri,
        filename: asset.fileName || "delivery",
        contentType: asset.mimeType || "image/jpeg",
        category: asset.type === "video" ? "video" : "image",
      });
      await run("upload", { fileUrl, fileName: asset.fileName || "delivery" });
    } catch (error) {
      setNote(error instanceof Error ? error.message : t("m.common.request_failed"));
      setBusy(false);
    }
  }

  const steps = [
    t("m.market.track.payment_held"),
    t("m.market.track.in_progress"),
    t("m.market.track.file_uploaded"),
    t("m.market.track.completed"),
  ];
  const index = delivery.status === "progress" ? 1 : delivery.status === "uploaded" ? 2 : delivery.status === "completed" ? 3 : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("m.market.track.deliver_work")}</Text>
      <Text style={styles.steps}>{steps.map((label, i) => (i <= index ? label : label)).join("  ·  ")}</Text>
      {delivery.previewUrl && delivery.status !== "completed" ? (
        <Image source={{ uri: delivery.previewUrl }} style={styles.preview} />
      ) : delivery.status !== "completed" ? (
        <Text style={styles.locked}>{delivery.fileName || t("m.market.track.file_uploaded")}</Text>
      ) : null}
      {role === "seller" && delivery.status === "held" ? (
        <Pressable style={styles.btn} disabled={busy} onPress={() => void run("start")}>
          <Text style={styles.btnText}>{t("m.market.track.in_progress")}</Text>
        </Pressable>
      ) : null}
      {role === "seller" && delivery.status !== "completed" ? (
        <Pressable style={styles.btn} disabled={busy} onPress={() => void pickFile()}>
          <Text style={styles.btnText}>{t("m.market.track.deliver_work")}</Text>
        </Pressable>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <Pressable style={styles.btn} disabled={busy} onPress={() => void run("approve")}>
          <Text style={styles.btnText}>{t("m.market.track.approve_download")}</Text>
        </Pressable>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <Pressable style={styles.btn} disabled={busy} onPress={() => void run("dispute")}>
          <Text style={styles.btnText}>{t("m.commission.dispute")}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.locked}>{t("m.commission.auto_note")}</Text>
      {role === "buyer" && delivery.status === "completed" && delivery.fileUrl ? (
        <Text style={styles.locked}>{delivery.fileUrl}</Text>
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#e6e0d6", gap: 8 },
  title: { fontWeight: "800", fontSize: 15 },
  steps: { fontSize: 11, color: "#5c6b8a" },
  preview: { height: 160, borderRadius: 12 },
  locked: { fontSize: 12, color: "#6b645b" },
  btn: { backgroundColor: "#2f5d9f", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  note: { color: "#b42318", fontSize: 12 },
});

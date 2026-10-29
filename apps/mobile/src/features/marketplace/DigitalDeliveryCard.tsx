import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchDigitalDelivery, postDigitalDelivery, type DigitalDeliveryView } from "@/api/marketplace";
import { useI18n } from "@/i18n/I18nProvider";

const CLOUD_SHARE_URL_PATTERN =
  /^https:\/\/(?:drive\.google\.com|docs\.google\.com|(?:www\.)?dropbox\.com|dl\.dropboxusercontent\.com)\/\S+$/i;

const NAVY = "#0b1f3a";
const MINT = "#7ef0d2";
const INK = "#f7fafc";
const WARN = "#ffe08a";

function stepIndex(status: string) {
  if (status === "progress") return 1;
  if (status === "uploaded") return 2;
  if (status === "completed") return 3;
  return 0;
}

export function DigitalDeliveryCard({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const [digital, setDigital] = useState(false);
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [delivery, setDelivery] = useState<DigitalDeliveryView | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [cloudUrl, setCloudUrl] = useState("");
  const [password, setPassword] = useState("");

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

  const index = stepIndex(delivery.status);
  const shareUrl = delivery.cloudShareUrl || delivery.fileUrl;
  const canDownload = role === "buyer" && !!shareUrl && (delivery.status === "uploaded" || delivery.status === "completed");
  const steps = [
    t("m.market.track.payment_held"),
    t("m.market.track.in_progress"),
    t("m.market.track.file_uploaded"),
    t("m.market.track.completed"),
  ];

  async function run(
    action: "start" | "upload" | "approve" | "dispute",
    file?: { cloudShareUrl?: string; sharePassword?: string; fileName?: string }
  ) {
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

  function submitLink() {
    const href = cloudUrl.trim();
    if (!CLOUD_SHARE_URL_PATTERN.test(href)) {
      setNote(t("m.market.track.cloud_invalid"));
      return;
    }
    void run("upload", {
      cloudShareUrl: href,
      sharePassword: password,
      fileName: href.includes("dropbox.com") ? "Dropbox" : "Google Drive",
    });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("m.market.track.deliver_work")}</Text>
      <Text style={styles.warn}>{t("m.commission.auto_note")}</Text>
      <View style={styles.steps}>
        {steps.map((label, step) => {
          const current = step === index;
          const done = step < index;
          return (
            <View key={label} style={styles.step}>
              <View style={[styles.bar, { backgroundColor: current || done ? MINT : "rgba(255,255,255,0.2)" }]} />
              <Text style={[styles.stepText, { color: current ? MINT : done ? INK : "#c5d0e0" }]}>{label}</Text>
            </View>
          );
        })}
      </View>

      {role === "seller" && (delivery.status === "held" || delivery.status === "progress") ? (
        <View style={styles.form}>
          <Text style={styles.label}>{t("m.market.track.cloud_url")}</Text>
          <TextInput
            value={cloudUrl}
            onChangeText={setCloudUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://drive.google.com/file/d/..."
            placeholderTextColor="#c5d0e0"
            style={styles.input}
          />
          <Text style={styles.label}>{t("m.market.track.cloud_password")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor="#c5d0e0"
            style={styles.input}
          />
          {delivery.status === "held" ? (
            <Pressable style={styles.ghost} disabled={busy} onPress={() => void run("start")}>
              <Text style={styles.ghostText}>{t("m.market.track.in_progress")}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.mint} disabled={busy} onPress={submitLink}>
            <Text style={styles.mintText}>{t("m.market.track.deliver_work")}</Text>
          </Pressable>
        </View>
      ) : null}

      {canDownload && shareUrl ? (
        <Pressable style={styles.white} onPress={() => void Linking.openURL(shareUrl)}>
          <Text style={styles.whiteText}>{t("m.market.track.download_file")}</Text>
        </Pressable>
      ) : null}
      {canDownload && delivery.sharePassword ? (
        <Text style={styles.password}>
          {t("m.market.track.cloud_password")}: {delivery.sharePassword}
        </Text>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <Pressable style={styles.mint} disabled={busy} onPress={() => void run("approve")}>
          <Text style={styles.mintText}>{t("m.market.track.approve_purchase")}</Text>
        </Pressable>
      ) : null}
      {role === "buyer" && delivery.status === "uploaded" ? (
        <Pressable style={styles.ghost} disabled={busy} onPress={() => void run("dispute")}>
          <Text style={styles.ghostText}>{t("m.commission.dispute")}</Text>
        </Pressable>
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: NAVY,
    gap: 10,
  },
  title: { color: "#fff", fontWeight: "800", fontSize: 16 },
  warn: { color: WARN, fontWeight: "700", fontSize: 13, lineHeight: 18 },
  steps: { flexDirection: "row", gap: 6 },
  step: { flex: 1, minWidth: 0 },
  bar: { height: 6, borderRadius: 999 },
  stepText: { marginTop: 6, fontSize: 11, fontWeight: "800", lineHeight: 14 },
  form: { gap: 8 },
  label: { color: INK, fontWeight: "800", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.1)",
    color: INK,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontWeight: "700",
  },
  mint: { backgroundColor: MINT, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  mintText: { color: NAVY, fontWeight: "800" },
  white: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  whiteText: { color: NAVY, fontWeight: "800" },
  ghost: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  ghostText: { color: "#fff", fontWeight: "800" },
  password: { color: INK, fontWeight: "700" },
  note: { color: "#ffb4b4", fontWeight: "700", fontSize: 13 },
});

import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadLocalFile } from "@/api/upload-file";
import {
  fetchMyStudio,
  saveStudio,
  type StudioAddon,
  type StudioDraft,
  type StudioField,
  type StudioMedia,
  type StudioTier,
} from "@/api/studios";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/ui/Screen";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";

function rid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const EMPTY: StudioDraft = {
  title: "",
  about: "",
  open: true,
  slotCap: 3,
  deliveryDays: 14,
  revisionNote: "Rough sketch: 1 revision. Flat color: 1 revision. No changes after coloring is finished.",
  currency: "krw",
  portfolio: [],
  tiers: [{ id: "tier1", name: "Half body", price: 80000 }],
  addons: [],
  formFields: [
    { id: "look", label: "Character appearance", kind: "text", required: true },
    { id: "persona", label: "Personality", kind: "text", required: true },
    { id: "pose", label: "Pose and expression", kind: "text", required: true },
    { id: "ref", label: "Reference image", kind: "image", required: true },
  ],
};

function mediaKind(asset: ImagePicker.ImagePickerAsset): StudioMedia["kind"] | "long" {
  const mime = asset.mimeType?.toLowerCase() || "";
  const name = `${asset.fileName || ""} ${asset.uri}`.toLowerCase();
  const seconds = !asset.duration ? 0 : asset.duration > 1000 ? asset.duration / 1000 : asset.duration;
  if (mime.startsWith("video") || /\.(mp4|mov|webm|m4v)$/.test(name)) {
    return seconds > 20 ? "long" : "video";
  }
  if (mime === "image/gif" || name.endsWith(".gif")) return "gif";
  return "image";
}

export function StudioEditorScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const mine = useQuery({ queryKey: ["my-studio"], queryFn: fetchMyStudio });
  const [draft, setDraft] = useState<StudioDraft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mine.data || ready) return;
    if (mine.data.studio) {
      const studio = mine.data.studio;
      setDraft({
        title: studio.title,
        about: studio.about,
        open: studio.open,
        slotCap: studio.slotCap,
        deliveryDays: studio.deliveryDays,
        revisionNote: studio.revisionNote,
        currency: studio.currency,
        portfolio: studio.portfolio,
        tiers: studio.tiers,
        addons: studio.addons,
        formFields: studio.formFields,
      });
    }
    setReady(true);
  }, [mine.data, ready]);

  async function addMedia() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(t("m.studio.digital"), t("m.marketplace.allow_access_to_your_photo_library"));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      videoMaxDuration: 20,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const kind = mediaKind(asset);
    if (kind === "long") {
      showIslandError(t("m.studio.gallery"), t("m.studio.video_limit"));
      return;
    }
    setBusy(true);
    try {
      const url = await uploadLocalFile({
        uri: asset.uri,
        filename: asset.fileName || (kind === "video" ? "studio.mp4" : kind === "gif" ? "studio.gif" : "studio.jpg"),
        contentType: asset.mimeType || (kind === "video" ? "video/mp4" : kind === "gif" ? "image/gif" : "image/jpeg"),
        category: kind === "video" ? "video" : "image",
      });
      setDraft((prev) => ({ ...prev, portfolio: [...prev.portfolio, { url, kind }].slice(0, 8) }));
    } catch (error) {
      showIslandError(t("m.studio.gallery"), error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const saved = await saveStudio(draft);
      await queryClient.invalidateQueries({ queryKey: ["my-studio"] });
      await queryClient.invalidateQueries({ queryKey: ["studios"] });
      showIslandSuccess(t("m.studio.digital"), t("m.studio.saved"));
      navigation.replace("StudioDetail", { id: saved.studio.id });
    } catch (error) {
      showIslandError(t("m.studio.digital"), error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  function patchTier(id: string, patch: Partial<StudioTier>) {
    setDraft((prev) => ({
      ...prev,
      tiers: prev.tiers.map((row): StudioTier => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }
  function patchAddon(id: string, patch: Partial<StudioAddon>) {
    setDraft((prev) => ({
      ...prev,
      addons: prev.addons.map((row): StudioAddon => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }
  function patchField(id: string, patch: Partial<StudioField>) {
    setDraft((prev) => ({
      ...prev,
      formFields: prev.formFields.map((row): StudioField => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  if (mine.isLoading && !ready) {
    return (
      <Screen>
        <ActivityIndicator color={colors.terracotta} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{t("m.studio.editor")}</Text>
        <Text style={[styles.note, { color: colors.textMuted }]}>{t("m.studio.watermark_note")}</Text>

        <Field label={t("m.studio.title")} colors={colors}>
          <TextInput
            value={draft.title}
            onChangeText={(title) => setDraft((prev) => ({ ...prev, title }))}
            style={[styles.input, inputStyle(colors)]}
            placeholder={t("m.studio.title_ph")}
            placeholderTextColor={colors.textMuted}
          />
        </Field>
        <Field label={t("m.studio.about")} colors={colors}>
          <TextInput
            value={draft.about}
            onChangeText={(about) => setDraft((prev) => ({ ...prev, about }))}
            style={[styles.input, styles.multi, inputStyle(colors)]}
            multiline
            placeholder={t("m.studio.about_ph")}
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.gallery")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {draft.portfolio.map((item) => (
            <Pressable
              key={item.url}
              onPress={() =>
                setDraft((prev) => ({ ...prev, portfolio: prev.portfolio.filter((row) => row.url !== item.url) }))
              }
            >
              {item.kind === "video" ? (
                <View style={[styles.thumb, { backgroundColor: colors.brand }]}>
                  <Text style={styles.thumbTag}>MP4</Text>
                </View>
              ) : (
                <Image source={{ uri: item.url }} style={styles.thumb} />
              )}
            </Pressable>
          ))}
          <Pressable style={[styles.thumb, styles.add, { borderColor: colors.border }]} onPress={() => void addMedia()}>
            <Text style={{ color: colors.brand, fontWeight: "800" }}>+</Text>
          </Pressable>
        </ScrollView>

        <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.tiers")}</Text>
        {draft.tiers.map((tier) => (
          <View key={tier.id} style={styles.row}>
            <TextInput
              value={tier.name}
              onChangeText={(name) => patchTier(tier.id, { name })}
              style={[styles.input, styles.grow, inputStyle(colors)]}
              placeholder={t("m.studio.tier_name")}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              value={String(tier.price || "")}
              onChangeText={(value) => patchTier(tier.id, { price: Number(value.replace(/[^0-9]/g, "")) || 0 })}
              keyboardType="number-pad"
              style={[styles.input, styles.price, inputStyle(colors)]}
              placeholder="80000"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ))}
        <TextButton
          label={t("m.studio.add_tier")}
          onPress={() =>
            setDraft((prev) => ({
              ...prev,
              tiers: [...prev.tiers, { id: rid("tier"), name: "", price: 0 }].slice(0, 8),
            }))
          }
        />

        <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.addons")}</Text>
        {draft.addons.map((addon) => (
          <View key={addon.id} style={styles.row}>
            <TextInput
              value={addon.name}
              onChangeText={(name) => patchAddon(addon.id, { name })}
              style={[styles.input, styles.grow, inputStyle(colors)]}
              placeholder={t("m.studio.addon_name")}
              placeholderTextColor={colors.textMuted}
            />
            <Pressable
              onPress={() => patchAddon(addon.id, { mode: addon.mode === "percent" ? "fixed" : "percent" })}
              style={[styles.mode, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.brand, fontWeight: "800" }}>{addon.mode === "percent" ? "%" : "+"}</Text>
            </Pressable>
            <TextInput
              value={String(addon.amount || "")}
              onChangeText={(value) => patchAddon(addon.id, { amount: Number(value.replace(/[^0-9]/g, "")) || 0 })}
              keyboardType="number-pad"
              style={[styles.input, styles.price, inputStyle(colors)]}
              placeholder={addon.mode === "percent" ? "100" : "30000"}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ))}
        <TextButton
          label={t("m.studio.add_addon")}
          onPress={() =>
            setDraft((prev) => {
              const next: StudioAddon = { id: rid("addon"), name: "", mode: "fixed", amount: 0 };
              return { ...prev, addons: [...prev.addons, next].slice(0, 12) };
            })
          }
        />

        <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.rules")}</Text>
        <View style={styles.row}>
          <Text style={[styles.inline, { color: colors.text }]}>{t("m.studio.days")}</Text>
          <TextInput
            value={String(draft.deliveryDays)}
            onChangeText={(value) =>
              setDraft((prev) => ({ ...prev, deliveryDays: Number(value.replace(/[^0-9]/g, "")) || 0 }))
            }
            keyboardType="number-pad"
            style={[styles.input, styles.price, inputStyle(colors)]}
          />
        </View>
        <TextInput
          value={draft.revisionNote}
          onChangeText={(revisionNote) => setDraft((prev) => ({ ...prev, revisionNote }))}
          style={[styles.input, styles.multi, inputStyle(colors)]}
          multiline
          placeholder={t("m.studio.revisions")}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.slots")}</Text>
        <View style={styles.row}>
          <Text style={[styles.inline, { color: colors.text }]}>{draft.open ? t("m.studio.open") : t("m.studio.closed")}</Text>
          <Switch value={draft.open} onValueChange={(open) => setDraft((prev) => ({ ...prev, open }))} />
          <TextInput
            value={String(draft.slotCap)}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, slotCap: Number(value.replace(/[^0-9]/g, "")) || 0 }))}
            keyboardType="number-pad"
            style={[styles.input, styles.price, inputStyle(colors)]}
          />
        </View>

        <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.form")}</Text>
        {draft.formFields.map((field) => (
          <View key={field.id} style={styles.row}>
            <TextInput
              value={field.label}
              onChangeText={(label) => patchField(field.id, { label })}
              style={[styles.input, styles.grow, inputStyle(colors)]}
              placeholder={t("m.studio.field_name")}
              placeholderTextColor={colors.textMuted}
            />
            <Pressable
              onPress={() => patchField(field.id, { kind: field.kind === "image" ? "text" : "image" })}
              style={[styles.mode, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.brand, fontWeight: "800", fontSize: 11 }}>
                {field.kind === "image" ? t("m.studio.image") : t("m.studio.text")}
              </Text>
            </Pressable>
          </View>
        ))}
        <TextButton
          label={t("m.studio.add_field")}
          onPress={() =>
            setDraft((prev) => {
              const next: StudioField = { id: rid("field"), label: "", kind: "text", required: true };
              return { ...prev, formFields: [...prev.formFields, next].slice(0, 8) };
            })
          }
        />

        <Pressable style={[styles.save, { backgroundColor: colors.terracotta }]} disabled={busy} onPress={() => void save()}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t("m.studio.save")}</Text>}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function inputStyle(colors: { border: string; text: string; surface: string }) {
  return { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface };
}

function Field({
  label,
  children,
  colors,
}: {
  label: string;
  children: ReactNode;
  colors: { textMuted: string };
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Text style={{ color: colors.brand, fontWeight: "800", paddingVertical: 6 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 48, gap: 8 },
  title: { fontSize: 22, fontWeight: "800" },
  note: { fontSize: 12, fontWeight: "600", lineHeight: 18 },
  section: { fontSize: 16, fontWeight: "800", marginTop: 12 },
  field: { gap: 4 },
  label: { fontSize: 12, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multi: { minHeight: 88, textAlignVertical: "top" },
  gallery: { gap: 8 },
  thumb: { width: 84, height: 84, borderRadius: 12 },
  thumbTag: { color: "#fff", fontWeight: "800", textAlign: "center", marginTop: 32 },
  add: { borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  grow: { flex: 1 },
  price: { width: 96 },
  mode: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 10 },
  inline: { fontWeight: "700", flex: 1 },
  save: { marginTop: 16, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});

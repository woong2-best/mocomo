import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyStudio,
  saveStudio,
  type StudioAddon,
  type StudioDraft,
  type StudioField,
  type StudioTier,
} from "@/api/studios";
import { parseStudioPortfolio } from "@/features/marketplace/studio-portfolio";
import { StudioPortfolioEditor } from "@/features/marketplace/StudioPortfolioEditor";
import {
  studioCategoryDisplay,
  studioCategoryGroups,
} from "@/features/marketplace/studio-categories";
import { normalizeDraft, step1Valid, step2Valid, step3Valid } from "@/features/marketplace/studio-editor-validation";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from "@/ui/KeyboardAwareScrollView";
import { Screen } from "@/ui/Screen";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";

function rid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const EMPTY: StudioDraft = {
  category: "",
  title: "",
  about: "",
  open: true,
  slotCap: 3,
  deliveryDays: 14,
  revisionNote: "Rough sketch: 1 revision. Flat color: 1 revision. No changes after coloring is finished.",
  currency: "moco",
  coverUrl: "",
  blocks: [],
  tiers: [{ id: "tier1", name: "Half body", price: 80 }],
  addons: [],
  formFields: [
    { id: "look", label: "Character appearance", kind: "text", required: true },
    { id: "persona", label: "Personality", kind: "text", required: true },
    { id: "pose", label: "Pose and expression", kind: "text", required: true },
    { id: "ref", label: "Reference image", kind: "image", required: true },
  ],
};

export function StudioEditorScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const categoryListHeight = Math.round(Math.min(windowHeight * 0.58, 460));
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const mine = useQuery({ queryKey: ["my-studio"], queryFn: fetchMyStudio });
  const [draft, setDraft] = useState<StudioDraft>(EMPTY);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    if (!mine.data || ready) return;
    if (mine.data.studio) {
      const studio = mine.data.studio;
      const doc = parseStudioPortfolio({
        coverUrl: studio.coverUrl,
        blocks: studio.blocks,
        portfolio: studio.portfolio,
      });
      setDraft(
        normalizeDraft({
          category: studio.category,
          title: studio.title,
          about: studio.about,
          open: studio.open,
          slotCap: studio.slotCap,
          deliveryDays: studio.deliveryDays,
          revisionNote: studio.revisionNote,
          currency: studio.currency,
          coverUrl: doc.coverUrl,
          blocks: doc.blocks,
          tiers: studio.tiers,
          addons: studio.addons,
          formFields: studio.formFields,
        })
      );
    }
    setReady(true);
  }, [mine.data, ready]);

  const canNext = step === 1 ? step1Valid(draft) : step === 2 ? step2Valid(draft) : step3Valid(draft);

  const stepLabels = useMemo(
    () => [t("m.studio.step_basic"), t("m.studio.step_pricing"), t("m.studio.step_slots")],
    [t]
  );

  async function save() {
    if (!step3Valid(draft)) return;
    setBusy(true);
    try {
      const saved = await saveStudio(normalizeDraft(draft));
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

  function moveField(index: number, delta: number) {
    setDraft((prev) => {
      const to = index + delta;
      if (to < 0 || to >= prev.formFields.length) return prev;
      const next = [...prev.formFields];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return { ...prev, formFields: next };
    });
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
      <KeyboardAwareScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.title, { color: colors.text }]}>{t("m.studio.editor")}</Text>
        <Text style={[styles.note, { color: colors.textMuted }]}>{t("m.studio.watermark_note")}</Text>

        <View style={styles.stepper}>
          {stepLabels.map((label, index) => {
            const n = index + 1;
            const active = step === n;
            const done = step > n;
            return (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: active || done ? colors.brand : colors.border,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.stepDotText, { color: active || done ? "#fff" : colors.textMuted }]}>{n}</Text>
                </View>
                <Text style={[styles.stepLabel, { color: active ? colors.text : colors.textMuted }]} numberOfLines={1}>
                  {label}
                </Text>
                {index < stepLabels.length - 1 ? (
                  <View style={[styles.stepLine, { backgroundColor: done ? colors.brand : colors.border }]} />
                ) : null}
              </View>
            );
          })}
        </View>

        {step === 1 ? (
          <>
            <SectionCard title={t("m.studio.step_basic")} colors={colors}>
              <Field label={t("m.studio.category")} colors={colors} required>
                <Pressable
                  onPress={() => setCategoryOpen(true)}
                  style={[styles.select, inputStyle(colors)]}
                  accessibilityRole="button"
                >
                  <Text style={{ color: draft.category ? colors.text : colors.textMuted, flex: 1 }}>
                    {draft.category ? studioCategoryDisplay(draft.category) : t("m.studio.category_ph")}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </Pressable>
              </Field>
              <Field label={t("m.studio.title")} colors={colors} required>
                <KeyboardAwareTextInput
                  value={draft.title}
                  onChangeText={(title) => setDraft((prev) => ({ ...prev, title }))}
                  style={[styles.input, inputStyle(colors)]}
                  placeholder={t("m.studio.title_ph")}
                  placeholderTextColor={colors.textMuted}
                />
              </Field>
              <Field label={t("m.studio.about")} colors={colors}>
                <KeyboardAwareTextInput
                  value={draft.about}
                  onChangeText={(about) => setDraft((prev) => ({ ...prev, about }))}
                  style={[styles.input, styles.multi, inputStyle(colors)]}
                  multiline
                  placeholder={t("m.studio.about_ph")}
                  placeholderTextColor={colors.textMuted}
                />
              </Field>
            </SectionCard>

            <SectionCard title={t("m.studio.blocks")} colors={colors}>
              <StudioPortfolioEditor
                coverUrl={draft.coverUrl}
                blocks={draft.blocks}
                busy={busy}
                onCover={(coverUrl) => setDraft((prev) => ({ ...prev, coverUrl }))}
                onBlocks={(blocks) => setDraft((prev) => ({ ...prev, blocks }))}
                onBusy={setBusy}
              />
            </SectionCard>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <SectionCard title={t("m.studio.tiers")} colors={colors}>
              {draft.tiers.map((tier) => (
                <View key={tier.id} style={styles.row}>
                  <KeyboardAwareTextInput
                    value={tier.name}
                    onChangeText={(name) => patchTier(tier.id, { name })}
                    style={[styles.input, styles.grow, inputStyle(colors)]}
                    placeholder={t("m.studio.tier_name")}
                    placeholderTextColor={colors.textMuted}
                  />
                  <KeyboardAwareTextInput
                    value={String(tier.price || "")}
                    onChangeText={(value) => patchTier(tier.id, { price: Number(value.replace(/[^0-9]/g, "")) || 0 })}
                    keyboardType="number-pad"
                    style={[styles.input, styles.price, inputStyle(colors)]}
                    placeholder="80"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.inline, { color: colors.textMuted }]}>{t("m.studio.moco")}</Text>
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
            </SectionCard>

            <SectionCard title={t("m.studio.addons")} colors={colors}>
              {draft.addons.map((addon) => (
                <View key={addon.id} style={styles.row}>
                  <KeyboardAwareTextInput
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
                    <Text style={{ color: colors.brand, fontWeight: "800" }}>{addon.mode === "percent" ? "%" : t("m.studio.moco")}</Text>
                  </Pressable>
                  <KeyboardAwareTextInput
                    value={String(addon.amount || "")}
                    onChangeText={(value) => patchAddon(addon.id, { amount: Number(value.replace(/[^0-9]/g, "")) || 0 })}
                    keyboardType="number-pad"
                    style={[styles.input, styles.price, inputStyle(colors)]}
                    placeholder={addon.mode === "percent" ? "100" : "10"}
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
            </SectionCard>

            <SectionCard title={t("m.studio.rules")} colors={colors}>
              <View style={styles.row}>
                <Text style={[styles.inline, { color: colors.text }]}>{t("m.studio.days")}</Text>
                <KeyboardAwareTextInput
                  value={String(draft.deliveryDays)}
                  onChangeText={(value) =>
                    setDraft((prev) => ({ ...prev, deliveryDays: Number(value.replace(/[^0-9]/g, "")) || 0 }))
                  }
                  keyboardType="number-pad"
                  style={[styles.input, styles.price, inputStyle(colors)]}
                />
              </View>
              <Field label={t("m.studio.revisions")} colors={colors} hint={t("m.studio.revisions_tooltip")}>
                <KeyboardAwareTextInput
                  value={draft.revisionNote}
                  onChangeText={(revisionNote) => setDraft((prev) => ({ ...prev, revisionNote }))}
                  style={[styles.input, styles.multi, inputStyle(colors)]}
                  multiline
                  placeholder={t("m.studio.revisions")}
                  placeholderTextColor={colors.textMuted}
                />
              </Field>
            </SectionCard>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <SectionCard title={t("m.studio.slots")} colors={colors}>
              <View style={styles.row}>
                <Text style={[styles.inline, { color: colors.text }]}>
                  {draft.open ? t("m.studio.open") : t("m.studio.closed")}
                </Text>
                <Switch value={draft.open} onValueChange={(open) => setDraft((prev) => ({ ...prev, open }))} />
                <KeyboardAwareTextInput
                  value={String(draft.slotCap)}
                  onChangeText={(value) =>
                    setDraft((prev) => ({ ...prev, slotCap: Number(value.replace(/[^0-9]/g, "")) || 0 }))
                  }
                  keyboardType="number-pad"
                  style={[styles.input, styles.price, inputStyle(colors)]}
                />
              </View>
            </SectionCard>

            <SectionCard title={t("m.studio.form")} colors={colors}>
              <Text style={[styles.hint, { color: colors.textMuted }]}>{t("m.studio.form_hint")}</Text>
              {draft.formFields.map((field, index) => (
                <View key={field.id} style={[styles.fieldCard, { borderColor: colors.border }]}>
                  <View style={styles.row}>
                    <View style={styles.handleCol}>
                      <Pressable onPress={() => moveField(index, -1)} hitSlop={6} disabled={index === 0}>
                        <Ionicons name="chevron-up" size={16} color={index === 0 ? colors.border : colors.brand} />
                      </Pressable>
                      <Ionicons name="menu" size={16} color={colors.textMuted} />
                      <Pressable
                        onPress={() => moveField(index, 1)}
                        hitSlop={6}
                        disabled={index === draft.formFields.length - 1}
                      >
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={index === draft.formFields.length - 1 ? colors.border : colors.brand}
                        />
                      </Pressable>
                    </View>
                    <KeyboardAwareTextInput
                      value={field.label}
                      onChangeText={(label) => patchField(field.id, { label })}
                      style={[styles.input, styles.grow, inputStyle(colors)]}
                      placeholder={t("m.studio.field_name")}
                      placeholderTextColor={colors.textMuted}
                    />
                    <Pressable
                      onPress={() =>
                        setDraft((prev) => ({
                          ...prev,
                          formFields: prev.formFields.length > 1 ? prev.formFields.filter((item) => item.id !== field.id) : prev.formFields,
                        }))
                      }
                      hitSlop={8}
                      disabled={draft.formFields.length < 2}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={draft.formFields.length < 2 ? colors.border : colors.terracotta}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => patchField(field.id, { kind: field.kind === "image" ? "text" : "image" })}
                      style={[styles.mode, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.brand, fontWeight: "800", fontSize: 11 }}>
                        {field.kind === "image" ? t("m.studio.image") : t("m.studio.text")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => patchField(field.id, { required: !field.required })}
                      style={styles.requiredRow}
                    >
                      <Ionicons
                        name={field.required ? "checkbox" : "square-outline"}
                        size={18}
                        color={field.required ? colors.terracotta : colors.textMuted}
                      />
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>{t("m.studio.required")}</Text>
                    </Pressable>
                  </View>
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
            </SectionCard>
          </>
        ) : null}

        <View style={styles.navRow}>
          {step > 1 ? (
            <Pressable
              style={[styles.navBtn, step === 3 ? styles.navBack : null, { borderColor: colors.border }]}
              onPress={() => {
                setStep((s) => Math.max(1, s - 1));
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "800" }}>{t("m.studio.back")}</Text>
            </Pressable>
          ) : (
            <View style={styles.navSpacer} />
          )}
          {step < 3 ? (
            <Pressable
              style={[
                styles.navBtn,
                styles.navPrimary,
                { backgroundColor: colors.brand, opacity: canNext ? 1 : 0.45 },
              ]}
              disabled={!canNext}
              onPress={() => {
                setStep((s) => Math.min(3, s + 1));
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>{t("m.studio.next")}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.navBtn,
                styles.navPublish,
                { backgroundColor: colors.terracotta, opacity: canNext && !busy ? 1 : 0.45 },
              ]}
              disabled={busy || !canNext}
              onPress={() => void save()}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t("m.studio.save")}</Text>}
            </Pressable>
          )}
        </View>
      </KeyboardAwareScrollView>

      <Modal visible={categoryOpen} animationType="slide" transparent onRequestClose={() => setCategoryOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCategoryOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("m.studio.category")}</Text>
            <ScrollView
              style={{ height: categoryListHeight }}
              contentContainerStyle={styles.modalScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bounces
            >
              {studioCategoryGroups().map(([group, items]) => (
                <View key={group} style={styles.modalGroup}>
                  <Text style={[styles.modalGroupTitle, { color: colors.textMuted }]}>{group}</Text>
                  {items.map((item) => {
                    const active = draft.category === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          setDraft((prev) => ({ ...prev, category: item.id }));
                          setCategoryOpen(false);
                        }}
                        style={[styles.modalOption, active && { backgroundColor: colors.brand + "22" }]}
                      >
                        <Text style={{ color: colors.text, fontWeight: active ? "800" : "600" }}>{item.label}</Text>
                        {active ? <Ionicons name="checkmark" size={18} color={colors.brand} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function inputStyle(colors: { border: string; text: string; surface: string }) {
  return { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface };
}

function SectionCard({
  title,
  children,
  colors,
}: {
  title: string;
  children: ReactNode;
  colors: { text: string; border: string; surface: string };
}) {
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  children,
  colors,
  required,
  hint,
}: {
  label: string;
  children: ReactNode;
  colors: { textMuted: string };
  required?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {label}
        {required ? " *" : ""}
      </Text>
      {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Text style={{ color: colors.brand, fontWeight: "800", paddingVertical: 8 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 48, gap: 16 },
  title: { fontSize: 22, fontWeight: "800" },
  note: { fontSize: 12, fontWeight: "600", lineHeight: 18 },
  stepper: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 },
  stepItem: { flex: 1, alignItems: "center", position: "relative" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotText: { fontSize: 13, fontWeight: "800" },
  stepLabel: { fontSize: 10, fontWeight: "700", marginTop: 6, textAlign: "center", paddingHorizontal: 2 },
  stepLine: {
    position: "absolute",
    top: 14,
    left: "58%",
    width: "84%",
    height: 2,
    zIndex: -1,
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  cardBody: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700" },
  hint: { fontSize: 11, fontWeight: "600", lineHeight: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  select: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  multi: { minHeight: 96, textAlignVertical: "top" },
  gallery: { gap: 10, paddingVertical: 4 },
  thumbWrap: { alignItems: "center", gap: 4 },
  thumbPress: { borderRadius: 12 },
  thumb: { width: 88, height: 88, borderRadius: 12 },
  thumbTag: { color: "#fff", fontWeight: "800", textAlign: "center", marginTop: 34 },
  thumbActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  add: { borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  fieldCard: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  handleCol: { alignItems: "center", gap: 2, paddingRight: 2 },
  requiredRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  grow: { flex: 1 },
  price: { width: 96 },
  mode: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 10 },
  inline: { fontWeight: "700", flex: 1 },
  save: { marginTop: 4, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  navRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  navBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navBack: { flex: 3 },
  navPublish: { flex: 7, borderWidth: 0 },
  navPrimary: { borderWidth: 0 },
  navSpacer: { flex: 1 },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  modalScrollContent: { paddingBottom: 12 },
  modalGroup: { marginBottom: 12 },
  modalGroupTitle: { fontSize: 12, fontWeight: "800", marginBottom: 6, textTransform: "uppercase" },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
});

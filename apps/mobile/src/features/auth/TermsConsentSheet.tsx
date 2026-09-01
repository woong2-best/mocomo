import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/config/env";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";
import { radii } from "@/theme/tokens";

const WEB = API_BASE_URL.replace(/\/$/, "");

export type TermsAccountPreview = {
  email: string | null;
  name: string | null;
  image: string | null;
};

type Props = {
  visible: boolean;
  account?: TermsAccountPreview | null;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onAgree: (opts: { marketing: boolean }) => void;
};

function Checkbox({
  colors,
  checked,
  onPress,
  label,
  required,
  linkPath,
}: {
  colors: ThemeColors;
  checked: boolean;
  onPress: () => void;
  label: string;
  required?: boolean;
  linkPath?: string;
}) {
  return (
    <View style={styles.checkRow}>
      <Pressable style={styles.checkTap} onPress={onPress} hitSlop={8}>
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.border },
            checked && { backgroundColor: colors.brand, borderColor: colors.brand },
          ]}
        >
          {checked ? (
            <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />
          ) : null}
        </View>
        <Text style={[styles.checkLabel, { color: colors.text }]}>
          {required ? "(필수) " : "(선택) "}
          {label}
        </Text>
      </Pressable>
      {linkPath ? (
        <Pressable onPress={() => void Linking.openURL(`${WEB}${linkPath}`)} hitSlop={8}>
          <Text style={[styles.viewLink, { color: colors.textMuted }]}>보기 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Terms gate shown before a brand-new account is created. */
export function TermsConsentSheet({
  visible,
  account,
  busy,
  error,
  onClose,
  onAgree,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTerms(false);
      setPrivacy(false);
      setMarketing(false);
    }
  }, [visible]);

  const allChecked = terms && privacy && marketing;
  const requiredOk = terms && privacy;
  const canSubmit = requiredOk && !busy;

  function toggleAll() {
    const next = !allChecked;
    setTerms(next);
    setPrivacy(next);
    setMarketing(next);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.scrim}
          onPress={() => {
            if (!busy) onClose();
          }}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <Text style={[styles.title, { color: colors.text }]}>
            MoCoMo 시작하기
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            처음 오셨네요. 약관에 동의하면 계정이 만들어집니다.
          </Text>

          {account ? (
            <View
              style={[
                styles.accountCard,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
              ]}
            >
              <FolkAvatar
                uri={account.image}
                name={account.name || account.email || "MoCoMo"}
                size={40}
              />
              <View style={styles.accountText}>
                <Text
                  style={[styles.accountName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {account.name || account.email || "새 계정"}
                </Text>
                {account.email ? (
                  <Text
                    style={[styles.accountEmail, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {account.email}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Checkbox
              colors={colors}
              checked={allChecked}
              onPress={toggleAll}
              label="전체 동의"
            />
            <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

            <Checkbox
              colors={colors}
              checked={terms}
              onPress={() => setTerms((v) => !v)}
              label="이용약관 동의"
              required
              linkPath="/legal/terms"
            />
            <Checkbox
              colors={colors}
              checked={privacy}
              onPress={() => setPrivacy((v) => !v)}
              label="개인정보 수집 및 이용 동의"
              required
              linkPath="/legal/privacy"
            />
            <Checkbox
              colors={colors}
              checked={marketing}
              onPress={() => setMarketing((v) => !v)}
              label="마케팅 정보 수신 동의"
              linkPath="/legal/policy"
            />
            <Text style={[styles.marketingHint, { color: colors.textMuted }]}>
              다양한 혜택과 프로그램 참여 기회를 약관에 따라 알려드릴게요!
            </Text>

            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
              MoCoMo는 크리에이터·팬 커뮤니티 서비스입니다. 운영 정책을 위반하는
              콘텐츠 게시·유포 시 이용 제한 또는 법적 조치를 받을 수 있습니다.
            </Text>
          </ScrollView>

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          <Pressable
            style={[
              styles.agreeBtn,
              { backgroundColor: canSubmit ? colors.brand : colors.muted },
            ]}
            disabled={!canSubmit}
            onPress={() => onAgree({ marketing })}
          >
            {busy ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text
                style={[
                  styles.agreeText,
                  { color: requiredOk ? colors.textOnAccent : colors.textMuted },
                ]}
              >
                동의하고 시작하기
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(9, 16, 30, 0.6)" },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "84%",
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  accountText: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: "700" },
  accountEmail: { fontSize: 13, marginTop: 2 },
  scroll: { flexGrow: 0, marginBottom: 12 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  checkTap: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { fontSize: 15, fontWeight: "600", flex: 1 },
  viewLink: { fontSize: 14, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  marketingHint: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 34,
    marginBottom: 16,
  },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 8 },
  error: { fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 10 },
  agreeBtn: {
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  agreeText: { fontSize: 16, fontWeight: "800" },
});

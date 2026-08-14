import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchSellerOnboardingState } from "@/api/commerce-market";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { openMobileWebSession } from "@/lib/open-web-session";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const STEP_LABELS: Record<string, string> = {
  AGREEMENTS: "약관 동의",
  EMAIL: "이메일 인증",
  PHONE: "휴대폰·계좌 인증",
  SELLER_INFO: "판매자 정보 (개인/사업자)",
  KYC: "본인 확인",
  SETTLEMENT: "정산·Stripe 연동",
  COMPLETE: "등록 완료",
  ACCOUNT: "계정",
};

export function SellerRegisterScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [opening, setOpening] = useState(false);

  const query = useQuery({
    queryKey: ["mobile-seller-onboarding"],
    queryFn: fetchSellerOnboardingState,
  });

  const state = query.data;
  const complete = state?.step === "COMPLETE" || state?.profile?.canList;

  async function openRegister(callback?: string) {
    setOpening(true);
    try {
      await openMobileWebSession(
        callback ?? "/market/seller/register?callbackUrl=/market/sell-item"
      );
      await query.refetch();
    } finally {
      setOpening(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="판매자 등록" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.terracotta} />
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + 32,
            gap: 16,
          }}
        >
          <Text style={styles.eyebrow}>MOCOMO {MARKET_BRAND_NAME}</Text>
          <Text style={styles.title}>판매자 온보딩</Text>
          <Text style={styles.body}>
            약관 동의, 이메일·휴대폰 인증, 개인/사업자 등록(국세청 검증), 계좌 1원 인증, 본인
            확인, Stripe 정산까지 웹과 동일한 절차로 진행됩니다.
          </Text>

          {state ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>현재 단계</Text>
              <Text style={styles.statusValue}>{STEP_LABELS[state.step] ?? state.step}</Text>
              {state.settlementPhase ? (
                <Text style={styles.statusSub}>정산: {state.settlementPhase}</Text>
              ) : null}
              <View style={styles.checklist}>
                <Check ok={state.emailVerified} label="이메일 인증" />
                <Check ok={!state.phoneRequired || state.phoneVerified} label="휴대폰·계좌 인증" />
                <Check ok={!!state.profile?.sellerType} label="판매자 유형 (개인/사업자)" />
                <Check
                  ok={!!state.profile?.businessVerifiedAt}
                  label="사업자 검증 (해당 시)"
                />
                <Check
                  ok={state.connectReady || !!state.settlementDeclared}
                  label="정산 연동"
                />
                <Check ok={!!complete} label="판매 가능" />
              </View>
            </View>
          ) : null}

          {complete ? (
            <>
              <FolkButton
                label="판매 등록하기"
                onPress={() => navigation.navigate("MarketSellItem")}
              />
              <FolkButton
                label="내 판매 관리"
                variant="secondary"
                onPress={() => navigation.navigate("SellerListings")}
              />
            </>
          ) : (
            <FolkButton
              label={opening ? "브라우저 여는 중…" : "웹에서 판매자 등록 계속하기"}
              onPress={() => void openRegister()}
              disabled={opening}
            />
          )}

          <FolkButton
            label="판매자 센터 (웹)"
            variant="secondary"
            onPress={() => void openRegister("/market/seller")}
            disabled={opening}
          />

          <Text style={styles.note}>
            브라우저에서 등록을 마친 뒤 앱으로 돌아와 새로고침하면 상태가 반영됩니다.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 13, color: ok ? colors.success : colors.textMuted, fontWeight: "600" }}>
      {ok ? "✓" : "○"} {label}
    </Text>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    eyebrow: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
      color: colors.terracotta,
      textTransform: "uppercase",
    },
    title: { fontSize: 22, fontWeight: "800", color: colors.text },
    body: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
    statusCard: {
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      backgroundColor: colors.surfaceRaised,
      gap: 8,
    },
    statusLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "700" },
    statusValue: { fontSize: 18, fontWeight: "800", color: colors.cobalt },
    statusSub: { fontSize: 13, color: colors.textMuted },
    checklist: { marginTop: 8, gap: 6 },
    note: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  });
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/auth/AuthContext";
import {
  acceptLatestTerms,
  fetchTermsAgreementStatus,
  parseTermsPayload,
  type TermsAgreementInfo,
} from "@/api/terms-agreement";
import { subscribeTermsRequired } from "@/legal/terms-required-event";
import { useAppForeground } from "@/api/app-foreground";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

async function loadRequiredTerms(): Promise<TermsAgreementInfo | null> {
  try {
    return await fetchTermsAgreementStatus();
  } catch {
    /* 403 TERMS_REQUIRED is emitted by the API client */
    return null;
  }
}

export function TermsAgreementModalHost() {
  const { status, signOut, refreshMe } = useAuth();
  const { colors } = useTheme();
  const themed = useMemo(() => createThemed(colors), [colors]);
  const [terms, setTerms] = useState<TermsAgreementInfo | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const acceptedVersionRef = useRef<string | null>(null);
  const shownVersionRef = useRef<string | null>(null);
  const toggleLockRef = useRef(0);

  const openTerms = useCallback((next: TermsAgreementInfo | null) => {
    if (!next) {
      shownVersionRef.current = null;
      setTerms(null);
      setAgreed(false);
      return;
    }
    if (acceptedVersionRef.current && acceptedVersionRef.current === next.versionTag) {
      return;
    }
    if (shownVersionRef.current === next.versionTag) {
      setTerms((prev) => prev ?? next);
      return;
    }
    shownVersionRef.current = next.versionTag;
    setAgreed(false);
    setTerms(next);
  }, []);

  useEffect(() => {
    return subscribeTermsRequired((payload) => {
      openTerms(parseTermsPayload(payload));
    });
  }, [openTerms]);

  useEffect(() => {
    if (status !== "signedIn") {
      acceptedVersionRef.current = null;
      openTerms(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = await loadRequiredTerms();
      if (cancelled) return;
      if (!next) {
        if (!acceptedVersionRef.current) openTerms(null);
        return;
      }
      openTerms(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, openTerms]);

  useAppForeground((backgroundedMs) => {
    if (status !== "signedIn" || backgroundedMs < 300) return;
    void (async () => {
      const next = await loadRequiredTerms();
      if (next) openTerms(next);
    })();
  });

  const onAccept = useCallback(async () => {
    if (!agreed || accepting) return;
    setAccepting(true);
    try {
      const accepted = await acceptLatestTerms();
      acceptedVersionRef.current =
        terms?.versionTag || accepted?.versionTag || "accepted";
      shownVersionRef.current = null;
      setTerms(null);
      setAgreed(false);
      await refreshMe();
    } catch {
      /* keep modal open */
    } finally {
      setAccepting(false);
    }
  }, [agreed, accepting, refreshMe, terms?.versionTag]);

  const onDecline = useCallback(async () => {
    acceptedVersionRef.current = null;
    openTerms(null);
    await signOut();
  }, [openTerms, signOut]);

  const onReview = useCallback(async () => {
    if (!terms) return;
    await WebBrowser.openBrowserAsync(terms.termsUrl);
  }, [terms]);

  const onToggleAgree = useCallback(() => {
    const now = Date.now();
    if (now - toggleLockRef.current < 280) return;
    toggleLockRef.current = now;
    setAgreed((prev) => !prev);
  }, []);

  if (!terms) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.scrim} pointerEvents="auto">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => undefined}
          accessibilityElementsHidden
        />
        <View style={[styles.card, themed.card]} pointerEvents="auto">
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            <Text style={[styles.title, themed.title]}>
              Notice of Updated Terms of Service
            </Text>
            <Text style={[styles.body, themed.body]}>
              Hi there, we have updated our Terms of Service to comply with updated legal
              standards and improve our operations.
            </Text>
            <Text style={[styles.body, themed.body, styles.spaced]}>
              Please review the changes through the link below before continuing:
            </Text>
            <Text style={[styles.body, themed.body, styles.spaced]}>
              👉{" "}
              <Text style={styles.link} onPress={onReview}>
                Review the Revised Terms of Service (Effective Date: {terms.effectiveDate})
              </Text>
            </Text>
            <Text style={[styles.body, themed.body, styles.spaced]}>
              * By clicking &quot;Accept and Continue&quot;, you agree to the revised Terms.
            </Text>
            <Text style={[styles.body, themed.body, styles.spaced]}>
              * If you do not agree, you will no longer be able to access our services, and
              you may choose to close your account.
            </Text>
            <Pressable
              style={styles.checkRow}
              onPress={onToggleAgree}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              <View style={[styles.box, agreed && themed.boxOn]}>
                {agreed ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={[styles.checkLabel, themed.body]}>
                I agree to the updated Terms of Service. (Required)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.primary, themed.primary, (!agreed || accepting) && styles.disabled]}
              disabled={!agreed || accepting}
              onPress={onAccept}
              accessibilityRole="button"
            >
              <Text style={styles.primaryLabel}>
                {accepting ? "Saving…" : "Accept and Continue"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.secondary, themed.secondary]}
              disabled={accepting}
              onPress={onDecline}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryLabel, themed.secondaryLabel]}>
                Decline / Close Account
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createThemed(colors: ThemeColors) {
  return {
    card: { backgroundColor: colors.surfaceRaised },
    title: { color: colors.cobalt },
    body: { color: colors.textMuted },
    primary: { backgroundColor: colors.terracotta },
    secondary: { borderColor: colors.borderStrong },
    secondaryLabel: { color: colors.text },
    boxOn: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  };
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "88%",
    borderRadius: radii.lg,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  spaced: {
    marginTop: 10,
  },
  link: {
    color: "#3B82F6",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 18,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#9AA4B2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkMark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primary: {
    marginTop: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondary: {
    marginTop: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.45,
  },
});

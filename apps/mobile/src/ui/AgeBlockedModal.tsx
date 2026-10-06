import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { navigateFromPush } from "@/navigation/navigationRef";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

export type AgeBlockedKind = "r18" | "qna" | "nsfw-view" | "money-missing" | "money-underage";

type Listener = (kind: AgeBlockedKind) => void;
const listeners = new Set<Listener>();

export function showAgeBlockedModal(kind: AgeBlockedKind) {
  for (const listener of listeners) listener(kind);
}

function DateOfBirthLink({ onPress }: { onPress: () => void }) {
  return (
    <Text style={styles.link} onPress={onPress}>
      Date of birth
    </Text>
  );
}

function Highlight({ word, onPress }: { word: string; onPress: () => void }) {
  return (
    <Text>
      {word} <DateOfBirthLink onPress={onPress} />
    </Text>
  );
}

function AgeBlockedBody({
  kind,
  onBirthDate,
}: {
  kind: AgeBlockedKind;
  onBirthDate: () => void;
}) {
  if (kind === "r18") {
    return (
      <Text style={styles.body}>
        Only users aged 19+ by the birth date on their profile can use{" "}
        <Highlight word="R-18" onPress={onBirthDate} />{" "}
        <Highlight word="categories" onPress={onBirthDate} />.
      </Text>
    );
  }
  if (kind === "qna") {
    return (
      <Text style={styles.body}>
        Only users aged 19+ by the birth date on their profile can use{" "}
        <Highlight word="NSFW" onPress={onBirthDate} />{" "}
        <Highlight word="categories" onPress={onBirthDate} />.
      </Text>
    );
  }
  if (kind === "nsfw-view") {
    return (
      <Text style={styles.body}>
        Only users aged 19+ by the birth date on their profile can view{" "}
        <Highlight word="NSFW" onPress={onBirthDate} /> posts.
      </Text>
    );
  }
  if (kind === "money-underage") {
    return (
      <Text style={styles.body}>
        Payments, tips, and transfers are only available to users 18 or older.{" "}
        <DateOfBirthLink onPress={onBirthDate} />
      </Text>
    );
  }
  return (
    <Text style={styles.body}>
      Add your date of birth to use payments, tips, and transfers.{" "}
      <DateOfBirthLink onPress={onBirthDate} />
    </Text>
  );
}

function titleFor(kind: AgeBlockedKind) {
  if (kind === "money-missing" || kind === "money-underage") {
    return "Date of birth confirmation";
  }
  return "Adults only";
}

export function AgeBlockedModal({
  visible,
  kind,
  onClose,
}: {
  visible: boolean;
  kind: AgeBlockedKind;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const themed = useMemo(() => createThemed(colors), [colors]);

  function openBirthDate() {
    onClose();
    navigateFromPush("ProfileEdit");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.card, themed.card]} onPress={(e) => e.stopPropagation()}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
          <Text style={[styles.title, themed.title]}>{titleFor(kind)}</Text>
          <AgeBlockedBody kind={kind} onBirthDate={openBirthDate} />
          <Pressable style={[styles.ok, themed.ok]} onPress={onClose} accessibilityRole="button">
            <Text style={styles.okLabel}>OK</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AgeBlockedModalHost() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AgeBlockedKind>("r18");

  useEffect(() => {
    const listener: Listener = (next) => {
      setKind(next);
      setOpen(true);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return <AgeBlockedModal visible={open} kind={kind} onClose={() => setOpen(false)} />;
}

function createThemed(colors: ThemeColors) {
  return {
    card: { backgroundColor: colors.surfaceRaised },
    title: { color: colors.cobalt },
    ok: { backgroundColor: colors.terracotta },
  };
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radii.lg,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  close: {
    position: "absolute",
    right: 14,
    top: 14,
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    paddingRight: 28,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: "#9AA4B2",
  },
  link: {
    color: "#F97316",
    fontWeight: "700",
  },
  ok: {
    marginTop: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  okLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});

import { Modal, Pressable, StyleSheet, View } from "react-native";
import { CrtFrame, PhosphorText } from "@/ui/CrtTerminal";

export type MocomoAlertAction = {
  label: string;
  onPress?: () => void;
  primary?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  actions: MocomoAlertAction[];
  onDismiss?: () => void;
  embedded?: boolean;
};

function DialogBody({
  title,
  message,
  actions,
  onDismiss,
}: Omit<Props, "visible" | "embedded">) {
  const hasPrimary = actions.some((a) => a.primary);
  const cancel = hasPrimary ? actions.find((a) => !a.primary) : undefined;
  const rest = hasPrimary ? actions.filter((a) => a.primary) : actions;

  const run = (action?: MocomoAlertAction) => {
    onDismiss?.();
    action?.onPress?.();
  };

  return (
    <Pressable style={styles.scrim} onPress={onDismiss} accessibilityRole="button">
      <Pressable style={styles.wrap} onPress={(e) => e.stopPropagation()}>
        <CrtFrame title="man">
          <View style={styles.body}>
            <PhosphorText glow style={styles.title}>
              {title}
            </PhosphorText>
            {message ? (
              <PhosphorText dim style={styles.message}>
                {message}
              </PhosphorText>
            ) : null}
            <View style={styles.actions}>
              {cancel ? (
                <Pressable
                  onPress={() => run(cancel)}
                  style={({ pressed }) => [styles.actionHit, pressed && styles.actionPressed]}
                  accessibilityRole="button"
                >
                  <PhosphorText dim style={styles.actionLabel}>
                    {cancel.label}
                  </PhosphorText>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={styles.primaryRow}>
                {rest.map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={() => run(action)}
                    style={({ pressed }) => [styles.actionHit, pressed && styles.actionPressed]}
                    accessibilityRole="button"
                  >
                    <PhosphorText glow style={styles.actionLabel}>
                      [{action.label}]
                    </PhosphorText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </CrtFrame>
      </Pressable>
    </Pressable>
  );
}

/** CRT dialog — phosphor green on tube black. No Android system chrome. */
export function MocomoAlertDialog({
  visible,
  title,
  message,
  actions,
  onDismiss,
  embedded = false,
}: Props) {
  if (!visible) return null;
  const body = (
    <DialogBody title={title} message={message} actions={actions} onDismiss={onDismiss} />
  );
  if (embedded) return body;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  wrap: { width: "100%", maxWidth: 380 },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: { fontSize: 16, letterSpacing: 0.4 },
  message: { marginTop: 10, fontSize: 13, lineHeight: 20 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  primaryRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionHit: { paddingVertical: 12, paddingHorizontal: 8 },
  actionPressed: { opacity: 0.65 },
  actionLabel: { fontSize: 13, letterSpacing: 0.3 },
});

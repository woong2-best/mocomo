import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FolkButton } from "@/ui/FolkButton";
import { spacing } from "@/theme/tokens";
import { translate } from "@/i18n/runtime";

type Props = {
  children: ReactNode;
  label?: string;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

/** Catches render errors so one bad screen does not kill the whole app. */
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ScreenErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`, error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>{translate("m.ui.could_not_load_this_screen")}</Text>
          <Text style={styles.message}>
            {this.props.label ? `${this.props.label} ` : ""}
            {translate("m.ui.something_went_wrong_try_again")}
          </Text>
          <FolkButton label={translate("toast.retry")} onPress={this.retry} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.75,
    marginBottom: 8,
  },
});

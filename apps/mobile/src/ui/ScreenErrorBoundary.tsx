import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FolkButton } from "@/ui/FolkButton";
import { spacing } from "@/theme/tokens";

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
          <Text style={styles.title}>화면을 불러오지 못했습니다</Text>
          <Text style={styles.message}>
            {this.props.label ? `${this.props.label} ` : ""}오류가 발생했습니다. 다시 시도해 주세요.
          </Text>
          <FolkButton label="다시 시도" onPress={this.retry} />
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

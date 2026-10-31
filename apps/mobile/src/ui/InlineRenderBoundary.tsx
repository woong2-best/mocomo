import { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

type Props = {
  children: ReactNode;
  /** Plain-text fallback when a child throws during render (e.g. caption linkify). */
  fallbackText?: string;
  fallbackStyle?: StyleProp<TextStyle>;
  resetKey?: string;
};

type State = { failed: boolean };

/** Keeps one bad inline subtree from taking down the whole screen. */
export class InlineRenderBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[InlineRenderBoundary]", error.message, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      const plain = this.props.fallbackText?.trim();
      if (!plain) return null;
      return (
        <Text style={this.props.fallbackStyle} numberOfLines={3}>
          {plain}
        </Text>
      );
    }
    return this.props.children;
  }
}

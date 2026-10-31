import { Component, type ErrorInfo, type ReactNode } from "react";
import { View } from "react-native";

type Props = {
  width: number;
  height: number;
  resetKey?: string;
  children: ReactNode;
};

type State = { failed: boolean };

/** One bad reel/ad must not replace the whole Reels screen with ScreenErrorBoundary. */
export class ReelSlotBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ReelSlotBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <View
          style={{
            width: this.props.width,
            height: this.props.height,
            backgroundColor: "#000",
          }}
        />
      );
    }
    return this.props.children;
  }
}

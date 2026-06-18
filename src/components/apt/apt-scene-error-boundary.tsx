"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AptSceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AptSceneErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="folk-card flex min-h-[min(80dvh,760px)] flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm font-semibold text-folk-cobalt">3D 뷰를 불러오지 못했습니다</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            브라우저 WebGL 지원 여부를 확인하거나 페이지를 새로고침해 주세요.
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={() => this.setState({ hasError: false })}>
            다시 시도
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

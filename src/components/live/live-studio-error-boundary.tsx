"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { LiveBrowserStudio } from "@/components/live/live-browser-studio";
import { AppErrorState } from "@/components/ui/app-error-state";

type Props = {
  children: ReactNode;
  channelId?: string;
  channelName?: string;
  onEndStream?: () => void;
  /** true: 영상 칸만 오류 표시, 스튜디오 전체는 유지 */
  inline?: boolean;
  /** inline 오류 시 브라우저 방송 패널로 대체 */
  hostObsFallback?: boolean;
};

type State = {
  hasError: boolean;
  message: string;
};

export class LiveStudioErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    const msg = error.message?.trim() || "알 수 없는 오류";
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[live-studio-error]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (
      this.props.inline &&
      this.props.hostObsFallback &&
      this.props.channelId &&
      this.props.onEndStream
    ) {
      return (
        <div className="space-y-2">
          <p className="text-xs text-amber-700 dark:text-amber-300 px-1">
            영상 UI 오류 — 방송 패널만 표시합니다. (Ctrl+Shift+R 권장)
          </p>
          <LiveBrowserStudio
            channelId={this.props.channelId}
            channelName={this.props.channelName ?? "방송"}
            onEndStream={this.props.onEndStream}
          />
        </div>
      );
    }

    if (this.props.inline) {
      return (
        <div className="aspect-video rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-destructive">{this.state.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            다시 시도
          </Button>
        </div>
      );
    }

    return (
      <AppErrorState
        title="스튜디오를 열지 못했습니다"
        description={this.state.message}
        icon={AlertTriangle}
        variant="destructive"
        onRetry={() => this.setState({ hasError: false, message: "" })}
        primaryHref={this.props.channelId ? `/voice/${this.props.channelId}` : "/live"}
        primaryLabel={this.props.channelId ? "페이지 새로고침" : "라이브 홈"}
        secondaryHref={this.props.channelId ? "/live" : undefined}
        secondaryLabel={this.props.channelId ? "라이브 홈" : undefined}
      />
    );
  }
}

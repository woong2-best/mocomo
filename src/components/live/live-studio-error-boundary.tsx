"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { LiveBrowserStudio } from "@/components/live/live-browser-studio";

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
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
          <h2 className="text-lg font-bold">스튜디오를 열지 못했습니다</h2>
          <p className="text-sm text-muted-foreground">{this.state.message}</p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              다시 시도
            </Button>
            {this.props.channelId && (
              <Button type="button" className="rounded-xl" asChild>
                <Link href={`/voice/${this.props.channelId}`}>페이지 새로고침</Link>
              </Button>
            )}
            <Button type="button" variant="outline" className="rounded-xl" asChild>
              <Link href="/live">라이브 홈</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

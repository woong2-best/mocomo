"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: ReactNode;
  channelId?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

/** LiveKit·채팅 등 스튜디오 클라이언트 크래시 시 전체 앱 error 대신 표시 */
export class LiveStudioErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    const msg = error.message?.trim() || "알 수 없는 오류";
    if (/RoomContext|LiveKitRoom|useTracks|useLocalParticipant/i.test(msg)) {
      return {
        hasError: true,
        message:
          "영상 서버 연결 컴포넌트 오류입니다. 페이지를 새로고침하거나 브라우저 모드로 다시 시도해 주세요.",
      };
    }
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[live-studio-error]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
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
    return this.props.children;
  }
}

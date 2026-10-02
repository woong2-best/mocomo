"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
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
  /** true: Video 칸만 오류 표시, 스튜디오 전체는 유지 */
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
    const msg = error.message?.trim() || t("live.s10ewre2");
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
            {t("live.ui_ctrl_shift_r")}
          </p>
          <LiveBrowserStudio
            channelId={this.props.channelId}
            channelName={this.props.channelName ?? t("live.sx2fs")}
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
            {t("toast.retry")}
          </Button>
        </div>
      );
    }

    return (
      <AppErrorState
        title={t("live.sbsa93w")}
        description={this.state.message}
        icon={AlertTriangle}
        variant="destructive"
        onRetry={() => this.setState({ hasError: false, message: "" })}
        primaryOnClick={
          this.props.channelId ? () => window.location.reload() : undefined
        }
        primaryHref={this.props.channelId ? undefined : "/live"}
        primaryLabel={this.props.channelId ? t("live.s1nx7peg") : t("live.sx1ht4s")}
        secondaryHref={this.props.channelId ? "/live" : undefined}
        secondaryLabel={this.props.channelId ? t("live.sx1ht4s") : undefined}
      />
    );
  }
}

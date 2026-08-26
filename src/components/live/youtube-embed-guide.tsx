import Image from "next/image";
import { AlertTriangle, ExternalLink } from "lucide-react";

const GUIDE_IMAGES = {
  error: "/live/guides/youtube-embed/error-embed-blocked.png",
  studio: "/live/guides/youtube-embed/studio-webcam.png",
  unchecked: "/live/guides/youtube-embed/settings-unchecked.png",
  checked: "/live/guides/youtube-embed/settings-checked.png",
} as const;

type Props = {
  /** compact = go-live form sidebar, full = standalone card, player = dark in-player fallback */
  variant?: "compact" | "full" | "player";
  watchUrl?: string;
};

export function YoutubeEmbedGuide({ variant = "full", watchUrl }: Props) {
  if (variant === "compact") {
    return (
      <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2.5 text-[11px] leading-relaxed text-red-900 dark:text-red-100">
        <p className="font-semibold">YouTube 라이브 — 퍼가기 허용 필수</p>
        <p className="mt-1 text-muted-foreground">
          MoCoMo에 영상이 보이려면 YouTube Studio에서{" "}
          <strong className="text-foreground">퍼가기 허용</strong>을 켜야 합니다. 아래
          안내를 확인한 뒤 방송을 시작하세요.
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer font-medium text-primary hover:underline">
            설정 방법 보기
          </summary>
          <GuideSteps className="mt-3" imageClassName="rounded-md border" />
        </details>
      </div>
    );
  }

  if (variant === "player") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-y-auto bg-gradient-to-b from-[#1a0a2e] via-black to-black px-4 py-6 text-white">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold">동영상을 재생할 수 없습니다</h2>
              <p className="mt-1 text-sm text-white/70">
                YouTube에서 <strong className="text-white">퍼가기 허용</strong>이 꺼져 있으면
                MoCoMo에 영상이 표시되지 않습니다. 아래 순서대로 설정을 변경해 주세요.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10">
            <Image
              src={GUIDE_IMAGES.error}
              alt="퍼가기 허용이 꺼져 있을 때 MoCoMo에 표시되는 화면"
              width={640}
              height={360}
              className="w-full opacity-90"
            />
          </div>

          <GuideSteps
            className="text-sm"
            imageClassName="rounded-lg border border-white/10 shadow-lg"
          />

          {watchUrl ? (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              <ExternalLink className="h-4 w-4" />
              YouTube에서 보기
            </a>
          ) : null}

          <p className="text-center text-xs text-white/50">
            설정 저장 후 이 페이지를 새로고침하면 영상이 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-base font-semibold">YouTube 라이브 — 퍼가기 허용 설정</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        MoCoMo에서 YouTube 라이브를 임베드하려면 YouTube Studio에서{" "}
        <strong>퍼가기 허용</strong>을 켜야 합니다.
      </p>
      <GuideSteps className="mt-4" imageClassName="rounded-lg border" />
    </div>
  );
}

function GuideSteps({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  const steps = [
    {
      title: "YouTube Studio에서 라이브를 시작합니다",
      body: "studio.youtube.com → 웹캠 또는 스트림으로 라이브 방송을 켭니다.",
      image: GUIDE_IMAGES.studio,
      alt: "YouTube Studio 웹캠 라이브 화면",
    },
    {
      title: "하단 「수정」 버튼을 누릅니다",
      body: "미리보기 아래 컨트롤 바 오른쪽에 있는 「수정」을 클릭합니다.",
      image: GUIDE_IMAGES.studio,
      alt: "수정 버튼 위치",
    },
    {
      title: "세부정보 → 퍼가기 허용 체크",
      body: "「설정 수정」 창에서 세부정보 탭을 선택하고, 라이선스 아래 「퍼가기 허용」에 체크합니다.",
      image: GUIDE_IMAGES.unchecked,
      alt: "퍼가기 허용 체크박스 (꺼짐)",
    },
    {
      title: "저장 후 MoCoMo 새로고침",
      body: "「저장」을 누른 뒤 MoCoMo 방송 페이지를 새로고침하면 영상이 표시됩니다.",
      image: GUIDE_IMAGES.checked,
      alt: "퍼가기 허용 체크박스 (켜짐)",
    },
  ];

  return (
    <ol className={`space-y-4 ${className ?? ""}`}>
      {steps.map((step, i) => (
        <li key={step.title} className="space-y-2">
          <div>
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <span className="font-medium">{step.title}</span>
          </div>
          <p className="text-muted-foreground pl-7 text-xs leading-relaxed">{step.body}</p>
          <div className="pl-7">
            <Image
              src={step.image}
              alt={step.alt}
              width={640}
              height={360}
              className={`w-full ${imageClassName ?? ""}`}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

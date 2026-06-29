import { SketchQuizHubClient } from "@/components/sketch-quiz/sketch-quiz-hub-client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const metadata = {
  title: "스케치퀴즈 | MoCoMo",
  description: "캐치마인드처럼 그림으로 맞히는 실시간 퀴즈 게임",
};

export default function SketchQuizPage() {
  return (
    <AppPageChrome maxWidth="3xl" spacing="sm">
      <SketchQuizHubClient />
    </AppPageChrome>
  );
}

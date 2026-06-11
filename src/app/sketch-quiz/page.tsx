import { SketchQuizHubClient } from "@/components/sketch-quiz/sketch-quiz-hub-client";

export const metadata = {
  title: "스케치퀴즈 | MoCoMo",
  description: "캐치마인드처럼 그림으로 맞히는 실시간 퀴즈 게임",
};

export default function SketchQuizPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <SketchQuizHubClient />
    </div>
  );
}

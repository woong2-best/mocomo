import { OmokHubClient } from "@/components/omok/omok-hub-client";

export const metadata = {
  title: "오목 | MoCoMo",
  description: "15×15 실시간 오목 · 친구 방 / 랜덤 매칭",
};

export default function OmokPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <OmokHubClient />
    </div>
  );
}

import { WordChainHubClient } from "@/components/word-chain/word-chain-hub-client";

export const metadata = {
  title: "끝말잇기 | MoCoMo",
  description: "실시간 끝말잇기 · 사전 검증",
};

export default function WordChainPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <WordChainHubClient />
    </div>
  );
}

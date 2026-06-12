import { RpsHubClient } from "@/components/rps/rps-hub-client";

export const metadata = {
  title: "가위바위보 | MoCoMo",
  description: "실시간 가위바위보 · 3판 2선승",
};

export default function RpsPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <RpsHubClient />
    </div>
  );
}

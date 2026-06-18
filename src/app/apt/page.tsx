import { AptHubClient } from "@/components/apt/apt-hub-client";

export const metadata = {
  title: "APT | MoCoMo",
  description: "MoCoMo APT",
};

export default function AptPage() {
  return <AptHubClient />;
}

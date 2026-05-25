import { LiveDirectory } from "@/components/live/live-directory";
import { getCachedLiveChannels } from "@/lib/cached-data";

export const revalidate = 30;

export default async function LivePage() {
  let channels: Awaited<ReturnType<typeof getCachedLiveChannels>>["channels"] = [];
  let hosts: Awaited<ReturnType<typeof getCachedLiveChannels>>["hosts"] = [];

  try {
    const data = await getCachedLiveChannels();
    channels = data.channels;
    hosts = data.hosts;
  } catch {
    channels = [];
    hosts = [];
  }

  return <LiveDirectory channels={channels} hosts={hosts} />;
}

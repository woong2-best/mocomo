import { EgressClient, EncodedFileOutput, S3Upload } from "livekit-server-sdk";
import { getLivekitApiHost } from "@/lib/livekit-host";
import { isLivekitConfigured } from "@/lib/livekit";

export function isLivekitEgressConfigured(): boolean {
  return (
    process.env.LIVEKIT_EGRESS_ENABLED === "1" &&
    isLivekitConfigured() &&
    !!process.env.S3_BUCKET_NAME &&
    !!process.env.S3_ACCESS_KEY_ID &&
    !!process.env.S3_SECRET_ACCESS_KEY &&
    !!getLivekitApiHost()
  );
}

function createEgressClient() {
  const host = getLivekitApiHost();
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  return new EgressClient(host, apiKey, apiSecret);
}

function buildR2FileOutput(channelId: string): EncodedFileOutput {
  const filepath = `live-recordings/${channelId}/{room_id}-{time}.mp4`;
  return new EncodedFileOutput({
    filepath,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: process.env.S3_ACCESS_KEY_ID!,
        secret: process.env.S3_SECRET_ACCESS_KEY!,
        bucket: process.env.S3_BUCKET_NAME!,
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: true,
      }),
    },
  });
}

/** 호스트 스튜디오 입장 후 방송 녹화 시작 (LiveKit → R2) */
export async function startChannelEgress(channelId: string): Promise<{
  egressId?: string;
  skipped?: boolean;
  error?: string;
}> {
  if (!isLivekitEgressConfigured()) return { skipped: true };

  try {
    const client = createEgressClient();
    const output = buildR2FileOutput(channelId);
    const info = await client.startRoomCompositeEgress(channelId, { file: output });
    return { egressId: info.egressId };
  } catch (e) {
    console.error("[startChannelEgress]", e);
    return { error: e instanceof Error ? e.message : "녹화 시작 실패" };
  }
}

export async function stopChannelEgress(egressId: string): Promise<{ error?: string }> {
  if (!isLivekitEgressConfigured() || !egressId) return {};
  try {
    const client = createEgressClient();
    await client.stopEgress(egressId);
    return {};
  } catch (e) {
    console.error("[stopChannelEgress]", e);
    return { error: e instanceof Error ? e.message : "녹화 종료 실패" };
  }
}

/** 웹훅 없을 때 파일 경로 → 공개 URL */
export function egressFileToPublicUrl(filename: string): string {
  const base = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
  if (!base) return filename;
  const key = filename.startsWith("http") ? new URL(filename).pathname.replace(/^\//, "") : filename.replace(/^\//, "");
  return `${base}/${key}`;
}

import { db } from "@/lib/db";
import {
  getWatermarkPublicConfig,
  isWatermarkEnabled,
} from "@/lib/watermark/config";
import { isWatermarkSecretConfigured } from "@/lib/watermark/crypto/secrets";
import { WatermarkForensicsClient } from "@/components/admin/watermark/forensics-client";

export const metadata = {
  title: "Watermark Forensics · Admin",
};

export default async function WatermarkForensicsPage() {
  const [sessionCount, publicConfig] = await Promise.all([
    db.watermarkSession.count(),
    Promise.resolve(getWatermarkPublicConfig()),
  ]);

  return (
    <WatermarkForensicsClient
      systemStatus={{
        enabled: isWatermarkEnabled(),
        secretConfigured: isWatermarkSecretConfigured(),
        sessionCount,
        watermarkVersion: publicConfig.watermarkVersion,
      }}
    />
  );
}

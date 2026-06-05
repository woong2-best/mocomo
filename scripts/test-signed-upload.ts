import { config } from "dotenv";
import { createSupabaseSignedUpload } from "../src/lib/supabase-storage";

config({ path: ".env" });

async function main() {
  const r = await createSupabaseSignedUpload("test", "probe.png", "image/png", "image");
  if (!r) {
    console.error("no signed url");
    process.exit(1);
  }
  console.log("signedUrl:", r.uploadUrl.slice(0, 80) + "...");
  console.log("publicUrl:", r.publicUrl);
  const tiny = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const headers: Record<string, string> = { "Content-Type": "image/png" };
  if (r.token) headers.Authorization = `Bearer ${r.token}`;
  const put = await fetch(r.uploadUrl, { method: "PUT", body: tiny, headers });
  console.log("PUT:", put.status, await put.text().catch(() => ""));
  const head = await fetch(r.publicUrl, { method: "HEAD" });
  console.log("HEAD public:", head.status);
}

main();

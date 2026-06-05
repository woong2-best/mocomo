import { readFileSync } from "fs";
import { config } from "dotenv";
import {
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
  uploadBufferToSupabase,
} from "../src/lib/supabase-storage";

config({ path: ".env" });

async function main() {
  console.log("configured:", isSupabaseStorageConfigured());
  console.log("url:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing");
  console.log("service_role:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing");
  console.log("bucket:", process.env.SUPABASE_STORAGE_BUCKET || "mocomo-uploads");

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("FAIL: no admin client");
    process.exit(1);
  }

  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  console.log(
    "buckets:",
    listErr?.message ?? buckets?.map((b) => `${b.id}(public=${b.public})`).join(", ")
  );

  const tiny = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const res = await uploadBufferToSupabase("test-script", tiny, "probe.png", "image/png", "image");
  if ("error" in res) {
    console.error("upload FAIL:", res.error);
    process.exit(1);
  }
  console.log("upload OK:", res.publicUrl);

  const check = await fetch(res.publicUrl, { method: "HEAD" });
  console.log("public HEAD:", check.status, check.statusText);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

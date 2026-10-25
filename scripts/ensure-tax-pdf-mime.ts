import { config } from "dotenv";
import { ensureTaxPdfUploadsAllowed, getSupabaseAdmin } from "../src/lib/supabase-storage";

config({ path: ".env" });

async function main() {
  const ok = await ensureTaxPdfUploadsAllowed();
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("FAIL: storage admin missing");
    process.exit(1);
  }
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "mocomo-uploads";
  const { data, error } = await admin.storage.getBucket(bucket);
  if (error || !data) {
    console.error("FAIL: could not read bucket");
    process.exit(1);
  }
  const row = data as { allowedMimeTypes?: string[] | null; allowed_mime_types?: string[] | null };
  const mimes = row.allowedMimeTypes ?? row.allowed_mime_types ?? [];
  console.log(JSON.stringify({ ok, hasPdf: mimes.includes("application/pdf") }));
  if (!ok || !mimes.includes("application/pdf")) process.exit(1);
}

main().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.name : "Error");
  process.exit(1);
});

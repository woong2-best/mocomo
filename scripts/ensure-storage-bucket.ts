import { PrismaClient } from "@prisma/client";

const sql = `
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mocomo-uploads',
  'mocomo-uploads',
  true,
  26214400,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/webm', 'audio/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
`;

async function main() {
  const db = new PrismaClient();
  try {
    await db.$executeRawUnsafe(sql);
    console.log("OK: storage bucket mocomo-uploads ready");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});

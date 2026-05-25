/** Upload image to S3 presigned URL, or fall back to local /api/upload/local */
export async function uploadImageBlob(blob: Blob, filename: string): Promise<string> {
  const contentType = blob.type || "image/jpeg";
  const file = new File([blob], filename, { type: contentType });

  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, category: "image" }),
  });

  if (presignRes.ok) {
    const { uploadUrl, publicUrl } = (await presignRes.json()) as {
      uploadUrl: string;
      publicUrl: string;
    };
    const put = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType },
    });
    if (!put.ok) throw new Error("클라우드 업로드에 실패했습니다.");
    return publicUrl;
  }

  const form = new FormData();
  form.set("file", file);
  form.set("category", "image");
  const localRes = await fetch("/api/upload/local", { method: "POST", body: form });
  const body = (await localRes.json().catch(() => ({}))) as { publicUrl?: string; error?: string };
  if (!localRes.ok) {
    throw new Error(body.error || "이미지 업로드에 실패했습니다.");
  }
  if (!body.publicUrl) throw new Error("업로드 응답이 올바르지 않습니다.");
  return body.publicUrl;
}

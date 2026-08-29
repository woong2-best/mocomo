/** 판매자 KYC 신분증 이미지 — 비공개 업로드 (공개 URL 반환 없음) */
export async function uploadSellerKycDocument(
  file: File
): Promise<{ documentKey: string } | { error: string }> {
  const form = new FormData();
  form.set("file", file);

  const res = await fetch("/api/upload/kyc", {
    method: "POST",
    body: form,
    credentials: "include",
    headers: { "X-Moco-No-Progress": "1" },
  });

  const body = (await res.json().catch(() => ({}))) as {
    documentKey?: string;
    error?: string;
  };

  if (!res.ok) {
    return {
      error:
        body.error ||
        (res.status === 401
          ? "로그인이 필요합니다."
          : res.status === 429
            ? "업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
            : "신분증 이미지 업로드에 실패했습니다."),
    };
  }

  if (!body.documentKey) {
    return { error: "업로드 응답을 처리할 수 없습니다." };
  }

  return { documentKey: body.documentKey };
}

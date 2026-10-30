"use client";

/** Copy the share URL. Swap later if we add short-links. */
export async function copyShareLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}

/** Device native share sheet (`navigator.share`). */
export async function shareWithOs(input: { url: string; title?: string; text?: string }): Promise<void> {
  if (typeof navigator.share !== "function") {
    throw new Error("native-share-unavailable");
  }
  await navigator.share({
    url: input.url,
    title: input.title,
    text: input.text ?? input.url,
  });
}

export async function shareToWhatsApp(url: string): Promise<void> {
  window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
}

export async function shareToSms(url: string): Promise<void> {
  window.location.href = `sms:?body=${encodeURIComponent(url)}`;
}

export async function shareToInstagram(url: string): Promise<void> {
  if (typeof navigator.share === "function") {
    await navigator.share({ url, text: url });
    return;
  }
  await copyShareLink(url);
}

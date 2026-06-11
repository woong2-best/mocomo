/** 후원(TIP) 결제 메타데이터 */

export type TipPaymentMetadata = {
  receiverId: string;
  message?: string;
  username?: string;
  channelId?: string;
  returnPath?: string;
  /** standard | video — 영상 후원은 결제 후 URL 입력 */
  tipKind?: "standard" | "video";
};

export function tipMetadataForCheckout(input: {
  receiverId: string;
  message?: string;
  username?: string;
  channelId?: string;
  returnPath?: string;
  tipKind?: "standard" | "video";
}): TipPaymentMetadata {
  const meta: TipPaymentMetadata = { receiverId: input.receiverId };
  const msg = input.message?.trim();
  if (msg) meta.message = msg.slice(0, 200);
  if (input.username?.trim()) meta.username = input.username.trim();
  if (input.channelId?.trim()) meta.channelId = input.channelId.trim();
  if (input.returnPath?.startsWith("/")) meta.returnPath = input.returnPath.trim();
  if (input.tipKind === "video") meta.tipKind = "video";
  return meta;
}

export function safeReturnPath(path: string | undefined, fallback = "/support"): string {
  if (!path?.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  return path;
}

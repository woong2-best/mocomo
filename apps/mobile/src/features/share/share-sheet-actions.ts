import { Linking, Platform, Share } from "react-native";
import { openDm, sendRoomMessage } from "@/api/messages";
import { copyTextToClipboard } from "@/lib/clipboard";
import { encodePostShareMessage } from "@/lib/chat-post-share";

/** Copy the share URL. Swap the body later if we add short-links. */
export async function copyShareLink(url: string): Promise<"copied" | "shared"> {
  return copyTextToClipboard(url);
}

/** Device native share sheet (`Share.share` / OS share). */
export async function shareWithOs(url: string, message?: string): Promise<void> {
  const text = (message ?? url).trim() || url;
  await Share.share({ message: text, url });
}

/** Send this post into an existing or new DM. */
export async function sharePostViaDirectMessage(input: {
  userId: string;
  postId: string;
  note?: string;
}): Promise<{ roomId: string }> {
  const { roomId } = await openDm(input.userId);
  await sendRoomMessage(roomId, {
    content: encodePostShareMessage(input.postId, input.note),
  });
  return { roomId };
}

export async function shareToWhatsApp(url: string): Promise<void> {
  const href = `https://wa.me/?text=${encodeURIComponent(url)}`;
  const ok = await Linking.canOpenURL(href);
  if (!ok) throw new Error("whatsapp");
  await Linking.openURL(href);
}

export async function shareToSms(url: string): Promise<void> {
  const href =
    Platform.OS === "ios"
      ? `sms:&body=${encodeURIComponent(url)}`
      : `sms:?body=${encodeURIComponent(url)}`;
  await Linking.openURL(href);
}

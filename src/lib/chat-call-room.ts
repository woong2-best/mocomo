/** Voice/video calls are allowed in peer DMs and used-market (MARKET) trade threads. */
export function isCallEligibleChatRoomType(type: string | null | undefined): boolean {
  return type === "DM" || type === "MARKET";
}

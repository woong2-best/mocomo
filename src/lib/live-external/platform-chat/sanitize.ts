/** Strip control chars and cap length for imported platform chat display. */
export function sanitizePlatformChatText(text: string, maxLen = 500): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

export function sanitizePlatformChatUsername(username: string, maxLen = 64): string {
  return username
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

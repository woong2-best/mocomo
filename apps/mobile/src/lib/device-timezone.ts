export function detectDeviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.length > 0 && tz.length <= 64 ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export function formatLocalClock(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(now);
  } catch {
    return "";
  }
}

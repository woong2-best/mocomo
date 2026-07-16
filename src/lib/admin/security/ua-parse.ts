export function parseUserAgent(ua: string | null | undefined): {
  browser: string;
  os: string;
  device: string;
} {
  const s = ua ?? "";
  let browser = "Unknown";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = "Chrome";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browser = "Safari";
  else if (/OPR\//i.test(s) || /Opera/i.test(s)) browser = "Opera";

  let os = "Unknown";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Mac OS X/i.test(s) || /Macintosh/i.test(s)) os = "macOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Linux/i.test(s)) os = "Linux";

  let device = "Desktop";
  if (/iPad|Tablet/i.test(s)) device = "Tablet";
  else if (/Mobile|Android|iPhone/i.test(s)) device = "Mobile";

  return { browser, os, device };
}

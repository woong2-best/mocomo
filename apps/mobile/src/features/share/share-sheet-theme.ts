/** X / Instagram share sheet — always dark, independent of app theme. */
export const SHARE_SHEET = {
  bg: "#1C1C1E",
  elevated: "#2C2C2E",
  iconMuted: "#3A3A3C",
  text: "#F5F5F7",
  textSecondary: "#EBEBF5",
  muted: "#8E8E93",
  placeholder: "#636366",
  handle: "rgba(235, 235, 245, 0.28)",
  dim: "rgba(0, 0, 0, 0.58)",
  whatsapp: "#25D366",
  sms: "#0A84FF",
  instagram: ["#F58529", "#DD2A7B", "#8134AF"] as const,
} as const;

export const SHARE_SPRING = {
  damping: 28,
  stiffness: 340,
  mass: 0.78,
} as const;

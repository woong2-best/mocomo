import type { LiveFolderFilter } from "@/components/live/live-folder-rail";

/** Neon arch + bottom rail colors per category tab (cinematic multi-stop). */
export type LiveHubNeonTheme = {
  cssBloom: string;
  gp: [string, string, string];
  gm: [string, string];
  gk: [string, string];
  rim: string;
  lineEdge: string;
  lineCore: string;
  bloomFill: string;
};

export const LIVE_HUB_NEON_THEME: Record<LiveFolderFilter, LiveHubNeonTheme> = {
  ALL: {
    cssBloom: "rgba(226, 66, 138, 0.55)",
    gp: ["#3c1a84", "#7c2288", "#3c1a84"],
    gm: ["#a02a90", "#b82c88"],
    gk: ["#cc3a86", "#ff4d9a"],
    rim: "#c4223c",
    lineEdge: "#d878c0",
    lineCore: "#ff9fd8",
    bloomFill: "#e2428a",
  },
  FOLLOWING: {
    cssBloom: "rgba(207, 96, 48, 0.55)",
    gp: ["#4a1806", "#9e4018", "#4a1806"],
    gm: ["#b85a28", "#e07838"],
    gk: ["#e88848", "#ffb070"],
    rim: "#a03818",
    lineEdge: "#d89060",
    lineCore: "#ffc090",
    bloomFill: "#e07030",
  },
  GAME: {
    cssBloom: "rgba(60, 120, 255, 0.55)",
    gp: ["#06143c", "#1c48b0", "#06143c"],
    gm: ["#1e4098", "#3870d8"],
    gk: ["#5090ff", "#78b8ff"],
    rim: "#1840a0",
    lineEdge: "#6890d0",
    lineCore: "#98c8ff",
    bloomFill: "#4080e8",
  },
  JUST_CHATTING: {
    cssBloom: "rgba(66, 180, 80, 0.55)",
    gp: ["#0e4010", "#309020", "#0e4010"],
    gm: ["#289028", "#48b838"],
    gk: ["#58d048", "#88f070"],
    rim: "#1a7020",
    lineEdge: "#78c868",
    lineCore: "#a8f098",
    bloomFill: "#48c040",
  },
  IRL: {
    cssBloom: "rgba(140, 60, 220, 0.55)",
    gp: ["#240850", "#6c1caa", "#240850"],
    gm: ["#7018b0", "#9838d0"],
    gk: ["#b058e8", "#d888ff"],
    rim: "#501090",
    lineEdge: "#a878d8",
    lineCore: "#d0a8ff",
    bloomFill: "#9040e0",
  },
  MUSIC: {
    cssBloom: "rgba(80, 180, 200, 0.55)",
    gp: ["#0b2a3a", "#3d8fa9", "#0b2a3a"],
    gm: ["#287888", "#48a8b8"],
    gk: ["#58c8d8", "#88e8f8"],
    rim: "#186878",
    lineEdge: "#78c0d0",
    lineCore: "#a8e8f8",
    bloomFill: "#40b8d0",
  },
  LIVE: {
    cssBloom: "rgba(200, 50, 80, 0.55)",
    gp: ["#3a0407", "#7a1611", "#3a0407"],
    gm: ["#8c1820", "#b83040"],
    gk: ["#d04858", "#ff6880"],
    rim: "#901018",
    lineEdge: "#d07078",
    lineCore: "#ffa0a8",
    bloomFill: "#e04058",
  },
  VIRTUAL: {
    cssBloom: "rgba(140, 60, 220, 0.55)",
    gp: ["#240850", "#6c1caa", "#240850"],
    gm: ["#7018b0", "#9838d0"],
    gk: ["#b058e8", "#d888ff"],
    rim: "#501090",
    lineEdge: "#a878d8",
    lineCore: "#d0a8ff",
    bloomFill: "#9040e0",
  },
};

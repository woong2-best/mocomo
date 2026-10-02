import type { RpsChoice } from "./shared-types";

export function rpsWinner(a: RpsChoice, b: RpsChoice): "a" | "b" | "draw" {
  if (a === b) return "draw";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  ) {
    return "a";
  }
  return "b";
}

export const RPS_LABELS: Record<RpsChoice, string> = {
  rock: "바위",
  paper: "보",
  scissors: "가위",
};

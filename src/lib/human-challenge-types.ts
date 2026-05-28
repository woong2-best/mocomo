export type HumanChallengeChoice = { id: string; label: string };

export type HumanChallengeQuestion = {
  token: string;
  prompt: string;
  hint?: string;
  choices: HumanChallengeChoice[];
};

export type ContributionTowerPayload = {
  name: string;
  avatar: string;
  profileUrl: string;
  /** Optional id for deduplication when syncing with the API */
  id?: string;
};

declare global {
  interface Window {
    addContribution?: (payload: ContributionTowerPayload) => void;
  }
}

export {};

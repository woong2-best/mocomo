export type MobileAuthUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  locale?: string | null;
  countryCode?: string | null;
  timeZone?: string | null;
  bio?: string | null;
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  createdAt?: string | null;
  counts?: {
    posts: number;
    followers: number;
    following: number;
  };
  hasPassword?: boolean;
};

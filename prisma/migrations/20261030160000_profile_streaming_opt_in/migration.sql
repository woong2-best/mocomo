-- Live Studio YouTube/Twitch connect must not auto-show icons on the public profile.
ALTER TABLE "Profile" ALTER COLUMN "showYoutubeOnProfile" SET DEFAULT false;
ALTER TABLE "Profile" ALTER COLUMN "showTwitchOnProfile" SET DEFAULT false;
UPDATE "Profile" SET "showYoutubeOnProfile" = false, "showTwitchOnProfile" = false;

-- Remove legacy platform bootstrap QnA (MoCoMo 공식 welcome post)
DELETE FROM "Post"
WHERE "communityId" IN (SELECT "id" FROM "Community" WHERE "slug" = 'welcome');

DELETE FROM "Community" WHERE "slug" = 'welcome';

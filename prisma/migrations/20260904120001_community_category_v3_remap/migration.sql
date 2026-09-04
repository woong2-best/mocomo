-- Remap legacy categories after enum values exist (separate migration from ADD VALUE).

UPDATE "Community" SET "category" = 'SUBCULTURE' WHERE "category" IN ('ANIME', 'COMIC', 'COSPLAY', 'GOODS', 'FIGURE');
UPDATE "Community" SET "category" = 'CREATOR' WHERE "category" IN ('VTUBER', 'AI');
UPDATE "Community" SET "category" = 'MUSIC' WHERE "category" IN ('UTAITE', 'VOCALOID');
UPDATE "Community" SET "category" = 'CREATIVE' WHERE "category" = 'FANART';

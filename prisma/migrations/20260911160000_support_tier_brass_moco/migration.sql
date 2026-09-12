-- Add BRASS support tier enum value

ALTER TYPE "SupportTierLevel" ADD VALUE IF NOT EXISTS 'BRASS';

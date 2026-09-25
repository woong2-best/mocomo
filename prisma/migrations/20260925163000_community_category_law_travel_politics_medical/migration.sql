-- QnA / community category expansion
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'LAW';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'TRAVEL';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'POLITICS';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'MEDICAL';

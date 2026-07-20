-- CreateEnum
CREATE TYPE "PostCollaboratorStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'LEFT', 'REMOVED');

-- CreateTable
CREATE TABLE "PostCollaborator" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PostCollaboratorStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostCollaborator_userId_status_invitedAt_idx" ON "PostCollaborator"("userId", "status", "invitedAt" DESC);

-- CreateIndex
CREATE INDEX "PostCollaborator_postId_status_idx" ON "PostCollaborator"("postId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PostCollaborator_postId_userId_key" ON "PostCollaborator"("postId", "userId");

-- AddForeignKey
ALTER TABLE "PostCollaborator" ADD CONSTRAINT "PostCollaborator_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCollaborator" ADD CONSTRAINT "PostCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCollaborator" ADD CONSTRAINT "PostCollaborator_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

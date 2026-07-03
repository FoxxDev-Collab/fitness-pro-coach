-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PORTAL';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "joinCode" TEXT;

-- CreateTable
CREATE TABLE "PortalMagicToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "teamId" TEXT,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalMagicToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalJoinRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PortalJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalMagicToken_token_key" ON "PortalMagicToken"("token");

-- CreateIndex
CREATE INDEX "PortalMagicToken_token_idx" ON "PortalMagicToken"("token");

-- CreateIndex
CREATE INDEX "PortalMagicToken_email_idx" ON "PortalMagicToken"("email");

-- CreateIndex
CREATE INDEX "PortalJoinRequest_teamId_idx" ON "PortalJoinRequest"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_joinCode_key" ON "Team"("joinCode");

-- AddForeignKey
ALTER TABLE "PortalJoinRequest" ADD CONSTRAINT "PortalJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

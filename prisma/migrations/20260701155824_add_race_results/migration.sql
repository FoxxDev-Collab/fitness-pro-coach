-- CreateEnum
CREATE TYPE "DisciplineUnit" AS ENUM ('TIME', 'DISTANCE', 'WEIGHT', 'POINTS');

-- CreateEnum
CREATE TYPE "ResultDirection" AS ENUM ('LOWER_BETTER', 'HIGHER_BETTER');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'MEET';

-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitType" "DisciplineUnit" NOT NULL,
    "direction" "ResultDirection" NOT NULL,
    "distanceMeters" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "place" INTEGER,
    "squad" TEXT,
    "dnf" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Split" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Split_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetOpponentScore" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "groupLabel" TEXT NOT NULL,
    "opponentName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "MeetOpponentScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discipline_coachId_idx" ON "Discipline"("coachId");

-- CreateIndex
CREATE INDEX "RaceResult_eventId_idx" ON "RaceResult"("eventId");

-- CreateIndex
CREATE INDEX "RaceResult_athleteId_idx" ON "RaceResult"("athleteId");

-- CreateIndex
CREATE INDEX "RaceResult_disciplineId_idx" ON "RaceResult"("disciplineId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_eventId_athleteId_disciplineId_key" ON "RaceResult"("eventId", "athleteId", "disciplineId");

-- CreateIndex
CREATE INDEX "Split_resultId_idx" ON "Split"("resultId");

-- CreateIndex
CREATE INDEX "MeetOpponentScore_eventId_idx" ON "MeetOpponentScore"("eventId");

-- AddForeignKey
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TeamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Split" ADD CONSTRAINT "Split_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "RaceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetOpponentScore" ADD CONSTRAINT "MeetOpponentScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TeamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;


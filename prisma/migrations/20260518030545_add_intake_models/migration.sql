-- CreateEnum
CREATE TYPE "IntakeQuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTI_CHOICE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "waiverText" TEXT;

-- CreateTable
CREATE TABLE "IntakeQuestion" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "IntakeQuestionType" NOT NULL,
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeResponse" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "sex" TEXT,
    "heightInches" INTEGER,
    "weightLbs" DOUBLE PRECISION,
    "occupation" TEXT,
    "medicalConditions" TEXT[],
    "conditionsOther" TEXT,
    "medications" TEXT,
    "pregnancyStatus" TEXT,
    "physicianRestrictions" TEXT,
    "physicianName" TEXT,
    "physicianPhone" TEXT,
    "injuries" JSONB,
    "chronicPain" TEXT,
    "painAreas" TEXT[],
    "waiverTextSnapshot" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL,
    "signatureIp" TEXT NOT NULL,
    "signatureUserAgent" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "textValue" TEXT,
    "choiceValues" TEXT[],
    "questionTextSnapshot" TEXT NOT NULL,
    "questionTypeSnapshot" "IntakeQuestionType" NOT NULL,
    "optionsSnapshot" TEXT[],

    CONSTRAINT "IntakeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntakeQuestion_coachId_idx" ON "IntakeQuestion"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeResponse_clientId_key" ON "IntakeResponse"("clientId");

-- CreateIndex
CREATE INDEX "IntakeResponse_clientId_idx" ON "IntakeResponse"("clientId");

-- CreateIndex
CREATE INDEX "IntakeAnswer_questionId_idx" ON "IntakeAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeAnswer_responseId_questionId_key" ON "IntakeAnswer"("responseId", "questionId");

-- AddForeignKey
ALTER TABLE "IntakeQuestion" ADD CONSTRAINT "IntakeQuestion_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "IntakeResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "IntakeQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

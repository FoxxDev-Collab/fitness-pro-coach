-- Unify race Results into the Metrics model.
-- Disciplines become MetricDefinitions (with a direction); race results become
-- MetricEntries tied to a TeamEvent. Existing rows are preserved by reusing PKs.

-- 1. Rename the discipline unit enum to the shared metric unit enum.
ALTER TYPE "DisciplineUnit" RENAME TO "MetricUnit";

-- 2. New competition status enum.
CREATE TYPE "ResultStatus" AS ENUM ('FINISHED', 'DNF', 'DNS', 'DQ');

-- 3. MetricDefinition: absorb discipline fields.
ALTER TABLE "MetricDefinition"
  ADD COLUMN "unitType" "MetricUnit" NOT NULL DEFAULT 'POINTS',
  ADD COLUMN "direction" "ResultDirection",
  ADD COLUMN "distanceMeters" INTEGER;

-- 4. MetricEntry: absorb result fields (value stays NOT NULL; 0 for DNF).
ALTER TABLE "MetricEntry"
  ADD COLUMN "place" INTEGER,
  ADD COLUMN "squad" TEXT,
  ADD COLUMN "status" "ResultStatus" NOT NULL DEFAULT 'FINISHED';

-- 5. Split: add new FK column (nullable while we backfill).
ALTER TABLE "Split" ADD COLUMN "metricEntryId" TEXT;

-- 6. Migrate Discipline -> MetricDefinition (reuse id; scope ATHLETE).
INSERT INTO "MetricDefinition"
  (id, "coachId", name, unit, scope, description, archived, "createdAt", "updatedAt", "unitType", "direction", "distanceMeters")
SELECT
  d.id, d."coachId", d.name, lower(d."unitType"::text), 'ATHLETE'::"MetricScope",
  NULL, d.archived, d."createdAt", d."updatedAt",
  d."unitType", d."direction", d."distanceMeters"
FROM "Discipline" d;

-- 7. Migrate RaceResult -> MetricEntry (reuse id; date from the event).
INSERT INTO "MetricEntry"
  (id, "metricDefinitionId", "teamId", "athleteId", "eventId", value, notes, date, "createdAt", place, squad, status)
SELECT
  rr.id, rr."disciplineId", NULL, rr."athleteId", rr."eventId",
  rr.value, rr.notes, te."startTime", rr."createdAt",
  rr.place, rr.squad,
  (CASE WHEN rr.dnf THEN 'DNF' ELSE 'FINISHED' END)::"ResultStatus"
FROM "RaceResult" rr
JOIN "TeamEvent" te ON te.id = rr."eventId";

-- 8. Repoint splits (Split.resultId == the reused MetricEntry.id).
UPDATE "Split" SET "metricEntryId" = "resultId";

-- 9. Split: enforce new FK, drop old.
ALTER TABLE "Split" DROP CONSTRAINT IF EXISTS "Split_resultId_fkey";
DROP INDEX IF EXISTS "Split_resultId_idx";
ALTER TABLE "Split" DROP COLUMN "resultId";
ALTER TABLE "Split" ALTER COLUMN "metricEntryId" SET NOT NULL;
ALTER TABLE "Split"
  ADD CONSTRAINT "Split_metricEntryId_fkey"
  FOREIGN KEY ("metricEntryId") REFERENCES "MetricEntry"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Split_metricEntryId_idx" ON "Split"("metricEntryId");

-- 10. MetricEntry uniqueness for event results (null eventId stays distinct).
CREATE UNIQUE INDEX "MetricEntry_eventId_athleteId_metricDefinitionId_key"
  ON "MetricEntry"("eventId", "athleteId", "metricDefinitionId");

-- 11. Drop the parallel result tables.
DROP TABLE "RaceResult";
DROP TABLE "Discipline";

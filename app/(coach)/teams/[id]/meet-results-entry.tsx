"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeInput } from "@/components/results/time-input";
import {
  getMeetResults,
  saveMeetResults,
  createDiscipline,
  archiveDiscipline,
} from "@/lib/actions/results";
import type { UnitType, Direction } from "@/lib/results/types";

export type DisciplineDTO = {
  id: string;
  name: string;
  unitType: UnitType;
  direction: Direction;
  distanceMeters: number | null;
};

const SQUADS = ["Varsity", "JV", "Open"];

type RowState = {
  value: number | null;
  place: string;
  squad: string;
  dnf: boolean;
  splits: (number | null)[];
  splitsOpen: boolean;
};

const blankRow = (): RowState => ({
  value: null,
  place: "",
  squad: "Varsity",
  dnf: false,
  splits: [],
  splitsOpen: false,
});

type LoadedResult = {
  athleteId: string;
  disciplineId: string;
  value: number;
  place: number | null;
  squad: string | null;
  dnf: boolean;
  splits: { value: number }[];
};

// ─── Meet Results Dialog ────────────────────────────────────

export function MeetResultsDialog({
  eventId,
  disciplines,
  children,
}: {
  eventId: string;
  disciplines: DisciplineDTO[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id ?? "");
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([]);
  const [existing, setExisting] = useState<LoadedResult[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const discipline = disciplines.find((d) => d.id === disciplineId);
  const isTime = discipline?.unitType === "TIME";

  // Load roster + existing results when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMeetResults(eventId)
      .then((data) => {
        setRoster(data.roster.map((a) => ({ id: a.id, name: a.name })));
        setExisting(
          data.results.map((r) => ({
            athleteId: r.athleteId,
            disciplineId: r.disciplineId,
            value: r.value,
            place: r.place,
            squad: r.squad,
            dnf: r.dnf,
            splits: r.splits.map((s) => ({ value: s.value })),
          })),
        );
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [open, eventId]);

  // Rebuild rows whenever the roster or selected discipline changes.
  useEffect(() => {
    const next: Record<string, RowState> = {};
    for (const a of roster) {
      const found = existing.find(
        (r) => r.athleteId === a.id && r.disciplineId === disciplineId,
      );
      next[a.id] = found
        ? {
            value: found.dnf ? null : found.value,
            place: found.place != null ? String(found.place) : "",
            squad: found.squad ?? "Varsity",
            dnf: found.dnf,
            splits: found.splits.map((s) => s.value),
            splitsOpen: found.splits.length > 0,
          }
        : blankRow();
    }
    setRows(next);
  }, [roster, existing, disciplineId]);

  const setRow = (athleteId: string, patch: Partial<RowState>) =>
    setRows((r) => ({ ...r, [athleteId]: { ...r[athleteId], ...patch } }));

  const handleSave = async () => {
    if (!disciplineId) return;
    setSaving(true);
    try {
      const payload = roster
        .map((a) => ({ athleteId: a.id, row: rows[a.id] }))
        .filter(({ row }) => row && (row.dnf || row.value != null))
        .map(({ athleteId, row }) => ({
          athleteId,
          disciplineId,
          value: row.dnf ? undefined : (row.value ?? undefined),
          place: row.place.trim() ? Number(row.place) : undefined,
          squad: row.squad || undefined,
          dnf: row.dnf,
          splits: row.splits
            .filter((v): v is number => v != null)
            .map((v, i) => ({ order: i + 1, value: v })),
        }));
      await saveMeetResults(eventId, { rows: payload });
      setOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enter Results</DialogTitle>
        </DialogHeader>

        {disciplines.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Add a discipline first (e.g. 5K) using the &ldquo;Disciplines&rdquo; button.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Discipline</Label>
              <Select value={disciplineId} onValueChange={setDisciplineId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground py-4">Loading roster…</p>
            ) : roster.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No active athletes on this team.
              </p>
            ) : (
              <div className="space-y-2">
                {roster.map((a) => {
                  const row = rows[a.id] ?? blankRow();
                  return (
                    <div key={a.id} className="rounded-lg border bg-card p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm min-w-0 flex-1 truncate">
                          {a.name}
                        </span>
                        <div className="w-24">
                          {isTime ? (
                            <TimeInput
                              value={row.value}
                              disabled={row.dnf}
                              onChange={(v) => setRow(a.id, { value: v })}
                            />
                          ) : (
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="mark"
                              disabled={row.dnf}
                              value={row.value ?? ""}
                              onChange={(e) =>
                                setRow(a.id, {
                                  value: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                            />
                          )}
                        </div>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="place"
                          className="w-16"
                          disabled={row.dnf}
                          value={row.place}
                          onChange={(e) => setRow(a.id, { place: e.target.value })}
                        />
                        <Select
                          value={row.squad}
                          onValueChange={(v) => setRow(a.id, { squad: v })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SQUADS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Checkbox
                            checked={row.dnf}
                            onCheckedChange={(c) => setRow(a.id, { dnf: !!c })}
                          />
                          DNF
                        </label>
                        {isTime && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setRow(a.id, { splitsOpen: !row.splitsOpen })}
                          >
                            {row.splitsOpen ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      {isTime && row.splitsOpen && (
                        <div className="mt-2 pl-2 border-l space-y-2">
                          <p className="text-xs text-muted-foreground">Splits</p>
                          {row.splits.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-14">
                                Split {i + 1}
                              </span>
                              <div className="w-24">
                                <TimeInput
                                  value={s}
                                  onChange={(v) => {
                                    const splits = [...row.splits];
                                    splits[i] = v;
                                    setRow(a.id, { splits });
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive"
                                onClick={() =>
                                  setRow(a.id, {
                                    splits: row.splits.filter((_, j) => j !== i),
                                  })
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRow(a.id, { splits: [...row.splits, null] })}
                          >
                            <Plus className="size-4 mr-1" /> Add split
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || loading || !disciplineId}
              className="w-full"
            >
              {saving ? "Saving…" : "Save Results"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Discipline Manager Dialog ──────────────────────────────

export function DisciplineManagerDialog({
  disciplines,
  children,
}: {
  disciplines: DisciplineDTO[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unitType: "TIME" as UnitType,
    direction: "LOWER_BETTER" as Direction,
    distanceMeters: "",
  });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createDiscipline({
        name: form.name.trim(),
        unitType: form.unitType,
        direction: form.direction,
        distanceMeters: form.distanceMeters.trim()
          ? Number(form.distanceMeters)
          : undefined,
      });
      setForm({ name: "", unitType: "TIME", direction: "LOWER_BETTER", distanceMeters: "" });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveDiscipline(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Disciplines</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {disciplines.length > 0 && (
            <div className="space-y-1">
              {disciplines.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                >
                  <span className="text-sm">
                    {d.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({d.unitType.toLowerCase()},{" "}
                      {d.direction === "LOWER_BETTER" ? "lower better" : "higher better"})
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => handleArchive(d.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 border-t pt-3">
            <p className="text-sm font-medium">Add discipline</p>
            <div>
              <Label>Name</Label>
              <Input
                placeholder="e.g. 5K, 3200m"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit</Label>
                <Select
                  value={form.unitType}
                  onValueChange={(v) => setForm((f) => ({ ...f, unitType: v as UnitType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIME">Time</SelectItem>
                    <SelectItem value="DISTANCE">Distance</SelectItem>
                    <SelectItem value="WEIGHT">Weight</SelectItem>
                    <SelectItem value="POINTS">Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Better is</Label>
                <Select
                  value={form.direction}
                  onValueChange={(v) => setForm((f) => ({ ...f, direction: v as Direction }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOWER_BETTER">Lower</SelectItem>
                    <SelectItem value="HIGHER_BETTER">Higher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Distance (meters, optional)</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 5000"
                value={form.distanceMeters}
                onChange={(e) => setForm((f) => ({ ...f, distanceMeters: e.target.value }))}
              />
            </div>
            <Button onClick={handleAdd} disabled={!form.name.trim() || saving} className="w-full">
              {saving ? "Adding…" : "Add discipline"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Plus, X, ChevronUp, ChevronDown, Loader2, Check } from "lucide-react";
import {
  updateWaiverText,
  createIntakeQuestion,
  updateIntakeQuestion,
  archiveIntakeQuestion,
  reorderIntakeQuestions,
} from "@/lib/actions/coach-intake-config";

type QuestionType = "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTI_CHOICE";

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  position: number;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  SINGLE_CHOICE: "Single choice",
  MULTI_CHOICE: "Multiple choice",
};

export function IntakeSection({
  initialWaiverText,
  initialQuestions,
}: {
  initialWaiverText: string;
  initialQuestions: Question[];
}) {
  return (
    <div className="space-y-6">
      <WaiverCard initial={initialWaiverText} />
      <QuestionsCard initial={initialQuestions} />
    </div>
  );
}

function WaiverCard({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      const result = await updateWaiverText({ waiverText: text });
      if (result.error) setMsg({ type: "error", text: result.error });
      else setMsg({ type: "success", text: "Waiver saved" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="size-4" /> Liability waiver
          {!initial && <Badge variant="outline" className="border-warning/50 text-warning">Required</Badge>}
        </CardTitle>
        <CardDescription>
          Your clients sign this before their first workout. Use your insurer&apos;s or attorney&apos;s language. Make clear that disclosure is voluntary and you are not providing medical advice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {msg && (
          <div className={`rounded-md border p-3 text-sm ${
            msg.type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-success/50 bg-success/10 text-success"
          }`}>{msg.text}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="waiver">Waiver text</Label>
          <Textarea
            id="waiver"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            maxLength={10000}
            placeholder="Paste your liability waiver / informed-consent text here..."
          />
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {text.length} / 10,000
          </p>
        </div>
        <Button onClick={handleSave} disabled={pending || text.trim().length < 20}>
          {pending ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : "Save waiver"}
        </Button>
      </CardContent>
    </Card>
  );
}

function QuestionsCard({ initial }: { initial: Question[] }) {
  const [questions, setQuestions] = useState<Question[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function move(id: string, dir: -1 | 1) {
    const idx = questions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const next = [...questions];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setQuestions(next);
    startTransition(async () => {
      const result = await reorderIntakeQuestions(next.map((q) => q.id));
      if (result.error) {
        setMsg({ type: "error", text: result.error });
        setQuestions(questions); // revert
      }
    });
  }

  function handleArchive(id: string) {
    if (!confirm("Archive this question? Existing answers will be preserved but new clients won't see it.")) return;
    startTransition(async () => {
      const result = await archiveIntakeQuestion(id);
      if (result.error) setMsg({ type: "error", text: result.error });
      else setQuestions((qs) => qs.filter((q) => q.id !== id));
    });
  }

  function handleSaveNew(q: Question) {
    setQuestions((qs) => [...qs, q]);
    setAdding(false);
  }
  function handleSaveEdit(q: Question) {
    setQuestions((qs) => qs.map((x) => x.id === q.id ? q : x));
    setEditingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Additional intake questions</CardTitle>
        <CardDescription>
          Optional. Added after the standard health section. Drag/move to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {msg && (
          <div className={`rounded-md border p-3 text-sm ${
            msg.type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-success/50 bg-success/10 text-success"
          }`}>{msg.text}</div>
        )}
        {questions.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground italic">No custom questions yet.</p>
        )}
        <ul className="space-y-2">
          {questions.map((q, i) => editingId === q.id ? (
            <QuestionEditor
              key={q.id}
              initial={q}
              onCancel={() => setEditingId(null)}
              onSaved={handleSaveEdit}
            />
          ) : (
            <li key={q.id} className="rounded-md border p-3 flex items-start gap-3">
              <div className="flex flex-col">
                <Button size="icon-sm" variant="ghost" onClick={() => move(q.id, -1)} disabled={i === 0 || pending} aria-label="Move up">
                  <ChevronUp className="size-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => move(q.id, 1)} disabled={i === questions.length - 1 || pending} aria-label="Move down">
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{q.text}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[q.type]}{q.required ? " · Required" : ""}
                  {q.options.length > 0 && ` · ${q.options.length} options`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditingId(q.id)} disabled={pending}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleArchive(q.id)} disabled={pending}>
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {adding ? (
          <QuestionEditor onCancel={() => setAdding(false)} onSaved={handleSaveNew} />
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4 mr-1.5" /> Add question
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Question;
  onCancel: () => void;
  onSaved: (q: Question) => void;
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [type, setType] = useState<QuestionType>(initial?.type ?? "SHORT_TEXT");
  const [options, setOptions] = useState<string[]>(initial?.options ?? []);
  const [required, setRequired] = useState<boolean>(initial?.required ?? false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isChoice = type === "SINGLE_CHOICE" || type === "MULTI_CHOICE";

  function handleSave() {
    setError(null);
    const input = { text, type, options: isChoice ? options : [], required };
    startTransition(async () => {
      const result = initial
        ? await updateIntakeQuestion(initial.id, input)
        : await createIntakeQuestion(input);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      const saved: Question =
        initial
          ? { ...initial, ...input }
          : { ...(result as unknown as { question: Question }).question };
      onSaved(saved);
    });
  }

  return (
    <li className="rounded-md border p-3 space-y-3 bg-muted/30">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
      )}
      <div className="space-y-2">
        <Label>Question text</Label>
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="e.g., What are your top three fitness goals?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SHORT_TEXT">Short text</SelectItem>
              <SelectItem value="LONG_TEXT">Long text</SelectItem>
              <SelectItem value="SINGLE_CHOICE">Single choice (radio)</SelectItem>
              <SelectItem value="MULTI_CHOICE">Multiple choice (checkboxes)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Required?</Label>
          <Button type="button" variant={required ? "default" : "outline"} size="sm" onClick={() => setRequired(!required)}>
            {required ? <><Check className="size-4 mr-1.5" /> Required</> : "Optional"}
          </Button>
        </div>
      </div>
      {isChoice && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => setOptions(options.map((o, j) => j === i ? e.target.value : o))}
                maxLength={200}
              />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOptions(options.filter((_, j) => j !== i))} aria-label="Remove option">
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>
            <Plus className="size-4 mr-1.5" /> Add option
          </Button>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="button" onClick={handleSave} disabled={pending || text.trim().length < 2}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </li>
  );
}

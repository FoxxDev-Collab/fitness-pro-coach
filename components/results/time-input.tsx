"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseTime, formatTime } from "@/lib/results/format";

type TimeInputProps = {
  value: number | null;
  onChange: (seconds: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * Displays a time string (mm:ss.t / h:mm:ss) but reports seconds via onChange.
 * Commits on blur/Enter; shows a red ring if the text can't be parsed.
 */
export function TimeInput({
  value,
  onChange,
  disabled,
  placeholder = "mm:ss.t",
  className,
}: TimeInputProps) {
  const [text, setText] = useState(value == null ? "" : formatTime(value));
  const [invalid, setInvalid] = useState(false);
  // Reset the displayed text when the external value changes (e.g. the parent
  // rebuilds rows on discipline change) — adjusting state during render, the
  // React-recommended alternative to a synchronous setState-in-effect.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value == null ? "" : formatTime(value));
    setInvalid(false);
  }

  const commit = () => {
    if (!text.trim()) {
      setInvalid(false);
      onChange(null);
      return;
    }
    try {
      onChange(parseTime(text));
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };

  return (
    <Input
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      inputMode="decimal"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className={cn(invalid && "ring-2 ring-destructive", className)}
    />
  );
}

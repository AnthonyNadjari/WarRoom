"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatDateForInput, parseInputToIsoDate } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

/** Value is YYYY-MM-DD (ISO); display is always DD/MM/YYYY. */
export function DateInput({
  value,
  onChange,
  placeholder = "JJ/MM/AAAA",
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const [display, setDisplay] = React.useState(() => formatDateForInput(value));
  const isControlled = value !== undefined;

  React.useEffect(() => {
    if (isControlled && value !== parseInputToIsoDate(display)) {
      setDisplay(formatDateForInput(value));
    }
  }, [value, isControlled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);
    const iso = parseInputToIsoDate(raw);
    if (iso) onChange(iso);
    else if (raw === "") onChange("");
  };

  const handleBlur = () => {
    const iso = parseInputToIsoDate(display);
    if (iso) {
      setDisplay(formatDateForInput(iso));
      onChange(iso);
    } else if (display.trim() === "") {
      onChange("");
    } else {
      setDisplay(formatDateForInput(value));
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        className={className}
        {...props}
      />
      <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

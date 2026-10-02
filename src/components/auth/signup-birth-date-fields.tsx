"use client";

import { useCallback, useId } from "react";
import { Input } from "@/components/ui/input";
import { sanitizeBirthDigitInput } from "@/lib/birth-date";

type BirthValues = {
  birthYear: string;
  birthMonth: string;
  birthDay: string;
};

type Props = {
  locale: string;
  required?: boolean;
  values: BirthValues;
  onChange: (next: BirthValues) => void;
};

/** Global signup DOB — year 4 digits, month/day 2 digits max. */
export function SignupBirthDateFields({ locale, required = true, values, onChange }: Props) {
  const id = useId();
  const label =
    "Date of birth";
  const hint =
    "False date of birth may lead to account restrictions under our Terms of Service.";

  const setYear = useCallback(
    (raw: string) => {
      onChange({ ...values, birthYear: sanitizeBirthDigitInput(raw, 4) });
    },
    [onChange, values]
  );
  const setMonth = useCallback(
    (raw: string) => {
      onChange({ ...values, birthMonth: sanitizeBirthDigitInput(raw, 2) });
    },
    [onChange, values]
  );
  const setDay = useCallback(
    (raw: string) => {
      onChange({ ...values, birthDay: sanitizeBirthDigitInput(raw, 2) });
    },
    [onChange, values]
  );

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="grid grid-cols-3 gap-2">
        <Input
          id={`${id}-year`}
          name="birthYear"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="YYYY"
          required={required}
          maxLength={4}
          value={values.birthYear}
          onChange={(e) => setYear(e.target.value)}
          autoComplete="bday-year"
          className="rounded-xl tabular-nums"
        />
        <Input
          id={`${id}-month`}
          name="birthMonth"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="MM"
          required={required}
          maxLength={2}
          value={values.birthMonth}
          onChange={(e) => setMonth(e.target.value)}
          autoComplete="bday-month"
          className="rounded-xl tabular-nums"
        />
        <Input
          id={`${id}-day`}
          name="birthDay"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="DD"
          required={required}
          maxLength={2}
          value={values.birthDay}
          onChange={(e) => setDay(e.target.value)}
          autoComplete="bday-day"
          className="rounded-xl tabular-nums"
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}

export function birthDateFieldsValid(values: BirthValues): boolean {
  const y = values.birthYear.trim();
  const m = values.birthMonth.trim();
  const d = values.birthDay.trim();
  if (y.length !== 4) return false;
  const month = Number(m);
  const day = Number(d);
  if (m.length < 1 || m.length > 2 || month < 1 || month > 12) return false;
  if (d.length < 1 || d.length > 2 || day < 1 || day > 31) return false;
  return true;
}

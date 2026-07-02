"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import {
  SIGNUP_EMAIL_CUSTOM_DOMAIN,
  SIGNUP_EMAIL_DOMAINS,
  SIGNUP_EMAIL_QUICK_PICKS,
  buildSignupEmail,
  getSignupDomainLabel,
  isKnownSignupDomain,
  parseSignupEmail,
} from "@/lib/signup-email-domains";

type EmailAddressFieldProps = {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (email: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
};

function useEmailParts(defaultValue: string, controlledValue?: string) {
  const seed = controlledValue ?? defaultValue;
  const initial = useMemo(() => parseSignupEmail(seed), [seed]);
  const [localPart, setLocalPart] = useState(initial.localPart);
  const [domain, setDomain] = useState(initial.domain);
  const [customDomain, setCustomDomain] = useState(initial.customDomain);

  useEffect(() => {
    if (controlledValue === undefined) return;
    const parsed = parseSignupEmail(controlledValue);
    setLocalPart(parsed.localPart);
    setDomain(parsed.domain);
    setCustomDomain(parsed.customDomain);
  }, [controlledValue]);

  return { localPart, setLocalPart, domain, setDomain, customDomain, setCustomDomain };
}

export function EmailAddressField({
  name = "email",
  defaultValue = "",
  value: controlledValue,
  onChange,
  required = true,
  disabled = false,
  id,
}: EmailAddressFieldProps) {
  const { t } = useLocale();
  const { localPart, setLocalPart, domain, setDomain, customDomain, setCustomDomain } =
    useEmailParts(defaultValue, controlledValue);

  const isCustom = domain === SIGNUP_EMAIL_CUSTOM_DOMAIN;
  const fullEmail = buildSignupEmail(localPart, domain, customDomain) ?? "";
  const activeDomain = isCustom ? customDomain : domain;

  const notifyChange = useCallback(
    (local: string, dom: string, custom: string) => {
      const built = buildSignupEmail(local, dom, custom) ?? "";
      onChange?.(built);
    },
    [onChange]
  );

  function applyParsed(local: string, dom: string, custom: string) {
    setLocalPart(local);
    setDomain(dom);
    setCustomDomain(custom);
    notifyChange(local, dom, custom);
  }

  function handleLocalChange(raw: string) {
    const trimmed = raw.trim();
    const at = trimmed.indexOf("@");
    if (at >= 0) {
      const parsed = parseSignupEmail(trimmed);
      applyParsed(parsed.localPart, parsed.domain, parsed.customDomain);
      return;
    }
    setLocalPart(raw);
    notifyChange(raw, domain, customDomain);
  }

  function pickDomain(next: string) {
    if (next === SIGNUP_EMAIL_CUSTOM_DOMAIN) {
      setDomain(SIGNUP_EMAIL_CUSTOM_DOMAIN);
      notifyChange(localPart, SIGNUP_EMAIL_CUSTOM_DOMAIN, customDomain);
      return;
    }
    setDomain(next);
    setCustomDomain("");
    notifyChange(localPart, next, "");
  }

  function handleDomainInput(raw: string) {
    const next = raw.trim().toLowerCase().replace(/^@+/, "");
    if (!next) {
      if (isCustom) setCustomDomain("");
      notifyChange(localPart, domain, "");
      return;
    }
    if (isKnownSignupDomain(next)) {
      setDomain(next);
      setCustomDomain("");
      notifyChange(localPart, next, "");
      return;
    }
    setDomain(SIGNUP_EMAIL_CUSTOM_DOMAIN);
    setCustomDomain(next);
    notifyChange(localPart, SIGNUP_EMAIL_CUSTOM_DOMAIN, next);
  }

  const domainSuggestions = useMemo(() => {
    const q = activeDomain.trim().toLowerCase();
    if (!q) return [...SIGNUP_EMAIL_DOMAINS];
    return SIGNUP_EMAIL_DOMAINS.filter(
      (d) => d.value.includes(q) || d.label.toLowerCase().includes(q)
    );
  }, [activeDomain]);

  const listId = id ? `${id}-domain-suggestions` : "email-domain-suggestions";

  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">{t("auth.email")}</span>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <Input
          id={id ? `${id}-local` : undefined}
          type="text"
          inputMode="email"
          placeholder={t("auth.emailLocalPart")}
          value={localPart}
          onChange={(e) => handleLocalChange(e.target.value)}
          autoComplete="username"
          disabled={disabled}
          required={required}
          aria-label={t("auth.emailLocalAria")}
          className="rounded-xl min-w-0"
        />
        <span
          className="flex h-10 w-8 shrink-0 items-center justify-center text-xl font-semibold text-foreground select-none"
          aria-hidden
        >
          @
        </span>
        <div className="min-w-0">
          <Input
            id={id ? `${id}-domain` : undefined}
            type="text"
            inputMode="url"
            placeholder={t("auth.emailDomain")}
            value={activeDomain}
            onChange={(e) => handleDomainInput(e.target.value)}
            list={listId}
            disabled={disabled}
            required={required}
            aria-label={t("auth.emailDomainAria")}
            className="rounded-xl min-w-0"
          />
          <datalist id={listId}>
            {domainSuggestions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </datalist>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SIGNUP_EMAIL_QUICK_PICKS.map((d) => {
          const selected = !isCustom && domain === d;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => pickDomain(d)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {getSignupDomainLabel(d)}
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => pickDomain(SIGNUP_EMAIL_CUSTOM_DOMAIN)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            isCustom
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {t("auth.emailCustom")}
        </button>
      </div>

      {fullEmail ? (
        <p className="text-xs text-muted-foreground truncate" aria-live="polite">
          {fullEmail}
        </p>
      ) : null}

      <input type="hidden" name={name} value={fullEmail} required={required} />
    </div>
  );
}

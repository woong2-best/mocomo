"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { updatePostTranslateInto } from "@/actions/post-translate-settings";
import { useLocale } from "@/components/providers/locale-provider";
import { usePostTranslate } from "@/components/providers/post-translate-provider";
import {
  POST_TRANSLATE_OFF,
  postTranslateLanguageChoices,
  postTranslateLanguageLabel,
  type PostTranslateInto,
} from "@/lib/client-translate/opus-mt-pairs";
import { isPostTranslateInto } from "@/lib/post-translate";

export function PostTranslateSettingsForm({
  initialValue,
}: {
  initialValue: string | null;
}) {
  const { t, locale } = useLocale();
  const sessionState = useSession();
  const { preference, setPreferenceLocal } = usePostTranslate();
  const [value, setValue] = useState<PostTranslateInto>(
    initialValue && isPostTranslateInto(initialValue) ? initialValue : preference
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialValue && isPostTranslateInto(initialValue)) return;
    setValue(preference);
  }, [preference, initialValue]);

  const options = useMemo(
    () =>
      postTranslateLanguageChoices().map((code) => ({
        code,
        label: postTranslateLanguageLabel(code, locale),
      })).sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale]
  );

  async function save() {
    setLoading(true);
    setSaved(false);
    const result = await updatePostTranslateInto({ postTranslateInto: value });
    if ("ok" in result) {
      setPreferenceLocal(result.postTranslateInto as PostTranslateInto);
      await sessionState?.update?.();
      setSaved(true);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("settings.translatePostsDesc")}</p>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("settings.translatePostsTitle")}</span>
        <select
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            if (isPostTranslateInto(next)) {
              setValue(next);
              setSaved(false);
            }
          }}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value={POST_TRANSLATE_OFF}>{t("settings.translatePostsOff")}</option>
          {options.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">{t("settings.translatePostsHint")}</p>
      <button
        type="button"
        onClick={() => void save()}
        disabled={loading}
        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
      >
        {loading ? t("settings.saving") : t("settings.save")}
      </button>
      {saved ? <p className="text-xs text-muted-foreground">{t("settings.saved")}</p> : null}
    </div>
  );
}

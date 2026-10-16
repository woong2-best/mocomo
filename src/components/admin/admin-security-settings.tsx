"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminPasskeyDeleteAction,
  adminPasskeyRegisterOptionsAction,
  adminPasskeyRegisterVerifyAction,
  adminPasskeyRenameAction,
  adminRecoveryGenerateAction,
  adminSecurityOverviewAction,
  adminTotpBeginAction,
  adminTotpSetEnabledAction,
  adminTotpVerifyAction,
  adminTrustedRevokeAction,
} from "@/actions/admin-security";

type Overview = Awaited<ReturnType<typeof adminSecurityOverviewAction>>;

export function AdminSecuritySettingsPanel() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpStatus, setTotpStatus] = useState<"created" | "existing" | "replaced" | null>(null);
  const [totpNeedsVerify, setTotpNeedsVerify] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const reload = useCallback(async () => {
    const overview = await adminSecurityOverviewAction();
    setData(overview);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!data || "error" in data) {
    return <p className="text-sm text-muted-foreground">{t("admin.s10ho2rs")}</p>;
  }

  async function addPasskey() {
    setLoading(true);
    setError(null);
    const options = await adminPasskeyRegisterOptionsAction();
    if ("error" in options && options.error) {
      setLoading(false);
      setError(errorText(options.error));
      return;
    }
    try {
      const attestation = await startRegistration(
        options as Parameters<typeof startRegistration>[0]
      );
      const name = window.prompt(t("admin.passkey_8"), "Passkey") || "Passkey";
      const result = await adminPasskeyRegisterVerifyAction(attestation, name);
      setLoading(false);
      if ("error" in result && result.error) {
        setError(errorText(result.error));
        return;
      }
      await reload();
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : t("admin.skg6k6w"));
    }
  }

  async function showCurrentTotp() {
    setLoading(true);
    setError(null);
    const begun = await adminTotpBeginAction();
    setLoading(false);
    if ("error" in begun && begun.error) {
      setError(errorText(begun.error));
      return;
    }
    if ("otpauthUrl" in begun && begun.otpauthUrl) {
      setSecret(begun.secretBase32 ?? null);
      setTotpStatus(begun.status ?? "existing");
      setTotpNeedsVerify(Boolean(begun.needsVerify));
      setQr(await QRCode.toDataURL(begun.otpauthUrl, { width: 200, margin: 1 }));
    }
  }

  async function replaceTotp() {
    const ok = window.confirm(
      "서버의 인증 키를 이 계정에 하나뿐인 새 키로 바꿉니다. 지금 쓰던 코드는 바로 무효가 됩니다. 인증 앱의 MoCoMo 항목을 모두 지운 뒤, 새 QR을 한 번만 스캔하세요."
    );
    if (!ok) return;
    setLoading(true);
    setError(null);
    const begun = await adminTotpBeginAction({ rotate: true });
    setLoading(false);
    if ("error" in begun && begun.error) {
      setError(errorText(begun.error));
      return;
    }
    if ("otpauthUrl" in begun && begun.otpauthUrl) {
      setSecret(begun.secretBase32 ?? null);
      setTotpStatus(begun.status ?? "replaced");
      setTotpNeedsVerify(true);
      setTotpCode("");
      setQr(await QRCode.toDataURL(begun.otpauthUrl, { width: 200, margin: 1 }));
    }
  }

  return (
    <div className="space-y-10">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Passkey</h2>
          <Button size="sm" disabled={loading} onClick={addPasskey}>
            등록
          </Button>
        </div>
        <ul className="divide-y rounded-lg border">
          {data.passkeys.map((pk) => (
            <li key={pk.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">{pk.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pk.deviceType ?? "unknown"} · 등록{" "}
                  {new Date(pk.createdAt).toLocaleString()}
                  {pk.lastUsedAt
                    ? ` · 최근 ${new Date(pk.lastUsedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {renameId === pk.id ? (
                  <>
                    <Input
                      className="h-8 w-36"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        await adminPasskeyRenameAction(pk.id, renameValue);
                        setRenameId(null);
                        await reload();
                      }}
                    >
                      저장
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRenameId(pk.id);
                      setRenameValue(pk.name);
                    }}
                  >
                    이름
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    const r = await adminPasskeyDeleteAction(pk.id);
                    if ("error" in r && r.error) setError(errorText(r.error));
                    await reload();
                  }}
                >
                  삭제
                </Button>
              </div>
            </li>
          ))}
          {!data.passkeys.length ? (
            <li className="p-3 text-sm text-muted-foreground">{t("admin.passkey_7")}</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Authenticator (TOTP)</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={loading} onClick={() => void showCurrentTotp()}>
              현재 키 보기
            </Button>
            <Button size="sm" variant="outline" disabled={loading} onClick={() => void replaceTotp()}>
              키 교체
            </Button>
            {data.totp?.enabled ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await adminTotpSetEnabledAction(false);
                  await reload();
                }}
              >
                비활성화
              </Button>
            ) : data.totp?.verifiedAt ? (
              <Button
                size="sm"
                onClick={async () => {
                  await adminTotpSetEnabledAction(true);
                  await reload();
                }}
              >
                활성화
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          상태:{" "}
          {data.totp?.enabled
            ? t("settings.twoFactorOn")
            : data.totp?.verifiedAt
              ? t("settings.twoFactorOff")
              : t("admin.ssexz8")}
          {data.totp?.verifiedAt
            ? ` · 검증 ${new Date(data.totp.verifiedAt).toLocaleString()}`
            : ""}
        </p>
        {qr ? (
          <div className="space-y-2 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              {totpStatus === "replaced"
                ? "이 계정의 키를 하나 교체했습니다. 인증 앱의 기존 MoCoMo 항목을 모두 지운 다음, 이 QR만 한 번 스캔하고 코드를 확인하세요."
                : totpStatus === "created"
                  ? "이 계정용 키를 하나 만들었습니다. 인증 앱에 한 번만 추가하세요."
                  : "서버에는 이 계정 키가 하나만 있습니다. 인증 앱에 MoCoMo 항목이 여러 개면 전부 지운 뒤 이 QR을 한 번만 스캔하세요. 이미 있는 항목을 또 추가하지 마세요."}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="TOTP QR" className="mx-auto" />
            {secret ? (
              <p className="break-all text-center font-mono text-xs">{secret}</p>
            ) : null}
            {totpNeedsVerify ? (
              <div className="flex gap-2">
                <Input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("admin.s1byjevq")}
                  className="font-mono"
                />
                <Button
                  onClick={async () => {
                    const r = await adminTotpVerifyAction(totpCode);
                    if ("error" in r && r.error) setError(errorText(r.error));
                    else {
                      setQr(null);
                      setTotpStatus(null);
                      setTotpNeedsVerify(false);
                      setTotpCode("");
                      await reload();
                    }
                  }}
                >
                  확인
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recovery Code</h2>
          <Button
            size="sm"
            disabled={loading}
            onClick={async () => {
              const r = await adminRecoveryGenerateAction();
              if ("codes" in r && r.codes) {
                setRecoveryCodes(r.codes);
                const blob = new Blob([r.codes.join("\n")], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "mocomo-admin-recovery-codes.txt";
                a.click();
              }
              await reload();
            }}
          >
            재생성 · 다운로드
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          미사용 {data.recovery.unused} / 전체 {data.recovery.total} (사용{" "}
          {data.recovery.used})
        </p>
        {recoveryCodes ? (
          <pre className="rounded-lg border bg-muted/40 p-3 text-xs leading-6">
            {recoveryCodes.join("\n")}
          </pre>
        ) : null}
        <ul className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
          {data.recovery.codes.map((c) => (
            <li
              key={c.index}
              className={c.used ? "line-through opacity-50" : "font-medium text-foreground"}
            >
              #{c.index} {c.used ? t("admin.st6qff") : t("admin.sz1qg")}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Trusted Devices</h2>
        <ul className="divide-y rounded-lg border">
          {data.trusted.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">{d.label ?? "Device"}</p>
                <p className="text-xs text-muted-foreground">
                  만료 {new Date(d.expiresAt).toLocaleString()}
                  {d.lastUsedAt
                    ? ` · 최근 ${new Date(d.lastUsedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await adminTrustedRevokeAction(d.id);
                  await reload();
                }}
              >
                해제
              </Button>
            </li>
          ))}
          {!data.trusted.length ? (
            <li className="p-3 text-sm text-muted-foreground">{t("admin.sz2nkly")}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

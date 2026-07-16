"use client";

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
    return <p className="text-sm text-muted-foreground">보안 설정을 불러오는 중…</p>;
  }

  async function addPasskey() {
    setLoading(true);
    setError(null);
    const options = await adminPasskeyRegisterOptionsAction();
    if ("error" in options && options.error) {
      setLoading(false);
      setError(options.error);
      return;
    }
    try {
      const attestation = await startRegistration(
        options as Parameters<typeof startRegistration>[0]
      );
      const name = window.prompt("Passkey 이름", "Passkey") || "Passkey";
      const result = await adminPasskeyRegisterVerifyAction(attestation, name);
      setLoading(false);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      await reload();
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "등록 취소");
    }
  }

  async function beginTotpReset() {
    setLoading(true);
    const begun = await adminTotpBeginAction();
    setLoading(false);
    if ("error" in begun && begun.error) {
      setError(begun.error);
      return;
    }
    if ("otpauthUrl" in begun && begun.otpauthUrl) {
      setSecret(begun.secretBase32 ?? null);
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
                    if ("error" in r && r.error) setError(r.error);
                    await reload();
                  }}
                >
                  삭제
                </Button>
              </div>
            </li>
          ))}
          {!data.passkeys.length ? (
            <li className="p-3 text-sm text-muted-foreground">등록된 Passkey 없음</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Authenticator (TOTP)</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={loading} onClick={beginTotpReset}>
              QR 재발급
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
            ? "활성"
            : data.totp?.verifiedAt
              ? "비활성"
              : "미등록"}
          {data.totp?.verifiedAt
            ? ` · 검증 ${new Date(data.totp.verifiedAt).toLocaleString()}`
            : ""}
        </p>
        {qr ? (
          <div className="space-y-2 rounded-lg border p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="TOTP QR" className="mx-auto" />
            {secret ? (
              <p className="break-all text-center font-mono text-xs">{secret}</p>
            ) : null}
            <div className="flex gap-2">
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6자리 코드"
                className="font-mono"
              />
              <Button
                onClick={async () => {
                  const r = await adminTotpVerifyAction(totpCode);
                  if ("error" in r && r.error) setError(r.error);
                  else {
                    setQr(null);
                    setTotpCode("");
                    await reload();
                  }
                }}
              >
                확인
              </Button>
            </div>
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
              #{c.index} {c.used ? "사용됨" : "유효"}
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
            <li className="p-3 text-sm text-muted-foreground">신뢰 기기 없음</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

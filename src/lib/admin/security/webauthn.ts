import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { db } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/auth-tokens";

function rpConfig() {
  const base = getAppBaseUrl();
  let origin = process.env.WEBAUTHN_ORIGIN?.trim() || base;
  let rpID =
    process.env.WEBAUTHN_RP_ID?.trim() ||
    (() => {
      try {
        return new URL(origin).hostname;
      } catch {
        return "localhost";
      }
    })();
  if (rpID === "127.0.0.1") rpID = "localhost";
  try {
    origin = new URL(origin).origin;
  } catch {
    /* keep */
  }
  return {
    rpID,
    rpName: "MoCoMo Admin",
    origin,
  };
}

function challengeIdentifier(kind: "reg" | "auth", userId: string) {
  return `admin-webauthn-${kind}:${userId}`;
}

async function storeChallenge(identifier: string, challenge: string) {
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: { identifier, token: challenge, expires },
  });
}

async function consumeChallenge(identifier: string): Promise<string | null> {
  const row = await db.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (!row || row.expires < new Date()) return null;
  await db.verificationToken.deleteMany({ where: { identifier } });
  return row.token;
}

function toBase64Url(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function beginPasskeyRegistration(user: {
  id: string;
  username: string;
  email?: string | null;
}) {
  const { rpID, rpName } = rpConfig();
  const existing = await db.adminWebAuthnCredential.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email || user.username,
    userDisplayName: user.username,
    userID: user.id,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: fromBase64Url(c.credentialId),
      type: "public-key" as const,
      transports: c.transports
        ? (JSON.parse(c.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await storeChallenge(challengeIdentifier("reg", user.id), options.challenge);
  return options;
}

export async function finishPasskeyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  name?: string
): Promise<{ credentialId: string } | { error: string }> {
  const { rpID, origin } = rpConfig();
  const expectedChallenge = await consumeChallenge(challengeIdentifier("reg", userId));
  if (!expectedChallenge) return { error: "Passkey 등록 세션이 만료되었습니다." };

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Passkey 등록 검증 실패" };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: "Passkey 등록에 실패했습니다." };
  }

  const info = verification.registrationInfo;
  // v9: credentialID (Uint8Array), credentialPublicKey, counter
  const credentialId = toBase64Url(
    info.credentialID instanceof Uint8Array
      ? info.credentialID
      : new Uint8Array(info.credentialID)
  );
  const publicKey = Buffer.from(info.credentialPublicKey);
  const counter = BigInt(info.counter);
  const transports = response.response.transports
    ? JSON.stringify(response.response.transports)
    : null;

  await db.adminWebAuthnCredential.create({
    data: {
      userId,
      credentialId,
      publicKey,
      counter,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      transports,
      name: name?.trim() || "Passkey",
    },
  });

  return { credentialId };
}

export async function beginPasskeyAuthentication(userId: string) {
  const { rpID } = rpConfig();
  const existing = await db.adminWebAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });
  if (!existing.length) {
    return { error: "등록된 Passkey가 없습니다." as const };
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: existing.map((c) => ({
      id: fromBase64Url(c.credentialId),
      type: "public-key" as const,
      transports: c.transports
        ? (JSON.parse(c.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
    userVerification: "preferred",
  });

  await storeChallenge(challengeIdentifier("auth", userId), options.challenge);
  return { options };
}

export async function finishPasskeyAuthentication(
  userId: string,
  response: AuthenticationResponseJSON
): Promise<{ ok: true } | { error: string }> {
  const { rpID, origin } = rpConfig();
  const expectedChallenge = await consumeChallenge(challengeIdentifier("auth", userId));
  if (!expectedChallenge) return { error: "Passkey 인증 세션이 만료되었습니다." };

  const cred = await db.adminWebAuthnCredential.findUnique({
    where: { credentialId: response.id },
  });
  if (!cred || cred.userId !== userId) {
    return { error: "알 수 없는 Passkey입니다." };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: fromBase64Url(cred.credentialId),
        credentialPublicKey: new Uint8Array(cred.publicKey),
        counter: Number(cred.counter),
        transports: cred.transports
          ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
          : undefined,
      },
      requireUserVerification: false,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Passkey 인증 실패" };
  }

  if (!verification.verified) return { error: "Passkey 인증에 실패했습니다." };

  await db.adminWebAuthnCredential.update({
    where: { id: cred.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  return { ok: true };
}

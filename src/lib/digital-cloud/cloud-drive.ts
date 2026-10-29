import { db } from "@/lib/db";
import { hydrateUserOAuthProfile } from "@/lib/oauth-vault";
import { safeLogWarn } from "@/lib/safe-log";
import {
  fileHashMismatch,
  normalizeMd5,
  normalizeSha256,
  validateCloudShareUrl,
} from "@/lib/digital-cloud/cloud-share-url";

export type CloudDeliveryFailure = "invalid_url" | "permission_failed" | "hash_mismatch" | "invalid_hash";

export type CloudDeliveryOk = {
  ok: true;
  href: string;
  fileId?: string;
  sha256?: string;
  mimeType?: string;
  sizeBytes?: number;
};

const DRIVE_TIMEOUT_MS = 8_000;

/**
 * Confirms a cloud share link and, when a Drive delivery token is configured,
 * grants the buyer reader access. File bytes stay on the cloud provider.
 * Without the token, a whitelisted link is accepted as a share URL.
 */
export async function verifyCloudDelivery(input: {
  cloudUrl: string;
  buyerUserId: string;
  declaredHash?: string | null;
  expectedHash?: string | null;
}): Promise<CloudDeliveryOk | { ok: false; code: CloudDeliveryFailure }> {
  const parsed = validateCloudShareUrl(input.cloudUrl);
  if (!parsed.ok) return { ok: false, code: "invalid_url" };

  const declared = input.declaredHash?.trim() ?? "";
  if (declared && !normalizeSha256(declared) && !normalizeMd5(declared)) {
    return { ok: false, code: "invalid_hash" };
  }
  if (fileHashMismatch(input.expectedHash, declared)) {
    return { ok: false, code: "hash_mismatch" };
  }

  const sha256 = normalizeSha256(declared) ?? undefined;
  if (parsed.provider !== "google" || !parsed.fileId) {
    return { ok: true, href: parsed.href, sha256 };
  }

  const token = process.env.GOOGLE_DRIVE_DELIVERY_ACCESS_TOKEN?.trim();
  if (!token) {
    return { ok: true, href: parsed.href, fileId: parsed.fileId, sha256 };
  }

  const meta = await readDriveFile(parsed.fileId, token);
  if (!meta.ok) {
    return { ok: false, code: meta.status === 404 ? "invalid_url" : "permission_failed" };
  }
  const declaredMd5 = normalizeMd5(declared);
  const expectedMd5 = normalizeMd5(input.expectedHash);
  if ((meta.md5 && declaredMd5 && meta.md5 !== declaredMd5) || (meta.md5 && expectedMd5 && meta.md5 !== expectedMd5)) {
    return { ok: false, code: "hash_mismatch" };
  }

  const email = await buyerDeliveryEmail(input.buyerUserId);
  if (!email) return { ok: false, code: "permission_failed" };
  const granted = await grantDriveReader(parsed.fileId, email, token);
  if (!granted) return { ok: false, code: "permission_failed" };

  return {
    ok: true,
    href: parsed.href,
    fileId: parsed.fileId,
    sha256,
    mimeType: meta.mimeType,
    sizeBytes: boundedSize(meta.size),
  };
}

async function buyerDeliveryEmail(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, email: true, passwordHash: true },
  });
  if (!user) return null;
  const profile = await hydrateUserOAuthProfile(user);
  const email = profile.email?.trim().toLowerCase() ?? "";
  return email.includes("@") ? email : null;
}

async function readDriveFile(
  fileId: string,
  token: string
): Promise<{ ok: true; md5: string | null; mimeType?: string; size?: string } | { ok: false; status: number }> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=md5Checksum,mimeType,size&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(DRIVE_TIMEOUT_MS),
      }
    );
    if (!res.ok) return { ok: false, status: res.status };
    const body = (await res.json()) as { md5Checksum?: string; mimeType?: string; size?: string };
    return {
      ok: true,
      md5: normalizeMd5(body.md5Checksum),
      mimeType: typeof body.mimeType === "string" ? body.mimeType.slice(0, 120) : undefined,
      size: body.size,
    };
  } catch (error) {
    safeLogWarn("digital-drive", {
      step: "files.get",
      error: error instanceof Error ? error.name : "request_failed",
    });
    return { ok: false, status: 0 };
  }
}

async function grantDriveReader(fileId: string, email: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "user", emailAddress: email }),
        signal: AbortSignal.timeout(DRIVE_TIMEOUT_MS),
      }
    );
    if (res.ok || res.status === 409) return true;
    safeLogWarn("digital-drive", { step: "permissions.create", status: res.status });
    return false;
  } catch (error) {
    safeLogWarn("digital-drive", {
      step: "permissions.create",
      error: error instanceof Error ? error.name : "request_failed",
    });
    return false;
  }
}

function boundedSize(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const size = Number(raw);
  if (!Number.isFinite(size) || size <= 0 || size > 2_000_000_000) return undefined;
  return Math.floor(size);
}

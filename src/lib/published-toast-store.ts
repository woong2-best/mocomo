import type { PublishedToastInput, PublishedToastKind } from "@/lib/published-toast-types";

export type QueuedToast = PublishedToastInput & {
  id: string;
  kind: PublishedToastKind;
};

type Listener = () => void;

let current: QueuedToast | null = null;
let queue: QueuedToast[] = [];
const listeners = new Set<Listener>();

let toastSeq = 0;
function nextId() {
  toastSeq += 1;
  return `pt-${Date.now()}-${toastSeq}`;
}

function emit() {
  listeners.forEach((l) => l());
}

export function getPublishedToastSnapshot() {
  return { current, queueLength: queue.length };
}

export function subscribePublishedToast(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearPublishedToast() {
  current = null;
  queue = [];
  emit();
}

export function dismissPublishedToastCurrent() {
  if (queue.length > 0) {
    current = queue[0] ?? null;
    queue = queue.slice(1);
  } else {
    current = null;
  }
  emit();
}

function present(item: QueuedToast) {
  // 게시 중 → 성공/실패는 즉시 교체
  if (current?.kind === "publishing" && item.kind !== "publishing") {
    current = item;
    emit();
    return;
  }
  if (!current) {
    current = item;
    emit();
    return;
  }
  queue = [...queue, item];
  emit();
}

export function pushPublishedToast(input: {
  postId: string;
  userImage?: string | null;
  userName?: string | null;
  avatars?: PublishedToastInput["avatars"];
  message?: string;
}) {
  const avatars =
    input.avatars && input.avatars.length > 0
      ? input.avatars
      : input.userImage || input.userName
        ? [{ image: input.userImage, name: input.userName }]
        : undefined;

  present({
    id: nextId(),
    kind: "published",
    message: input.message ?? "게시됨",
    postId: input.postId,
    userImage: input.userImage,
    userName: input.userName,
    avatars,
    showActions: true,
    durationMs: 4500,
  });
}

export function pushPublishingToast(input?: {
  userImage?: string | null;
  userName?: string | null;
  avatars?: PublishedToastInput["avatars"];
  message?: string;
}) {
  present({
    id: nextId(),
    kind: "publishing",
    message: input?.message ?? "게시 중…",
    userImage: input?.userImage,
    userName: input?.userName,
    avatars: input?.avatars,
    durationMs: 120_000,
  });
}

export function pushErrorToast(input: { message: string; detail?: string }) {
  present({
    id: nextId(),
    kind: "error",
    message: input.message,
    detail: input.detail,
    durationMs: 4500,
  });
}

export function pushInfoToast(input: {
  message: string;
  detail?: string;
  href?: string;
  durationMs?: number;
}) {
  present({
    id: nextId(),
    kind: "info",
    message: input.message,
    detail: input.detail,
    href: input.href,
    durationMs: input.durationMs ?? 3000,
  });
}

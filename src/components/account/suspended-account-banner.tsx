"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";

export function SuspendedAccountBanner() {
  const session = useSession();
  const user = session.data?.user;
  if (!user?.isSuspendedReadOnly) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[60] border-b border-red-900/40 bg-red-600 text-white shadow-md"
    >
      <div className="mx-auto max-w-5xl px-4 py-3 text-sm leading-relaxed">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 space-y-2">
            <p className="text-base font-bold">계정이 정지되었습니다.</p>
            <p>
              당사의 검토 결과, 귀하의 계정이 커뮤니티 운영원칙을 중대하게 위반한 것으로 확인되었습니다.
            </p>
            <p>
              귀하의 계정은 영구적으로 <strong>읽기 전용(Read Only)</strong> 상태입니다. 현재 게시물 작성,
              댓글 작성, 좋아요, 북마크, 메시지 전송 등 대부분의 기능을 이용할 수 없습니다.
            </p>
            <p>
              또한 새로운 계정을 생성하거나 기존 제재를 우회하려는 행위 역시 금지됩니다.
            </p>
            <p>
              본 조치가 잘못 적용되었다고 판단되는 경우 아래의{" "}
              <Link href="/appeal" className="font-semibold underline underline-offset-2">
                이의 제기하기
              </Link>{" "}
              버튼을 통해 재심사를 요청할 수 있습니다.
            </p>
            <Link
              href="/appeal"
              className="inline-flex rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              이의 제기하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

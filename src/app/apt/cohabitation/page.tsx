import Link from "next/link";
import { redirect } from "next/navigation";
import {
  acceptAptCohabitationRequestForm,
  getMyAptCohabitationState,
  rejectAptCohabitationRequestForm,
  requestAptCohabitationMoveOutForm,
} from "@/actions/apt-cohabitation";
import { getCachedCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function label(user: { name: string | null; username: string }) {
  return user.name ?? user.username;
}

export default async function AptCohabitationPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/apt/cohabitation");

  const state = await getMyAptCohabitationState();
  if (!state) redirect("/auth/signin?callbackUrl=/apt/cohabitation");

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-24">
      <div className="rounded-[2rem] border-4 border-slate-900 bg-white p-5 shadow-[0_8px_0_rgba(15,23,42,0.12)]">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          MOCOMO APT
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">동거 신청 관리</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          동거는 집주인 포함 기본 2명까지 가능합니다. 집주인에게 아이템이 하나도 없는 빈 방이 있어야
          수락할 수 있고, 동거 종료는 양쪽 동의가 필요합니다.
        </p>
      </div>

      <section className="rounded-[1.5rem] border-2 border-slate-900 bg-[#fffdf5] p-4">
        <h2 className="text-lg font-black text-slate-900">받은 동거 신청</h2>
        <div className="mt-3 space-y-3">
          {state.incoming.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">아직 받은 신청이 없습니다.</p>
          ) : (
            state.incoming.map((request) => (
              <div key={request.id} className="rounded-2xl border bg-white p-4">
                <p className="font-black text-slate-900">{label(request.requester)}님의 동거 신청</p>
                <p className="mt-1 text-xs text-slate-500">
                  신청 방: {request.roomId ?? "빈 방 자동 선택"} · {request.createdAt.toLocaleString("ko-KR")}
                </p>
                {request.message && <p className="mt-2 text-sm text-slate-700">{request.message}</p>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <form action={acceptAptCohabitationRequestForm}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit" className="w-full rounded-xl">
                      수락
                    </Button>
                  </form>
                  <form action={rejectAptCohabitationRequestForm}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit" variant="outline" className="w-full rounded-xl">
                      거절
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border-2 border-slate-900 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">현재 동거 상태</h2>
        <div className="mt-3 space-y-3">
          {state.hosted.map((row) => (
            <div key={row.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-900">{label(row.resident)}님이 함께 거주 중</p>
              <p className="text-xs text-slate-500">배정 방: {row.roomId}</p>
              <form action={requestAptCohabitationMoveOutForm} className="mt-3">
                <input type="hidden" name="cohabitantId" value={row.id} />
                <Button type="submit" variant="outline" className="w-full rounded-xl">
                  동거 종료 동의 요청
                </Button>
              </form>
            </div>
          ))}

          {state.residence && (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-900">{label(state.residence.host)}님의 집에 동거 중</p>
              <p className="text-xs text-slate-500">내 방: {state.residence.roomId}</p>
              <form action={requestAptCohabitationMoveOutForm} className="mt-3">
                <input type="hidden" name="cohabitantId" value={state.residence.id} />
                <Button type="submit" variant="outline" className="w-full rounded-xl">
                  이사/동거 종료 요청
                </Button>
              </form>
            </div>
          )}

          {state.hosted.length === 0 && !state.residence && (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">현재 동거 중인 유저가 없습니다.</p>
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border-2 border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">내가 보낸 신청</h2>
        <div className="mt-3 space-y-2">
          {state.outgoing.length === 0 ? (
            <p className="text-sm text-slate-500">보낸 신청이 없습니다.</p>
          ) : (
            state.outgoing.map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <span>{label(request.host)}님</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">
                  {request.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border-2 border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-900">APT 장터 자동 판매</h2>
        <p className="mt-1 text-xs text-slate-500">
          동거 입주/이사 과정에서 기존 방 아이템은 자동으로 판매 등록됩니다.
        </p>
        <div className="mt-3 space-y-2">
          {state.marketListings.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">자동 판매 등록된 아이템이 없습니다.</p>
          ) : (
            state.marketListings.map((listing) => (
              <div key={listing.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <div>
                  <p className="font-bold text-slate-900">{listing.itemKind}</p>
                  <p className="text-xs text-slate-500">
                    {listing.source} · {listing.roomId ?? "방 정보 없음"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">
                  {listing.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <Button asChild variant="outline" className="w-full rounded-2xl">
        <Link href="/apt">APT로 돌아가기</Link>
      </Button>
    </div>
  );
}

export function UsedAuctionRetiredNotice() {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground"
    >
      중고 경매 기능은 종료되었습니다. 신규 입찰·경매 등록은 할 수 없으며, 진행 중이던 결제·협상만 아래에서
      이어갈 수 있습니다.
    </div>
  );
}

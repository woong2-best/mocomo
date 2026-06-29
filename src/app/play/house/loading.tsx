export default function PlayHouseLoading() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0a12]">
      <div className="h-[calc(max(0.5rem,env(safe-area-inset-top))+3rem)] shrink-0 bg-[#12121c]/80" />
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#1a1520] via-[#12121c] to-[#0a0a12]" />
        <div className="absolute inset-x-6 top-1/3 h-40 rounded-2xl bg-white/5 animate-pulse" />
        <div className="absolute inset-x-10 bottom-[calc(max(4.5rem,env(safe-area-inset-bottom))+1rem)] flex justify-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-12 rounded-2xl bg-white/8 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
      <p className="pointer-events-none absolute inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))+1rem)] text-center text-[10px] font-bold text-white/40">
        집 불러오는 중…
      </p>
    </div>
  );
}

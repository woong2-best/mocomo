/** Ruled note that fills the reel frame. Text is already paginated to fit. */
export function ReelNotePage({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 bg-[#14110e]">
      <div
        className="absolute inset-3 overflow-hidden rounded-md bg-[#f6f1e4] text-[#221c16] shadow-[inset_0_0_0_1px_rgba(80,60,30,0.16)]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 31px, rgba(90,62,28,0.22) 31px 32px)",
          backgroundSize: "100% 32px",
          backgroundPosition: "0 12px",
        }}
      >
        <p className="whitespace-pre-wrap pb-28 pl-5 pr-14 pt-3 text-[17px] font-medium leading-8">
          {text}
        </p>
      </div>
    </div>
  );
}

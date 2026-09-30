import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const innerSize: Record<Size, string> = {
  sm: "h-10 w-10 rounded-[14px] text-[17px]",
  md: "h-10 w-10 rounded-[14px] text-[17px]",
};

/** QnA feed avatar — matches mobile `FeedPostCard` qnaMark (cobalt square + white Q). */
export function QnaQuestionMark({
  size = "sm",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-[16px] border-2 border-folk-cobalt/45 bg-background p-0.5",
        className
      )}
      role="img"
      aria-label="QnA question"
    >
      <div
        className={cn(
          "flex items-center justify-center bg-folk-cobalt font-extrabold text-white",
          innerSize[size]
        )}
      >
        Q
      </div>
    </div>
  );
}

/** Staunty 스타일 — 온라인 체스 표준에 가까운 플랫 벡터 기물 (Lichess staunty, CC BY-NC-SA 4.0) */

type PieceProps = {
  color: "w" | "b";
  type: string;
  className?: string;
  style?: React.CSSProperties;
};

const PIECE_SET = "staunty";

export function ChessPieceSvg({ color, type, className, style }: PieceProps) {
  const key = `${color}${type.toUpperCase()}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/chess/pieces/${PIECE_SET}/${key}.svg`}
      alt=""
      aria-hidden
      draggable={false}
      className={className}
      style={style}
    />
  );
}

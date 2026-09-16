"""Slice photo-2 category grid into 6 transparent card assets."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\백권웅\.cursor\projects\c-dev-mocomo\assets"
    r"\c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-fb5a7343-e0f2-4363-9ab3-75bbcdf8daa5.png"
)
OUT = Path(r"C:\dev\mocomo\public\images\live\categories")

# Fixed order matching the 2×3 grid in photo 2
ORDER = [
    "IRL",
    "JUST_CHATTING",  # labeled CHATTING in art
    "GAME",
    "MUSIC",
    "VIRTUAL",
    "LIVE",
]


def is_bg(r: int, g: int, b: int, thr: int = 22) -> bool:
    return (r + g + b) / 3 <= thr


def find_content_bbox(im: Image.Image, thr: int = 22) -> tuple[int, int, int, int]:
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            if not is_bg(*px[x, y], thr):
                found = True
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y
    if not found:
        return (0, 0, w, h)
    return (min_x, min_y, max_x + 1, max_y + 1)


def make_transparent(im: Image.Image, thr: int = 18, soft: int = 14) -> Image.Image:
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            lum = (r + g + b) / 3
            if lum <= thr:
                px[x, y] = (r, g, b, 0)
            elif lum < thr + soft:
                px[x, y] = (r, g, b, int(a * (lum - thr) / soft))
    return rgba


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert("RGB")
    # Content area (drop outer black)
    bx0, by0, bx1, by1 = find_content_bbox(im, thr=28)
    content = im.crop((bx0, by0, bx1, by1))
    cw, ch = content.size
    print(f"content bbox=({bx0},{by0},{bx1},{by1}) size={cw}x{ch}")

    # 2 cols × 3 rows with small gutters — split evenly then trim each cell
    cols, rows = 2, 3
    cell_w = cw / cols
    cell_h = ch / rows

    for idx, cat in enumerate(ORDER):
        row, col = divmod(idx, cols)
        # wait: grid is row-major: idx 0 = r0c0, 1=r0c1, 2=r1c0...
        row = idx // cols
        col = idx % cols
        x0 = int(col * cell_w)
        y0 = int(row * cell_h)
        x1 = int((col + 1) * cell_w)
        y1 = int((row + 1) * cell_h)
        cell = content.crop((x0, y0, x1, y1))

        # Trim per-card black padding
        lx0, ly0, lx1, ly1 = find_content_bbox(cell, thr=26)
        # pad slightly so rounded corners aren't clipped
        pad = 2
        lx0 = max(0, lx0 - pad)
        ly0 = max(0, ly0 - pad)
        lx1 = min(cell.width, lx1 + pad)
        ly1 = min(cell.height, ly1 + pad)
        card = cell.crop((lx0, ly0, lx1, ly1))
        card = make_transparent(card)

        # Drop residual empty alpha edges
        bbox = card.getbbox()
        if bbox:
            card = card.crop(bbox)

        dest = OUT / f"{cat.lower()}.png"
        card.save(dest, "PNG", optimize=True)
        print(f"wrote {dest.name} {card.size[0]}x{card.size[1]}")


if __name__ == "__main__":
    main()

"""Strip dark card plates from category cards — keep folder + white label only."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

OUT = Path(r"C:\dev\mocomo\public\images\live\categories")
SRC_COMPOSITE = Path(
    r"C:\Users\백권웅\.cursor\projects\c-dev-mocomo\assets"
    r"\c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-e8aa9276-e1d5-4e07-b5c5-2847084314b0.png"
)

ORDER = [
    "irl-card.png",
    "chatting-card.png",
    "gaming-card.png",
    "music-card.png",
    "virtual-card.png",
    "live-card.png",
]


def is_card_plate(r: int, g: int, b: int) -> bool:
    """Near-black / charcoal plate behind the folder — not colored folder glass."""
    lum = (r + g + b) / 3.0
    mx, mn = max(r, g, b), min(r, g, b)
    sat = 0.0 if mx == 0 else (mx - mn) / mx
    if lum <= 18:
        return True
    # dark unsaturated charcoal (card fill / outer bg)
    if lum < 42 and sat < 0.22:
        return True
    if lum < 55 and sat < 0.12:
        return True
    return False


def clear_plate(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if is_card_plate(r, g, b):
                px[x, y] = (r, g, b, 0)
            else:
                # soft edge: slightly dark low-sat near plate → fade
                lum = (r + g + b) / 3.0
                mx, mn = max(r, g, b), min(r, g, b)
                sat = 0.0 if mx == 0 else (mx - mn) / mx
                if lum < 70 and sat < 0.18:
                    fade = (lum - 42) / 28 if lum > 42 else 0
                    px[x, y] = (r, g, b, max(0, min(255, int(a * fade))))
    return rgba


def trim(im: Image.Image, pad: int = 6) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def slice_composite() -> list[Image.Image]:
    im = Image.open(SRC_COMPOSITE).convert("RGB")
    w, h = im.size
    # Find content bbox (non-black)
    px = im.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if (r + g + b) / 3 > 28:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    content = im.crop((min_x, min_y, max_x + 1, max_y + 1))
    cw, ch = content.size
    cols, rows = 2, 3
    cells: list[Image.Image] = []
    for idx in range(6):
        row, col = divmod(idx, cols)
        x0 = int(col * cw / cols)
        y0 = int(row * ch / rows)
        x1 = int((col + 1) * cw / cols)
        y1 = int((row + 1) * ch / rows)
        cell = content.crop((x0, y0, x1, y1))
        # trim black padding inside cell first
        cpx = cell.load()
        cx0, cy0, cx1, cy1 = cell.width, cell.height, 0, 0
        found = False
        for y in range(cell.height):
            for x in range(cell.width):
                r, g, b = cpx[x, y]
                if (r + g + b) / 3 > 26:
                    found = True
                    cx0 = min(cx0, x)
                    cy0 = min(cy0, y)
                    cx1 = max(cx1, x)
                    cy1 = max(cy1, y)
        if found:
            pad = 3
            cell = cell.crop(
                (
                    max(0, cx0 - pad),
                    max(0, cy0 - pad),
                    min(cell.width, cx1 + 1 + pad),
                    min(cell.height, cy1 + 1 + pad),
                )
            )
        cells.append(cell)
    return cells


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    cells = slice_composite()
    for name, cell in zip(ORDER, cells):
        out = clear_plate(cell)
        out = trim(out)
        # Normalize height for consistent grid
        max_h = 360
        if out.height > max_h:
            ratio = max_h / out.height
            out = out.resize((max(1, int(out.width * ratio)), max_h), Image.Resampling.LANCZOS)
        dest = OUT / name
        out.save(dest, "PNG", optimize=True)
        print(f"wrote {name} {out.size[0]}x{out.size[1]}")

    # cleanup debug artifacts
    for dbg in OUT.glob("_debug*"):
        dbg.unlink()
        print("removed", dbg.name)


if __name__ == "__main__":
    main()

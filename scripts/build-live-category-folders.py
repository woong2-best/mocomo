"""Crop KakaoTalk folders to the front panel only (no stacked back tab)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ASSETS = Path(r"C:\Users\백권웅\.cursor\projects\c-dev-mocomo\assets")
OUT = Path(r"C:\dev\mocomo\public\images\live\categories")

SOURCES = {
    "irl-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_04-ab9231cb-087b-4c1c-9be3-e91d5d3af51f.png",
    "chatting-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_05-eb9069de-1956-41aa-b5b3-1788de717ef6.png",
    "gaming-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_03-952b64e6-6620-470c-8b03-ea0be861097a.png",
    "music-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_02-32fd0a2c-82cc-4944-94c0-36f08ceba2aa.png",
    "virtual-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827-40a31d82-fcfa-4b19-9ac3-f13fa510e862.png",
    "live-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_01-088fc1da-1359-4436-8d78-679bb430dfb9.png",
}


def key_black(im: Image.Image, thr: int = 26, soft: int = 16) -> Image.Image:
    rgba = im.convert("RGBA")
    px = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = px[x, y]
            lum = (r + g + b) / 3
            if lum <= thr:
                px[x, y] = (r, g, b, 0)
            elif lum < thr + soft:
                px[x, y] = (r, g, b, int(a * (lum - thr) / soft))
    return rgba


def opaque_bbox(im: Image.Image, amin: int = 40) -> tuple[int, int, int, int]:
    px = im.load()
    w, h = im.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= amin:
                found = True
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if not found:
        return (0, 0, w, h)
    return (min_x, min_y, max_x + 1, max_y + 1)


def front_panel_only(im: Image.Image) -> Image.Image:
    """
    Folder art = back tab + front rounded square.
    Drop the top tab strip so only one panel remains (no stacked look).
    """
    l, t, r, b = opaque_bbox(im)
    body = im.crop((l, t, r, b))
    # Tab is roughly the top ~14–18% of the body height
    cut = int(body.height * 0.16)
    front = body.crop((0, cut, body.width, body.height))
    # Re-trim after cut
    fl, ft, fr, fb = opaque_bbox(front)
    pad = 4
    front = front.crop(
        (
            max(0, fl - pad),
            max(0, ft - pad),
            min(front.width, fr + pad),
            min(front.height, fb + pad),
        )
    )
    return front


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for dest_name, src_name in SOURCES.items():
        src = ASSETS / src_name
        out = front_panel_only(key_black(Image.open(src)))
        max_side = 480
        if max(out.size) > max_side:
            out.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        dest = OUT / dest_name
        out.save(dest, "PNG", optimize=True)
        print(f"wrote {dest_name} {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    main()

"""Full folder icons — black bg only removed. Do NOT crop the tab."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ASSETS = Path(r"C:\Users\백권웅\.cursor\projects\c-dev-mocomo\assets")
OUT = Path(r"C:\dev\mocomo\public\images\live\categories")

# Full folder art (tab + front). Black bg → transparent only.
SOURCES = {
    "irl-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_04-b4dfa016-2e56-45f4-9212-714bd4299887.png",
    "chatting-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_05-55d6c95d-2b98-4dc1-8805-1496de87c7fb.png",
    "gaming-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_03-af90f865-77d0-48e4-a9cb-e25abde7125d.png",
    "music-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_02-c9477ddb-a569-4c5b-a4f7-cc2817dc7cc5.png",
    "virtual-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827-4666071c-ee06-4916-b71e-f8c511d2cb79.png",
    "live-folder.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_01-f8894453-43b0-450a-b604-ce718fbefb23.png",
}


def key_black(im: Image.Image, thr: int = 24, soft: int = 14) -> Image.Image:
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


def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop(
        (max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad))
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for dest_name, src_name in SOURCES.items():
        src = ASSETS / src_name
        if not src.exists():
            raise SystemExit(f"missing {src_name}")
        # Keep full folder (tab + front). Only remove black canvas.
        out = trim(key_black(Image.open(src)))
        max_side = 512
        if max(out.size) > max_side:
            out.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        dest = OUT / dest_name
        out.save(dest, "PNG", optimize=True)
        print(f"wrote {dest_name} {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    main()

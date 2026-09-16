"""Cut black backgrounds from live category folder icons and map by color."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ASSETS = Path(r"C:\Users\백권웅\.cursor\projects\c-dev-mocomo\assets")
OUT = Path(r"C:\dev\mocomo\public\images\live\categories")

# Explicit paths from the chat attachments (folder icons 4–9)
FOLDER_FILES = [
    ASSETS / "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_04-ab9231cb-087b-4c1c-9be3-e91d5d3af51f.png",
    ASSETS / "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_02-32fd0a2c-82cc-4944-94c0-36f08ceba2aa.png",
    ASSETS / "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827-40a31d82-fcfa-4b19-9ac3-f13fa510e862.png",
    ASSETS / "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_03-952b64e6-6620-470c-8b03-ea0be861097a.png",
    ASSETS / "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_05-eb9069de-1956-41aa-b5b3-1788de717ef6.png",
    ASSETS / "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260916_135836827_01-088fc1da-1359-4436-8d78-679bb430dfb9.png",
]


def avg_rgb(im: Image.Image, box: tuple[float, float, float, float]) -> tuple[float, float, float]:
    w, h = im.size
    x0, y0, x1, y1 = box
    crop = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1))).convert("RGB")
    pixels = list(crop.getdata())
    n = max(1, len(pixels))
    return (
        sum(p[0] for p in pixels) / n,
        sum(p[1] for p in pixels) / n,
        sum(p[2] for p in pixels) / n,
    )


def classify(r: float, g: float, b: float) -> str:
    if g > r + 12 and g > b + 8:
        return "IRL"
    # pink / peach (VIRTUAL)
    if r > 150 and g > 90 and b > 100 and r >= g and abs(r - b) < 55:
        return "VIRTUAL"
    # orange / amber gaming
    if r > g + 25 and r > b + 30 and g > 80:
        return "GAME"
    # rusty red-brown LIVE
    if r > g + 20 and g < 110 and b < 100:
        return "LIVE"
    # blue chatting
    if b > r + 15 and b >= g:
        return "JUST_CHATTING"
    # purple music
    if b > g + 5 and r > g - 5:
        return "MUSIC"
    return "UNKNOWN"


def remove_black(im: Image.Image, threshold: int = 28, soft: int = 18) -> Image.Image:
    rgba = im.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            lum = (r + g + b) / 3
            if lum <= threshold:
                pixels[x, y] = (r, g, b, 0)
            elif lum < threshold + soft:
                alpha = int(a * (lum - threshold) / soft)
                pixels[x, y] = (r, g, b, alpha)
    return rgba


def trim_transparent(im: Image.Image, pad: int = 4) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("=== KakaoTalk folders ===")
    assigned: dict[str, Path] = {}
    unused: list[Path] = []
    for f in FOLDER_FILES:
        if not f.exists():
            print("MISSING", f.name)
            continue
        im = Image.open(f)
        r, g, b = avg_rgb(im, (0.35, 0.35, 0.7, 0.7))
        cat = classify(r, g, b)
        print(f"{f.name[-50:]} center=({r:.0f},{g:.0f},{b:.0f}) -> {cat}")
        if cat == "UNKNOWN" or cat in assigned:
            unused.append(f)
            continue
        assigned[cat] = f

    needed = ["IRL", "JUST_CHATTING", "GAME", "MUSIC", "LIVE", "VIRTUAL"]
    missing = [c for c in needed if c not in assigned]
    print("assigned:", {k: v.name[-40:] for k, v in assigned.items()})
    print("missing:", missing)
    print("unused count:", len(unused))

    def score_pink(path: Path) -> float:
        r, g, b = avg_rgb(Image.open(path), (0.35, 0.35, 0.7, 0.7))
        return r + (g * 0.4) - abs(b - 150)

    def score_purple(path: Path) -> float:
        r, g, b = avg_rgb(Image.open(path), (0.35, 0.35, 0.7, 0.7))
        return (r + b) / 2 - g + b * 0.2

    def score_blue(path: Path) -> float:
        r, g, b = avg_rgb(Image.open(path), (0.35, 0.35, 0.7, 0.7))
        return b - r + (b - g)

    def score_red(path: Path) -> float:
        r, g, b = avg_rgb(Image.open(path), (0.35, 0.35, 0.7, 0.7))
        return r - g - b

    scorers = {
        "VIRTUAL": score_pink,
        "MUSIC": score_purple,
        "JUST_CHATTING": score_blue,
        "LIVE": score_red,
        "GAME": score_red,
        "IRL": score_purple,
    }
    for cat in missing:
        if not unused:
            break
        best = max(unused, key=scorers.get(cat, score_purple))
        assigned[cat] = best
        unused.remove(best)
        print(f"fallback {cat} <- {best.name[-40:]}")

    for cat, src in assigned.items():
        out = remove_black(Image.open(src))
        out = trim_transparent(out)
        # Keep reasonable web size
        max_side = 512
        if max(out.size) > max_side:
            out.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        dest = OUT / f"{cat.lower()}.png"
        out.save(dest, "PNG", optimize=True)
        print(f"wrote {dest.name} ({out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    main()

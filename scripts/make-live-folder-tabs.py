from PIL import Image
import os

assets = r"C:\Users\백권웅\.cursor\projects\c-dev-mocomo\assets"
out = r"C:\dev\mocomo\public\images\live\categories"
os.makedirs(out, exist_ok=True)

# Prefer clean sources; gaming uses the newly provided clean shot
mapping = {
    "virtual-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212451_Gallery-311dd662-5611-4bd8-be22-bcd9dcde43dd.png",
    "gaming-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212440_Gallery-d8b25dba-95d2-4410-97a2-41540bfdf501.png",
    "chatting-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212444_Gallery-a1566d87-2a20-4f85-b008-ec4c332299c8.png",
    "irl-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212442_Gallery-c60ea681-60fd-46ec-a044-5e26421d2f14.png",
    "music-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212447_Gallery-1f83d262-e9f5-437b-a5c6-cc0e79bf5992.png",
    "live-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212449_Gallery-ef2aeefc-dffe-4a66-ae24-5138a5ec9740.png",
}


def remove_black_bg(img: Image.Image) -> Image.Image:
    """Remove near-black backdrop only — never touch warm/colored folder pixels."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # Strict: only pure-ish black (keeps orange browns / folder shadows)
            if r <= 18 and g <= 18 and b <= 18:
                px[x, y] = (0, 0, 0, 0)
            elif r <= 40 and g <= 40 and b <= 40 and max(r, g, b) - min(r, g, b) < 8:
                # neutral dark gray fringe → soft alpha
                lum = (r + g + b) / 3
                alpha = int(max(0, min(255, (lum - 18) * (255 / 22))))
                px[x, y] = (r, g, b, alpha)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    return img


for out_name, src_name in mapping.items():
    src = os.path.join(assets, src_name)
    if not os.path.exists(src):
        print("MISSING", src_name)
        continue
    im = remove_black_bg(Image.open(src))
    dest = os.path.join(out, out_name)
    im.save(dest, "PNG", optimize=True)
    print(f"OK {out_name} {im.size}")

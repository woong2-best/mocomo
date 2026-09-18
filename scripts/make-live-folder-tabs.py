from PIL import Image
import os

assets = r"C:\Users\백권웅\.cursor\projects\c-dev-mocomo\assets"
out = r"C:\dev\mocomo\public\images\live\categories"
os.makedirs(out, exist_ok=True)

mapping = {
    "virtual-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212451_Gallery-311dd662-5611-4bd8-be22-bcd9dcde43dd.png",
    "gaming-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212440_Gallery-d683d60c-ff9e-4463-8be2-ec9e67c19c72.png",
    "chatting-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212444_Gallery-a1566d87-2a20-4f85-b008-ec4c332299c8.png",
    "irl-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212442_Gallery-c60ea681-60fd-46ec-a044-5e26421d2f14.png",
    "music-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212447_Gallery-1f83d262-e9f5-437b-a5c6-cc0e79bf5992.png",
    "live-tab.png": "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260917_212449_Gallery-ef2aeefc-dffe-4a66-ae24-5138a5ec9740.png",
}


def remove_black_bg(img: Image.Image, thresh: int = 28) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= thresh and g <= thresh and b <= thresh:
                px[x, y] = (r, g, b, 0)
            else:
                m = min(r, g, b)
                if m < thresh + 20:
                    fade = int(255 * (m - thresh) / 20)
                    px[x, y] = (r, g, b, max(0, min(255, fade)))
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
    im.save(dest, "PNG")
    print(f"OK {out_name} {im.size}")

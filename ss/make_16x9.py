from pathlib import Path
from PIL import Image

src = Path(r"c:\Users\Nishad\Desktop\WEB\gemma_hack\ss")
out = src / "landscape_16x9"
out.mkdir(exist_ok=True)
W, H = 1280, 720
bg = (247, 249, 252)

count = 0
for p in sorted(src.iterdir()):
    if not p.is_file():
        continue
    if p.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
        continue
    im = Image.open(p).convert("RGBA")
    canvas = Image.new("RGB", (W, H), bg)
    scale = min(H / im.height, (W * 0.42) / im.width)
    nw = max(1, int(im.width * scale))
    nh = max(1, int(im.height * scale))
    im2 = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x, y = (W - nw) // 2, (H - nh) // 2
    canvas.paste(im2, (x, y), im2)
    dest = out / f"{p.stem}_16x9.png"
    canvas.save(dest, optimize=True)
    print(f"{p.name} -> {dest.name} ({nw}x{nh} on {W}x{H})")
    count += 1

print(f"Done: {count} images in {out}")

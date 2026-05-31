#!/usr/bin/env python3
"""Generate the PWA app icons with no third-party deps.

Draws a cute pancake-stack-with-a-face on a warm pink background and
encodes RGBA PNGs by hand (zlib + struct only). Run from repo root:

    python3 tools/gen_icons.py

Outputs icons/icon-180.png, icon-192.png, icon-512.png (centered design
doubles as the maskable icon since the background bleeds to all edges).
"""
import math, os, struct, zlib

def blank(size, rgba):
    return bytearray(rgba * (size * size)), size

def idx(x, y, size):
    return (y * size + x) * 4

def put(buf, size, x, y, r, g, b, a=255):
    if x < 0 or y < 0 or x >= size or y >= size:
        return
    i = idx(x, y, size)
    ba = a / 255.0
    buf[i]   = int(r * ba + buf[i]   * (1 - ba))
    buf[i+1] = int(g * ba + buf[i+1] * (1 - ba))
    buf[i+2] = int(b * ba + buf[i+2] * (1 - ba))
    buf[i+3] = 255

def ellipse(buf, size, cx, cy, rx, ry, col):
    x0, x1 = int(cx - rx) - 1, int(cx + rx) + 1
    y0, y1 = int(cy - ry) - 1, int(cy + ry) + 1
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx = (x - cx) / rx
            dy = (y - cy) / ry
            d = dx * dx + dy * dy
            if d <= 1.0:
                # soft 1px edge
                a = 255 if d < 0.92 else int(255 * (1 - (d - 0.92) / 0.08))
                put(buf, size, x, y, *col, max(0, min(255, a)))

def disc(buf, size, cx, cy, r, col):
    ellipse(buf, size, cx, cy, r, r, col)

def fill_bg(buf, size, top, bot):
    for y in range(size):
        t = y / (size - 1)
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for x in range(size):
            i = idx(x, y, size)
            buf[i], buf[i+1], buf[i+2], buf[i+3] = r, g, b, 255

def draw_icon(size):
    buf, _ = blank(size, b"\x00\x00\x00\x00")
    fill_bg(buf, size, (255, 150, 178), (232, 93, 134))  # pink gradient
    s = size
    cx = s * 0.5
    # plate
    ellipse(buf, s, cx, s * 0.70, s * 0.40, s * 0.13, (255, 255, 255))
    ellipse(buf, s, cx, s * 0.70, s * 0.33, s * 0.10, (233, 238, 245))
    gold = (246, 200, 115)
    edge = (214, 160, 80)
    # pancake stack (bottom -> top)
    for k, yy in enumerate((0.66, 0.585, 0.51, 0.435)):
        ellipse(buf, s, cx, s * yy + s * 0.03, s * (0.30 - k * 0.005), s * 0.085, edge)
        ellipse(buf, s, cx, s * yy, s * (0.30 - k * 0.005), s * 0.075, gold)
    topy = 0.435
    # syrup drip
    syr = (165, 100, 45)
    ellipse(buf, s, cx, s * (topy + 0.02), s * 0.26, s * 0.06, syr)
    for dx in (-0.16, 0.0, 0.18):
        ellipse(buf, s, cx + s * dx, s * (topy + 0.10), s * 0.03, s * 0.05, syr)
    # butter pat
    ellipse(buf, s, cx + s * 0.02, s * (topy - 0.03), s * 0.08, s * 0.05, (255, 225, 90))
    # cute face on the top pancake
    eo = s * 0.075
    disc(buf, s, cx - eo, s * topy, s * 0.022, (58, 43, 43))
    disc(buf, s, cx + eo, s * topy, s * 0.022, (58, 43, 43))
    disc(buf, s, cx - eo + s*0.008, s*topy - s*0.008, s*0.008, (255,255,255))
    disc(buf, s, cx + eo + s*0.008, s*topy - s*0.008, s*0.008, (255,255,255))
    # blush
    ellipse(buf, s, cx - s*0.12, s*topy + s*0.025, s*0.028, s*0.018, (255,140,170))
    ellipse(buf, s, cx + s*0.12, s*topy + s*0.025, s*0.028, s*0.018, (255,140,170))
    # smile (arc of dots)
    for a in range(20, 161, 14):
        rad = math.radians(a)
        mx = cx + math.cos(rad) * s * 0.05
        my = s * (topy + 0.012) + math.sin(rad) * s * 0.035
        disc(buf, s, mx, my, s * 0.011, (58, 43, 43))
    return buf

def write_png(path, buf, size):
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter: none
        raw += buf[y * size * 4:(y + 1) * size * 4]
    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
        return c

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", comp) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path, size, "x", size)

def main():
    out = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out, exist_ok=True)
    for size in (180, 192, 512):
        buf = draw_icon(size)
        write_png(os.path.join(out, f"icon-{size}.png"), buf, size)

if __name__ == "__main__":
    main()

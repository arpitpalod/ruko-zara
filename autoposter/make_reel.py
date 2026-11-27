"""Render a Ruko Zara Reel (720x1280, 30fps, silent MP4) from a scene spec.
Usage: python3 make_reel.py spec.json out.mp4
"""
import json, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 720, 1280, 30
FD = "/usr/share/fonts/opentype/inter/"
WEIGHT = {"600": "InterDisplay-SemiBold.otf", "700": "InterDisplay-Bold.otf",
          "800": "InterDisplay-ExtraBold.otf", "900": "InterDisplay-Black.otf"}
COL = {"OR": (255, 106, 26), "WH": (255, 255, 255), "GR": (163, 163, 163),
       "BG": (20, 20, 20), "CARD": (232, 90, 12), "INK": (30, 26, 24),
       "SUB": (74, 63, 63), "RED": (192, 57, 43), "GREEN": (46, 107, 63)}
_fonts = {}


def font(w, s):
    k = (w, s)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(FD + WEIGHT[str(w)], s)
    return _fonts[k]


def ease(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def mix(bg, fg, a):
    return tuple(int(b + (f - b) * a) for b, f in zip(bg, fg))


def bag(d, cx, cy, s, col, inner):
    d.rounded_rectangle([cx - s / 2, cy - s / 2 + s * .1, cx + s / 2, cy + s / 2], radius=s * .12, fill=col)
    r = s * .22
    d.arc([cx - r, cy - s / 2 + s * .12 - r, cx + r, cy - s / 2 + s * .12 + r], 180, 360, fill=col, width=max(2, int(s * .08)))
    d.rectangle([cx - s * .16, cy - s * .08, cx - s * .06, cy + s * .30], fill=inner)
    d.rectangle([cx + s * .06, cy - s * .08, cx + s * .16, cy + s * .30], fill=inner)


def wrap_left(d, text, f, maxw):
    words, lines, line = text.split(), [], ""
    for w in words:
        t = (line + " " + w).strip()
        if d.textlength(t, font=f) > maxw and line:
            lines.append(line); line = w
        else:
            line = t
    lines.append(line)
    return lines


def draw_card(img, d, lt, k):
    d.rectangle([0, 0, W, H], fill=COL["CARD"])
    bag(d, 76, 88, 40, COL["WH"], COL["CARD"])
    d.text((119, 106), "ruko zara", font=font(900, 44), fill=COL["WH"], anchor="ls")
    a = ease(lt / .5)
    dy = (1 - a) * 60
    bgc = COL["CARD"]
    d.rounded_rectangle([51, 180 + dy, 669, 1088 + dy], radius=53, fill=mix(bgc, COL["WH"], a))
    c = lambda col: mix(bgc, col, a)
    d.text((101, 259 + dy), k["label"], font=font(700, 27), fill=c(COL["SUB"]), anchor="ls")
    y = 327 + dy
    for ln in wrap_left(d, k["title"], font(900, 49), 519):
        d.text((101, y), ln, font=font(900, 49), fill=c(COL["INK"]), anchor="ls"); y += 62
    d.text((101, y + 30), k["price"], font=font(800, 33), fill=c(COL["SUB"]), anchor="ls")
    d.rectangle([101, y + 76, 619, y + 78], fill=c((217, 207, 207)))
    pct = round(k["pct"] * ease((lt - .6) / 1.2))
    big = COL.get(k["color"], COL["OR"])
    d.text((95, y + 245), f"{pct}%", font=font(900, 153), fill=c(big), anchor="ls")
    d.text((101, y + 318), k["said"], font=font(900, 43), fill=c(big), anchor="ls")
    d.text((101, y + 370), k["votes"], font=font(600, 29), fill=c(COL["SUB"]), anchor="ls")
    d.text((51, 1177), "Ask India before you buy", font=font(900, 36), fill=COL["WH"], anchor="ls")
    d.text((51, 1220), "arpitpalod.github.io/ruko-zara", font=font(600, 27), fill=(255, 227, 211), anchor="ls")


def frame(spec, t):
    img = Image.new("RGB", (W, H), COL["BG"])
    d = ImageDraw.Draw(img)
    sc = next((s for s in spec["scenes"] if s["t0"] <= t < s["t1"]), spec["scenes"][-1])
    lt = t - sc["t0"]
    if sc.get("card"):
        draw_card(img, d, lt, spec["card"]); return img
    d.rectangle([60, 70, W - 60, 78], fill=(42, 42, 42))
    d.rectangle([60, 70, 60 + (W - 120) * min(t / spec["dur"], 1), 78], fill=COL["OR"])
    if spec.get("tag"):
        d.text((W / 2, 140), spec["tag"], font=font(700, 30), fill=COL["GR"], anchor="ms")
    if sc.get("logo"):
        a = ease(lt / .45)
        bag(d, W / 2, 400, 170, mix(COL["BG"], COL["OR"], a), mix(COL["BG"], COL["WH"], a))
    for ln in sc.get("lines", []):
        txt, y, size, color, weight = ln[:5]
        delay = ln[5] if len(ln) > 5 else 0
        if lt < delay:
            continue
        a = ease((lt - delay) / .45)
        while size > 28 and d.textlength(txt, font=font(weight, size)) > W - 80:
            size -= 2  # shrink long lines instead of letting them run off the edge
        d.text((W / 2, y + (1 - a) * 30), txt, font=font(weight, size), fill=mix(COL["BG"], COL[color], a), anchor="ms")
    return img


def main(spec_path, out):
    spec = json.load(open(spec_path))
    n = int(spec["dur"] * FPS)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-f", "lavfi", "-i",
                          "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                          "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(frame(spec, i / FPS).tobytes())
    p.stdin.close(); p.wait()
    sheet = out.replace(".mp4", "_check.png")
    ts = spec.get("check", [2, 6, 10, 14, 18, 21])
    imgs = [frame(spec, t).resize((240, 427)) for t in ts]
    s = Image.new("RGB", (240 * len(imgs) + 4 * (len(imgs) - 1), 427), (0, 0, 0))
    for i, im in enumerate(imgs):
        s.paste(im, (i * 244, 0))
    s.save(sheet)
    print(out, sheet)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

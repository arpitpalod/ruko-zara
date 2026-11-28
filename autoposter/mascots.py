"""Three mascot Reel options for Ruko Zara (720x1280, 30 fps, silent AAC track).
python3 mascots.py check            -> key frames to out/mascot_check_<name>.png
python3 mascots.py render [names]   -> out/option-<name>.mp4
Drawn at 2x and downscaled for smooth edges."""
import math, random, subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, S = 720, 1280, 30, 2
FD = "/usr/share/fonts/opentype/inter/"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
C = dict(BG=(22, 18, 16), WH=(255, 255, 255), GR=(170, 162, 156), OR=(255, 106, 26), INK=(30, 26, 24),
         CLAY=(200, 100, 46), CLAY_D=(160, 76, 36), CLAY_L=(226, 140, 88), DOT=(250, 222, 190), SLOT=(58, 30, 18),
         CHEEK=(240, 138, 122), GREEN=(46, 160, 90), RED=(214, 64, 52), CARD=(255, 250, 244), SUB=(110, 100, 94),
         GOLD=(255, 196, 60))
_f, _e = {}, {}


def font(w, s):
    k = (w, s)
    if k not in _f:
        _f[k] = ImageFont.truetype(FD + {600: "InterDisplay-SemiBold.otf", 700: "InterDisplay-Bold.otf",
                                         800: "InterDisplay-ExtraBold.otf", 900: "InterDisplay-Black.otf"}[w], int(s * S))
    return _f[k]


def emoji(ch, px):
    k = (ch, int(px))
    if k not in _e:
        f = ImageFont.truetype(EMOJI, 109)
        im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((10, 10), ch, font=f, embedded_color=True)
        im = im.crop(im.getbbox())
        sc = px * S / max(im.size)
        _e[k] = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.LANCZOS)
    return _e[k]


def paste_emoji(img, ch, cx, cy, px, rot=0):
    e = emoji(ch, px)
    if rot: e = e.rotate(rot, resample=Image.BICUBIC, expand=True)
    img.paste(e, (int(cx * S - e.width / 2), int(cy * S - e.height / 2)), e)


clamp = lambda t: max(0.0, min(1.0, t))
out_cubic = lambda t: 1 - (1 - clamp(t)) ** 3


def out_back(t, k=1.7):
    t = clamp(t) - 1
    return 1 + (k + 1) * t ** 3 + k * t ** 2


def R(*v): return [x * S for x in v]


def text(d, s, x, y, size, color, weight=900, anchor="ms", maxw=640, scale=1.0):
    size = size * scale
    while size > 20 and d.textlength(s, font=font(weight, size)) > maxw * S:
        size -= 2
    if size * scale > 1:
        d.text((x * S, y * S), s, font=font(weight, size), fill=color, anchor=anchor)


def pop(t, start, dur=0.45):  # 0..~1.1..1 scale for popping in
    return 0 if t < start else out_back((t - start) / dur)


# ---------------- characters ----------------
def gullak(img, d, cx, cy, r, t, expr="neutral", look=(0, 0), blink=False, sx=1.0, sy=1.0, shake=0.0):
    cx += shake * math.sin(t * 55) * 6
    bw, bh = r * sx, r * 0.9 * sy
    by = cy
    # feet
    for fx in (-0.45, 0.45):
        d.ellipse(R(cx + fx * bw - r * .18, by + bh - r * .12, cx + fx * bw + r * .18, by + bh + r * .1), fill=C["CLAY_D"])
    d.ellipse(R(cx - bw, by - bh, cx + bw, by + bh), fill=C["CLAY"])
    d.ellipse(R(cx - bw * .92, by + bh * .1, cx + bw * .92, by + bh * .98), fill=C["CLAY_D"])
    d.ellipse(R(cx - bw, by - bh, cx + bw, by + bh * .75), fill=C["CLAY"])
    d.ellipse(R(cx - bw * .72, by - bh * .82, cx - bw * .25, by - bh * .45), fill=C["CLAY_L"])
    # neck + coin slot
    nk = r * .3
    d.rounded_rectangle(R(cx - nk, by - bh - r * .16, cx + nk, by - bh + r * .1), radius=r * .08 * S, fill=C["CLAY_D"])
    d.rounded_rectangle(R(cx - nk * .7, by - bh - r * .1, cx + nk * .7, by - bh - r * .03), radius=r * .03 * S, fill=C["SLOT"])
    # painted dots band
    for i in range(-4, 5):
        x = cx + i * bw * .19
        yy = by + bh * .42 - abs(i) * r * .015
        d.ellipse(R(x - r * .035, yy - r * .035, x + r * .035, yy + r * .035), fill=C["DOT"])
    # face
    ex, ey, ew, eh = r * .3, by - bh * .2, r * .17, r * .21
    lx, ly = look
    for sgn in (-1, 1):
        x = cx + sgn * ex
        if expr == "happy":
            d.arc(R(x - ew, ey - eh * .6, x + ew, ey + eh * 1.2), 200, 340, fill=C["SLOT"], width=int(r * .07 * S))
        elif blink:
            d.line(R(x - ew, ey, x + ew, ey), fill=C["SLOT"], width=int(r * .06 * S))
        else:
            d.ellipse(R(x - ew, ey - eh, x + ew, ey + eh), fill=C["WH"])
            p = r * .09
            px, py = x + lx * ew * .5, ey + ly * eh * .5 + eh * .1
            d.ellipse(R(px - p, py - p, px + p, py + p), fill=(20, 14, 12))
            d.ellipse(R(px - p * .35 + p * .3, py - p * .7, px + p * .25 + p * .3, py - p * .1), fill=C["WH"])
        if expr in ("nervous", "sad"):  # worried brows
            d.line(R(x - ew, ey - eh * 1.5 + sgn * -r * .04, x + ew, ey - eh * 1.5 - sgn * -r * .06),
                   fill=C["SLOT"], width=int(r * .05 * S))
        d.ellipse(R(x - ew * 1.1 + sgn * ew * .3, ey + eh * 1.1, x + ew * .7 + sgn * ew * .3, ey + eh * 1.6), fill=C["CHEEK"])
    my = by + bh * .12
    if expr == "happy":
        d.pieslice(R(cx - r * .26, my - r * .2, cx + r * .26, my + r * .26), 0, 180, fill=C["SLOT"])
        d.pieslice(R(cx - r * .13, my + r * .02, cx + r * .13, my + r * .24), 0, 180, fill=C["CHEEK"])
    elif expr == "wow":
        d.ellipse(R(cx - r * .09, my - r * .06, cx + r * .09, my + r * .14), fill=C["SLOT"])
    elif expr == "nervous":
        pts = [(cx - r * .2 + i * r * .08, my + (r * .03 if i % 2 else -r * .03)) for i in range(6)]
        d.line([tuple(v * S for v in p) for p in pts], fill=C["SLOT"], width=int(r * .045 * S))
    elif expr == "sad":
        d.arc(R(cx - r * .18, my, cx + r * .18, my + r * .24), 200, 340, fill=C["SLOT"], width=int(r * .05 * S))
    else:
        d.arc(R(cx - r * .16, my - r * .14, cx + r * .16, my + r * .1), 20, 160, fill=C["SLOT"], width=int(r * .05 * S))


def bagu(img, d, cx, cy, r, t, hand=False, blink=False, talk=False):
    bw, bh = r, r * 1.05
    # legs
    for fx in (-.4, .4):
        d.line(R(cx + fx * bw, cy + bh, cx + fx * bw, cy + bh + r * .28), fill=C["OR"], width=int(r * .1 * S))
        d.ellipse(R(cx + fx * bw - r * .16, cy + bh + r * .22, cx + fx * bw + r * .12, cy + bh + r * .36), fill=C["WH"])
    # handle
    d.arc(R(cx - r * .5, cy - bh - r * .5, cx + r * .5, cy - bh + r * .4), 180, 360, fill=C["OR"], width=int(r * .14 * S))
    d.rounded_rectangle(R(cx - bw, cy - bh, cx + bw, cy + bh), radius=r * .22 * S, fill=C["OR"])
    d.rounded_rectangle(R(cx - bw, cy - bh, cx + bw, cy - bh + r * .22), radius=r * .1 * S, fill=(232, 90, 12))
    # eyes
    for sgn in (-1, 1):
        x, y = cx + sgn * r * .38, cy - r * .32
        if blink:
            d.line(R(x - r * .14, y, x + r * .14, y), fill=C["INK"], width=int(r * .06 * S))
        else:
            d.ellipse(R(x - r * .16, y - r * .19, x + r * .16, y + r * .19), fill=C["WH"])
            d.ellipse(R(x - r * .07, y - r * .05, x + r * .07, y + r * .09), fill=C["INK"])
    # pause-bar mouth (the logo), opens a little when talking
    gap = r * (.06 + (.05 * abs(math.sin(t * 18)) if talk else 0))
    for sgn in (-1, 1):
        d.rounded_rectangle(R(cx + sgn * (gap + r * .12) - r * .07, cy + r * .1, cx + sgn * (gap + r * .12) + r * .07, cy + r * .62),
                            radius=r * .04 * S, fill=C["WH"])
    if hand:
        ax, ay = cx - bw - r * .35, cy - bh * .55
        d.line(R(cx - bw * .9, cy, ax + r * .1, ay + r * .2), fill=C["OR"], width=int(r * .11 * S))
        paste_emoji(img, "✋", ax, ay - r * .05, r * .75, rot=8 * math.sin(t * 20))


def bubble(d, x, y, w, h, s, size, tail="down"):
    d.rounded_rectangle(R(x - w / 2, y - h / 2, x + w / 2, y + h / 2), radius=28 * S, fill=C["WH"])
    if tail == "down":
        d.polygon([tuple(v * S for v in p) for p in [(x + w * .15, y + h / 2 - 2), (x + w * .32, y + h / 2 - 2), (x + w * .3, y + h / 2 + 34)]], fill=C["WH"])
    text(d, s, x, y + size * .36, size, C["INK"], 900, maxw=w - 40)


def end_card(img, d, t, mascot):
    a = out_back(t / .5)
    if mascot == "gullak":
        gullak(img, d, 360, 400, 120 * a, t, "happy", sy=1 + .04 * math.sin(t * 6))
    else:
        bagu(img, d, 360, 400, 110 * a, t, blink=int(t * 2) % 4 == 0)
    text(d, "Ruko Zara", 360, 700, 96, C["OR"], scale=pop(t, .2))
    text(d, "Khareedne se pehle", 360, 820, 54, C["WH"], 700, scale=pop(t, .4))
    text(d, "janta se pooch lo.", 360, 892, 54, C["WH"], 700, scale=pop(t, .4))
    text(d, "Free · link in bio", 360, 1030, 40, C["GR"], 600, scale=pop(t, .7))


def coins(img, t, start, end, cx, top_y, n=10, seed=3, from_y=-60):
    rnd = random.Random(seed)
    for i in range(n):
        t0 = start + (end - start) * i / n
        k = (t - t0) / .7
        if 0 <= k <= 1:
            x = cx + rnd.uniform(-20, 20) * (1 - k)
            y = from_y + (top_y - from_y) * out_cubic(k) ** 1.4
            paste_emoji(img, "🪙", x, y, 64, rot=rnd.uniform(-30, 30))


def confetti(d, t, start, seed=5, stop=99):
    rnd = random.Random(seed)
    if t < start or t > stop: return
    for i in range(70):
        x0, sp, ph = rnd.uniform(20, 700), rnd.uniform(260, 520), rnd.uniform(0, 6)
        col = rnd.choice([C["OR"], C["GOLD"], C["GREEN"], C["WH"], C["CHEEK"]])
        y = -40 + (t - start) * sp - rnd.uniform(0, 300)
        if -20 < y < H:
            x = x0 + 22 * math.sin(t * 3 + ph)
            d.rectangle(R(x, y, x + 10, y + 18), fill=col)


# ---------------- option A: Gullak reacts (real request: Vastu painting) ----------------
def scene_gullak_reacts(t):
    img = Image.new("RGB", (W * S, H * S), C["BG"]); d = ImageDraw.Draw(img)
    blink = (t % 3.1) < .12
    if t < 18.2:
        enter = out_back(t / .8) if t < 1 else 1
        gy = 1500 - (1500 - 820) * enter
        expr, look, shake, sx, sy = "neutral", (0, 0), 0, 1, 1 + .03 * math.sin(t * 5)
        if 3.2 <= t < 8: expr, look, shake = "nervous", (.4, -1), (0.4 if t > 4.2 else 0)
        if 8 <= t < 10.4: expr, blink, shake = "nervous", True, 1.0
        if t >= 10.4:
            j = max(0, math.sin((t - 10.4) * 7)) * (1 if t < 13 else .3)
            expr, gy, sx, sy = "happy", gy - 60 * j, 1 + .06 * (1 - j), 1 - .05 * (1 - j) + .06 * j
        if t >= 10.4: confetti(d, t, 10.5, stop=14.6)
        coins(img, t, 10.8, 13.6, 360, gy - 170, from_y=500)
        gullak(img, d, 360, gy, 165, t, expr, look, blink, sx, sy, shake)
        if 4.2 <= t < 10.4: paste_emoji(img, "💦", 520, gy - 170 + 8 * math.sin(t * 9), 54)
        if t < 3.2:
            text(d, "Ye hai Gullak.", 360, 250, 76, C["WH"], scale=pop(t, .4))
            text(d, "Har kharche pe iski nazar hai.", 360, 330, 42, C["GR"], 700, scale=pop(t, 1.2))
        elif t < 10.4:  # the real request card
            k = out_cubic((t - 3.2) / .5); y0 = -380 + 520 * k
            d.rounded_rectangle(R(56, y0, 664, y0 + 400), radius=40 * S, fill=C["CARD"])
            text(d, "AAJ KI ASLI REQUEST", 96, y0 + 66, 26, C["SUB"], 800, anchor="ls")
            text(d, "Living room ke liye", 96, y0 + 132, 52, C["INK"], 900, anchor="ls", maxw=540)
            text(d, "Vastu painting", 96, y0 + 196, 52, C["INK"], 900, anchor="ls", maxw=540)
            text(d, "₹3,000", 96, y0 + 272, 56, C["OR"], 900, anchor="ls")
            text(d, "“Dekhte hi pasand aa gayi.”", 96, y0 + 338, 34, C["SUB"], 700, anchor="ls", maxw=540)
            if t >= 8:
                dots = "." * (1 + int((t - 8) * 3) % 3)
                text(d, "Janta ne kya kaha" + dots, 360, 1180, 54, C["WH"], scale=pop(t, 8))
        else:  # result
            k = pop(t, 10.4)
            d.rounded_rectangle(R(56, 140, 664, 140 + max(2, 330 * min(k, 1.05))), radius=min(40, max(1, 165 * min(k, 1))) * S, fill=C["CARD"])
            if t >= 10.85:
                text(d, "JANTA NE KAHA", 360, 210, 28, C["SUB"], 800)
                pct = round(67 * out_cubic((t - 10.85) / 1.0))
                text(d, f"{pct}% Rehne de", 360, 320, 84, C["GREEN"], 900)
                text(d, "15 votes · asli request", 360, 400, 32, C["SUB"], 700)
            if 11 <= t < 15:
                s = pop(t, 11.2)
                text(d, "+₹3,000", 150, gy - 200, 52, C["GOLD"], 900, scale=s)
            if t >= 15:
                text(d, "₹3,000 bache.", 360, 1130, 80, C["OR"], scale=pop(t, 15))
                text(d, "Plan B: ₹500 ka print.", 360, 1205, 44, C["WH"], 700, scale=pop(t, 15.5))
    else:
        end_card(img, d, t - 18.2, "gullak")
    return img


# ---------------- option B: Bagu skit (11:58 PM) ----------------
def phone(img, d, t, mode, timer):
    x0, y0, x1, y1 = 150, 250, 570, 1060
    d.rounded_rectangle(R(x0 - 14, y0 - 14, x1 + 14, y1 + 14), radius=64 * S, fill=(52, 48, 46))
    d.rounded_rectangle(R(x0, y0, x1, y1), radius=52 * S, fill=C["CARD"])
    if mode == "cart":
        text(d, "Your cart", x0 + 36, y0 + 82, 40, C["INK"], 900, anchor="ls")
        d.rounded_rectangle(R(x0 + 30, y0 + 120, x1 - 30, y0 + 330), radius=28 * S, fill=(244, 238, 232))
        paste_emoji(img, "👟", x0 + 110, y0 + 225, 110)
        text(d, "Sneakers", x0 + 190, y0 + 210, 40, C["INK"], 900, anchor="ls")
        text(d, "₹4,999", x0 + 190, y0 + 270, 44, C["INK"], 800, anchor="ls")
        d.rounded_rectangle(R(x0 + 30, y0 + 370, x1 - 30, y0 + 470), radius=22 * S, fill=(255, 232, 228))
        text(d, f"SALE ends in {timer}", (x0 + x1) / 2, y0 + 434, 34, C["RED"], 900)
        d.rounded_rectangle(R(x0 + 30, y1 - 170, x1 - 30, y1 - 70), radius=50 * S, fill=(30, 30, 30))
        text(d, "Place order", (x0 + x1) / 2, y1 - 106, 42, C["WH"], 900)
    else:
        d.rounded_rectangle(R(x0, y0, x1, y0 + 120), radius=52 * S, fill=C["OR"])
        d.rectangle(R(x0, y0 + 60, x1, y0 + 120), fill=C["OR"])
        text(d, "ruko zara", x0 + 36, y0 + 86, 42, C["WH"], 900, anchor="ls")
        text(d, "Sneakers · ₹4,999", (x0 + x1) / 2, y0 + 250, 40, C["INK"], 900)
        text(d, "Le le ya Rehne de?", (x0 + x1) / 2, y0 + 330, 40, C["SUB"], 800)
        for i, (lab, col) in enumerate([("Le le", C["GREEN"]), ("Rehne de", C["RED"])]):
            yy = y0 + 430 + i * 140
            d.rounded_rectangle(R(x0 + 50, yy, x1 - 50, yy + 104), radius=52 * S, outline=col, width=5 * S)
            text(d, lab, (x0 + x1) / 2, yy + 68, 42, col, 900)


def scene_bagu_skit(t):
    img = Image.new("RGB", (W * S, H * S), C["BG"]); d = ImageDraw.Draw(img)
    if t >= 16:
        end_card(img, d, t - 16, "bagu"); return img
    sh = (8 * math.sin(t * 70) * max(0, 1 - (t - 6.5) / .4)) if 6.5 <= t < 6.9 else 0
    secs = max(0, 119 - int(t * 1.0))
    timer = f"00:{secs // 60:02d}:{secs % 60:02d}"
    if t < 9.5:
        text(d, "11:58 PM", 360, 170 + sh, 60, C["OR"], scale=pop(t, .1))
        text(d, "Sale khatam hone mein 2 minute.", 360, 222 + sh, 34, C["GR"], 700, scale=pop(t, .5))
    ps = pop(t, 0, .5)
    if ps > .05:
        phone(img, d, t, "cart" if t < 9.5 else "rz", timer)
    if 3.5 <= t < 9.5:  # finger heads for the button, then flinches back
        k = out_cubic((t - 3.5) / 2.8) if t < 6.5 else 1 - .25 * out_cubic((t - 6.5) / .4)
        fx, fy = 700 - (700 - 410) * k, 1250 - (1250 - 930) * k
        paste_emoji(img, "👆", fx, fy, 120)
        if t < 6.5: text(d, "Bas ek tap…", 360, 1170, 54, C["WH"], scale=pop(t, 3.7))
    if t >= 6.5:
        k = out_back((t - 6.5) / .45)
        bx = 900 - (900 - 520) * k
        if t < 9.5:
            bagu(img, d, bx + sh, 900, 120, t, hand=True, blink=(t % 2.7) < .12, talk=6.6 < t < 8)
            bubble(d, 470 + sh, 640, 360, 120, "Ruko zara!", 64)
        else:
            m = out_cubic((t - 9.5) / .4)
            bagu(img, d, 520 + 100 * m, 900 + 70 * m, 120 - 30 * m, t, hand=False, blink=(t % 2.7) < .12, talk=9.6 < t < 11.5)
            if t < 13.5:
                bubble(d, 330, 1165, 520, 110, "Pehle janta se pooch lo.", 44, tail="none")
    if 13.5 <= t < 16:
        text(d, "Sale phir aayegi.", 360, 1150, 64, C["WH"], scale=pop(t, 13.5))
        text(d, "Paise nahi.", 360, 1225, 64, C["OR"], scale=pop(t, 14.1))
    return img


# ---------------- option C: Gullak ka hisaab (real totals) ----------------
def scene_gullak_hisaab(t):
    img = Image.new("RGB", (W * S, H * S), C["BG"]); d = ImageDraw.Draw(img)
    if t >= 15.8:
        end_card(img, d, t - 15.8, "gullak"); return img
    blink = (t % 2.9) < .12
    text(d, "Gullak ka hisaab", 360, 200, 76, C["OR"], scale=pop(t, .2))
    text(d, "Ruko Zara ke asli numbers", 360, 268, 38, C["GR"], 700, scale=pop(t, .7))
    grow = out_cubic((t - 3.4) / 4.6) if t > 3.4 else 0
    r = 150 + 45 * grow
    gy = 1500 - (1500 - 850) * (out_back(t / .8) if t < 1 else 1)
    expr = "neutral" if t < 3.4 else ("wow" if t < 8 else "happy")
    j = max(0, math.sin((t - 8) * 7)) if t > 8 else 0
    coins(img, t, 3.4, 8.2, 360, gy - r * .95 - 30, n=16, from_y=520)
    if t > 8.2: confetti(d, t, 8.3, stop=12.5)
    gullak(img, d, 360, gy - 30 * j, r, t, expr, blink=blink and expr != "happy", sy=1 + .03 * math.sin(t * 5) + .05 * j)
    if t >= 3.2:
        v = int(166500 * out_cubic((t - 3.4) / 4.6)) if t > 3.4 else 0
        s = f"{v:,}"
        if v >= 100000:  # Indian grouping: 1,66,500
            s = f"{v // 100000},{(v // 1000) % 100:02d},{v % 1000:03d}"
        text(d, f"₹{s}", 360, 420, 112, C["WH"], 900, scale=pop(t, 3.2))
        text(d, "nahi kharche gaye", 360, 488, 40, C["GR"], 700, scale=pop(t, 3.6))
    if 9 <= t < 13:
        text(d, "Vote ke baad", 360, 1120, 52, C["WH"], 800, scale=pop(t, 9))
        text(d, "3 purchases skip hui.", 360, 1195, 60, C["OR"], scale=pop(t, 9.5))
    if 13 <= t < 15.8:
        text(d, "Tumhara Gullak", 360, 1120, 60, C["WH"], scale=pop(t, 13))
        text(d, "kitna bharega?", 360, 1200, 68, C["OR"], scale=pop(t, 13.4))
    return img


OPTIONS = {"gullak-reacts": (scene_gullak_reacts, 21.5, [2, 5.5, 9, 12, 16, 19.5]),
           "bagu-skit": (scene_bagu_skit, 19.5, [1.5, 5.5, 7.2, 11, 14.5, 17.5]),
           "gullak-hisaab": (scene_gullak_hisaab, 19.3, [1.5, 5.5, 8.6, 11, 14, 17.5])}


def frame(fn, t):
    return fn(t).resize((W, H), Image.LANCZOS)


def check(names):
    os.makedirs("out", exist_ok=True)
    for n in names:
        fn, dur, ts = OPTIONS[n]
        ims = [frame(fn, x).resize((240, 427), Image.LANCZOS) for x in ts]
        sheet = Image.new("RGB", (244 * len(ims) - 4, 427))
        for i, im in enumerate(ims): sheet.paste(im, (i * 244, 0))
        sheet.save(f"out/mascot_check_{n}.png"); print("check", n)


def render(names):
    for n in names:
        fn, dur, _ = OPTIONS[n]
        tmp, out = f"out/.option-{n}.tmp.mp4", f"out/option-{n}.mp4"
        p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                              "-r", str(FPS), "-i", "-", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                              "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                              "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", tmp], stdin=subprocess.PIPE)
        for i in range(int(dur * FPS)):
            p.stdin.write(frame(fn, i / FPS).tobytes())
        p.stdin.close()
        if p.wait() == 0: os.replace(tmp, out); print("rendered", out)


if __name__ == "__main__":
    names = sys.argv[2:] or list(OPTIONS)
    (check if sys.argv[1] == "check" else render)(names)

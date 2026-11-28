"""Bagu in situations: faces plus props and effects (cold, pollution, sale, saving, broke, 2 AM, EMI, wedding, thinking).
python3 bagu_props.py sheet out.png    -> 3x3 sheet (1080x1440)
python3 bagu_props.py demo out.mp4     -> each situation animated, ~20 s (720x1280, 30 fps, silent AAC)
pose(img, name, cx, cy, r, t) draws one situation anywhere, so Reels can reuse it."""
import math, os, random, subprocess, sys
from PIL import Image, ImageDraw
from mascots import S, C, R, text, font, out_back, out_cubic, clamp, paste_emoji, pop
from bagu_face import FACES, BASE, bagu, stroke, qbez, drop, heart, WH, INK, TEAR

ARM = (206, 76, 6)
CREAM = (248, 240, 226)

FACES.update({k: {**BASE, **v} for k, v in {
    "thand": dict(L=[(-.30, -.02), (-.30, .08), (-.02, .08)], R=[(.30, -.02), (.30, .08), (.02, .08)], w=0, fill=1,
                  teeth=1, tongue=0, chatter=1, lid=.34, tilt=-.5, pupil=.8, browy=(.6, .6), browt=(-.7, -.7)),
    "dhuan": dict(L=[(-.2, .1), (-.1, .1), (0, .1)], R=[(.2, .1), (.1, .1), (0, .1)], w=0, lid=.45, tilt=-.35,
                  pupil=.8, browy=(.2, .2), browt=(-.5, -.5), tear=.55),
    "sale": dict(L=[(-.42, -.10), (-.42, .36), (-.02, .36)], R=[(.42, -.10), (.42, .36), (.02, .36)], w=0, fill=1,
                 teeth=1, browy=(1.1, 1.1), browt=(-.3, -.3), sym="%"),
    "paisa": dict(L=[(-.40, -.06), (-.32, .22), (-.02, .22)], R=[(.40, -.06), (.32, .22), (.02, .22)], w=.12,
                  browy=(.9, .9), browt=(-.3, -.3), sym="₹"),
    "kangaal": dict(L=[(-.22, .14), (-.11, .10), (0, .10)], R=[(.22, .14), (.11, .10), (0, .10)], w=.11, lid=.3,
                    tilt=-.8, look=(0, .6), browy=(.3, .3), browt=(-.9, -.9)),
    "raat": dict(L=[(-.13, .1), (-.06, .1), (0, .1)], R=[(.13, .1), (.06, .1), (0, .1)], w=.1, lid=.52, tilt=-.1,
                 pupil=.75, look=(0, .85), eyebags=1, browy=(-.1, -.1), browt=(-.2, -.2)),
    "emi": dict(L=[(-.2, 0), (-.1, 0), (0, 0)], R=[(.2, 0), (.1, 0), (0, 0)], w=0, grit=1, lid=.58, tilt=.9,
                browy=(-.3, -.3), browt=(.9, .9), sweat=1),
    "shaadi": dict(L=[(-.34, -.04), (-.32, .26), (-.02, .26)], R=[(.34, -.04), (.32, .26), (.02, .26)], w=0, fill=1,
                   cheek=1, browy=(.8, .8), browt=(-.3, -.3)),
    "soch": dict(L=[(-.22, .10), (-.14, .10), (-.05, .09)], R=[(.10, .05), (.03, .08), (-.05, .09)], w=.11, lid=.08,
                 look=(.75, -.85), browy=(-.2, 1.0), browt=(.3, -.4)),
}.items()})

POSES = ["thand", "dhuan", "sale", "paisa", "kangaal", "raat", "emi", "shaadi", "soch"]
LABELS = {"thand": ("Thand lag gayi", "Heater, jacket, kambal wali arzi"),
          "dhuan": ("Dhuan hi dhuan", "Purifier, mask wali arzi"),
          "sale": ("Sale ka nasha", "Black Friday, sale season"),
          "paisa": ("Paisa bacha", "Rehne de jeeta"),
          "kangaal": ("Kangaal", "Mahine ka aakhri hafta"),
          "raat": ("Raat ke 2 baje", "Neend nahi, cart full"),
          "emi": ("EMI ka bojh", "EMI wali arzi"),
          "shaadi": ("Shaadi season", "Har hafte ek shaadi"),
          "soch": ("Soch raha hoon", "Le loon ya nahi?")}
TINT = {"thand": (20, 32, 50), "dhuan": (56, 52, 47), "raat": (14, 18, 44)}
DEFAULT_TINT = (31, 27, 25)


def arm(d, sh, hand, r, bend=.25):
    (x0, y0), (x1, y1) = sh, hand
    L = math.hypot(x1 - x0, y1 - y0) or 1
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    c = ((x0 + x1) / 2 + nx * bend * r, (y0 + y1) / 2 + ny * bend * r)
    stroke(d, qbez((x0, y0), c, (x1, y1), 16), r * .1, ARM)
    d.ellipse(R(x1 - r * .12, y1 - r * .12, x1 + r * .12, y1 + r * .12), fill=WH)


def arms(d, g, cx, r, left, right):
    """left/right = (hand_x, hand_y, bend) in units of r from (cx, body centre), or None."""
    for sgn, a in ((-1, left), (1, right)):
        if a is None: continue
        sh = (cx + sgn * g["bw"] * .9, g["ccy"] + r * .12)
        arm(d, sh, (cx + a[0] * r, g["ccy"] + a[1] * r), r, a[2] * -sgn)


def rotated_tag(img, x, y, w, h, label, ang, bg, fg):
    tile = Image.new("RGBA", (int(w * S * 1.6), int(w * S * 1.6)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    cx, cy = tile.width / 2, tile.height / 2
    td.rounded_rectangle((cx - w * S / 2, cy - h * S / 2, cx + w * S / 2, cy + h * S / 2), radius=h * S * .25, fill=bg)
    td.ellipse((cx - w * S / 2 + h * S * .2, cy - h * S * .1, cx - w * S / 2 + h * S * .4, cy + h * S * .1), fill=(0, 0, 0, 0))
    td.text((cx + h * S * .12, cy), label, font=font(900, h * .52), fill=fg, anchor="mm")
    tile = tile.rotate(ang, resample=Image.BICUBIC)
    img.paste(tile, (int(x * S - tile.width / 2), int(y * S - tile.height / 2)), tile)


def beanie(d, cx, top, r):
    col, cuff, stripe = (44, 116, 180), (32, 92, 150), (236, 236, 236)
    d.chord(R(cx - r * 1.02, top - r * .88, cx + r * 1.02, top + r * .72), 180, 360, fill=col)
    d.arc(R(cx - r * .86, top - r * .62, cx + r * .86, top + r * .5), 200, 340, fill=stripe, width=int(r * .07 * S))
    d.rounded_rectangle(R(cx - r * 1.07, top - r * .2, cx + r * 1.07, top + r * .14), radius=r * .08 * S, fill=cuff)
    for i in range(-9, 10):
        x = cx + i * r * .11
        d.line(R(x, top - r * .15, x, top + r * .09), fill=col, width=max(1, int(r * .03 * S)))
    d.ellipse(R(cx - r * .17, top - r * 1.0, cx + r * .17, top - r * .66), fill=CREAM)


def scarf(d, cx, y, r, bw):
    red, cream = (200, 40, 50), CREAM
    d.rounded_rectangle(R(cx - bw * 1.03, y, cx + bw * 1.03, y + r * .24), radius=r * .1 * S, fill=red)
    for i in range(-4, 5):
        x = cx + i * r * .24
        d.rectangle(R(x - r * .04, y + r * .02, x + r * .04, y + r * .22), fill=cream)
    tx = cx + bw * .55  # hanging end
    d.rounded_rectangle(R(tx - r * .12, y + r * .1, tx + r * .12, y + r * .78), radius=r * .06 * S, fill=red)
    for k in range(3):
        yy = y + r * (.25 + k * .18)
        d.rectangle(R(tx - r * .12, yy, tx + r * .12, yy + r * .06), fill=cream)
    for k in range(4):
        x = tx - r * .1 + k * r * .067
        d.line(R(x, y + r * .78, x, y + r * .88), fill=red, width=max(1, int(r * .03 * S)))


def mask(d, g, cx, r):
    mx, my = g["mcx"], g["mcy"] - r * .02
    d.line(R(mx - r * .44, my - r * .12, cx - g["bw"], g["ey"] + r * .12), fill=(210, 220, 230), width=int(r * .035 * S))
    d.line(R(mx + r * .44, my - r * .12, cx + g["bw"], g["ey"] + r * .12), fill=(210, 220, 230), width=int(r * .035 * S))
    d.rounded_rectangle(R(mx - r * .48, my - r * .24, mx + r * .48, my + r * .28), radius=r * .16 * S, fill=(236, 244, 250))
    for k in (-1, 0, 1):
        d.line(R(mx - r * .38, my + k * r * .1, mx + r * .38, my + k * r * .1), fill=(180, 196, 210), width=max(1, int(r * .025 * S)))


def garland(d, g, cx, r, t):
    top, bw = g["top"], g["bw"]
    pts = qbez((cx - bw * .9, top + r * .3), (cx - bw * 1.0, g["ccy"] + r * 1.0), (cx, g["ccy"] + r * .86), 10)[:-1] + \
          qbez((cx, g["ccy"] + r * .86), (cx + bw * 1.0, g["ccy"] + r * 1.0), (cx + bw * .9, top + r * .3), 10)
    for i, (x, y) in enumerate(pts):
        col = (255, 206, 40) if i % 2 else (232, 70, 20)
        rr = r * .095
        d.ellipse(R(x - rr, y - rr, x + rr, y + rr), fill=col)
        d.ellipse(R(x - rr * .4, y - rr * .4, x + rr * .4, y + rr * .4), fill=(255, 236, 140) if i % 2 else (255, 140, 60))


def weight(d, cx, y_bottom, r, t):
    w0, w1, h = r * 1.0, r * .72, r * .62
    yb = y_bottom
    d.arc(R(cx - r * .28, yb - h - r * .3, cx + r * .28, yb - h + r * .2), 180, 360, fill=(70, 70, 76), width=int(r * .1 * S))
    d.polygon([(v[0] * S, v[1] * S) for v in [(cx - w0, yb), (cx + w0, yb), (cx + w1, yb - h), (cx - w1, yb - h)]], fill=(70, 70, 76))
    d.polygon([(v[0] * S, v[1] * S) for v in [(cx - w1, yb - h), (cx + w1, yb - h), (cx + w1 * .9, yb - h + r * .08), (cx - w1 * .9, yb - h + r * .08)]], fill=(110, 110, 118))
    text(d, "EMI", cx, yb - h * .22, r * .42, WH, 900, maxw=w0 * 1.6)


def phone_back(d, g, cx, r):
    x0, y0, x1, y1 = cx - r * .34, g["mcy"] + r * .2, cx + r * .34, g["mcy"] + r * .92
    d.rounded_rectangle(R(x0 - r * .03, y0 - r * .03, x1 + r * .03, y1 + r * .03), radius=r * .1 * S, fill=(140, 220, 255))
    d.rounded_rectangle(R(x0, y0, x1, y1), radius=r * .08 * S, fill=(34, 34, 40))
    d.rounded_rectangle(R(x0 + r * .06, y0 + r * .06, x0 + r * .24, y0 + r * .26), radius=r * .05 * S, fill=(58, 58, 66))
    for k in range(2):
        cxx, cyy = x0 + r * .11 + k * r * .08, y0 + r * .12
        d.ellipse(R(cxx - r * .025, cyy - r * .025, cxx + r * .025, cyy + r * .025), fill=(14, 14, 18))


def moth(d, x, y, r, t):
    flap = abs(math.sin(t * 22))
    for sgn in (-1, 1):
        d.ellipse(R(x + sgn * r * .02 - (sgn < 0) * r * .16, y - r * .12 * (.4 + .6 * flap),
                    x + sgn * r * .02 + (sgn > 0) * r * .16, y + r * .02), fill=(200, 190, 170))
    d.ellipse(R(x - r * .035, y - r * .08, x + r * .035, y + r * .08), fill=(110, 96, 80))


def cobweb(d, x, y, r):
    col = (230, 220, 210)
    for a in (0, 30, 60, 90):
        d.line(R(x, y, x + math.cos(math.radians(a)) * r * .38, y + math.sin(math.radians(a)) * r * .38), fill=col, width=max(1, int(r * .015 * S)))
    for k in (1, 2, 3):
        rr = r * .12 * k
        d.arc(R(x - rr, y - rr, x + rr, y + rr), 0, 90, fill=col, width=max(1, int(r * .015 * S)))


def cloud(d, x, y, s, col):
    for dx, dy, rr in ((-.5, .1, .45), (0, -.15, .6), (.5, .1, .45), (0, .2, .45)):
        d.ellipse(R(x + dx * s - rr * s, y + dy * s - rr * s, x + dx * s + rr * s, y + dy * s + rr * s), fill=col)


def pose(img, name, cx, cy, r, t, intro=1.0):
    """Draw Bagu in a situation. cy = body centre at rest; intro 0..1 pops him in. Returns the image."""
    d = ImageDraw.Draw(img)
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    f = dict(FACES[name])
    rnd = random.Random(7)
    sx, sy, dx, dy = 1.0, 1.0 + .015 * math.sin(t * 4), 0.0, 0.0
    blink = 0.0
    bt = t % 2.8
    if bt < .14 and not f["sym"] and f["cheek"] < .5: blink = math.sin(bt / .14 * math.pi)
    rr = r * intro
    if rr < 2: return img

    # ---- background effects
    if name == "raat":
        for i in range(14):
            x, y = cx + rnd.uniform(-1.9, 1.9) * r, cy + rnd.uniform(-2.2, -1.0) * r
            tw = .5 + .5 * math.sin(t * 3 + i)
            s_ = r * .018 * (1 + tw)
            d.ellipse(R(x - s_, y - s_, x + s_, y + s_), fill=(220, 220, 255))
        mx, my = cx + r * 1.45, cy - r * 1.75
        d.ellipse(R(mx - r * .28, my - r * .28, mx + r * .28, my + r * .28), fill=(255, 236, 170))
        d.ellipse(R(mx - r * .16, my - r * .36, mx + r * .36, my + r * .2), fill=TINT["raat"])
    if name == "dhuan":
        for i in range(7):
            sp = rnd.uniform(14, 30) * (1 if i % 2 else -1)
            x = cx + ((rnd.uniform(-2, 2) * r + t * sp + 3 * r) % (4.4 * r)) - 2.2 * r
            y = cy + rnd.uniform(-1.9, 1.2) * r
            s_ = rnd.uniform(.35, .6) * r
            cloud(od, x, y, s_, (120, 112, 100, 70))

    # ---- body motion per situation
    if name == "thand": dx = 3.2 * math.sin(t * 75)
    if name == "dhuan":
        c = (t % 1.7)
        if c < .35: sy -= .06 * math.sin(c / .35 * math.pi); dy = 0
    if name == "sale": sy += .05 * abs(math.sin(t * 9)); dy = -14 * abs(math.sin(t * 9)) * r / 150
    if name == "emi": sy, sx = .86 + .02 * math.sin(t * 20), 1.07; dx = 2 * math.sin(t * 30)
    if name == "shaadi": dy = -18 * abs(math.sin(t * 6)) * r / 150; sx = 1 + .03 * math.sin(t * 12)
    if name == "kangaal": sy -= .03

    g = bagu(img, d, cx + dx, cy + dy, rr, t, f, blink, sx, sy)
    top = g["top"]

    # ---- props on the body
    if name == "thand":
        beanie(d, cx + dx, top, rr)
        scarf(d, cx + dx, g["mcy"] + rr * .3, rr, g["bw"])
    if name == "dhuan": mask(d, g, cx + dx, rr)
    if name == "shaadi": garland(d, g, cx + dx, rr, t)
    if name == "emi": weight(d, cx + dx, top + rr * .08, rr, t)
    if name == "raat":
        phone_back(d, g, cx, rr)
    if name == "kangaal":
        d.rounded_rectangle(R(cx - rr * .7, top + rr * .05, cx + rr * .7, top + rr * .15), radius=rr * .04 * S, fill=(60, 26, 8))
        cobweb(d, cx - g["bw"] + rr * .04, top + rr * .24, rr)

    # ---- arms
    sw = math.sin(t * 9)
    A = {"thand": (None, None),
         "sale": ((-1.45, -1.0 - .15 * sw, .3), (1.45, -1.0 + .15 * sw, .3)),
         "paisa": (None, (1.4, -.75, .35)),
         "kangaal": ((-1.5, .3, -.25), (1.5, .3, -.25)),
         "raat": ((-.34, .62 + .36, .3), (.34, .62 + .36, .3)),
         "emi": ((-.95, -1.2, .35), (.95, -1.2, .35)),
         "shaadi": ((-1.3, -1.05 + .2 * math.sin(t * 6), .3), (1.3, -1.05 - .2 * math.sin(t * 6), .3)),
         "soch": (None, (.34, .80, .45)),
         "dhuan": (None, None)}[name]
    if name in ("raat",):
        A = ((-.34, (g["mcy"] - g["ccy"]) / rr + .62, .3), (.34, (g["mcy"] - g["ccy"]) / rr + .62, .3))
    arms(d, g, cx + dx, rr, *A)

    # ---- front effects
    if name == "thand":
        for i in range(26):
            x0, sp = rnd.uniform(-2, 2) * r, rnd.uniform(.5, 1.0) * r
            y = (rnd.uniform(0, 4.2) * r + t * sp) % (4.2 * r) - 2.4 * r
            x = cx + x0 + .15 * r * math.sin(t * 2 + i)
            s_ = rnd.uniform(.02, .045) * r
            d.ellipse(R(x - s_, cy + y - s_, x + s_, cy + y + s_), fill=WH)
        ph = (t * 1.1) % 1  # breath puffs
        bx, by = g["mcx"] + rr * .45 + ph * rr * .5, g["mcy"] - ph * rr * .3
        cloud(od, bx, by, rr * (.12 + .18 * ph), (235, 245, 255, int(150 * (1 - ph))))
        for sgn in (-1, 1):  # shiver marks
            x = cx + sgn * (g["bw"] + rr * .16)
            for k in range(2):
                yy = g["ccy"] - rr * .3 + k * rr * .3
                d.arc(R(x - rr * .1, yy - rr * .12, x + rr * .1, yy + rr * .12), 270 - 50 if sgn < 0 else 90 - 50,
                      270 + 50 if sgn < 0 else 90 + 50, fill=(190, 220, 255), width=max(1, int(rr * .03 * S)))
    if name == "dhuan":
        for i in range(5):
            x = cx + ((rnd.uniform(-2, 2) * r + t * 22 * (1 if i % 2 else -1) + 3 * r) % (4.4 * r)) - 2.2 * r
            y = cy + rnd.uniform(-.2, 1.3) * r
            cloud(od, x, y, rnd.uniform(.3, .5) * r, (130, 122, 110, 85))
        c = t % 1.7
        if c < .6:
            text(d, "khaans!", cx + rr * 1.0, top - rr * .1, rr * .26, (210, 205, 195), 800, scale=pop(c, 0, .2), maxw=rr * 1.6)
    if name == "sale":
        for i in range(5):
            a = t * 1.3 + i * 2 * math.pi / 5
            x, y = cx + math.cos(a) * r * 1.75, cy - r * .3 + math.sin(a) * r * 1.35
            rotated_tag(img, x, y, r * .62, r * .26, "SALE" if i % 2 else "-70%", 20 * math.sin(a * 2),
                        (214, 40, 40) if i % 2 else (255, 196, 60), WH if i % 2 else INK)
    if name == "paisa":
        for i in range(5):
            t0 = i * .4
            k = ((t - t0) % 2.0) / .8
            if 0 <= k <= 1:
                y = top - rr * 1.1 + (rr * 1.1) * out_cubic(k)
                paste_emoji(img, "🪙", cx + (i % 3 - 1) * rr * .25 * (1 - k), y, rr * .32, rot=30 * (i - 2))
        for i in range(4):
            a = i * 1.6 + t
            x, y = cx + math.cos(a) * r * 1.5, cy - r * .6 + math.sin(a * 1.3) * r * .9
            s_ = r * .07 * (.6 + .4 * math.sin(t * 6 + i))
            d.polygon([(v[0] * S, v[1] * S) for v in [(x, y - s_ * 2), (x + s_ * .5, y - s_ * .5), (x + s_ * 2, y), (x + s_ * .5, y + s_ * .5),
                                                     (x, y + s_ * 2), (x - s_ * .5, y + s_ * .5), (x - s_ * 2, y), (x - s_ * .5, y - s_ * .5)]],
                      fill=C["GOLD"])
    if name == "kangaal":
        k = (t % 2.4) / 2.4
        moth(d, cx + .5 * r * math.sin(k * 7) * k, top - rr * .05 - k * r * 1.5, r * 1.7, t)
    if name == "emi":
        for sgn in (-1, 1):
            ph = (t * 1.6 + (sgn > 0) * .5) % 1
            drop(d, cx + sgn * (g["bw"] * .7 + ph * rr * .5), top + rr * .3 - ph * rr * .2 + ph * ph * rr * .6, rr * .09, TEAR)
    if name == "shaadi":
        for i in range(22):
            x0 = rnd.uniform(-2, 2) * r
            y = (rnd.uniform(0, 4) * r + t * rnd.uniform(.4, .8) * r) % (4 * r) - 2.3 * r
            x = cx + x0 + .2 * r * math.sin(t * 2 + i)
            col = (255, 206, 40) if i % 2 else (240, 90, 20)
            s_ = r * .035
            d.ellipse(R(x - s_, cy + y - s_ * .6, x + s_, cy + y + s_ * .6), fill=col)
    if name == "soch":
        bx, by = cx + rr * 1.0, top - rr * .05
        for k, s_ in enumerate((.05, .075)):
            x, y = cx + rr * (.62 + k * .16), top + rr * (.35 - k * .2)
            d.ellipse(R(x - rr * s_, y - rr * s_, x + rr * s_, y + rr * s_), fill=WH)
        cloud(d, bx, by - rr * .2, rr * .36, WH)
        text(d, "₹?", bx, by - rr * .12, rr * .3, INK, 900, maxw=rr * .9)

    if ov.getbbox():
        img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    return img


def sheet(out):
    Wd, Hd = 1080, 1500
    img = Image.new("RGB", (Wd * S, Hd * S), C["BG"]); d = ImageDraw.Draw(img)
    text(d, "Bagu ke haalaat", 540, 105, 66, WH, 900, maxw=1000)
    text(d, "Mausam, sale aur mahine ka aakhri hafta", 540, 158, 32, C["GR"], 700, maxw=1000)
    for n, name in enumerate(POSES):
        col, row = n % 3, n // 3
        x0, y0 = 16 + 352 * col, 200 + 430 * row
        d.rounded_rectangle(R(x0, y0, x0 + 344, y0 + 418), radius=28 * S, fill=TINT.get(name, DEFAULT_TINT))
        img = pose(img, name, x0 + 172, y0 + 178, 74, 0.35)
        d = ImageDraw.Draw(img)
        a, b = LABELS[name]
        text(d, a, x0 + 172, y0 + 358, 36, C["OR"], 900, maxw=320)
        text(d, b, x0 + 172, y0 + 394, 23, C["GR"], 700, maxw=320)
    img.resize((Wd, Hd), Image.LANCZOS).save(out); print("sheet", out)


SEG = 2.3


def demo_frame(t):
    i = min(int(t / SEG), len(POSES) - 1)
    u = t - i * SEG
    name = POSES[i]
    img = Image.new("RGB", (720 * S, 1280 * S), TINT.get(name, DEFAULT_TINT)); d = ImageDraw.Draw(img)
    img = pose(img, name, 360, 640, 150, t, intro=out_back(u / .35, 1.4) if u < .35 else 1)
    d = ImageDraw.Draw(img)
    a, b = LABELS[name]
    text(d, a, 360, 1070, 78, C["OR"], 900, scale=pop(u, .05, .35))
    text(d, b, 360, 1135, 38, C["GR"], 700, scale=pop(u, .2, .35))
    text(d, "Bagu", 360, 150, 56, WH, 900)
    return img.resize((720, 1280), Image.LANCZOS)


def demo(out):
    dur = len(POSES) * SEG
    tmp = out + ".tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "720x1280",
                          "-r", "30", "-i", "-", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                          "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                          "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", tmp], stdin=subprocess.PIPE)
    for k in range(int(dur * 30)):
        p.stdin.write(demo_frame(k / 30).tobytes())
    p.stdin.close()
    if p.wait() == 0: os.replace(tmp, out); print("demo", out)


if __name__ == "__main__":
    {"sheet": sheet, "demo": demo}[sys.argv[1]](sys.argv[2])

"""Bagu with real expressions. The two pause bars of the logo bend into a mouth; eyes get lids, brows and cheeks.
python3 bagu_face.py sheet out.png   -> expression sheet (1080x1440)
python3 bagu_face.py demo out.mp4    -> morph demo (720x1280, 30 fps, silent AAC)
Every face is a set of numbers, so any two faces blend frame by frame (the bars visibly move into the new shape)."""
import math, os, subprocess, sys
from PIL import Image, ImageDraw
from mascots import S, C, R, text, out_back, out_cubic, clamp

BAG, BAND, INK, WH = C["OR"], (232, 90, 12), C["INK"], C["WH"]
CAVITY, TONGUE, TEAR, HEART = (78, 26, 8), (244, 128, 112), (120, 190, 255), (236, 52, 78)

# Mouth = two strokes (L, R), each (start, bend, end) in units of r from the mouth centre.
# Both always run outer/top -> centre/bottom, so blending two faces moves the bars instead of jumping.
BASE = dict(w=.13, fill=0, teeth=0, tongue=1, lid=0, tilt=0, cheek=0, pupil=1, look=(0, 0), size=1,
            brow=1, browy=(0, 0), browt=(0, 0), heart=0, tear=0, sweat=0, q=0, wobble=0,
            chatter=0, grit=0, eyebags=0, sym="")
FACES = {
    # the logo face: pause bars + frown brows. Used only for the "Ruko zara!" moment
    "ruko": dict(L=[(-.18, -.25), (-.18, 0), (-.18, .25)], R=[(.18, -.25), (.18, 0), (.18, .25)], w=.14,
                 lid=.3, tilt=1, browy=(-.4, -.4), browt=(1, 1)),
    "khush": dict(L=[(-.40, -.06), (-.32, .22), (-.02, .22)], R=[(.40, -.06), (.32, .22), (.02, .22)], w=.12,
                  cheek=1, browy=(.5, .5), browt=(-.25, -.25)),
    "maza": dict(L=[(-.42, -.10), (-.42, .36), (-.02, .36)], R=[(.42, -.10), (.42, .36), (.02, .36)], w=.0,
                 fill=1, teeth=1, cheek=1, browy=(.9, .9), browt=(-.3, -.3)),
    "arre": dict(L=[(0, -.22), (-.44, 0), (0, .24)], R=[(0, -.22), (.44, 0), (0, .24)], w=.06, fill=1, tongue=0,
                 size=1.22, pupil=.55, browy=(1.3, 1.3), browt=(-.15, -.15)),
    "udaas": dict(L=[(-.36, .16), (-.30, -.08), (-.02, -.08)], R=[(.36, .16), (.30, -.08), (.02, -.08)], w=.12,
                  lid=.32, tilt=-1, pupil=1.15, look=(0, .45), browy=(.3, .3), browt=(-1, -1), tear=1),
    "ghabraya": dict(L=[(-.38, .02), (-.19, -.17), (0, .02)], R=[(.38, .02), (.19, .21), (0, .02)], w=.10,
                     lid=.06, tilt=-.6, pupil=.6, look=(.35, -.1), size=1.08, browy=(.7, .7), browt=(-.7, -.7),
                     sweat=1, wobble=1),
    "sachmein": dict(L=[(-.12, .10), (-.03, .085), (.07, .07)], R=[(.34, .0), (.21, .035), (.07, .07)], w=.12,
                     lid=.48, tilt=.15, look=(.95, .15), browy=(-.5, .9), browt=(.6, -.35)),
    "uljhan": dict(L=[(-.30, .12), (-.15, -.06), (0, .04)], R=[(.30, -.05), (.15, .15), (0, .04)], w=.10,
                   pupil=.85, look=(-.55, -.7), browy=(-.3, 1.0), browt=(.35, -.4), q=1),
    "dil": dict(L=[(-.32, -.04), (-.30, .26), (-.02, .26)], R=[(.32, -.04), (.30, .26), (.02, .26)], w=.0,
                fill=1, teeth=.0, browy=(.8, .8), browt=(-.3, -.3), heart=1),
}
for k in FACES: FACES[k] = {**BASE, **FACES[k]}

LABELS = {"ruko": ("Ruko!", "Kharcha rokne wala pal"), "khush": ("Khush", "Rehne de jeeta"),
          "maza": ("Maza aa gaya", "Bade paise bache"), "arre": ("Arre!", "Price dekh ke"),
          "udaas": ("Udaas", "Le le jeeta"), "ghabraya": ("Ghabraya", "Votes ka intezaar"),
          "sachmein": ("Sach mein?", "Arzi judge karte hue"), "uljhan": ("Uljhan", "Tie"),
          "dil": ("Dil aa gaya", "Pasand aa gaya")}


def lerp(a, b, k):
    if isinstance(a, str): return b if k > .5 else a
    if isinstance(a, (int, float)): return a + (b - a) * k
    return type(a)(lerp(x, y, k) for x, y in zip(a, b)) if isinstance(a, tuple) else [lerp(x, y, k) for x, y in zip(a, b)]


def mix(fa, fb, k):
    return {key: lerp(fa[key], fb[key], k) for key in fa}


def qbez(p0, p1, p2, n=28):
    return [((1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0],
             (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]) for u in (i / n for i in range(n + 1))]


def stroke(d, pts, w, col):
    sp = [(x * S, y * S) for x, y in pts]
    d.line(sp, fill=col, width=max(1, int(w * S)), joint="curve")
    for x, y in (sp[0], sp[-1]):
        d.ellipse((x - w * S / 2, y - w * S / 2, x + w * S / 2, y + w * S / 2), fill=col)


def heart(d, x, y, s, col):
    s *= S; x *= S; y *= S
    d.ellipse((x - s, y - s * .75, x, y + s * .25), fill=col)
    d.ellipse((x, y - s * .75, x + s, y + s * .25), fill=col)
    d.polygon([(x - s * .97, y - s * .1), (x + s * .97, y - s * .1), (x, y + s * 1.05)], fill=col)


def drop(d, x, y, s, col):
    d.polygon([(v[0] * S, v[1] * S) for v in [(x - s * .5, y + s * .3), (x + s * .5, y + s * .3), (x, y - s * .9)]], fill=col)
    d.ellipse(R(x - s * .55, y - s * .1, x + s * .55, y + s), fill=col)


def eye(img, x, y, ew, eh, sgn, f, r, blink):
    eh *= max(.08, 1 - blink)
    pad = 4
    w, h = int(2 * ew * S) + 2 * pad, int(2 * eh * S) + 2 * pad
    mask = Image.new("L", (w, h), 0); md = ImageDraw.Draw(mask)
    md.ellipse((pad, pad, w - pad, h - pad), fill=255)
    inner = -sgn  # which way the face centre is
    lid = f["lid"]; tilt = f["tilt"] * min(1, lid / .2)
    if lid > .005:
        yc = pad + (h - 2 * pad) * lid
        ly = lambda px: yc + tilt * ((px - w / 2) / (w / 2)) * inner * (h / 2) * .55
        md.polygon([(0, -h), (w, -h), (w, ly(w)), (0, ly(0))], fill=0)
    if f["cheek"] > .005:
        cyy = h / 2 + (h / 2) * (2.0 - 1.4 * f["cheek"])
        md.ellipse((-w * .3, cyy - h / 2, w * 1.3, cyy + h / 2), fill=0)
    layer = Image.new("RGB", (w, h), WH); ld = ImageDraw.Draw(layer)
    pr = r * .092 * f["pupil"] * S
    px = w / 2 + f["look"][0] * ew * .45 * S
    py = h / 2 + f["look"][1] * eh * .45 * S + eh * .08 * S
    ld.ellipse((px - pr, py - pr, px + pr, py + pr), fill=(20, 14, 12))
    hr = pr * .32
    ld.ellipse((px + pr * .2 - hr, py - pr * .45 - hr, px + pr * .2 + hr, py - pr * .45 + hr), fill=WH)
    img.paste(layer, (int(x * S - w / 2), int(y * S - h / 2)), mask)


SYM = {"%": (WH, (214, 40, 40)), "₹": ((255, 196, 60), (150, 90, 10))}


def sym_eye(img, d, x, y, rad, sym, t, sgn):
    bg, fg = SYM[sym]
    d.ellipse(R(x - rad, y - rad, x + rad, y + rad), fill=bg)
    if sym == "₹": d.ellipse(R(x - rad * .8, y - rad * .8, x + rad * .8, y + rad * .8), outline=fg, width=max(1, int(rad * .1 * S)))
    from mascots import font
    sz = rad * (1.5 if sym == "%" else 1.25)
    tile = Image.new("RGBA", (int(rad * 2.4 * S), int(rad * 2.4 * S)), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2), sym, font=font(900, sz), fill=fg, anchor="mm")
    ang = (t * 360 * sgn) % 360 if sym == "%" else 12 * math.sin(t * 6)
    tile = tile.rotate(ang, resample=Image.BICUBIC)
    img.paste(tile, (int(x * S - tile.width / 2), int(y * S - tile.height / 2)), tile)


def bagu(img, d, cx, cy, r, t, f, blink=0.0, sx=1.0, sy=1.0):
    bw, bh = r * sx, r * 1.05 * sy
    top = cy + r * 1.05 - bh * 2  # feet stay on the ground when squashing
    ccy = top + bh
    for fx in (-.4, .4):
        d.line(R(cx + fx * bw, cy + r * 1.05, cx + fx * bw, cy + r * 1.05 + r * .28), fill=BAG, width=int(r * .1 * S))
        d.ellipse(R(cx + fx * bw - r * .16, cy + r * 1.05 + r * .22, cx + fx * bw + r * .12, cy + r * 1.05 + r * .36), fill=WH)
    d.arc(R(cx - r * .5, top - r * .5, cx + r * .5, top + r * .4), 180, 360, fill=BAG, width=int(r * .14 * S))
    d.rounded_rectangle(R(cx - bw, top, cx + bw, top + bh * 2), radius=r * .22 * S, fill=BAG)
    d.rounded_rectangle(R(cx - bw, top, cx + bw, top + r * .22), radius=r * .1 * S, fill=BAND)
    # eyes (or hearts)
    ey = ccy - r * .30 * sy
    hk = f["heart"]
    for i, sgn in enumerate((-1, 1)):
        ex = cx + sgn * r * .38 * sx
        ew, eh = r * .19 * f["size"] * (1 - hk), r * .235 * f["size"] * (1 - hk)
        if f["eyebags"] > .02:
            d.arc(R(ex - ew * .9, ey + eh * .55, ex + ew * .9, ey + eh * 1.45), 20, 160, fill=(150, 60, 40),
                  width=max(1, int(r * .045 * S * f["eyebags"])))
        if f["sym"] and ew > 1:
            sym_eye(img, d, ex, ey, ew * 1.05, f["sym"], t, sgn)
        elif ew > 1: eye(img, ex, ey, ew, eh, sgn, f, r, blink if hk < .5 else 0)
        if hk > .02:
            heart(d, ex, ey - r * .02, r * .2 * hk * (1 + .08 * math.sin(t * 9)), HEART)
        # brow
        if f["brow"] > .05:
            inner = -sgn
            by = ey - r * .235 * f["size"] - r * .10 - f["browy"][i] * r * .075
            tl = f["browt"][i] * r * .06
            hl = r * .13 * f["brow"]
            stroke(d, qbez((ex - inner * hl, by - tl), (ex, by - r * .03), (ex + inner * hl, by + tl), 12), r * .065, INK)
        if f["tear"] > .05:
            ph = (t * 1.3 + i * .45) % 1
            drop(d, ex + sgn * r * .12, ey + r * .14 + ph * r * .7, r * .08 * f["tear"], TEAR)
    # mouth
    mcx, mcy = cx, ccy + r * .36 * sy
    L, Rr = [list(p) for p in f["L"]], [list(p) for p in f["R"]]
    if f["wobble"] > .01:
        a = f["wobble"] * .07 * math.sin(t * 16)
        L[1][1] += a; Rr[1][1] -= a
    if f["chatter"] > .01:  # teeth chattering: the jaw snaps open and shut
        a = f["chatter"] * .08 * (.5 + .5 * math.sin(t * 46))
        for P in (L, Rr): P[1][1] += a * 1.4; P[2][1] += a
    toabs = lambda pts: [(mcx + x * r, mcy + y * r * sy) for x, y in pts]
    lp, rp = qbez(*toabs(L)), qbez(*toabs(Rr))
    if f["fill"] > .02:
        poly = lp + rp[::-1]
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        x0, y0, x1, y1 = min(xs) - 2, min(ys) - 2, max(xs) + 2, max(ys) + 2
        w, h = int((x1 - x0) * S) + 2, int((y1 - y0) * S) + 2
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).polygon([((x - x0) * S, (y - y0) * S) for x, y in poly], fill=int(255 * clamp(f["fill"])))
        lay = Image.new("RGB", (w, h), CAVITY); ld = ImageDraw.Draw(lay)
        if f["tongue"] > .3: ld.ellipse((w * .22, h * .62, w * .78, h * 1.35), fill=TONGUE)
        if f["teeth"] > .02:  # the two pause bars, now as front teeth
            tw, th = w * .16, h * .30 * f["teeth"]
            for s_ in (-1, 1):
                ld.rounded_rectangle((w / 2 + s_ * (tw * .62) - tw / 2, -10, w / 2 + s_ * (tw * .62) + tw / 2, th),
                                     radius=tw * .25, fill=WH)
        img.paste(lay, (int(x0 * S), int(y0 * S)), m)
    wd = f["w"] * r
    if wd > .5:
        stroke(d, lp, wd, WH); stroke(d, rp, wd, WH)
    if f["grit"] > .05:  # clenched teeth
        gw, gh = r * .62 * f["grit"], r * .26 * f["grit"]
        d.rounded_rectangle(R(mcx - gw / 2, mcy - gh / 2, mcx + gw / 2, mcy + gh / 2), radius=gh * .3 * S, fill=WH)
        d.line(R(mcx - gw / 2, mcy, mcx + gw / 2, mcy), fill=CAVITY, width=max(1, int(r * .03 * S)))
        for k in (-1, 0, 1):
            d.line(R(mcx + k * gw / 4, mcy - gh / 2, mcx + k * gw / 4, mcy + gh / 2), fill=CAVITY, width=max(1, int(r * .025 * S)))
    if f["sweat"] > .05:
        drop(d, cx + r * .78 * sx, top + r * .45 + 6 * math.sin(t * 7), r * .13 * f["sweat"], TEAR)
    if f["q"] > .05:
        text(d, "?", cx + r * 1.15, top + r * .1 + 6 * math.sin(t * 4), r * .9 * f["q"], C["GOLD"], 900)
    return dict(top=top, ccy=ccy, bw=bw, bh=bh, ey=ey, mcx=mcx, mcy=mcy, foot=cy + r * 1.05)


def face_at(seq, t, hold=1.05, morph=.38):
    """seq of face names; returns the blended face at time t and the index of the current one."""
    step = hold + morph
    i = min(int(t / step), len(seq) - 1)
    u = t - i * step
    a = FACES[seq[i]]
    if i + 1 < len(seq) and u > hold:
        k = out_back((u - hold) / morph, 1.2)
        return mix(a, FACES[seq[i + 1]], k), i + (1 if k > .5 else 0), (u - hold) / morph
    return a, i, None


def sheet(out):
    Wd, Hd = 1080, 1440
    img = Image.new("RGB", (Wd * S, Hd * S), C["BG"]); d = ImageDraw.Draw(img)
    text(d, "Bagu ke chehre", 540, 110, 68, WH, 900, maxw=1000)
    text(d, "Pause ki do lines ab muh banati hain", 540, 165, 34, C["GR"], 700, maxw=1000)
    names = ["ruko", "khush", "maza", "arre", "udaas", "ghabraya", "sachmein", "uljhan", "dil"]
    for n, name in enumerate(names):
        col, row = n % 3, n // 3
        cx, top = 180 + 360 * col, 220 + 400 * row
        bagu(img, d, cx, top + 160, 86, 0.3, FACES[name])
        a, b = LABELS[name]
        text(d, a, cx, top + 340, 40, C["OR"], 900, maxw=330)
        text(d, b, cx, top + 380, 26, C["GR"], 700, maxw=330)
    img.resize((Wd, Hd), Image.LANCZOS).save(out); print("sheet", out)


DEMO = ["ruko", "khush", "maza", "arre", "udaas", "ghabraya", "sachmein", "uljhan", "dil", "ruko"]


def demo_frame(t):
    img = Image.new("RGB", (720 * S, 1280 * S), C["BG"]); d = ImageDraw.Draw(img)
    f, i, mk = face_at(DEMO, t)
    blink = 0.0
    bt = t % 2.6
    if bt < .14 and f["cheek"] < .5 and f["heart"] < .5: blink = math.sin(bt / .14 * math.pi)
    sq = 0.0
    if mk is not None: sq = math.sin(clamp(mk) * math.pi) * .07
    bagu(img, d, 360, 600, 175, t, f, blink, sx=1 + sq, sy=1 - sq + .015 * math.sin(t * 4))
    name = DEMO[i]
    step = 1.43
    since = t - i * step + (0 if mk is None or i == 0 else 0)
    a, b = LABELS[name]
    text(d, a, 360, 1040, 80, C["OR"], 900)
    text(d, b, 360, 1110, 40, C["GR"], 700)
    text(d, "Bagu", 360, 150, 60, WH, 900)
    return img.resize((720, 1280), Image.LANCZOS)


def demo(out):
    dur = len(DEMO) * 1.43 + .6
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

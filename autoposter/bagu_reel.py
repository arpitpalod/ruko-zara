"""Daily "Bagu reacts" Reel from a JSON spec (one real, closed, OK-to-feature request). Same spec as gullak_reel.py.
python3 bagu_reel.py spec.json out.mp4   -> video + <out>_check.png (8 key frames)

Bagu's face follows the story: judging the request -> "Arre!" at the price -> nervous while the votes come in ->
Rehne de wins: happy, laughs as coins drop into the bag | Le le wins: sad, tears, coins fly out | tie: confused.
The straight pause bars (the logo) appear only on the end card, then turn into a smile."""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw
from mascots import W, H, FPS, S, C, R, text, pop, out_back, out_cubic, clamp, coins, confetti, paste_emoji, font
from bagu_face import FACES, mix, bagu

MORPH = .32


def face_track(track, t):
    """track = [(start_time, face_name), ...] sorted. Returns the blended face and a 0..1 'just changed' pulse."""
    cur = track[0][1]; prev = cur; t0 = track[0][0]
    for st, name in track:
        if t >= st: prev, cur, t0 = cur, name, st
    k = (t - t0) / MORPH
    if k < 1 and prev != cur:
        return mix(FACES[prev], FACES[cur], out_back(k, 1.2)), math.sin(clamp(k) * math.pi)
    return dict(FACES[cur]), 0.0


def coins_out(img, t, start, end, cx, slot_y, n=8):
    for i in range(n):
        t0 = start + (end - start) * i / n
        k = (t - t0) / .9
        if 0 <= k <= 1:
            x = cx + (i % 2 * 2 - 1) * 170 * k
            y = slot_y - 420 * out_cubic(k) + 260 * k * k
            paste_emoji(img, "🪙", x, y, 58, rot=200 * k)


def shadow(d, cx, y, w):
    d.ellipse(R(cx - w, y - w * .09, cx + w, y + w * .09), fill=(12, 10, 9))


def end_card(img, d, t):
    a = out_back(t / .5)
    f, pulse = face_track([(0, "ruko"), (1.1, "khush")], t)
    r = 110 * a
    if r > 2:
        shadow(d, 360, 400 + r * 1.42, r * .95)
        bagu(img, d, 360, 400, r, t, f, sx=1 + .06 * pulse, sy=1 - .06 * pulse)
    text(d, "Ruko Zara", 360, 700, 96, C["OR"], scale=pop(t, .2))
    text(d, "Khareedne se pehle", 360, 820, 54, C["WH"], 700, scale=pop(t, .4))
    text(d, "janta se pooch lo.", 360, 892, 54, C["WH"], 700, scale=pop(t, .4))
    text(d, "Free · link in bio", 360, 1030, 40, C["GR"], 600, scale=pop(t, .7))


def scene(spec, t):
    img = Image.new("RGB", (W * S, H * S), C["BG"]); d = ImageDraw.Draw(img)
    if t >= 18.2:
        end_card(img, d, t - 18.2); return img
    y, n = spec["votes_yes"], spec["votes_no"]
    mood = "tie" if y == n else ("save" if n > y else "spend")
    total = y + n
    pct = round(100 * max(y, n) / total) if total else 0
    r, cx, base = 135, 360, 820
    ground = base + r * 1.05  # where the feet stand
    enter = out_back(t / .8) if t < 1 else 1
    cy = 1550 - (1550 - base) * enter

    track = [(0, "sachmein"), (3.55, "arre"), (5.0, "sachmein"), (8.0, "ghabraya")]
    if mood == "save": track += [(10.4, "khush"), (11.0, "maza"), (14.2, "khush")]
    elif mood == "spend": track += [(10.4, "arre"), (10.9, "udaas")]
    else: track += [(10.4, "uljhan")]
    f, pulse = face_track(track, t)
    if 3.2 <= t < 8: f["look"] = (0, -1) if t >= 3.55 else f["look"]  # eyes on the request card
    sx, sy, dx = 1 + .07 * pulse, 1 - .07 * pulse + .015 * math.sin(t * 4), 0
    if 8 <= t < 10.4: dx = 5 * math.sin(t * 50)  # nervous jitter
    jump = 0
    if mood == "save" and t >= 10.4:
        j = max(0, math.sin((t - 10.4) * 7)) * (1 if t < 13 else .3)
        jump = 60 * j; sy += .06 * j
    if mood == "spend" and t >= 10.9: sy -= .04
    blink = 0.0
    bt = t % 3.1
    if bt < .14 and f["cheek"] < .5 and f["fill"] < .5: blink = math.sin(bt / .14 * math.pi)

    if mood == "save" and t >= 10.4: confetti(d, t, 10.5, stop=14.6)
    shadow(d, cx, ground + r * .36, r * (1 - .25 * clamp(jump / 60)))
    bagu(img, d, cx + dx, cy - jump, r, t, f, blink, sx, sy)
    top = cy - jump - r * 1.05
    if mood == "save": coins(img, t, 10.8, 13.6, cx, top + 30, from_y=470)
    if mood == "spend": coins_out(img, t, 10.9, 13.6, cx, top + 20)

    if t < 3.2:
        text(d, spec["intro"][0], 360, 250, 72, C["WH"], scale=pop(t, .4))
        text(d, spec["intro"][1], 360, 330, 46, C["OR"] if spec.get("hook") else C["GR"], 800, scale=pop(t, 1.2))
    elif t < 10.4:
        k = out_cubic((t - 3.2) / .5); y0 = -380 + 520 * k
        d.rounded_rectangle(R(56, y0, 664, y0 + 400), radius=40 * S, fill=C["CARD"])
        text(d, "AAJ KI ASLI REQUEST", 96, y0 + 66, 26, C["SUB"], 800, anchor="ls")
        lines = spec["title"]
        for i, ln in enumerate(lines):
            text(d, ln, 96, y0 + 132 + i * 64, 50, C["INK"], 900, anchor="ls", maxw=540)
        py = y0 + 132 + len(lines) * 64 + 12
        text(d, spec["price"], 96, py, 56, C["OR"], 900, anchor="ls", scale=pop(t, 3.55, .35) if t < 4 else 1)
        words, lines2, cur = spec["note"].split(), [], ""
        for w_ in words:  # wrap the note onto at most 2 lines instead of shrinking it
            tt = (cur + " " + w_).strip()
            if d.textlength(tt, font=font(700, 30)) > 540 * S and cur: lines2.append(cur); cur = w_
            else: cur = tt
        lines2.append(cur)
        for i, ln in enumerate(lines2[:2]):
            text(d, ln, 96, py + 58 + i * 38, 30, C["SUB"], 700, anchor="ls", maxw=540)
        if t >= 8:
            dots = "." * (1 + int((t - 8) * 3) % 3)
            text(d, "Janta ne kya kaha" + dots, 360, 1095, 54, C["WH"], scale=pop(t, 8))
    else:
        k = pop(t, 10.4)
        d.rounded_rectangle(R(56, 140, 664, 140 + max(2, 330 * min(k, 1.05))), radius=min(40, max(1, 165 * min(k, 1))) * S,
                            fill=C["CARD"])
        if t >= 10.85:
            text(d, "JANTA NE KAHA", 360, 210, 28, C["SUB"], 800)
            shown = round(pct * out_cubic((t - 10.85) / 1.0))
            if mood == "tie":
                text(d, f"Tie! {y} vs {n}", 360, 320, 84, C["OR"], 900)
            else:
                lab, col = ("Rehne de", C["GREEN"]) if mood == "save" else ("Le le", C["RED"])
                text(d, f"{shown}% {lab}", 360, 320, 84, col, 900)
            text(d, f"{total} votes · asli request", 360, 400, 32, C["SUB"], 700)
        if 11 <= t < 15 and mood != "tie":
            sign, col = ("+", C["GOLD"]) if mood == "save" else ("-", C["RED"])
            text(d, sign + spec["coins_label"], 360, 560, 56, col, 900, scale=pop(t, 11.2))
        if t >= 15:
            text(d, spec["closing"][0], 360, 1085, 66, C["OR"], scale=pop(t, 15))
            text(d, spec["closing"][1], 360, 1150, 42, C["WH"], 700, scale=pop(t, 15.5))
    return img


CHECK_TS = [1.5, 3.9, 6.5, 9.2, 11.6, 13.0, 16.2, 20.0]


def render(spec, out, dur=21.5):
    frame = lambda t: scene(spec, t).resize((W, H), Image.LANCZOS)
    sheet = Image.new("RGB", (244 * 4 - 4, 431 * 2 - 4))
    for i, x in enumerate(CHECK_TS):
        sheet.paste(frame(x).resize((240, 427), Image.LANCZOS), ((i % 4) * 244, (i // 4) * 431))
    sheet.save(out.replace(".mp4", "_check.png"))
    tmp = out.replace(".mp4", ".tmp.mp4")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                          "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                          "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", tmp], stdin=subprocess.PIPE)
    for i in range(int(dur * FPS)):
        p.stdin.write(frame(i / FPS).tobytes())
    p.stdin.close()
    if p.wait() == 0: os.replace(tmp, out); print("rendered", out)


if __name__ == "__main__":
    if sys.argv[1] == "check":
        spec = json.load(open(sys.argv[2])); out = sys.argv[3]
        sheet = Image.new("RGB", (244 * 4 - 4, 431 * 2 - 4))
        for i, x in enumerate(CHECK_TS):
            sheet.paste(scene(spec, x).resize((240, 427), Image.LANCZOS), ((i % 4) * 244, (i // 4) * 431))
        sheet.save(out); print("check", out)
    else:
        render(json.load(open(sys.argv[1])), sys.argv[2])

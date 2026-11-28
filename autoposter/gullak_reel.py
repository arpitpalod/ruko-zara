"""Daily "Gullak reacts" Reel from a JSON spec (one real, closed, OK-to-feature request).
python3 gullak_reel.py spec.json out.mp4   -> video + <out>_check.png (6 key frames)

spec = {
  "intro": ["Ye hai Gullak.", "Har kharche pe iski nazar hai."],   # or a 2-line hook about the request
  "title": ["Living room ke liye", "Vastu painting"],                # 1-2 lines
  "price": "₹3,000",
  "note": "“Dekhte hi pasand aa gayi.”",                    # from the request's own words
  "votes_yes": 5, "votes_no": 10,
  "coins_label": "₹3,000",                                          # what goes in (Rehne de) or out (Le le)
  "closing": ["₹3,000 bache.", "Plan B: ₹500 ka print."]            # line 1 big orange, line 2 white
}
Mood follows the votes: more "no" = Rehne de = Gullak celebrates and coins drop in;
more "yes" = Le le = Gullak is sad and coins fly out; equal = tie = Gullak is confused."""
import json, math, os, subprocess, sys
from PIL import Image, ImageDraw
from mascots import (W, H, FPS, S, C, R, text, pop, out_back, out_cubic, gullak, coins, confetti,
                     paste_emoji, end_card)


def tears(d, cx, gy, r, t):
    for sgn in (-1, 1):
        for k in range(2):
            ph = ((t * 1.4) + k * .5) % 1
            x = cx + sgn * r * .32 + sgn * r * .05
            y = gy - r * .05 + ph * r * .55
            d.ellipse(R(x - r * .04, y - r * .06, x + r * .04, y + r * .06), fill=(110, 180, 255))


def coins_out(img, t, start, end, cx, slot_y, n=8):
    for i in range(n):
        t0 = start + (end - start) * i / n
        k = (t - t0) / .9
        if 0 <= k <= 1:
            x = cx + (i % 2 * 2 - 1) * 160 * k
            y = slot_y - 520 * out_cubic(k) + 200 * k * k
            paste_emoji(img, "🪙", x, y, 60, rot=200 * k)


def scene(spec, t):
    img = Image.new("RGB", (W * S, H * S), C["BG"]); d = ImageDraw.Draw(img)
    if t >= 18.2:
        end_card(img, d, t - 18.2, "gullak"); return img
    y, n = spec["votes_yes"], spec["votes_no"]
    mood = "tie" if y == n else ("save" if n > y else "spend")
    total = y + n
    pct = round(100 * max(y, n) / total) if total else 0
    blink = (t % 3.1) < .12
    enter = out_back(t / .8) if t < 1 else 1
    gy = 1500 - (1500 - 820) * enter
    expr, look, shake, sx, sy = "neutral", (0, 0), 0, 1, 1 + .03 * math.sin(t * 5)
    if 3.2 <= t < 8: expr, look, shake = "nervous", (.4, -1), (0.4 if t > 4.2 else 0)
    if 8 <= t < 10.4: expr, blink, shake = "nervous", True, 1.0
    if t >= 10.4:
        if mood == "save":
            j = max(0, math.sin((t - 10.4) * 7)) * (1 if t < 13 else .3)
            expr, gy, sx, sy = "happy", gy - 60 * j, 1 + .06 * (1 - j), 1 - .05 * (1 - j) + .06 * j
        elif mood == "spend":
            expr, shake, sy = "sad", (.3 if t < 13 else 0), .96 + .02 * math.sin(t * 3)
        else:
            expr, look = "wow", ((-1 if int(t * 2) % 2 else 1), 0)
    if mood == "save" and t >= 10.4: confetti(d, t, 10.5, stop=14.6)
    if mood == "save": coins(img, t, 10.8, 13.6, 360, gy - 170, from_y=500)
    if mood == "spend": coins_out(img, t, 10.9, 13.6, 360, gy - 170)
    gullak(img, d, 360, gy, 165, t, expr, look, blink, sx, sy, shake)
    if mood == "spend" and t >= 10.4: tears(d, 360, gy, 165, t)
    if mood == "tie" and t >= 10.6:
        for i, x in enumerate((200, 520)):
            text(d, "?", x, gy - 150 + 10 * math.sin(t * 5 + i), 96, C["GOLD"], 900, scale=pop(t, 10.6 + i * .3))
    if 4.2 <= t < 10.4: paste_emoji(img, "💦", 520, gy - 170 + 8 * math.sin(t * 9), 54)

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
        text(d, spec["price"], 96, py, 56, C["OR"], 900, anchor="ls")
        from mascots import font
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
            text(d, "Janta ne kya kaha" + dots, 360, 1180, 54, C["WH"], scale=pop(t, 8))
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
            text(d, sign + spec["coins_label"], 150, gy - 200, 52, col, 900, scale=pop(t, 11.2))
        if t >= 15:
            text(d, spec["closing"][0], 360, 1130, 76, C["OR"], scale=pop(t, 15))
            text(d, spec["closing"][1], 360, 1205, 44, C["WH"], 700, scale=pop(t, 15.5))
    return img


def render(spec, out, dur=21.5):
    frame = lambda t: scene(spec, t).resize((W, H), Image.LANCZOS)
    ts = [2, 5.5, 9, 12.3, 16, 19.5]
    sheet = Image.new("RGB", (244 * len(ts) - 4, 427))
    for i, x in enumerate(ts): sheet.paste(frame(x).resize((240, 427), Image.LANCZOS), (i * 244, 0))
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
    render(json.load(open(sys.argv[1])), sys.argv[2])

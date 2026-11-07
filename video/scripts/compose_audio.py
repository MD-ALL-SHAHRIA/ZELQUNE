"""Composes the promo's original music and SFX, synced to the scene grid in src/video.config.ts.

    python3 scripts/compose_audio.py   ->  assets/music.mp3 + the SFX library in assets/sfx/

120 BPM in D major, cinematic: sub drone, cold glass and lone piano notes under the intro cuts, a
reverse swell into the reveal, then felt piano + string ensemble with a half-time heartbeat kick
that the pads breathe around; solo piano on the services title; a rolled final chord over the hold.
Everything is synthesised here, so the audio is original and free to use.
"""
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 44100
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(7)

# Scene starts (in beats) and total length, read from the single source of truth.
cfg = (ROOT / 'src/video.config.ts').read_text()
SC = {m[0]: int(m[1]) for m in re.findall(r'(\w+): \{ start: (\d+), length: \d+ \}', cfg)}
TOTAL = int(re.search(r'TOTAL_BEATS = (\d+)', cfg)[1])
N = int(TOTAL * BEAT * SR)


def t(sec):
    return np.arange(int(sec * SR)) / SR


def at(beat):
    return int(beat * BEAT * SR)


def add(buf, sig, beat, gain=1.0):
    i = at(beat)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i] * gain


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, 'low', fs=SR, output='sos'), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)


def note(n):
    """MIDI note -> Hz."""
    return 440 * 2 ** ((n - 69) / 12)


def env(n, a, r):
    """Attack/release envelope over n samples (seconds)."""
    e = np.ones(n)
    ai, ri = max(1, int(a * SR)), max(1, int(r * SR))
    e[:ai] = np.linspace(0, 1, ai) ** 2
    e[-ri:] *= np.linspace(1, 0, ri) ** 2
    return e


def reverb(x, secs=2.2, mix=0.3):
    ir = rng.standard_normal(int(secs * SR)) * np.exp(-np.linspace(0, 6, int(secs * SR)))
    ir = lp(ir, 6000)
    wet = fftconvolve(x, ir)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return x * (1 - mix) + wet * mix * np.max(np.abs(x))


# ---- instruments -----------------------------------------------------------------------------

def stereo_reverb(x, secs=3.2, predelay=0.03, damp=5000):
    """Decorrelated L/R tails with pre-delay: wide, soft space."""
    out = []
    for seed in (11, 23):
        r = np.random.default_rng(seed)
        n = int(secs * SR)
        ir = r.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
        ir = lp(ir, damp)
        ir = np.concatenate([np.zeros(int(predelay * SR)), ir])
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(fftconvolve(x, ir)[: len(x)])
    return np.stack(out, axis=1)


def piano(n, vel=0.7, secs=4.0):
    """Felt piano: slightly inharmonic partials, two detuned strings, soft hammer."""
    tt = t(secs)
    f0 = note(n)
    s = np.zeros_like(tt)
    for k in range(1, 9):
        fk = f0 * k * np.sqrt(1 + 0.00035 * k * k)
        if fk > 9000:
            break
        a = (1 / k ** 1.4) * (vel ** (0.6 + 0.25 * k))
        d = np.exp(-tt * (0.55 + 0.45 * k) * (f0 / 260) ** 0.35)
        for det in (-0.6, 0.6):  # cents
            s += a * d * np.sin(2 * np.pi * fk * 2 ** (det / 1200) * tt + rng.uniform(0, 6.28))
    hammer = lp(rng.standard_normal(len(tt)), 1800) * np.exp(-tt * 90) * 0.08 * vel
    s = lp(s + hammer, 2200 + 2500 * vel)
    return s * env(len(tt), 0.004, 0.4) * vel * 0.22


def strings(notes, secs, bright=2600):
    """Ensemble pad: many slowly drifting detuned sines, slow attack."""
    tt = t(secs)
    s = np.zeros_like(tt)
    for n in notes:
        f = note(n)
        for v in range(6):
            cents = rng.uniform(-7, 7)
            vib = 1 + 0.0012 * np.sin(2 * np.pi * rng.uniform(4.2, 5.6) * tt + rng.uniform(0, 6.28))
            ph = 2 * np.pi * np.cumsum(f * 2 ** (cents / 1200) * vib) / SR
            s += np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    s = lp(s / (len(notes) * 6), bright)
    return s * env(len(tt), min(1.6, secs * 0.4), min(1.8, secs * 0.45))


def kick(gain=1.0):
    """Soft, deep heartbeat kick (no click)."""
    tt = t(0.9)
    f = 42 + 38 * np.exp(-tt * 18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4.5)
    return lp(s, 160) * env(len(tt), 0.004, 0.2) * gain


def hat(gain=0.03):
    tt = t(0.12)
    return bp(rng.standard_normal(len(tt)), 7000, 14000) * np.exp(-tt * 45) * gain


def boom(gain=1.0):
    """Cinematic low impact with a soft body and long tail."""
    tt = t(4.5)
    f = 34 + 30 * np.exp(-tt * 3)
    low = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 0.9)
    body = lp(rng.standard_normal(len(tt)), 400) * np.exp(-tt * 2.2) * 0.5
    return (low + body) * env(len(tt), 0.006, 1.0) * gain


def reverse_swell(secs, gain=0.5, bright=5000):
    """Reverse-reverb style swell that sucks into the next hit."""
    tt = t(secs)
    k = tt / secs
    nz = rng.standard_normal(len(tt))
    s = (lp(nz, 400) * (1 - k) + lp(nz, bright) * k) * k ** 3
    tone = sum(np.sin(2 * np.pi * note(m) * tt) for m in (62, 69, 74)) / 3 * k ** 4 * 0.6
    return (s * 0.6 + tone) * gain


def shimmer(secs, gain=0.06):
    """Cold, glassy high partials for the intro."""
    tt = t(secs)
    s = sum(np.sin(2 * np.pi * note(m) * tt + 0.3 * np.sin(2 * np.pi * 0.17 * tt * (i + 1))) for i, m in enumerate((81, 86, 88)))
    return s / 3 * env(len(tt), 2.0, 2.0) * gain


# ---- arrangement -----------------------------------------------------------------------------

dry = np.zeros(N)      # piano, strings, fx (gets the big reverb)
drums = np.zeros(N)    # kick + hats (light reverb)
duck = np.ones(N)      # sidechain-style pumping on pads
pads = np.zeros(N)

reveal, services, design, proof, cta = SC['reveal'], SC['services'], SC['design'], SC['proof'], SC['cta']
end_beat = cta + 8

# Intro (warm): strings swell from silence as the arch of light draws; a rolled piano chord as the
# panel switches on; a rising piano note on each word (Handcrafted. Warm. Yours.); the strings
# bloom as the arch opens into the room.
intro_len = reveal * BEAT + 2
tt = t(intro_len)
add(dry, np.sin(2 * np.pi * note(38) * tt) * env(len(tt), 2.0, 2.0) * 0.18, 0)
add(pads, strings([50, 57, 62, 66, 69], SC['problem'] * BEAT + 1.5, 1600), 0, 0.42)
add(pads, strings([47, 54, 59, 62, 66], (reveal - SC['problem']) * BEAT + 1.5, 2400), SC['problem'], 0.48)
for k, n in enumerate((50, 57, 62, 66, 69, 74)):
    add(dry, piano(n, 0.42, 4.0), 1.4 + k * 0.09)
for b, n in ((SC['problem'], 78), (SC['problem'] + 2, 81), (SC['problem'] + 4, 86)):
    add(dry, piano(n, 0.55, 3.5), b)
    add(dry, piano(n - 12, 0.4, 3.5), b + 0.02)
add(dry, shimmer(4 * BEAT, 0.05), SC['problem'] + 6)

# Harmony: Dmaj9 · Bm9 · Gmaj7 · Asus, one chord per bar.
prog = [
    dict(pad=[50, 57, 61, 64, 66], bass=38, arp=[62, 66, 69, 73, 76, 73, 69, 66]),
    dict(pad=[47, 54, 57, 61, 62], bass=35, arp=[59, 62, 66, 69, 73, 69, 66, 62]),
    dict(pad=[43, 50, 54, 57, 62], bass=31, arp=[55, 59, 62, 66, 69, 66, 62, 59]),
    dict(pad=[45, 52, 57, 59, 64], bass=33, arp=[57, 62, 64, 69, 71, 69, 64, 62]),
]
# A simple top-line motif that enters with the feature beats (beat offset within the bar, note).
motif = [[(0, 78), (1.5, 76), (2, 73)], [(0, 74), (1.5, 73), (2, 69)], [(0, 71), (1.5, 73), (2, 74)], [(0, 76), (2, 69)]]

def section(b):
    if b < SC['find']:
        return 'reveal'
    if services <= b < design:
        return 'break'
    if b >= end_beat:
        return 'end'
    if b >= proof:
        return 'peak'
    return 'feature'

for bar in range(reveal, TOTAL, 4):
    i = ((bar - reveal) // 4) % 4
    c = prog[i]
    sec = section(bar)
    if sec == 'end':
        # Final rolled Dmaj9 with strings, ringing out over the hold.
        ring = (TOTAL - bar) * BEAT + 1
        add(pads, strings(prog[0]['pad'], ring), bar, 0.5)
        for k, n in enumerate([38, 50, 57, 62, 66, 69, 76]):
            add(dry, piano(n, 0.55, ring), bar + k * 0.12)
        break
    pad_gain = {'reveal': 0.45, 'feature': 0.5, 'break': 0.32, 'peak': 0.62}[sec]
    add(pads, strings(c['pad'], 4 * BEAT + 1.6), bar, pad_gain)
    add(pads, strings([c['bass']], 4 * BEAT + 0.8, 500), bar, 0.55 if sec != 'break' else 0.25)
    # Piano: eighth-note broken chord (human timing and velocity).
    for k, n in enumerate(c['arp']):
        if sec == 'break' and k % 2:
            continue
        vel = 0.42 + 0.12 * (k % 4 == 0) + rng.uniform(-0.05, 0.05) + (0.08 if sec == 'peak' else 0)
        add(dry, piano(n, vel, 2.5), bar + k * 0.5 + rng.uniform(-0.012, 0.012))
    if sec in ('feature', 'peak'):
        for off, n in motif[i]:
            add(dry, piano(n, 0.62 if sec == 'feature' else 0.7, 3.0), bar + off)
    # Heartbeat kick on 1 and 3, pads breathe around it; hats only when the story moves fastest.
    if sec in ('feature', 'peak'):
        for k in (0, 2):
            add(drums, kick(0.9 if sec == 'peak' else 0.75), bar + k)
            d0 = at(bar + k)
            m = min(N - d0, int(0.45 * SR))
            if m > 0:
                duck[d0:d0 + m] *= 1 - 0.32 * np.exp(-np.arange(m) / SR * 7)
        if sec == 'peak' or SC['reserve'] <= bar < services:
            for k in range(8):
                add(drums, hat(0.035 if k % 2 else 0.02), bar + k * 0.5 + 0.25)


# ---- mix --------------------------------------------------------------------------------------

pads *= duck
music = dry + pads
wet = stereo_reverb(music, 3.4, 0.035, 4500)
dwet = stereo_reverb(drums, 0.9, 0.01, 3000)
mono = np.stack([music, music], axis=1)
dmono = np.stack([drums, drums], axis=1)
stereo = mono * 0.62 + wet * 0.55 * np.max(np.abs(mono)) / (np.max(np.abs(wet)) + 1e-9) + dmono * 0.9 + dwet * 0.12
stereo = np.stack([hp(stereo[:, 0], 25), hp(stereo[:, 1], 25)], axis=1)
# Gentle glue: very light saturation, then peak-normalise to -1 dBFS.
stereo = np.tanh(stereo / np.max(np.abs(stereo)) * 1.15) / np.tanh(1.15)
fade = np.ones(N)
fi, fo = int(0.03 * SR), int(3.5 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fade[-fo:] = np.linspace(1, 0, fo) ** 2
stereo *= fade[:, None]
stereo /= np.max(np.abs(stereo)) / 0.89


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    ch = 1 if pcm.ndim == 1 else pcm.shape[1]
    subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', str(ch), '-i', '-',
         '-codec:a', 'libmp3lame', '-b:a', '256k', str(path)],
        input=pcm.tobytes(), check=True,
    )


write(ROOT / 'assets/music.mp3', stereo)

# ---- SFX library (impacts and risers live here, so they follow the picture) ------------------

SFX = ROOT / 'assets/sfx'


def norm(x, peak=0.8):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def keystroke(seed):
    """Soft mechanical key: low 'thock' body, a bright plastic tick, and a quieter release click."""
    r = np.random.default_rng(100 + seed)
    tt = t(0.16)
    body_f = r.uniform(170, 260)
    body = np.sin(2 * np.pi * body_f * tt) * np.exp(-tt * r.uniform(55, 75)) * 0.9
    res = np.sin(2 * np.pi * r.uniform(1400, 2300) * tt) * np.exp(-tt * r.uniform(120, 180)) * 0.25
    tick = bp(r.standard_normal(len(tt)), r.uniform(2500, 3500), r.uniform(7000, 9500)) * np.exp(-tt * r.uniform(260, 340)) * 0.8
    down = body + res + tick
    rel = np.zeros_like(tt)
    off = int(r.uniform(0.055, 0.075) * SR)
    m = len(tt) - off
    rel[off:] = bp(r.standard_normal(m), 3000, 8000) * np.exp(-tt[:m] * 380) * 0.25
    return norm(lp(down + rel, 9000), r.uniform(0.6, 0.75))


def mouse_click():
    tt = t(0.07)
    a = bp(rng.standard_normal(len(tt)), 2000, 6000) * np.exp(-tt * 600)
    b = np.zeros_like(tt)
    o = int(0.018 * SR)
    b[o:] = bp(rng.standard_normal(len(tt) - o), 1500, 5000) * np.exp(-tt[: len(tt) - o] * 700) * 0.6
    body = np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 260) * 0.35
    return norm(a + b + body, 0.6)


def toggle():
    tt = t(0.12)
    s = np.sin(2 * np.pi * (1300 + 500 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 70)
    s += bp(rng.standard_normal(len(tt)), 3000, 9000) * np.exp(-tt * 500) * 0.4
    return norm(s, 0.5)


def pop():
    tt = t(0.18)
    f = 380 + 520 * np.exp(-tt * 45)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28) * env(len(tt), 0.002, 0.05)
    s += lp(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 300) * 0.12
    return norm(reverb(s, 0.5, 0.15), 0.55)


def tick_sfx():
    tt = t(0.05)
    s = np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt * 300) + bp(rng.standard_normal(len(tt)), 4000, 10000) * np.exp(-tt * 700) * 0.3
    return norm(s, 0.45)


def bell(freqs, secs, decay=2.5):
    tt = t(secs)
    s = np.zeros_like(tt)
    for i, f in enumerate(freqs):
        for ratio, amp, d in ((1, 1, 1), (2.756, 0.35, 1.8), (5.404, 0.15, 3.2), (8.933, 0.06, 5)):
            s += np.sin(2 * np.pi * f * ratio * tt) * amp * np.exp(-tt * decay * d) * (0.9 ** i)
    return s * env(len(tt), 0.002, 0.3)


def chime():
    a = bell([note(86)], 1.6, 2.2)
    b = np.zeros_like(a)
    o = int(0.09 * SR)
    b[o:] = bell([note(93)], 1.6, 2.2)[: len(a) - o] * 0.8
    return norm(reverb(a + b, 1.6, 0.3), 0.55)


def shimmer_sfx():
    secs = 2.0
    out = np.zeros(int(secs * SR))
    for k, n in enumerate((86, 90, 93, 98, 102)):
        b = bell([note(n)], secs, 3.0) * (0.8 - k * 0.1)
        o = int(k * 0.06 * SR)
        out[o:] += b[: len(out) - o]
    air = bp(rng.standard_normal(len(out)), 6000, 14000) * np.sin(np.pi * np.linspace(0, 1, len(out))) ** 2 * 0.15
    return norm(reverb(out + air, 2.0, 0.4), 0.45)


def whoosh(seed, secs=0.75):
    r = np.random.default_rng(300 + seed)
    tt = t(secs)
    k = tt / secs
    nz = r.standard_normal(len(tt))
    lo, hi = r.uniform(500, 800), r.uniform(3500, 6000)
    s = (lp(nz, lo) * (1 - k) + bp(nz, 900, hi) * k) * np.sin(np.pi * k ** r.uniform(0.7, 1.2)) ** 2.4
    return norm(reverb(s, 1.0, 0.3), 0.5)


def riser_sfx(secs):
    """Builds over exactly `secs` and stops dead on the hit."""
    tt = t(secs)
    k = tt / secs
    nz = rng.standard_normal(len(tt))
    noise = (lp(nz, 500) * (1 - k) + bp(nz, 1500, 9000) * k) * k ** 2.6
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (2.5 * k)) / SR) * k ** 3 * 0.5
    shim = sum(np.sin(2 * np.pi * note(m) * tt) for m in (74, 81, 86)) / 3 * k ** 4 * 0.35
    s = noise + tone + shim
    s[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return norm(s, 0.6)


def impact_sfx():
    tt = t(4.0)
    f = 36 + 50 * np.exp(-tt * 9)
    low = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.3)
    thump = lp(rng.standard_normal(len(tt)), 300) * np.exp(-tt * 14) * 0.8
    air = bp(rng.standard_normal(len(tt)), 2000, 9000) * np.exp(-tt * 9) * 0.12
    s = (low + thump + air) * env(len(tt), 0.003, 1.2)
    return norm(reverb(s, 3.0, 0.3), 0.85)


for i in range(8):
    write(SFX / f'key-{i + 1}.mp3', keystroke(i))
write(SFX / 'click.mp3', mouse_click())
write(SFX / 'toggle.mp3', toggle())
write(SFX / 'pop.mp3', pop())
write(SFX / 'tick.mp3', tick_sfx())
write(SFX / 'chime.mp3', chime())
write(SFX / 'shimmer.mp3', shimmer_sfx())
for i in range(3):
    write(SFX / f'whoosh-{i + 1}.mp3', whoosh(i))
write(SFX / 'riser.mp3', riser_sfx(4 * BEAT))
write(SFX / 'impact.mp3', impact_sfx())
for old in ('whoosh.mp3',):
    (SFX / old).unlink(missing_ok=True)
print('wrote assets/music.mp3 and', len(list(SFX.glob('*.mp3'))), 'SFX', f'({TOTAL * BEAT:.1f} s)')

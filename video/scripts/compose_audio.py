"""Composes the promo's original music and SFX, synced to the scene grid in src/video.config.ts.

    python3 scripts/compose_audio.py   ->  assets/music.mp3, assets/sfx/whoosh.mp3, assets/sfx/click.mp3

120 BPM in D major. Cold drone with hits on the intro cuts, a riser into the reveal, then a warm
pad + soft groove; a breakdown on the services title; the last chord rings out over the end hold.
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

def pad(notes, secs, bright=1800):
    tt = t(secs)
    s = np.zeros_like(tt)
    for n in notes:
        for d in (-0.08, 0.0, 0.07):  # detuned saws
            f = note(n + d)
            s += 2 * ((tt * f) % 1) - 1
    s = lp(s / (len(notes) * 3), bright, 2)
    return s * env(len(tt), secs * 0.35, secs * 0.4)


def kick(gain=1.0):
    tt = t(0.45)
    f = 45 + 80 * np.exp(-tt * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)
    click = hp(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 300) * 0.15
    return (s + click) * gain


def impact(gain=1.0):
    tt = t(2.8)
    f = 38 + 60 * np.exp(-tt * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.6)
    air = lp(rng.standard_normal(len(tt)), 1200) * np.exp(-tt * 3) * 0.35
    return reverb((boom + air) * gain, 2.5, 0.35)


def shaker(gain=0.12):
    tt = t(0.09)
    return bp(rng.standard_normal(len(tt)), 6000, 12000) * np.exp(-tt * 60) * gain


def rim(gain=0.18):
    tt = t(0.25)
    body = np.sin(2 * np.pi * 820 * tt) * np.exp(-tt * 40)
    snap = bp(rng.standard_normal(len(tt)), 1500, 6000) * np.exp(-tt * 35)
    return (body * 0.5 + snap) * gain


def pluck(n, secs=0.6, gain=0.18):
    tt = t(secs)
    f = note(n)
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt))
    return lp(s, 3500) * np.exp(-tt * 6) * env(len(tt), 0.003, 0.05) * gain


def sub(n, secs, gain=0.35):
    tt = t(secs)
    return np.sin(2 * np.pi * note(n) * tt) * env(len(tt), 0.02, 0.15) * gain


def riser(secs, gain=0.35):
    tt = t(secs)
    k = tt / secs
    noise = rng.standard_normal(len(tt))
    # Sweep the noise brighter by blending progressively higher-passed copies.
    s = lp(noise, 600) * (1 - k) + bp(noise, 1500, 9000) * k
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * k ** 2) / SR) * 0.25
    return (s + tone) * k ** 2.2 * gain


# ---- arrangement -----------------------------------------------------------------------------

L = np.zeros(N)
music_start = SC['reveal']
services, design, cta = SC['services'], SC['design'], SC['cta']
end_groove = cta + 8

# Intro: cold drone (D2 + A2), slowly opening filter.
drone_len = music_start * BEAT + 1.5
tt = t(drone_len)
dr = (np.sin(2 * np.pi * note(38) * tt) + 0.6 * np.sin(2 * np.pi * note(45) * tt) + 0.3 * np.sin(2 * np.pi * note(50) * tt * 1.003))
air = lp(rng.standard_normal(len(tt)), 900) * 0.25
dr = (dr * 0.22 + air) * env(len(tt), 1.2, 1.5)
add(L, reverb(dr, 3, 0.4), 0, 0.55)

# Hits on the hook and on each cold cut (problem shots are two beats apart).
for b, g in ((0, 0.7), (SC['problem'], 0.8), (SC['problem'] + 2, 0.8), (SC['problem'] + 4, 0.9)):
    add(L, impact(g), b)
# Heartbeat pulse under the hook.
for b in (2, 3, 4, 5):
    add(L, kick(0.35 if b % 2 else 0.25), b)
# Riser into the light coming on / the reveal.
add(L, riser(4 * BEAT), music_start - 4)
add(L, impact(1.0), music_start)

# Chords: Dmaj9 · Bm9 · Gmaj7 · A6sus, one per bar (4 beats).
chords = [
    ([50, 57, 61, 64, 66], 38), ([47, 54, 57, 61, 62], 35),
    ([43, 50, 54, 57, 62], 31), ([45, 52, 57, 59, 62], 33),
]
groove_on = lambda b: (music_start + 2 <= b < services) or (design <= b < end_groove)

for bar_start in range(music_start, TOTAL, 4):
    chord, root = chords[((bar_start - music_start) // 4) % 4]
    final = bar_start >= end_groove
    secs = (TOTAL - bar_start) * BEAT if final else 4 * BEAT + 0.6
    add(L, pad(chord, secs, 2600 if not final else 1800), bar_start, 0.32)
    if final:
        break
    add(L, sub(root, 4 * BEAT - 0.05), bar_start, 0.3 if groove_on(bar_start) else 0.12)
    for k in range(4):
        b = bar_start + k
        if groove_on(b):
            add(L, kick(0.55), b)
            add(L, shaker(), b + 0.5)
            add(L, shaker(0.07), b + 0.25)
            add(L, shaker(0.07), b + 0.75)
            if k in (1, 3):
                add(L, rim(), b)
        # Arpeggio in eighths over the chord.
        if b >= music_start + 4:
            for e, ci in enumerate((1, 3, 2, 4)):
                if e % 2 == 0 or groove_on(b):
                    add(L, pluck(chord[ci] + 12), b + e * 0.25, 0.9)

# Services title: breakdown (no drums) with a riser back in.
add(L, riser(2 * BEAT, 0.22), design - 2)
add(L, impact(0.7), design)
add(L, impact(0.6), cta)

# Wide, warm, glued.
L = reverb(L, 1.8, 0.18)
L = hp(L, 28)
L = np.tanh(L * 1.6) / np.tanh(1.6)
fade = np.ones(N)
fi, fo = int(0.05 * SR), int(3.0 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade
L /= np.max(np.abs(L)) / 0.89

# Gentle stereo: a few ms of delay on one side.
R = np.concatenate([np.zeros(int(0.011 * SR)), L])[:N]
stereo = np.stack([L * 0.97 + R * 0.03, R * 0.97 + L * 0.03], axis=1)


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

# Whoosh: a band-passed noise swell (0.7 s).
tt = t(0.7)
k = tt / 0.7
wn = rng.standard_normal(len(tt))
wh = (lp(wn, 900) * (1 - k) + bp(wn, 1200, 7000) * k) * np.sin(np.pi * k) ** 2
write(ROOT / 'assets/sfx/whoosh.mp3', reverb(wh / np.max(np.abs(wh)) * 0.8, 0.8, 0.25))

# Click: a soft, short trackpad tick.
tt = t(0.08)
ck = np.sin(2 * np.pi * 2200 * tt) * np.exp(-tt * 180) + hp(rng.standard_normal(len(tt)), 4000) * np.exp(-tt * 400) * 0.4
write(ROOT / 'assets/sfx/click.mp3', ck / np.max(np.abs(ck)) * 0.7)
print('wrote assets/music.mp3, assets/sfx/whoosh.mp3, assets/sfx/click.mp3', f'({TOTAL * BEAT:.1f} s)')

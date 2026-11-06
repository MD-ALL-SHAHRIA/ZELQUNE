"""Composes the promo's original music and SFX, synced to the scene grid in src/video.config.ts.

    python3 scripts/compose_audio.py   ->  assets/music.mp3, assets/sfx/whoosh.mp3, assets/sfx/click.mp3

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

# Intro: sub drone + cold glass shimmer; booms on the hook and every cold cut.
intro_len = reveal * BEAT + 2
tt = t(intro_len)
sub_drone = np.sin(2 * np.pi * note(26) * tt) * env(len(tt), 1.5, 2.0) * 0.35
add(dry, sub_drone, 0)
add(dry, shimmer(intro_len), 0, 1.0)
for b, g in ((0, 0.8), (SC['problem'], 0.75), (SC['problem'] + 2, 0.8), (SC['problem'] + 4, 0.9)):
    add(dry, boom(g), b)
# A lonely piano note answers each cut (cold, high, quiet).
for b, n in ((0.5, 74), (SC['problem'] + 0.5, 73), (SC['problem'] + 2.5, 71), (SC['problem'] + 4.5, 69)):
    add(dry, piano(n, 0.35, 3.5), b)
# The light comes on: swell into the reveal.
add(dry, reverse_swell(4 * BEAT, 0.55), reveal - 4)
add(dry, boom(1.0), reveal)

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
        add(dry, boom(0.6), bar)
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

# Transitions into the services title, the first service, and the ending.
add(dry, reverse_swell(2 * BEAT, 0.35, 3000), services - 2)
add(dry, boom(0.55), services)
add(dry, reverse_swell(2 * BEAT, 0.4), design - 2)
add(dry, boom(0.7), design)
add(dry, reverse_swell(4 * BEAT, 0.45), cta - 4)
add(dry, boom(0.8), cta)

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

# Whoosh: a band-passed noise swell (0.7 s).
tt = t(0.7)
k = tt / 0.7
wn = rng.standard_normal(len(tt))
wh = (lp(wn, 700) * (1 - k) + bp(wn, 900, 4500) * k) * np.sin(np.pi * k) ** 2.5
write(ROOT / 'assets/sfx/whoosh.mp3', reverb(wh / np.max(np.abs(wh)) * 0.6, 1.2, 0.35))

# Click: a soft, short trackpad tick.
tt = t(0.08)
ck = np.sin(2 * np.pi * 1600 * tt) * np.exp(-tt * 220) * 0.7 + lp(hp(rng.standard_normal(len(tt)), 2500), 7000) * np.exp(-tt * 500) * 0.3
write(ROOT / 'assets/sfx/click.mp3', ck / np.max(np.abs(ck)) * 0.7)
print('wrote assets/music.mp3, assets/sfx/whoosh.mp3, assets/sfx/click.mp3', f'({TOTAL * BEAT:.1f} s)')

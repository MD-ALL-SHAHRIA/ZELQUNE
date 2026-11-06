"""Detects the tempo and beat phase of assets/music.mp3 and checks the video's beat grid against it.

    python3 scripts/bpm.py
"""
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 22050
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(ROOT / 'assets/music.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype='<f4')

# Spectral-flux onset envelope.
hop, win = 512, 2048
frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop] * np.hanning(win)
mag = np.abs(np.fft.rfft(frames, axis=1))
flux = np.maximum(0, np.diff(np.log1p(mag), axis=0)).sum(axis=1)
flux -= np.convolve(flux, np.ones(16) / 16, mode='same')
flux = np.maximum(flux, 0)
fps = SR / hop

# Tempo: comb filter over 70–180 BPM (mean onset strength on the best-phase pulse train).
def comb(bpm):
    period = 60 / bpm * fps
    n = np.arange(int((len(flux) - 1) / period))
    best = 0
    for ph in np.linspace(0, period, 24, endpoint=False):
        idx = np.round(ph + n * period).astype(int)
        best = max(best, flux[idx].mean())
    return best

cands = np.arange(70, 180.5, 0.5)
scores = np.array([comb(b) for b in cands])
bpm = cands[np.argmax(scores)]

cfg = (ROOT / 'src/video.config.ts').read_text()
grid_bpm = int(re.search(r'export const BPM = (\d+)', cfg)[1])
start = int(re.search(r'reveal: \{ start: (\d+)', cfg)[1])

# Phase: energy of onsets on the config grid vs. half a beat off it (after the music enters).
beat_s = 60 / grid_bpm
def grid_energy(offset):
    ts = np.arange(start * beat_s + offset, len(x) / SR - 2, beat_s)
    return sum(flux[int(t * fps) - 1:int(t * fps) + 2].max() for t in ts)
on, off = grid_energy(0), grid_energy(beat_s / 4)

print(f'detected tempo: {bpm:.1f} BPM (video grid: {grid_bpm} BPM)')
print(f'onset energy on the grid: {on:.1f} vs a sixteenth off: {off:.1f} -> {"ALIGNED" if on > off * 1.2 else "CHECK ALIGNMENT"}')
print(f'logo impact frame {int(start * beat_s * 30)} = beat {start} = bar {start // 4 + 1} downbeat: {start % 4 == 0}')

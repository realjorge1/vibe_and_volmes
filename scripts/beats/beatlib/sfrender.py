"""Render sampled instruments from the GeneralUser GS SoundFont with FluidSynth.

Each part becomes a one-channel MIDI file rendered dry (no FluidSynth reverb
or chorus: the mixer adds its own space), cached by content hash."""
import hashlib
import json
import os
import subprocess

import mido
import numpy as np
import soundfile as sf

from .dsp import SR, secs

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(os.path.dirname(HERE), '.tools')
FLUID = os.path.join(TOOLS, 'fluidsynth', 'fluidsynth-v2.6.1-win10-x64-cpp11', 'bin', 'fluidsynth.exe')
SF2 = os.path.join(TOOLS, 'GeneralUser-GS.sf2')
CACHE = os.path.join(TOOLS, 'cache')
TPB = 960


def _midi(notes, bank: int, program: int, bpm: float, end_beats: float, drums: bool, cc: dict | None) -> mido.MidiFile:
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    ch = 9 if drums else 0
    tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=0))
    if not drums:
        tr.append(mido.Message('control_change', channel=ch, control=0, value=bank, time=0))
    tr.append(mido.Message('program_change', channel=ch, program=program, time=0))
    for ctl, val in (cc or {}).items():
        tr.append(mido.Message('control_change', channel=ch, control=int(ctl), value=int(val), time=0))
    events = []
    for nt in notes:
        on = max(0, int(round(nt.t * TPB)))
        off = max(on + 1, int(round((nt.t + nt.dur) * TPB)))
        events.append((on, 1, mido.Message('note_on', channel=ch, note=int(nt.pitch), velocity=int(max(1, min(127, nt.vel))))))
        events.append((off, 0, mido.Message('note_off', channel=ch, note=int(nt.pitch), velocity=0)))
    events.sort(key=lambda e: (e[0], e[1]))
    now = 0
    for tick, _, msg in events:
        msg.time = tick - now
        now = tick
        tr.append(msg)
    end_tick = int(round(end_beats * TPB))
    tr.append(mido.MetaMessage('end_of_track', time=max(0, end_tick - now)))
    return mid


def render(notes, bank: int, program: int, bpm: float, n: int, tail_s: float = 3.0, drums: bool = False,
           gain: float = 0.5, cc: dict | None = None) -> np.ndarray:
    """Stereo render of `notes` (beats) -> array of n + tail samples."""
    total = n + secs(tail_s)
    end_beats = total / SR * bpm / 60.0
    key = json.dumps([[round(x.t, 4), round(x.dur, 4), x.pitch, x.vel] for x in notes] +
                     [bank, program, bpm, total, drums, gain, cc or {}], sort_keys=True)
    h = hashlib.sha1(key.encode()).hexdigest()[:16]
    os.makedirs(CACHE, exist_ok=True)
    wav = os.path.join(CACHE, f'{h}.wav')
    if not os.path.exists(wav):
        mid = os.path.join(CACHE, f'{h}.mid')
        _midi(notes, bank, program, bpm, end_beats, drums, cc).save(mid)
        cmd = [FLUID, '-ni', '-q', '-g', str(gain), '-r', str(SR), '-R', '0', '-C', '0',
               '-o', 'synth.reverb.active=0', '-o', 'synth.chorus.active=0', '-o', 'synth.polyphony=256',
               '-F', wav, SF2, mid]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    x, sr = sf.read(wav, dtype='float64', always_2d=True)
    assert sr == SR, sr
    if len(x) < total:
        x = np.concatenate([x, np.zeros((total - len(x), 2))])
    return x[:total]

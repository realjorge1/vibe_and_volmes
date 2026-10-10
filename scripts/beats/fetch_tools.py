"""
Download the beat engine's tools into scripts/beats/.tools/ (git-ignored):
FluidSynth (Windows x64), the GeneralUser GS SoundFont and an ffmpeg build.

  py scripts/beats/fetch_tools.py

Python packages: py -m pip install numpy scipy mido soundfile pillow
"""
import io
import os
import urllib.request
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(HERE, '.tools')

FLUIDSYNTH = 'https://github.com/FluidSynth/fluidsynth/releases/download/v2.6.1/fluidsynth-v2.6.1-win10-x64-cpp11.zip'
SOUNDFONT = 'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2'
SOUNDFONT_LICENSE = 'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/documentation/LICENSE.txt'
FFMPEG = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.1-latest-win64-lgpl-shared-8.1.zip'


def fetch(url: str) -> bytes:
    print('downloading', url)
    req = urllib.request.Request(url, headers={'User-Agent': 'vibe-and-volumes-beat-tools'})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()


def main():
    os.makedirs(TOOLS, exist_ok=True)
    if not os.path.isdir(os.path.join(TOOLS, 'fluidsynth')):
        zipfile.ZipFile(io.BytesIO(fetch(FLUIDSYNTH))).extractall(os.path.join(TOOLS, 'fluidsynth'))
    sf2 = os.path.join(TOOLS, 'GeneralUser-GS.sf2')
    if not os.path.exists(sf2):
        open(sf2, 'wb').write(fetch(SOUNDFONT))
        open(os.path.join(TOOLS, 'GeneralUser-LICENSE.txt'), 'wb').write(fetch(SOUNDFONT_LICENSE))
    ff = os.path.join(TOOLS, 'ffmpeg')
    if not os.path.exists(os.path.join(ff, 'ffmpeg.exe')):
        os.makedirs(ff, exist_ok=True)
        z = zipfile.ZipFile(io.BytesIO(fetch(FFMPEG)))
        for name in z.namelist():
            if '/bin/' in name and not name.endswith('/'):
                open(os.path.join(ff, name.split('/')[-1]), 'wb').write(z.read(name))
    print('tools ready in', TOOLS)


if __name__ == '__main__':
    main()

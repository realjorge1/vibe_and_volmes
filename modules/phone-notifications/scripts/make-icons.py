"""Generate the status-bar icons (white vector drawables) for each phone app.

    py modules/phone-notifications/scripts/make-icons.py

Glyph outlines come straight from the icon fonts the app already ships
(Ionicons: MIT, Material Design Icons: Apache 2.0), fitted to a 24x24
viewport. The VibeGram lens is drawn by hand to match its home-screen icon.
Needs fonttools (`py -m pip install fonttools`).
"""
import json, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
FONTS = os.path.join(ROOT, 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons')
OUT = os.path.join(ROOT, 'modules', 'phone-notifications', 'android', 'src', 'main', 'res', 'drawable')

def glyph_path(font_name, glyph, pad=1.5):
    font = TTFont(os.path.join(FONTS, 'Fonts', f'{font_name}.ttf'))
    cmap = font.getBestCmap()
    code = json.load(open(os.path.join(FONTS, 'glyphmaps', f'{font_name}.json'), encoding='utf-8'))[glyph]
    gs = font.getGlyphSet()
    g = gs[cmap[code]]
    bp = BoundsPen(gs)
    g.draw(bp)
    x0, y0, x1, y1 = bp.bounds
    size = 24 - 2 * pad
    s = size / max(x1 - x0, y1 - y0)
    ox = pad + (size - (x1 - x0) * s) / 2
    oy = pad + (size - (y1 - y0) * s) / 2
    pen = SVGPathPen(gs, ntos=lambda v: ('%.3f' % v).rstrip('0').rstrip('.'))
    # Font units are y-up; the drawable is y-down.
    g.draw(TransformPen(pen, (s, 0, 0, -s, ox - x0 * s, oy + y1 * s)))
    return pen.getCommands()

def rrect(x0, y0, x1, y1, r):
    return (f'M{x0 + r},{y0} H{x1 - r} A{r},{r} 0 0 1 {x1},{y0 + r} V{y1 - r} A{r},{r} 0 0 1 {x1 - r},{y1} '
            f'H{x0 + r} A{r},{r} 0 0 1 {x0},{y1 - r} V{y0 + r} A{r},{r} 0 0 1 {x0 + r},{y0} Z')

def circle(cx, cy, r):
    return f'M{cx},{cy - r} A{r},{r} 0 1 1 {cx},{cy + r} A{r},{r} 0 1 1 {cx},{cy - r} Z'

def vector(path, even_odd=False):
    fill = ' android:fillType="evenOdd"' if even_odd else ''
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
            '    android:width="24dp" android:height="24dp"\n'
            '    android:viewportWidth="24" android:viewportHeight="24">\n'
            f'  <path android:fillColor="#FFFFFFFF"{fill}\n'
            f'      android:pathData="{path}" />\n'
            '</vector>\n')

lens = ' '.join([rrect(2, 2, 22, 22, 6), rrect(4.2, 4.2, 19.8, 19.8, 4.2), circle(12, 12, 5), circle(12, 12, 3.1), circle(17.4, 6.6, 1.25)])
icons = {
    'vv_notif_chirp': (glyph_path('MaterialCommunityIcons', 'bird'), False),
    'vv_notif_vibegram': (lens, True),
    'vv_notif_toktalk': (glyph_path('Ionicons', 'musical-note'), False),
    'vv_notif_pulsenews': (glyph_path('Ionicons', 'pulse'), False),
    'vv_notif_career': (glyph_path('Ionicons', 'sparkles'), False),
}
os.makedirs(OUT, exist_ok=True)
for name, (path, eo) in icons.items():
    open(os.path.join(OUT, f'{name}.xml'), 'w', encoding='utf-8', newline='\n').write(vector(path, eo))
    print(name, len(path))

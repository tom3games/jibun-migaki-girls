# 緑背景を抜いて webp にする。~/tools/pyimg/bin/python art/key.py（Pillow と numpy）
# 女の子版。部屋・本棚・鏡の枠・ベッド・スキンケア・猫とおばあちゃんは元の jibun-migaki の絵をそのまま使う（img/ にコピー済み）
import numpy as np, os
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/../img/'; RAW = D + '/../../_art_raw/jibun-migaki-girls/raw/'
def key(src):
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = g - np.maximum(r, b)
    al = 1 - np.clip((k - 2) / (40 - 2), 0, 1)
    lim = np.maximum(r, b); g = np.where(g > lim, lim, g)
    im = Image.fromarray(np.dstack([r, g, b, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
    A = im.split()[3].filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7)); im.putalpha(A)
    return im
def save(im, n, q=80):
    im.save(OUT + n + '.webp', quality=q, method=6); print(n, im.size, os.path.getsize(OUT + n + '.webp') // 1024, 'KB')
def cells(sheet, cols, rows, names, mx=300):
    if not os.path.exists(RAW + sheet + '.png'): return
    it = key(RAW + sheet + '.png'); W, H = it.size
    for i, n in enumerate(names):
        if not n: continue
        c = it.crop((i % cols * W // cols, i // cols * H // rows, (i % cols + 1) * W // cols, (i // cols + 1) * H // rows))
        a = np.asarray(c.split()[3]) > 40
        arr = np.asarray(c).copy(); arr[..., 3] = np.where(a, arr[..., 3], 0); c = Image.fromarray(arr, 'RGBA')
        c = c.crop(c.getbbox()); c.thumbnail((mx, mx)); save(c, n, 82)
cells('items', 3, 3, ['o_shoes', 'o_pan', 'o_laptop', 'o_scale', 'o_nail', 'o_ring', 'o_penlight', 'o_cal', 'o_wallet'])
def row(sheet, names, mx=320):
    # 1列のシートは、空の列で区切った塊を大きい順に取り、小さい塊は近い塊にまとめる。全段階を同じ枠で切る
    it = key(RAW + sheet + '.png'); a = np.asarray(it.split()[3]) > 40; cols = a.any(0); n = len(cols); runs = []; i = 0
    while i < n:
        if cols[i]:
            j = i
            while j < n and cols[j]: j += 1
            runs.append([i, j]); i = j
        else: i += 1
    big = sorted(sorted(runs, key=lambda r: r[0] - r[1])[:len(names)])
    for r in runs:
        if r in big: continue
        g = min(big, key=lambda b: min(abs(r[0] - b[1]), abs(b[0] - r[1])))
        g[0] = min(g[0], r[0]); g[1] = max(g[1], r[1])
    crops = [it.crop((b[0], 0, b[1], it.height)) for b in big]
    bb = [c.getbbox() for c in crops]; w = max(c.width for c in crops); top = min(x[1] for x in bb); bot = max(x[3] for x in bb)
    for c, nm in zip(crops, names):
        cv = Image.new('RGBA', (w, bot - top)); cv.paste(c.crop((0, top, c.width, bot)), ((w - c.width) // 2, 0)); cv.thumbnail((mx, mx)); save(cv, nm, 82)
if os.path.exists(RAW + 'dresser.png'): row('dresser', ['dress0', 'dress1', 'dress2', 'dress3'])
P = ['shikaku', 'kujo', 'saeki', 'riku', 'tanaka', 'takeshi', 'doctor', 'ren', 'kakou', 'host', 'oshi', 'tomo', 'kuma', 'sagi', 'jibun']
for n in P:
    if os.path.exists(RAW + n + '.png'):
        im = Image.open(RAW + n + '.png').convert('RGB'); im.thumbnail((640, 960)); save(im, 'p_' + n, 78)
        t = im.crop((0, 0, im.width, im.width)); t.thumbnail((200, 200)); save(t, 't_' + n, 74)
for n in ['me0'] + ['me_' + k for k in ['soji1', 'soji2', 'mori1', 'mori2', 'naka1', 'naka2', 'allhigh', 'run', 'tired', 'fast', 'hosp', 'oshi', 'selfie']]:
    if os.path.exists(RAW + n + '.png'):
        im = Image.open(RAW + n + '.png').convert('RGB'); w, h = im.size; im = im.crop((0, int(h * 0.04), w, int(h * 0.04) + w)); im.thumbnail((360, 360)); save(im, n, 78)

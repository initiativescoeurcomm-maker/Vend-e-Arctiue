#!/usr/bin/env python3
"""Trace le fond de carte (Atlantique Nord) de dist/rituel.html.

Lit le masque terre/mer déjà présent dans l'appli (earth-spec-4k.png,
projection équirectangulaire, mer = clair), découpe la zone de la Route du
Rhum, suit les côtes pixel par pixel, simplifie le tracé et écrit un chemin
SVG en unités carte : 10 unités par degré, origine en haut à gauche.

Usage :  python3 tools/make-rituel-map.py > chemin.txt     (Pillow requis)
Le chemin obtenu se colle dans <path id="terres" d="…"> de dist/rituel.html.
Si BOUNDS change, reporter les mêmes valeurs dans la constante CARTE du HTML.
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASK = ROOT / "dist/vendor/textures/earth-spec-4k.png"

BOUNDS = dict(west=-76, east=8, south=4, north=60)   # degrés
UNITS_PER_DEG = 10
EPSILON = 0.55        # tolérance de simplification, en pixels du masque
MIN_ISLAND = 1.5      # aire mini d'une île, en pixels² (garde Açores, Antilles)
MIN_LAKE = 40         # aire mini d'un lac / d'une mer intérieure


def load_land():
    img = Image.open(MASK).convert("L")
    w, h = img.size
    ppd = w / 360.0
    x0 = round((BOUNDS["west"] + 180) * ppd)
    x1 = round((BOUNDS["east"] + 180) * ppd)
    y0 = round((90 - BOUNDS["north"]) * ppd)
    y1 = round((90 - BOUNDS["south"]) * ppd)
    crop = img.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    px = crop.load()
    land = [[px[x, y] < 128 for x in range(cw)] for y in range(ch)]
    return land, cw, ch, ppd


def trace_loops(land, cw, ch):
    """Boucles fermées le long des arêtes terre/mer (terre à droite du sens)."""
    def is_land(x, y):
        return 0 <= x < cw and 0 <= y < ch and land[y][x]

    out = {}   # sommet de départ -> liste des sommets d'arrivée
    for y in range(ch):
        row = land[y]
        for x in range(cw):
            if not row[x]:
                continue
            if not is_land(x, y - 1): out.setdefault((x, y), []).append((x + 1, y))
            if not is_land(x + 1, y): out.setdefault((x + 1, y), []).append((x + 1, y + 1))
            if not is_land(x, y + 1): out.setdefault((x + 1, y + 1), []).append((x, y + 1))
            if not is_land(x - 1, y): out.setdefault((x, y + 1), []).append((x, y))

    loops = []
    while out:
        start = next(iter(out))
        loop, cur, prev_dir = [start], start, None
        while True:
            ends = out[cur]
            if len(ends) == 1 or prev_dir is None:
                nxt = ends.pop()
            else:
                # Deux pixels qui se touchent par un coin : on tourne à droite
                # pour les garder dans deux boucles distinctes.
                right = (-prev_dir[1], prev_dir[0])
                pick = next((e for e in ends
                             if (e[0] - cur[0], e[1] - cur[1]) == right), ends[-1])
                ends.remove(pick)
                nxt = pick
            if not ends:
                del out[cur]
            prev_dir = (nxt[0] - cur[0], nxt[1] - cur[1])
            cur = nxt
            if cur == start:
                break
            loop.append(cur)
        loops.append(loop)
    return loops


def area(loop):
    s = 0
    for i, (x, y) in enumerate(loop):
        nx, ny = loop[(i + 1) % len(loop)]
        s += x * ny - nx * y
    return s / 2


def simplify(points, eps):
    """Douglas-Peucker itératif sur une ligne ouverte."""
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = points[a]
        bx, by = points[b]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5 or 1.0
        far, idx = 0.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            d = abs(dx * (ay - py) - dy * (ax - px)) / norm
            if d > far:
                far, idx = d, i
        if far > eps:
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return [p for p, k in zip(points, keep) if k]


def simplify_loop(loop, eps):
    # Coupe la boucle en deux moitiés pour que Douglas-Peucker ait deux ancres.
    far = max(range(len(loop)),
              key=lambda i: (loop[i][0] - loop[0][0]) ** 2 + (loop[i][1] - loop[0][1]) ** 2)
    first = simplify(loop[:far + 1], eps)
    second = simplify(loop[far:] + [loop[0]], eps)
    return first[:-1] + second[:-1]


def fmt(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def main():
    land, cw, ch, ppd = load_land()
    scale = UNITS_PER_DEG / ppd
    parts, n_points = [], 0
    for loop in trace_loops(land, cw, ch):
        a = area(loop)
        if (a > 0 and a < MIN_ISLAND) or (a < 0 and -a < MIN_LAKE):
            continue
        pts = simplify_loop(loop, EPSILON)
        if len(pts) < 3:
            continue
        n_points += len(pts)
        parts.append("M" + "L".join(f"{fmt(x * scale)},{fmt(y * scale)}" for x, y in pts) + "Z")
    sys.stdout.write("".join(parts))
    width = (BOUNDS["east"] - BOUNDS["west"]) * UNITS_PER_DEG
    height = (BOUNDS["north"] - BOUNDS["south"]) * UNITS_PER_DEG
    print(f"\n{len(parts)} contours, {n_points} points, carte {width}×{height}", file=sys.stderr)


if __name__ == "__main__":
    main()

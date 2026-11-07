"""Bake the existing clothed CC0 mesh into detailed, material-encoded animation pages.

Usage: python3 scripts/bake-motion-94.py [path/to/unpacked-mesh.json]
The input comes from the existing footballer-mesh.js export; no source download is needed.
"""
from pathlib import Path
import json, math, sys, subprocess, os, argparse
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('mesh', nargs='?')
parser.add_argument('--page', type=int, choices=range(4))
parser.add_argument('--landmarks-only', action='store_true')
args = parser.parse_args()
if args.mesh:
    data = json.loads(Path(args.mesh).read_text())
else:
    export = "const m=require('./assets/models/footballer-mesh.js');process.stdout.write(JSON.stringify(m,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v));"
    data = json.loads(subprocess.check_output(['node', '-e', export], cwd=ROOT, text=True))
V = np.asarray(data['positions'], dtype=float).reshape(-1, 3)
N = np.asarray(data['normals'], dtype=float).reshape(-1, 3)
F = np.asarray(data['indices'], dtype=int).reshape(-1, 3)
ids = np.asarray(data['skinIndices'], dtype=int).reshape(-1, 4)
weights = np.asarray(data['skinWeights'], dtype=float).reshape(-1, 4)
bones = np.asarray(data['bones'], dtype=float)
parents = bones[:, 0].astype(int)
local = bones[:, 1:]
bind = local.copy()
for i, parent in enumerate(parents):
    if parent >= 0:
        bind[i] += bind[parent]
slots = np.zeros(len(F), dtype=int)
for start, count, slot in data['groups']:
    slots[start // 3:(start + count) // 3] = slot
centres = V[F].mean(axis=1)

WIDTH, HEIGHT, DIRECTIONS, POSES, ROWS, SS = 128, 224, 16, 22, 6, 2
PPM, ANCHOR, ELEVATION = 88, 205, .60

def euler(x=0., y=0., z=0.):
    cx, sx, cy, sy, cz, sz = math.cos(x), math.sin(x), math.cos(y), math.sin(y), math.cos(z), math.sin(z)
    return np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]) @ np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]) @ np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])

def pose_vertices(frame, extra_points=None, extra_weights=None):
    R = np.repeat(np.eye(3)[None], len(parents), axis=0)
    phase = (frame - 1) / 12 * math.tau
    speed = 1 if 1 <= frame <= 12 else 0
    stride = math.sin(phase) * .72 * speed
    k1, k2 = max(0, -math.cos(phase)) * .9 * speed, max(0, math.cos(phase)) * .9 * speed
    R[0] = euler(y=math.cos(phase) * .045 * speed)
    R[1] = euler(.12 * speed)
    R[2] = euler(y=-math.cos(phase) * .09 * speed, z=math.sin(phase) * .018 * speed)
    R[4] = euler(y=math.cos(phase) * .035 * speed)
    R[5], R[8], R[6], R[9] = euler(stride), euler(-stride), euler(k1), euler(k2)
    R[7], R[10] = euler(-k1 * .26), euler(-k2 * .26)
    R[11], R[14] = euler(-stride * .65, z=-.13), euler(stride * .65, z=.13)
    R[12], R[15] = euler(-.25 - speed * .5), euler(-.25 - speed * .5)
    if frame in [13, 14]:
        R[1], R[2] = euler(.06), euler(y=-.10)
        R[5], R[6] = euler(.60 if frame == 13 else -1.20), euler(1.05 if frame == 13 else .18)
        R[11], R[14] = euler(-.35, z=-.4), euler(.2, z=.4)
    if frame in [15, 16, 20]:
        angle = -2.4 if frame == 20 else -1.25 if frame == 16 else -.9
        R[11], R[14] = euler(angle, z=-.45), euler(angle, z=.45)
        R[12] = R[15] = euler(-.16)
    if frame == 17:
        R[11], R[14] = euler(z=-2.6), euler(z=2.6)
        R[12] = R[15] = euler(-.2)
    if frame == 18:
        R[5], R[8], R[6], R[9] = euler(-1.), euler(.3), euler(.12), euler(.95)
    if frame == 19:
        R[1], R[5], R[8], R[6], R[9] = euler(.6), euler(-.5), euler(-.5), euler(.9), euler(.9)
        R[11], R[14] = euler(-1.3, z=-.15), euler(-1.3, z=.15)
    if frame == 21:
        R[5], R[6], R[1] = euler(-.5), euler(.25), euler(.13)
    worldR, worldP = [], []
    for i, parent in enumerate(parents):
        worldR.append(R[i] if parent < 0 else worldR[parent] @ R[i])
        worldP.append(local[i] if parent < 0 else worldP[parent] + worldR[parent] @ local[i])
    worldR, worldP = np.asarray(worldR), np.asarray(worldP)
    out, normals = np.zeros_like(V), np.zeros_like(N)
    for k in range(4):
        b, w = ids[:, k], weights[:, k, None]
        out += (np.einsum('nij,nj->ni', worldR[b], V - bind[b]) + worldP[b]) * w
        normals += np.einsum('nij,nj->ni', worldR[b], N) * w
    if extra_points is not None:
        extra = np.zeros_like(extra_points)
        for bone in range(len(parents)):
            extra += ((extra_points - bind[bone]) @ worldR[bone].T + worldP[bone]) * extra_weights[:, bone, None]
        return out, normals, extra
    return out, normals

def antialias(image):
    block = np.asarray(image).reshape(HEIGHT, SS, WIDTH, SS, 4).transpose(0, 2, 1, 3, 4).reshape(HEIGHT, WIDTH, SS * SS, 4)
    counts = np.stack([(block[:, :, :, 0] == m).sum(axis=2) for m in range(1, 9)], axis=2)
    material = counts.argmax(axis=2).astype(np.uint8) + 1
    chosen = (block[:, :, :, 0] == material[:, :, None]) & (block[:, :, :, 3] > 0)
    n = np.maximum(1, chosen.sum(axis=2))
    shade = ((block[:, :, :, 1] * chosen).sum(axis=2) / n).astype(np.uint8)
    flags = np.rint((block[:, :, :, 2] * chosen).sum(axis=2) / n).astype(np.uint8)
    coverage = np.rint(block[:, :, :, 3].sum(axis=2) / (SS * SS)).astype(np.uint8)
    material[coverage == 0] = 0
    out = np.stack([material, shade, flags, coverage], axis=2)
    # Pupils are restricted to visible eye pixels, so they cannot show through the head.
    remaining = set(map(tuple, np.argwhere(material == 8)))
    while remaining:
        seed = remaining.pop()
        group, queue = [seed], [seed]
        while queue:
            y, x = queue.pop()
            for neighbour in [(y-1, x), (y+1, x), (y, x-1), (y, x+1)]:
                if neighbour in remaining:
                    remaining.remove(neighbour); group.append(neighbour); queue.append(neighbour)
        if len(group) < 2:
            continue
        centre = np.asarray(group).mean(axis=0)
        radius = max(.65, min(1.1, math.sqrt(len(group)) * .23))
        for y, x in group:
            if np.linalg.norm(np.array([y, x]) - centre) <= radius:
                out[y, x, 2] = 2
    return Image.fromarray(out)

if args.landmarks_only:
    targets = np.array([[-.22,1.54,.15],[.22,1.54,.15],[.19,1.035,.15],[-.19,1.035,.15],
                        [.22,1.54,-.095],[-.22,1.54,-.095],[-.19,1.035,-.095],[.19,1.035,-.095]])
    vertices = np.unique(F[slots == 0])
    vertices = vertices[ids[vertices,0] < 4]
    # Use torso-centre weights on each horizontal edge, excluding arms and legs.
    # Shirt corners must not follow a raised sleeve or a kicking thigh.
    centres = targets.copy();centres[:,0] = 0
    nearest = [vertices[np.argmin(np.linalg.norm(V[vertices] - p, axis=1))] for p in centres]
    extra_weights = np.zeros((len(targets),len(parents)))
    for i,index in enumerate(nearest):
        for bone,w in zip(ids[index],weights[index]):
            if bone < 4:extra_weights[i,bone] += w
        extra_weights[i] /= extra_weights[i].sum()
    quads = []
    for frame in range(POSES):
        _,_,points = pose_vertices(frame,targets,extra_weights)
        for direction in range(DIRECTIONS):
            yaw = direction * math.tau / DIRECTIONS
            camera = np.array([math.sin(yaw)*math.cos(ELEVATION),math.sin(ELEVATION),math.cos(yaw)*math.cos(ELEVATION)])
            right = np.array([math.cos(yaw),0,-math.sin(yaw)]);up = np.cross(camera,right)
            projected = np.column_stack((WIDTH/2+(points@right)*PPM,ANCHOR-(points@up)*PPM))
            quads.append(np.round(projected,3).ravel().tolist())
    text = "/* Shirt coordinates projected from the same clothed CC0 mesh and animation. */\n(function(root){const data="+json.dumps({'poses':POSES,'directions':DIRECTIONS,'quads':quads},separators=(',',':'))+";if(typeof module==='object'&&module.exports)module.exports=data;else root.AuraKitLandmarks=data;})(typeof globalThis!=='undefined'?globalThis:this);\n"
    (ROOT/'assets/models/jersey-landmarks-95.js').write_text(text)
    print('Generated projected shirt coordinates:',len(quads))
    sys.exit()

pages = [Image.new('RGBA', (WIDTH * DIRECTIONS, HEIGHT * min(ROWS, POSES - p * ROWS))) for p in range(math.ceil(POSES / ROWS))]
for frame in range(POSES) if args.page is None else range(args.page * ROWS, min(POSES, (args.page + 1) * ROWS)):
    posed, normals = pose_vertices(frame)
    face_normals = np.cross(posed[F[:, 1]] - posed[F[:, 0]], posed[F[:, 2]] - posed[F[:, 0]])
    for direction in range(DIRECTIONS):
        yaw = direction * math.tau / DIRECTIONS
        cam = np.array([math.sin(yaw) * math.cos(ELEVATION), math.sin(ELEVATION), math.cos(yaw) * math.cos(ELEVATION)])
        right = np.array([math.cos(yaw), 0, -math.sin(yaw)])
        up = np.cross(cam, right)
        points = np.column_stack((WIDTH/2 + (posed @ right) * PPM, ANCHOR - (posed @ up) * PPM)) * SS
        diffuse = np.clip(normals @ np.array([-.35, .83, .43]), 0, 1)
        rim = (1 - np.abs(normals @ cam).clip(0, 1)) ** 3 * .10
        light = np.clip(.32 + diffuse * .73 + rim, 0, 1.12)
        face_light = light[F].mean(axis=1)
        order = np.argsort((posed @ cam)[F].mean(axis=1))
        visible = face_normals @ cam > 0
        image = Image.new('RGBA', (WIDTH * SS, HEIGHT * SS))
        draw = ImageDraw.Draw(image)
        for index in order[visible[order]]:
            mat, c = int(slots[index]), centres[index]
            flag = 1 if mat == 0 and int((c[0] + .32) / .085) % 2 == 0 else 0
            if mat == 2 and 1.67 < c[1] < 1.69 and c[2] > .14 and abs(c[0]) < .025:
                flag = 3
            elif mat == 2 and 1.60 < c[1] < 1.70 and c[2] > .07:
                flag = 4
            shade = int(np.clip(face_light[index] / 1.12 * 255, 0, 255))
            draw.polygon([tuple(v) for v in points[F[index]]], fill=(mat + 1, shade, flag, 255))
        pages[frame // ROWS].paste(antialias(image), (direction * WIDTH, (frame % ROWS) * HEIGHT))
    print(f'Baked animation {frame+1}/{POSES}', flush=True)

for index, page in enumerate(pages):
    if args.page is not None and index != args.page:
        continue
    path = ROOT / f'assets/models/human-motion-94-{index}.png'
    temporary = path.with_suffix('.png.tmp')
    with temporary.open('wb') as output:
        page.save(output, format='PNG', optimize=True)
        output.flush(); os.fsync(output.fileno())
    os.replace(temporary, path)
    with Image.open(path) as check:
        check.verify()
    print(path.name, path.stat().st_size, 'bytes', flush=True)
print('Motion pages complete.', flush=True)

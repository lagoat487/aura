"""Generate a shared 32-panel ball surface and shaded CPU rolling frames."""
from pathlib import Path
from itertools import combinations
import math, os
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
phi=(1+math.sqrt(5))/2
vertices=np.array([(0,a,b*phi) for a in [-1,1] for b in [-1,1]]+[(a,b*phi,0) for a in [-1,1] for b in [-1,1]]+[(b*phi,0,a) for a in [-1,1] for b in [-1,1]],dtype=float)
vertices/=np.linalg.norm(vertices,axis=1)[:,None]
edge=min(np.linalg.norm(a-b) for i,a in enumerate(vertices) for b in vertices[i+1:])
faces=[(a,b,c) for a,b,c in combinations(range(12),3) if all(abs(np.linalg.norm(vertices[i]-vertices[j])-edge)<1e-6 for i,j in [(a,b),(b,c),(c,a)])]
assert len(faces)==20
centres=np.array([vertices[list(face)].mean(axis=0) for face in faces]);centres/=np.linalg.norm(centres,axis=1)[:,None]
seeds=np.concatenate([vertices,centres])

def surface(normals):
    dots=normals@seeds.T
    best=dots.argmax(axis=-1)
    nearest=np.partition(dots,-2,axis=-1)[...,-2:]
    seam=nearest[...,1]-nearest[...,0]<.007
    color=np.where((best<12)[...,None],np.array([24,34,43]),np.array([243,244,233])).astype(float)
    color[seam]=[104,115,113]
    return color,seam

def save(image,name):
    path=ROOT/'assets/textures'/name
    temporary=path.with_suffix('.png.tmp')
    with temporary.open('wb') as file:
        image.save(file,format='PNG',optimize=True);file.flush();os.fsync(file.fileno())
    os.replace(temporary,path)
    with Image.open(path) as check:check.verify()
    print(name,path.stat().st_size,flush=True)

w,h=512,256
u,v=np.meshgrid((np.arange(w)+.5)/w,(np.arange(h)+.5)/h)
theta=v*math.pi;azimuth=u*math.tau
n=np.stack([-np.cos(azimuth)*np.sin(theta),np.cos(theta),np.sin(azimuth)*np.sin(theta)],axis=-1)
albedo,seams=surface(n)
save(Image.fromarray(np.uint8(albedo)),'ball-albedo-95.png')
save(Image.fromarray(np.uint8(np.where(seams,100,180))),'ball-seams-95.png')

size,ss,frames=64,2,24
x,y=np.meshgrid((np.arange(size*ss)+.5-size*ss/2)/(size*ss*.46),-(np.arange(size*ss)+.5-size*ss/2)/(size*ss*.46))
inside=x*x+y*y<=1
z=np.sqrt(np.maximum(0,1-x*x-y*y))
normal=np.stack([x,y,z],axis=-1)
light=np.array([-.4,.65,.8]);light/=np.linalg.norm(light)
half=(light+np.array([0,0,1]));half/=np.linalg.norm(half)
shade=.30+np.maximum(0,normal@light)*.69
spec=np.maximum(0,normal@half)**32*.24
atlas=Image.new('RGBA',(size*frames,size*2))
for axis in range(2):
    for frame in range(frames):
        angle=frame/frames*math.tau;c,s=math.cos(angle),math.sin(angle)
        spun=np.stack([x*c+z*s,y,-x*s+z*c],axis=-1) if axis==0 else np.stack([x,y*c-z*s,y*s+z*c],axis=-1)
        color,_=surface(spun)
        rgb=np.clip(color*shade[...,None]+spec[...,None]*235,0,255).astype(np.uint8)
        rgba=np.dstack([rgb,inside.astype(np.uint8)*255]);rgba[~inside]=0
        tile=Image.fromarray(rgba).resize((size,size),Image.Resampling.LANCZOS)
        atlas.paste(tile,(frame*size,axis*size))
save(atlas,'ball-motion-95.png')

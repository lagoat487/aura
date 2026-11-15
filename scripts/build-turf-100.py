"""Deterministic, original pitch colour and micro-normal textures for the game."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
rng=np.random.default_rng(100);root=Path(__file__).resolve().parents[1]/'assets/textures';root.mkdir(exist_ok=True)
w,h=2048,1328
noise=rng.normal(0,1,(h,w));macro=np.asarray(Image.fromarray(np.uint8(np.clip(noise*32+128,0,255))).filter(ImageFilter.GaussianBlur(15)),float)-128
x=np.arange(w)[None,:];stripe=np.cos(x/w*np.pi*20)
base=np.zeros((h,w,3),float);base[:]=[39,85,33];base+=stripe[:,:,None]*np.array([4,8,2]);base+=noise[:,:,None]*np.array([2,4,1.6]);base+=macro[:,:,None]*np.array([.25,.6,.18])
im=Image.fromarray(np.uint8(np.clip(base,0,255)));draw=ImageDraw.Draw(im,'RGBA')
for i in range(95000):
 a=int(rng.integers(w));b=int(rng.integers(h));c=(145,186,82,23) if i%2 else (9,43,20,25)
 draw.line((a,b,a+int(rng.integers(-1,2)),b+int(rng.integers(1,5))),fill=c,width=1)
im.save(root/'pitch-next-100.webp',quality=93)
size=512;field=rng.normal(0,1,(size,size));field=np.asarray(Image.fromarray(np.uint8(np.clip(field*48+128,0,255))).filter(ImageFilter.GaussianBlur(.45)),float)/255
dy,dx=np.gradient(field);normal=np.stack([-dx*2,-dy*2,np.ones_like(field)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True)
Image.fromarray(np.uint8((normal*.5+.5)*255)).save(root/'turf-normal-100.webp',quality=94)
print('Generated pitch-next-100.webp and turf-normal-100.webp')

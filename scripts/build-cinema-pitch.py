"""Create a physical-size pitch albedo with mowing, divots and goalmouth wear."""
from pathlib import Path
import os
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
w,h=2048,1326;rng=np.random.default_rng(96027)
tile=Image.open(ROOT/'assets/textures/turf-photo.webp').convert('RGB').resize((256,256))
texture=Image.new('RGB',(w,h))
for y in range(0,h,256):
 for x in range(0,w,256):
  patch=tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if rng.random()>.5 else tile
  if rng.random()>.5:patch=patch.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
  texture.paste(patch,(x,y))
rgb=np.array(texture,dtype=float)/255
mean=rgb.mean(axis=(0,1));target=np.array([.205,.288,.112]);rgb*=target/mean
def noise(columns,rows):
 field=Image.fromarray(np.uint8(rng.random((rows,columns))*255)).resize((w,h),Image.Resampling.BICUBIC)
 return np.array(field,dtype=float)/255-.5
macro=noise(12,8)*.13+noise(42,28)*.07+noise(192,128)*.025
x,z=np.meshgrid((np.arange(w)+.5)/w*105-52.5,(np.arange(h)+.5)/h*68-34)
mow=np.where((np.floor((x+52.5)/5.25).astype(int)%2)==0,1.047,.965)
rgb*=mow[:,:,None]*(1+macro[:,:,None])
wear=np.zeros((h,w))
for side in [-1,1]:
 wear+=np.exp(-((x-side*50)/3.3)**2-(z/6.5)**2)*.20
 wear+=np.exp(-((x-side*41.5)/.75)**2-(z/.7)**2)*.11
wear+=np.exp(-(x/1.0)**2-(z/1.0)**2)*.06
soil=np.array([.29,.27,.14]);rgb=rgb*(1-wear[:,:,None])+soil*wear[:,:,None]
image=Image.fromarray(np.uint8(np.clip(rgb,0,1)*255));path=ROOT/'assets/textures/pitch-cinema-96.webp';temporary=path.with_suffix('.webp.tmp')
with temporary.open('wb') as file:image.save(file,format='WEBP',quality=91,method=6);file.flush();os.fsync(file.fileno())
os.replace(temporary,path)
with Image.open(path) as check:check.load();assert check.size==(w,h)
print(path.name,path.stat().st_size,'bytes',flush=True)

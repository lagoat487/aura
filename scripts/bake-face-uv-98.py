"""Project the live head UVs into the compatible renderer's 22 x 16 animations.

Only coordinates, lighting and coverage are baked; all five local photographs
use these same four pages. The CPU rasterizer depth-tests hands and clothing.
"""
from pathlib import Path
import ctypes,json,math,subprocess,tempfile
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
export="const m=require('./assets/models/footballer-mesh.js');process.stdout.write(JSON.stringify(m,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v));"
data=json.loads(subprocess.check_output(['node','-e',export],cwd=ROOT,text=True))
V=np.array(data['positions']).reshape(-1,3);N=np.array(data['normals']).reshape(-1,3)
F=np.array(data['indices'],dtype=np.int32).reshape(-1,3);ids=np.array(data['skinIndices']).reshape(-1,4);weights=np.array(data['skinWeights']).reshape(-1,4)
bones=np.array(data['bones']);parents=bones[:,0].astype(int);local=bones[:,1:];bind=local.copy()
for i,p in enumerate(parents):
 if p>=0:bind[i]+=bind[p]
slots=np.zeros(len(F),dtype=np.int32)
for start,count,slot in data['groups']:slots[start//3:(start+count)//3]=slot
WIDTH,HEIGHT,PPM,ANCHOR,ELEVATION,SS=192,336,132,307.5,.60,2

def euler(x=0,y=0,z=0):
 cx,sx,cy,sy,cz,sz=math.cos(x),math.sin(x),math.cos(y),math.sin(y),math.cos(z),math.sin(z)
 return np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])@np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])@np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])

def pose(frame,points=None):
 R=np.repeat(np.eye(3)[None],len(parents),axis=0);phase=(frame-1)/12*math.tau;speed=int(1<=frame<=12)
 stride=math.sin(phase)*.72*speed;k1=max(0,-math.cos(phase))*.9*speed;k2=max(0,math.cos(phase))*.9*speed
 R[0]=euler(y=math.cos(phase)*.045*speed);R[1]=euler(.12*speed);R[2]=euler(y=-math.cos(phase)*.09*speed,z=math.sin(phase)*.018*speed);R[4]=euler(y=math.cos(phase)*.035*speed)
 R[5],R[8],R[6],R[9]=euler(stride),euler(-stride),euler(k1),euler(k2);R[7],R[10]=euler(-k1*.26),euler(-k2*.26)
 R[11],R[14]=euler(-stride*.65,z=-.13),euler(stride*.65,z=.13);R[12]=R[15]=euler(-.25-speed*.5)
 if frame in [13,14]:R[1],R[2]=euler(.06),euler(y=-.10);R[5],R[6]=euler(.60 if frame==13 else -1.20),euler(1.05 if frame==13 else .18);R[11],R[14]=euler(-.35,z=-.4),euler(.2,z=.4)
 if frame in [15,16,20]:
  angle=-2.4 if frame==20 else -1.25 if frame==16 else -.9;R[11],R[14]=euler(angle,z=-.45),euler(angle,z=.45);R[12]=R[15]=euler(-.16)
 if frame==17:R[11],R[14]=euler(z=-2.6),euler(z=2.6);R[12]=R[15]=euler(-.2)
 if frame==18:R[5],R[8],R[6],R[9]=euler(-1),euler(.3),euler(.12),euler(.95)
 if frame==19:R[1],R[5],R[8],R[6],R[9]=euler(.6),euler(-.5),euler(-.5),euler(.9),euler(.9);R[11],R[14]=euler(-1.3,z=-.15),euler(-1.3,z=.15)
 if frame==21:R[5],R[6],R[1]=euler(-.5),euler(.25),euler(.13)
 worldR=[];worldP=[]
 for i,p in enumerate(parents):worldR.append(R[i] if p<0 else worldR[p]@R[i]);worldP.append(local[i] if p<0 else worldP[p]+worldR[p]@local[i])
 worldR,worldP=np.array(worldR),np.array(worldP);out=np.zeros_like(V);normals=np.zeros_like(N)
 for k in range(4):
  b=ids[:,k];w=weights[:,k,None];out+=(np.einsum('nij,nj->ni',worldR[b],V-bind[b])+worldP[b])*w;normals+=np.einsum('nij,nj->ni',worldR[b],N)*w
 if points is not None:return out,normals,(points-bind[4])@worldR[4].T+worldP[4]
 return out,normals

if __name__=='__main__':
 with tempfile.TemporaryDirectory(prefix='aura-face-uv-') as directory:
  library=Path(directory)/'uv.so';subprocess.run(['g++','-std=c++17','-O3','-shared','-fPIC',str(ROOT/'scripts/raster-face-uv.cpp'),'-o',str(library)],check=True)
  raster=ctypes.CDLL(str(library)).raster;ptr=ctypes.c_void_p;raster.argtypes=[ptr,ptr,ptr,ptr,ptr,ctypes.c_int,ctypes.c_int,ctypes.c_int,ptr,ptr]
  rest=np.ascontiguousarray(V,dtype=np.float32);faces=np.ascontiguousarray(F,dtype=np.int32);mats=np.ascontiguousarray(slots,dtype=np.int32)
  for page in range(4):
   rows=min(6,22-page*6);atlas=Image.new('RGBA',(64*16,96*rows));origins=json.loads((ROOT/f'assets/models/human-origins-96-{page}.json').read_text())
   for row in range(rows):
    posed,normals=pose(page*6+row);normals=np.ascontiguousarray(normals,dtype=np.float32)
    for direction in range(16):
     yaw=direction*math.tau/16;cam=np.array([math.sin(yaw)*math.cos(ELEVATION),math.sin(ELEVATION),math.cos(yaw)*math.cos(ELEVATION)])
     right=np.array([math.cos(yaw),0,-math.sin(yaw)]);up=np.cross(cam,right);axes=np.ascontiguousarray([right,up,cam],dtype=np.float32)
     screen=np.ascontiguousarray(np.column_stack(((WIDTH/2+posed@right*PPM)*SS,(ANCHOR-posed@up*PPM)*SS,posed@cam)),dtype=np.float32)
     raw=np.zeros((HEIGHT*SS,WIDTH*SS,4),dtype=np.uint8)
     raster(screen.ctypes.data,normals.ctypes.data,rest.ctypes.data,faces.ctypes.data,mats.ctypes.data,len(F),WIDTH*SS,HEIGHT*SS,axes.ctypes.data,raw.ctypes.data)
     block=raw.reshape(HEIGHT,SS,WIDTH,SS,4).transpose(0,2,1,3,4).reshape(HEIGHT,WIDTH,SS*SS,4)
     selected=block[:,:,:,3]>0;count=np.maximum(1,selected.sum(2));out=np.zeros((HEIGHT,WIDTH,4),dtype=np.uint8)
     for k in range(3):out[:,:,k]=np.rint((block[:,:,:,k]*selected).sum(2)/count).astype(np.uint8)
     out[:,:,3]=np.rint(selected.sum(2)*255/(SS*SS)).astype(np.uint8)
     x,y=origins[row*16+direction];crop=Image.fromarray(out).crop((x,y,x+64,y+96));atlas.paste(crop,(direction*64,row*96))
   dest=ROOT/f'assets/models/human-face-uv-98-{page}.png';atlas.save(dest,optimize=True);print('Baked face UV page',page,flush=True)

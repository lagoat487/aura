"""Head coverage, bone pivots and photograph quads for the compatible renderer."""
from pathlib import Path
import importlib.util,ctypes,json,math,subprocess,tempfile
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pose98',ROOT/'scripts/bake-face-uv-98.py');P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P)
layout=[];scale=1.4
center=np.array([0,1.76,.065]);w,h=.22,.30
points=np.array([center+[-w/2,h/2,0],center+[w/2,h/2,0],center+[w/2,-h/2,0],center+[-w/2,-h/2,0],center,center+[0,0,.1]])
points=P.bind[4]+(points-P.bind[4])*scale
points=np.concatenate([points,P.bind[4][None]])
with tempfile.TemporaryDirectory(prefix='aura-head-mask-') as directory:
 library=Path(directory)/'mask.so';subprocess.run(['g++','-std=c++17','-O3','-shared','-fPIC',str(ROOT/'scripts/raster-head-mask-99.cpp'),'-o',str(library)],check=True)
 raster=ctypes.CDLL(str(library)).raster;ptr=ctypes.c_void_p;raster.argtypes=[ptr,ptr,ptr,ptr,ptr,ctypes.c_int,ctypes.c_int,ctypes.c_int,ptr,ptr]
 rest=np.ascontiguousarray(P.V,dtype=np.float32);faces=np.ascontiguousarray(P.F,dtype=np.int32);mats=np.ascontiguousarray(P.slots,dtype=np.int32)
 for page in range(4):
  rows=min(6,22-page*6);atlas=Image.new('RGBA',(64*16,96*rows));origins=json.loads((ROOT/f'assets/models/human-origins-96-{page}.json').read_text())
  for row in range(rows):
   posed,normals,extra=P.pose(page*6+row,points);normals=np.ascontiguousarray(normals,dtype=np.float32)
   for direction in range(16):
    yaw=direction*math.tau/16;cam=np.array([math.sin(yaw)*math.cos(P.ELEVATION),math.sin(P.ELEVATION),math.cos(yaw)*math.cos(P.ELEVATION)])
    right=np.array([math.cos(yaw),0,-math.sin(yaw)]);up=np.cross(cam,right);axes=np.ascontiguousarray([right,up,cam],dtype=np.float32)
    screen=np.ascontiguousarray(np.column_stack(((P.WIDTH/2+posed@right*P.PPM)*P.SS,(P.ANCHOR-posed@up*P.PPM)*P.SS,posed@cam)),dtype=np.float32)
    raw=np.zeros((P.HEIGHT*P.SS,P.WIDTH*P.SS,4),dtype=np.uint8)
    raster(screen.ctypes.data,normals.ctypes.data,rest.ctypes.data,faces.ctypes.data,mats.ctypes.data,len(P.F),P.WIDTH*P.SS,P.HEIGHT*P.SS,axes.ctypes.data,raw.ctypes.data)
    alpha=np.rint(raw[:,:,3].reshape(P.HEIGHT,P.SS,P.WIDTH,P.SS).mean((1,3))).astype(np.uint8)
    out=np.zeros((P.HEIGHT,P.WIDTH,4),dtype=np.uint8);out[:,:,:3]=255;out[:,:,3]=alpha
    x,y=origins[row*16+direction];atlas.paste(Image.fromarray(out).crop((x,y,x+64,y+96)),(direction*64,row*96))
    xy=np.column_stack((P.WIDTH/2+extra@right*P.PPM,P.ANCHOR-extra@up*P.PPM))
    normal=extra[5]-extra[4];front=float(normal@cam/np.linalg.norm(normal))
    layout.append({'pivot':np.round(xy[6],3).tolist(),'quad':np.round(xy[:4],3).ravel().tolist(),'front':round(front,4)})
  atlas.save(ROOT/f'assets/models/human-head-mask-99-{page}.png',optimize=True);print('Baked head mask page',page,flush=True)
data={'scale':scale,'frames':layout}
(ROOT/'assets/models/head-mask-layout-99.js').write_text('/* Projection of the live head bone and image mask, 22 poses x 16 directions. */\n(function(root){const data='+json.dumps(data,separators=(',',':'))+';if(typeof module===\'object\'&&module.exports)module.exports=data;else root.AuraHeadMaskLayout=data;})(typeof globalThis!==\'undefined\'?globalThis:this);\n')

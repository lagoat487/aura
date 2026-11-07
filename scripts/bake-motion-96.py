"""Bake smooth-lit 192x336 anatomical animation plus an occluded curly-hair layer.

Uses the existing clothed CC0 mesh. Compile the small CPU rasterizer in a scratch
directory; no GPU, downloaded model, generated concept picture or binary is used.
"""
from pathlib import Path
import argparse,ctypes,json,math,os,subprocess,tempfile
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--page',type=int,choices=range(4));args=parser.parse_args()
export="const m=require('./assets/models/footballer-mesh.js');process.stdout.write(JSON.stringify(m,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v));"
data=json.loads(subprocess.check_output(['node','-e',export],cwd=ROOT,text=True))
V=np.array(data['positions'],dtype=float).reshape(-1,3);N=np.array(data['normals'],dtype=float).reshape(-1,3)
F=np.array(data['indices'],dtype=int).reshape(-1,3);ids=np.array(data['skinIndices'],dtype=int).reshape(-1,4);weights=np.array(data['skinWeights']).reshape(-1,4)
bones=np.array(data['bones']);parents=bones[:,0].astype(int);local=bones[:,1:];bind=local.copy()
for i,p in enumerate(parents):
 if p>=0:bind[i]+=bind[p]
slots=np.zeros(len(F),dtype=np.int32)
for start,count,slot in data['groups']:slots[start//3:(start+count)//3]=slot
base_vertices=len(V);base_triangles=len(F)

def curls():
 vertices=[];normals=[];faces=[]
 for i in range(58):
  height=(i+.5)/58;angle=i*2.39996323;radius=math.sqrt(1-height*height)
  centre=np.array([math.cos(angle)*radius*.113,1.795+height*.077,-.012+math.sin(angle)*radius*.109])
  r=.018+(i%7)*.0012;start=len(vertices)
  for row in range(7):
   theta=row/6*math.pi
   for column in range(10):
    a=column/10*math.tau;n=np.array([math.sin(theta)*math.cos(a),math.cos(theta),math.sin(theta)*math.sin(a)])
    vertices.append(centre+n*r*np.array([1,.85,1]));normals.append(n)
  for row in range(6):
   for column in range(10):
    a=start+row*10+column;b=start+row*10+(column+1)%10;c=b+10;d=a+10
    faces.extend([[a,b,c],[a,c,d]])
 return np.array(vertices),np.array(normals),np.array(faces)
def boot():
 stations=[(-.085,.07,.014),(-.06,.135,.047),(-.02,.168,.057),(.05,.144,.065),(.14,.102,.062),(.22,.066,.046),(.254,.038,.012)]
 vertices=[];faces=[]
 for z,top,width in stations:
  for i in range(20):
   angle=i/20*math.tau;c=math.cos(angle);vertices.append([math.sin(angle)*width,.022+(top-.022)*max(0,c)**.7+min(0,c)*.005,z])
 for row in range(len(stations)-1):
  for i in range(20):
   a=row*20+i;b=row*20+(i+1)%20;c=b+20;d=a+20;faces.extend([[a,c,b],[a,d,c]])
 # Closed toe and heel caps.
 for ring,reverse in [(0,True),(len(stations)-1,False)]:
  centre=len(vertices);vertices.append(np.mean(vertices[ring*20:ring*20+20],axis=0))
  for i in range(20):
   a=ring*20+i;b=ring*20+(i+1)%20;faces.append([centre,b,a] if reverse else [centre,a,b])
 vertices=np.array(vertices);faces=np.array(faces);normals=np.zeros_like(vertices)
 face_normals=np.cross(vertices[faces[:,1]]-vertices[faces[:,0]],vertices[faces[:,2]]-vertices[faces[:,0]])
 for i in range(3):np.add.at(normals,faces[:,i],face_normals)
 normals/=np.maximum(1e-9,np.linalg.norm(normals,axis=1))[:,None]
 return vertices,normals,faces
BV,BN,BF=boot()
CV,CN,CF=curls()
if args.page in [None,0]:
 script="""/* Procedural head-bound curls for the clothed AURA avatar. */
(function(root){const p=[],n=[],f=[];
for(let i=0;i<58;i++){const h=(i+.5)/58,a=i*2.39996323,t=Math.sqrt(1-h*h),c=[Math.cos(a)*t*.113,1.795+h*.077,-.012+Math.sin(a)*t*.109],r=.018+(i%7)*.0012,start=p.length/3;
 for(let row=0;row<7;row++)for(let col=0;col<10;col++){const theta=row/6*Math.PI,phi=col/10*Math.PI*2,x=Math.sin(theta)*Math.cos(phi),y=Math.cos(theta),z=Math.sin(theta)*Math.sin(phi);p.push(c[0]+x*r,c[1]+y*r*.85,c[2]+z*r);n.push(x,y,z);}
 for(let row=0;row<6;row++)for(let col=0;col<10;col++){const a=start+row*10+col,b=start+row*10+(col+1)%10,c=b+10,d=a+10;f.push(a,b,c,a,c,d);}}
const data={positions:new Float32Array(p),normals:new Float32Array(n),indices:new Uint16Array(f),head:HEAD};if(typeof module==='object'&&module.exports)module.exports=data;else root.AuraCurlMesh=data;})(typeof globalThis!=='undefined'?globalThis:this);
""".replace('HEAD',json.dumps(bind[4].tolist(),separators=(',',':')))
 (ROOT/'assets/models/curly-hair-96.js').write_text(script)
if args.page in [None,0]:
 boot_export={'positions':np.round(BV,5).ravel().tolist(),'normals':np.round(BN,5).ravel().tolist(),'indices':BF.ravel().tolist(),'anchor':bind[7,1:].tolist()}
 (ROOT/'assets/models/football-boots-96.js').write_text('/* Closed football boots, attached to the ankle bones. */\n(function(root){const data='+json.dumps(boot_export,separators=(',',':'))+';if(typeof module===\'object\'&&module.exports)module.exports=data;else root.AuraBootMesh=data;})(typeof globalThis!==\'undefined\'?globalThis:this);\n')
for bone in [7,10]:
 boot_vertices=BV.copy();boot_vertices[:,0]+=bind[bone,0]
 F=np.concatenate([F,BF+len(V)]);slots=np.concatenate([slots,np.full(len(BF),4,dtype=np.int32)])
 V=np.concatenate([V,boot_vertices]);N=np.concatenate([N,BN]);ids=np.concatenate([ids,np.tile([bone,0,0,0],(len(BV),1))]);weights=np.concatenate([weights,np.tile([1,0,0,0],(len(BV),1))])
base_triangles=len(F)
F=np.concatenate([F,CF+len(V)]);slots=np.concatenate([slots,np.full(len(CF),9,dtype=np.int32)])
V=np.concatenate([V,CV]);N=np.concatenate([N,CN]);ids=np.concatenate([ids,np.tile([4,0,0,0],(len(CV),1))]);weights=np.concatenate([weights,np.tile([1,0,0,0],(len(CV),1))])
WIDTH,HEIGHT,PPM,ANCHOR,ELEVATION,SS=192,336,132,307.5,.60,2
DIRECTIONS,POSES,ROWS=16,22,6

def euler(x=0,y=0,z=0):
 cx,sx,cy,sy,cz,sz=math.cos(x),math.sin(x),math.cos(y),math.sin(y),math.cos(z),math.sin(z)
 return np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])@np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])@np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])

def pose_vertices(frame,extra_points=None,extra_weights=None):
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
 return out,normals

def antialias(raw,mark=0):
 block=raw.reshape(HEIGHT,SS,WIDTH,SS,4).transpose(0,2,1,3,4).reshape(HEIGHT,WIDTH,SS*SS,4)
 if mark:block=block.copy();block[block[:,:,:,0]!=mark]=0;block[block[:,:,:,0]==mark,0]=6
 counts=np.stack([(block[:,:,:,0]==m).sum(2) for m in range(1,9)],axis=2);material=counts.argmax(2).astype(np.uint8)+1
 chosen=(block[:,:,:,0]==material[:,:,None])&(block[:,:,:,3]>0);n=np.maximum(1,chosen.sum(2));shade=((block[:,:,:,1]*chosen).sum(2)/n).astype(np.uint8)
 flags=np.zeros((HEIGHT,WIDTH),np.uint8);best=np.zeros((HEIGHT,WIDTH),int)
 for f in [1,3,4,5,7,9,10,11]:
  score=((block[:,:,:,2]==f)&chosen).sum(2);take=score>best;flags[take]=f;best[take]=score[take]
 coverage=np.rint(block[:,:,:,3].sum(2)/(SS*SS)).astype(np.uint8);material[coverage==0]=0
 # Keep pupils on the actual eye geometry rather than placing them over the face.
 from scipy.ndimage import label,center_of_mass
 labelled,nlabels=label(material==8)
 for group in range(1,nlabels+1):
  yy,xx=np.where(labelled==group)
  if len(yy):cy,cx=yy.mean(),xx.mean();flags[yy[(yy-cy)**2+(xx-cx)**2<1.7],xx[(yy-cy)**2+(xx-cx)**2<1.7]]=2
 return np.stack([material,shade,flags,coverage],axis=2)

def atomic(image,path):
 temporary=path.with_suffix('.png.tmp')
 with temporary.open('wb') as output:image.save(output,format='PNG',optimize=True);output.flush();os.fsync(output.fileno())
 os.replace(temporary,path)
 with Image.open(path) as check:check.verify()

with tempfile.TemporaryDirectory(prefix='aura-raster-') as directory:
 library=Path(directory)/'raster.so';subprocess.run(['g++','-std=c++17','-O3','-shared','-fPIC',str(ROOT/'scripts/raster-human-96.cpp'),'-o',str(library)],check=True)
 raster=ctypes.CDLL(str(library)).raster;ptr=ctypes.c_void_p;raster.argtypes=[ptr,ptr,ptr,ptr,ptr,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_int,ptr,ptr,ptr]
 rest=np.ascontiguousarray(V,dtype=np.float32);faces=np.ascontiguousarray(F,dtype=np.int32);mats=np.ascontiguousarray(slots,dtype=np.int32)
 for page in range(4) if args.page is None else [args.page]:
  page_rows=min(ROWS,POSES-page*ROWS);atlas=Image.new('RGBA',(WIDTH*DIRECTIONS,HEIGHT*page_rows));hair=Image.new('RGBA',(64*DIRECTIONS,96*page_rows));origins=[]
  for frame in range(page*ROWS,min(POSES,(page+1)*ROWS)):
   posed,normals=pose_vertices(frame);normals=np.ascontiguousarray(normals,dtype=np.float32)
   for direction in range(DIRECTIONS):
    yaw=direction*math.tau/DIRECTIONS;cam=np.array([math.sin(yaw)*math.cos(ELEVATION),math.sin(ELEVATION),math.cos(yaw)*math.cos(ELEVATION)])
    right=np.array([math.cos(yaw),0,-math.sin(yaw)]);up=np.cross(cam,right);axes=np.ascontiguousarray([right,up,cam],dtype=np.float32)
    screen=np.ascontiguousarray(np.column_stack(((WIDTH/2+posed@right*PPM)*SS,(ANCHOR-posed@up*PPM)*SS,posed@cam)),dtype=np.float32)
    base=np.zeros((HEIGHT*SS,WIDTH*SS,4),dtype=np.uint8);result=np.zeros_like(base)
    raster(screen.ctypes.data,normals.ctypes.data,rest.ctypes.data,faces.ctypes.data,mats.ctypes.data,len(F),base_triangles,WIDTH*SS,HEIGHT*SS,axes.ctypes.data,base.ctypes.data,result.ctypes.data)
    image=Image.fromarray(antialias(base));overlay=Image.fromarray(antialias(result,10));bbox=overlay.getbbox()
    if bbox is None:origin=[64,80]
    else:
     assert bbox[2]-bbox[0]<=64 and bbox[3]-bbox[1]<=94,bbox
     origin=[math.floor((bbox[0]+bbox[2]-64)/2),bbox[1]-1]
    crop=overlay.crop((origin[0],origin[1],origin[0]+64,origin[1]+96));origins.append(origin)
    atlas.paste(image,(direction*WIDTH,(frame%ROWS)*HEIGHT));hair.paste(crop,(direction*64,(frame%ROWS)*96))
   print('Rendered smooth animation',frame+1,'/',POSES,flush=True)
  atomic(atlas,ROOT/f'assets/models/human-motion-96-{page}.png');atomic(hair,ROOT/f'assets/models/human-curls-96-{page}.png')
  (ROOT/f'assets/models/human-origins-96-{page}.json').write_text(json.dumps(origins,separators=(',',':')))
  print('Saved page',page,flush=True)

# Rebuild the tiny placement script whenever every page is available.
paths=[ROOT/f'assets/models/human-origins-96-{page}.json' for page in range(4)]
if all(path.exists() for path in paths):
 origins=[origin for path in paths for origin in json.loads(path.read_text())]
 assert len(origins)==POSES*DIRECTIONS
 text=("/* Occluded curl placement for all 22 poses and 16 viewing directions. */\n(function(root){const data="
       +json.dumps({'origins':origins,'width':64,'height':96},separators=(',',':'))
       +";if(typeof module==='object'&&module.exports)module.exports=data;else root.AuraHumanDetail=data;})(typeof globalThis!=='undefined'?globalThis:this);\n")
 target=ROOT/'assets/models/human-details-96.js';temporary=target.with_suffix('.'+str(os.getpid())+'.tmp');temporary.write_text(text);os.replace(temporary,target)

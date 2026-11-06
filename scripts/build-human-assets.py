"""Build clothed game meshes and CPU-renderer animation atlases from MakeHuman CC0 data.
Usage: python scripts/build-human-assets.py /path/to/makehuman-source
Only model data is used; no MakeHuman application source is distributed.
"""
from pathlib import Path
import sys,json,math,collections,numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(sys.argv[1])/'makehuman/data'
vertices=[];uvs=[];faces=[];group='';joint_faces=collections.defaultdict(set)
for line in (SOURCE/'3dobjs/base.obj').read_text().splitlines():
 s=line.split()
 if not s:continue
 if s[0]=='v':vertices.append(list(map(float,s[1:4])))
 elif s[0]=='vt':uvs.append(list(map(float,s[1:3])))
 elif s[0]=='g':group=' '.join(s[1:])
 elif s[0]=='f':
  f=[int(t.split('/')[0])-1 for t in s[1:]]
  if group.startswith('joint-'):joint_faces[group].update(f)
  if group in ['body','helper-l-eye','helper-r-eye','helper-upper-teeth','helper-lower-teeth']:
   for i in range(1,len(f)-1):faces.append((f[0],f[i],f[i+1],group))
V=np.array(vertices,dtype=float)
for target,factor in [('universal-male-young-averagemuscle-averageweight.target',.65),('universal-male-young-maxmuscle-averageweight.target',.35),('caucasian-male-young.target',1)]:
 path=SOURCE/'targets/macrodetails'/target
 if not path.is_file():raise SystemExit('Missing CC0 shape target: '+str(path))
 for line in path.read_text().splitlines():
  parts=line.split()
  if len(parts)==4 and not line.startswith('#'):V[int(parts[0])]+=np.array(list(map(float,parts[1:])))*factor
original=V.copy();scale=1.88/(V.max(0)[1]-V.min(0)[1]);ground=V.min(0)[1];V[:,1]-=ground;V*=scale
joint=lambda name:V[list(joint_faces['joint-'+name])].mean(0)
J=np.array([joint(n) for n in ['pelvis','spine-3','spine-1','neck','head','r-upper-leg','r-knee','r-ankle','l-upper-leg','l-knee','l-ankle','r-shoulder','r-elbow','r-hand','l-shoulder','l-elbow','l-hand']])
parents=np.array([-1,0,1,2,3,0,5,6,0,8,9,2,11,12,2,14,15]);bind=J.copy()
for upper,knee,ankle in [(5,6,7),(8,9,10)]:
 bind[knee,0]=bind[upper,0];bind[ankle,0]=bind[upper,0]
for upper,elbow,hand in [(11,12,13),(14,15,16)]:
 bind[elbow]=bind[upper]+[0,-np.linalg.norm(J[elbow]-J[upper]),0]
 bind[hand]=bind[elbow]+[0,-np.linalg.norm(J[hand]-J[elbow]),0]
weights=np.zeros((len(V),17))
def target_bone(name):
 side=name.endswith('.L');leg=8 if side else 5;arm=14 if side else 11
 if name.startswith('upperleg'):return leg
 if name.startswith('lowerleg'):return leg+1
 if name.startswith(('foot','toe')):return leg+2
 if name.startswith('upperarm'):return arm
 if name.startswith('lowerarm'):return arm+1
 if name.startswith(('wrist','finger','metacarpal')):return arm+2
 if name.startswith(('shoulder','clavicle','breast')):return 2
 if name.startswith('neck'):return 3
 if name.startswith('spine'):return 2 if name in ('spine01','spine02') else 1
 if name.startswith(('pelvis','root')):return 0
 return 4
for name,pairs in json.loads((SOURCE/'rigs/default_weights.mhw').read_text())['weights'].items():
 b=target_bone(name)
 for index,w in pairs:weights[index,b]+=w
for index in np.flatnonzero(weights.sum(1)<1e-5):weights[index,np.argmin(np.linalg.norm(J-V[index],axis=1))]=1
weights/=weights.sum(1)[:,None]
def align(a,b):
 a=a/np.linalg.norm(a);b=b/np.linalg.norm(b);c=np.cross(a,b);d=np.dot(a,b)
 k=np.array([[0,-c[2],c[1]],[c[2],0,-c[0]],[-c[1],c[0],0]])
 return np.eye(3)+k+k@k/(1+d) if d>-.999 else np.diag([-1,-1,1])
rotations=np.repeat(np.eye(3)[None],17,axis=0)
for a,b in [(5,6),(6,7),(8,9),(9,10),(11,12),(12,13),(14,15),(15,16)]:rotations[a]=align(J[b]-J[a],bind[b]-bind[a])
for a,b in [(7,6),(10,9),(13,12),(16,15)]:rotations[a]=rotations[b]
posed=np.zeros_like(V)
for b in range(17):posed+=((V-J[b])@rotations[b].T+bind[b])*weights[:,b,None]
V=posed
# A football uniform adds an opaque cloth shell; no unclothed model is emitted.
ids=np.argsort(weights,axis=1)[:,-4:][:,::-1];W=np.take_along_axis(weights,ids,1);W/=W.sum(1)[:,None]
tri=[];materials=[]
for a,b,c,kind in faces:
 p=(V[a]+V[b]+V[c])/3;y=p[1];major=ids[[a,b,c],0];arm=np.any(np.isin(major,[11,12,13,14,15,16]));leg=np.any(np.isin(major,[5,6,7,8,9,10]));x=abs(p[0])
 if kind.startswith('helper-'):mat=7 if 'eye' in kind else 6
 elif y<.15:mat=4
 elif y<.48 and leg:mat=3
 elif y<1.055 and y>.76 and not arm:mat=1
 elif (1.035<y<1.555 and x<.245) or (arm and y>1.36):mat=0
 elif y>1.818 or (y>1.78 and p[2]<.045):mat=5
 else:mat=2
 tri.append([a,b,c]);materials.append(mat)
F=np.array(tri);M=np.array(materials)
used=np.unique(F);remap=np.full(len(V),-1);remap[used]=np.arange(len(used));F=remap[F];V=V[used];ids=ids[used];W=W[used]
# Thicken the kit very slightly and keep the silhouette continuous at the sleeves.
for i,p in enumerate(V):
 y=p[1]
 if 1.04<y<1.54 and abs(p[0])<.23:p[0]*=1.055;p[2]=.015+(p[2]-.015)*1.07
 if .78<y<1.04:p[0]*=1.035;p[2]=.015+(p[2]-.015)*1.06
N=np.zeros_like(V);faceN=np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]])
for k in range(3):np.add.at(N,F[:,k],faceN)
N/=np.maximum(1e-9,np.linalg.norm(N,axis=1))[:,None]
# Cylindrical cloth UVs are independent of the original body UV layout.
UV=np.column_stack(((np.arctan2(V[:,0],V[:,2]-.015)/(2*np.pi)+.5)%1,(V[:,1]-.9)/.65))
order=np.argsort(M,kind='stable');F=F[order];M=M[order];groups=[]
for mat in range(8):
 rows=np.flatnonzero(M==mat)
 if len(rows):groups.append([int(rows[0])*3,len(rows)*3,mat])
def rounded(a,n=5):return np.round(a,n).tolist()
data={'positions':rounded(V),'normals':rounded(N),'uv':rounded(UV),'indices':F.ravel().tolist(),'skinIndices':ids.tolist(),'skinWeights':rounded(W,4),'bones':[[int(parents[i])]+rounded(bind[i]-(bind[parents[i]] if parents[i]>=0 else 0)) for i in range(17)],'groups':groups,'height':1.88,'source':'MakeHuman base mesh, CC0'}
p=ROOT/'assets/models/footballer-mesh.js'
p.write_text('/* Clothed AURA mesh derived from MakeHuman CC0 core assets. */\n(function(root){const data='+json.dumps(data,separators=(',',':'))+';if(typeof module==="object"&&module.exports)module.exports=data;else root.AuraHumanMesh=data;})(typeof globalThis!=="undefined"?globalThis:this);\n')
import subprocess
subprocess.run([sys.executable,str(ROOT/'scripts/pack-human-mesh.py')],check=True)
print('Human mesh:',len(V),'vertices,',len(F),'triangles,',p.stat().st_size,'bytes',flush=True)
# The compatible renderer uses direction/pose sprites rendered from the SAME mesh.
# R=material index+1, G=lighting, B=shirt detail flag, A=coverage. Runtime recolours kits.
SW,SH,DIRECTIONS,POSES=96,176,16,12;SS=2
atlas=Image.new('RGBA',(SW*DIRECTIONS,SH*POSES))
projection_scale=69
restLocal=bind.copy()
for i in range(17):
 if parents[i]>=0:restLocal[i]-=bind[parents[i]]
def euler(x=0,y=0,z=0):
 cx,sx=math.cos(x),math.sin(x);cy,sy=math.cos(y),math.sin(y);cz,sz=math.cos(z),math.sin(z)
 return np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])@np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])@np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])
def frame_vertices(frame):
 R=np.repeat(np.eye(3)[None],17,axis=0);phase=(frame-1)/6*math.pi*2;speed=0 if frame==0 else 1;stride=math.sin(phase)*.66*speed;k1=max(0,-math.cos(phase))*.9*speed;k2=max(0,math.cos(phase))*.9*speed
 if frame>6:stride=0;k1=k2=0
 R[1]=euler(.10 if frame else 0);R[5]=euler(stride);R[8]=euler(-stride);R[6]=euler(k1);R[9]=euler(k2)
 R[11]=euler(-stride*.65,z=-.11);R[14]=euler(stride*.65,z=.11);R[12]=R[15]=euler(-.35 if frame else -.15)
 if frame in [7,8]:R[5]=euler(-.8 if frame==7 else -1.35);R[6]=euler(.25)
 if frame==9:R[11]=euler(-1.0,z=-.8);R[14]=euler(-1.0,z=.8)
 if frame==10:R[11]=euler(-1.3,z=-.6);R[14]=euler(-1.3,z=.6)
 if frame==11:R[11]=euler(z=-2.7);R[14]=euler(z=2.7)
 worldR=[];worldP=[]
 for i in range(17):
  parent=parents[i]
  worldR.append(R[i] if parent<0 else worldR[parent]@R[i]);worldP.append(restLocal[i] if parent<0 else worldP[parent]+worldR[parent]@restLocal[i])
 worldR=np.array(worldR);worldP=np.array(worldP);out=np.zeros_like(V);norm=np.zeros_like(N)
 for slot in range(4):
  b=ids[:,slot];r=worldR[b];w=W[:,slot,None];out+=(np.einsum('nij,nj->ni',r,V-bind[b])+worldP[b])*w;norm+=np.einsum('nij,nj->ni',r,N)*w
 return out,norm
for frame in range(POSES):
 posed,normals=frame_vertices(frame)
 for direction in range(DIRECTIONS):
  yaw=direction*2*math.pi/DIRECTIONS;elevation=.48;cam=np.array([math.sin(yaw)*math.cos(elevation),math.sin(elevation),math.cos(yaw)*math.cos(elevation)]);right=np.array([math.cos(yaw),0,-math.sin(yaw)]);up=np.cross(cam,right)
  xx=posed@right;yy=posed@up;zz=posed@cam
  points=np.column_stack((SW/2+xx*projection_scale,SH-17-yy*projection_scale))*SS
  normalLight=np.clip(normals@np.array([-.35,.83,.43]),0,1);rim=np.maximum(0,1-np.abs(normals@cam))**3*.13
  light=np.clip(.43+normalLight*.58+rim,0,1.2)
  faceLight=np.mean(light[F],axis=1);depth=zz[F].mean(1);faceNormals=np.cross(posed[F[:,1]]-posed[F[:,0]],posed[F[:,2]]-posed[F[:,0]]);visible=faceNormals@cam>0;centers=posed[F].mean(1);detailFlags=((centers[:,0]+.32)/.085).astype(int)%2==0;image=Image.new('RGBA',(SW*SS,SH*SS));draw=ImageDraw.Draw(image)
  for index in np.argsort(depth)[visible[np.argsort(depth)]]:
   f=F[index];p=points[f]
   mat=int(M[index]);detail=1 if mat==0 and detailFlags[index] else 0
   shade=int(max(0,min(255,faceLight[index]/1.2*255)))
   draw.polygon([tuple(t) for t in p],fill=(mat+1,shade,detail,255))
  # Nearest material IDs; antialias only alpha and lighting to preserve material identities.
  encoded=np.array(image);small=encoded[::SS,::SS].copy();coverage=np.array(image.getchannel('A').resize((SW,SH),Image.Resampling.BOX));shade=np.array(image.getchannel('G').resize((SW,SH),Image.Resampling.BOX));small[:,:,1]=shade;small[:,:,3]=coverage
  atlas.paste(Image.fromarray(small),(direction*SW,frame*SH))
 print('Baked pose',frame+1,'/',POSES,flush=True)
atlas.save(ROOT/'assets/models/human-motion.png',optimize=True)
# Human terrace fans are rendered from the mesh, rather than coloured box heads.
raw=np.array(atlas);rng=np.random.default_rng(827);crowd=Image.new('RGB',(2048,512),'#1a2230')
palettes=[['#9c7456','#a82747','#142e63','#284064','#19212a','#302622','#e4d39f','#141820'],['#cea583','#c8c8c3','#393d45','#c6c5bd','#1c2026','#302722','#c3b995','#171a22'],['#bd9170','#233c69','#1b2a43','#334a75','#25272e','#342a21','#c4bda1','#1b2127']]
def color_sprite(tile,palette):
 a=np.array(tile).copy();rgb=np.zeros_like(a[:,:,:3]);factor=a[:,:,1]/255*1.2
 # Slots follow the GPU material groups: shirt, shorts, skin, socks, boots, hair, trim, eyes.
 colors=[palette[1],palette[2],palette[0],palette[3],palette[4],palette[5],palette[6],palette[7]]
 for m,color in enumerate(colors):
  mask=a[:,:,0]==m+1;v=np.array([int(color[i:i+2],16) for i in [1,3,5]])
  rgb[mask]=np.clip(v[None,:]*factor[mask,None],0,255)
 return Image.fromarray(np.dstack((rgb,a[:,:,3])))
for row in range(14):
 for col in range(103):
  if col%26 in [0,1]:continue
  p=palettes[int(rng.integers(0,len(palettes)))];tile=atlas.crop((0,0,SW,SH));fan=color_sprite(tile,p)
  fan=fan.crop((17,12,79,95)).resize((20,34),Image.Resampling.LANCZOS)
  crowd.paste(fan,(col*20+int(rng.integers(-1,2)),row*35+5),fan)
crowd.save(ROOT/'assets/textures/crowd-terrace.webp',quality=89)
# A human-scale model preview in the Barcelona palette, for asset verification.
preview=Image.new('RGB',(SW*8,SH*2),'#253141')
for i,d in enumerate([0,2,4,6,8,10,12,14]):
 tile=atlas.crop((d*SW,0,(d+1)*SW,SH));c=color_sprite(tile,palettes[0]);preview.paste(c,(i*SW,0),c)
 tile=atlas.crop((d*SW,3*SH,(d+1)*SW,4*SH));c=color_sprite(tile,palettes[0]);preview.paste(c,(i*SW,SH),c)
preview.resize((1536,704)).save(ROOT.parent/'human-model-preview.png')
print('Assets complete:',ROOT/'assets/models/human-motion.png',flush=True)

"""Build the game-ready AURA Arena mesh in Blender; export the actual runtime asset."""
import bpy, math, json, base64, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
verts=[];faces=[];slots=[]
def point(a,rx,rz,y):
 c,s=math.cos(a),math.sin(a)
 return (math.copysign(abs(c)**.57,c)*rx,y,math.copysign(abs(s)**.57,s)*rz)
def quad(a,b,c,d,slot):
 i=len(verts);verts.extend([a,b,c,d]);faces.append((i,i+1,i+2,i+3));slots.append(slot)
def rod(a,b,r=.10,slot=3,sides=8):
 a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0)))
 if u.length<.01:u=axis.cross(Vector((1,0,0)))
 u.normalize();v=axis.cross(u).normalized()
 for i in range(sides):
  p=math.tau*i/sides;q=math.tau*(i+1)/sides
  x=u*math.cos(p)*r+v*math.sin(p)*r;z=u*math.cos(q)*r+v*math.sin(q)*r
  quad(tuple(a+x),tuple(b+x),tuple(b+z),tuple(a+z),slot)
SEG=96;ROWS=8
for tier in range(3):
 for row in range(ROWS):
  rx=65+tier*9+row*1.02;rz=45+tier*7+row*.81;y=1.25+tier*5.7+row*.56
  for i in range(SEG):
   a=math.tau*i/SEG;b=math.tau*(i+1)/SEG
   quad(point(a,rx,rz,y),point(b,rx,rz,y),point(b,rx+1.02,rz+.81,y),point(a,rx+1.02,rz+.81,y),0)
   quad(point(a,rx+1.02,rz+.81,y),point(b,rx+1.02,rz+.81,y),point(b,rx+1.02,rz+.81,y+.56),point(a,rx+1.02,rz+.81,y+.56),0)
 for i in range(SEG):
  a=math.tau*i/SEG;b=math.tau*(i+1)/SEG
  rx,rz=65+tier*9,45+tier*7;y=1.15+tier*5.7
  quad(point(a,rx-.2,rz-.2,y),point(b,rx-.2,rz-.2,y),point(b,rx-.2,rz-.2,y+.7),point(a,rx-.2,rz-.2,y+.7),4)
  if tier>0:quad(point(a,rx-.24,rz-.24,y+.1),point(b,rx-.24,rz-.24,y+.1),point(b,rx-.24,rz-.24,y+.23),point(a,rx-.24,rz-.24,y+.23),5)
for i in range(SEG):
 a=math.tau*i/SEG;b=math.tau*(i+1)/SEG
 quad(point(a,68,46,22.8),point(b,68,46,22.8),point(b,95,74,27),point(a,95,74,27),2)
 quad(point(a,68,46,22.6),point(b,68,46,22.6),point(b,68,46,22.85),point(a,68,46,22.85),5)
 if i%3!=0:quad(point(a,95,74,1),point(b,95,74,1),point(b,95,74,26.8),point(a,95,74,26.8),1)
for i in range(32):
 a=math.tau*i/32
 top=point(a,94,73,27.2);inner=point(a,68,46,22.9);low=point(a,94,73,24.4)
 rod(point(a,94,73,0),top,.16);rod(top,inner,.13);rod(low,inner,.1)
 for j in range(1,5):
  t=j/5;p=tuple(top[k]*(1-t)+inner[k]*t for k in range(3));q=tuple(low[k]*(1-t)+inner[k]*t for k in range(3));rod(p,q,.065)
mesh=bpy.data.meshes.new('Arena100_GameMesh');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('AURA_ARENA_100',mesh);bpy.context.collection.objects.link(obj)
for name in ['Concrete','Facade','Canopy','Steel','Ribbon','Light']:
 mat=bpy.data.materials.new(name);obj.data.materials.append(mat)
for p,slot in zip(mesh.polygons,slots):p.material_index=slot
mesh.calc_loop_triangles();indices=[];groups=[]
for slot in range(6):
 start=len(indices)
 for t in mesh.loop_triangles:
  if mesh.polygons[t.polygon_index].material_index==slot:indices.extend(t.vertices)
 groups.append([start,len(indices)-start,slot])
def pack(values,fmt):return base64.b64encode(struct.pack('<'+fmt*len(values),*values)).decode()
p=[round(c*300) for v in mesh.vertices for c in v.co]
n=[max(-32767,min(32767,round(c*32767))) for v in mesh.vertices for c in v.normal]
assert max(map(abs,p))<32767 and len(mesh.vertices)<65536
data={'p':pack(p,'h'),'n':pack(n,'h'),'i':pack(indices,'H'),'groups':groups}
script="""/* Original AURA Arena, built in Blender. Source: scripts/build-arena-100.py. */
(function(root){'use strict';const d=DATA;
function decode(s,C){const b=typeof Buffer!=='undefined'?Uint8Array.from(Buffer.from(s,'base64')):Uint8Array.from(atob(s),c=>c.charCodeAt(0));return new C(b.buffer);}
const p=decode(d.p,Int16Array),n=decode(d.n,Int16Array),positions=Float32Array.from(p,x=>x/300),normals=Float32Array.from(n,x=>x/32767);
const model={positions,normals,indices:decode(d.i,Uint16Array),groups:d.groups,roofY:27,roofZ:74,version:'10.0-radical',source:'Blender 4.3'};
if(typeof module==='object'&&module.exports)module.exports=model;else root.AuraArenaMesh100=model;})(typeof globalThis!=='undefined'?globalThis:this);
""".replace('DATA',json.dumps(data,separators=(',',':')))
out=ROOT/'assets/models/arena-100.js';out.write_text(script)
print(json.dumps({'asset':str(out),'vertices':len(mesh.vertices),'triangles':len(indices)//3,'bytes':out.stat().st_size}))

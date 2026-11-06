from pathlib import Path
import json,base64,numpy as np
p=Path(__file__).resolve().parents[1]/'assets/models/footballer-mesh.js'
s=p.read_text();d=json.loads(s.split('const data=',1)[1].split(';if(typeof module',1)[0])
def enc(a,dtype):return base64.b64encode(np.array(a,dtype=dtype).tobytes()).decode()
packed={
 'positions':enc(np.round(np.array(d['positions']).ravel()*10000),'<i2'),
 'normals':enc(np.round(np.array(d['normals']).ravel()*127),'i1'),
 'uv':enc(np.round(np.array(d['uv']).ravel()*10000),'<i2'),
 'indices':enc(d['indices'],'<u2'),
 'skinIndices':enc(np.array(d['skinIndices']).ravel(),'u1'),
 'skinWeights':enc(np.round(np.array(d['skinWeights']).ravel()*255),'u1')}
header='''/* Football uniform mesh derived from MakeHuman CC0. Source and license: assets/licenses/makehuman-cc0.txt. */
(function(root){'use strict';
const packed=PACKED;
function unpack(text,Type,scale=1){const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const source=new Type(bytes.buffer);return scale===1?source:Float32Array.from(source,n=>n/scale);}
const data={positions:unpack(packed.positions,Int16Array,10000),normals:unpack(packed.normals,Int8Array,127),uv:unpack(packed.uv,Int16Array,10000),indices:unpack(packed.indices,Uint16Array),skinIndices:unpack(packed.skinIndices,Uint8Array),skinWeights:unpack(packed.skinWeights,Uint8Array,255),bones:BONES,groups:GROUPS,height:1.88,vertexCount:VERTICES,triangleCount:TRIANGLES,atlas:{width:96,height:176,directions:16,poses:12}};
for(let i=0;i<data.skinWeights.length;i+=4){const n=data.skinWeights[i]+data.skinWeights[i+1]+data.skinWeights[i+2]+data.skinWeights[i+3]||1;for(let j=0;j<4;j++)data.skinWeights[i+j]/=n;}
if(typeof module==='object'&&module.exports)module.exports=data;else root.AuraHumanMesh=data;
})(typeof globalThis!=='undefined'?globalThis:this);
'''
header=header.replace('PACKED',json.dumps(packed,separators=(',',':'))).replace('BONES',json.dumps(d['bones'],separators=(',',':'))).replace('GROUPS',json.dumps(d['groups'],separators=(',',':'))).replace('VERTICES',str(len(d['positions']))).replace('TRIANGLES',str(len(d['indices'])//3))
p.write_text(header)
print('Packed model bytes',p.stat().st_size)

/* AURA Arena Next: actual scene geometry, player presentation and a bounded M5 profile. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraNext=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function point(a,rx,rz,y){const c=Math.cos(a),s=Math.sin(a);return [Math.sign(c)*Math.pow(Math.abs(c),.57)*rx,y,Math.sign(s)*Math.pow(Math.abs(s),.57)*rz];}
 function lighting(stadium,weather){const day=stadium==='day',sunset=stadium==='sunset',rain=weather==='rain';return {exposure:day?1.02:sunset?1.04:1.03,ambient:day?.82:.55,key:day?2.65:sunset?2.15:1.18,fill:day?.42:.38,rim:day?.65:1.15,sky:rain?0x3b4d59:day?0x9abac9:sunset?0x55556a:0x070d18,keyColor:sunset?0xffd8b3:0xf0f4ff,rimColor:0xc6dcff};}
 function budget(quality,width,height,dpr=1){const maxPixels=quality==='ultra'?3600000:quality==='high'?2400000:quality==='low'?1000000:1600000,ceiling=quality==='ultra'?1.8:quality==='high'?1.5:1.25;return Math.max(.1,Math.min(Number.isFinite(dpr)&&dpr>0?dpr:1,ceiling,Math.sqrt(maxPixels/Math.max(1,(Number.isFinite(width)&&width>0?width:1)*(Number.isFinite(height)&&height>0?height:1)))));}
 function cameraFrame(game,mode,aspect,preview){
  if(preview)return null;
  if(mode==='portrait'){
   const p=game?.players?.[game.controlled]||game?.players?.[0];if(!p)return null;
   const x=Number.isFinite(p.x)?p.x:0,z=Number.isFinite(p.z)?p.z:0,fx=Number.isFinite(p.faceX)?p.faceX:0,fz=Number.isFinite(p.faceZ)?p.faceZ:1,len=Math.hypot(fx,fz)||1;
   return {position:[x+fx/len*2.6+fz/len*.85,1.72,z+fz/len*2.6-fx/len*.85],target:[x,1.46,z],fov:aspect<1?40:31};
  }
  if(!['stadium','broadcast','tele'].includes(mode))return null;
  const ball=game?.ball||{},x=clamp(Number.isFinite(ball.x)?ball.x:0,-53,53),z=clamp(Number.isFinite(ball.z)?ball.z:0,-35,35),d=game?.half===2?-1:1;
  const portrait=aspect<1?1.42:aspect<1.3?1.16:1,lead=clamp((ball.vx||0)*.12,-3,3);
  if(mode==='stadium')return {position:[clamp(x-d*11.8*portrait,-61,61),9.6*portrait,clamp(z*.72+18.5*portrait,-5,41)],target:[x+d*2.5+lead,.78,z*.86-2.2],fov:51};
  if(mode==='tele')return {position:[x*.94-d*3,12.8*portrait,z*.55+21*portrait],target:[x+lead,.8,z*.82],fov:42};
  return {position:[x*.9-2,17*portrait,z*.48+26*portrait],target:[x+lead,.5,z*.78],fov:45};
 }
 function pose(player,game,base){
  const speed=base.speed,phase=base.cycle,swing=Math.sin(phase),support=Math.cos(phase);
  return {...base,stride:swing*.65*speed,kneeLeft:Math.pow(Math.max(0,-support),1.5)*1.05*speed,kneeRight:Math.pow(Math.max(0,support),1.5)*1.05*speed,
   hipTwist:Math.cos(phase)*.065*speed,chestTwist:-Math.cos(phase)*.115*speed,lean:base.lean*.78,jump:base.celebrate?base.jump:Math.abs(Math.sin(phase*2))*.018*speed,
   headYaw:clamp((player.turn||0)*.08,-.12,.12)+base.headYaw};
 }
 function stadium(T,c){
  const {scene,material,geometry,mesh,basic,texture,canvas,options}=c;
  const data=typeof AuraArenaMesh100!=='undefined'?AuraArenaMesh100:null;if(!data)return null;
  const g=geometry('arena-next-blender',()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(data.positions,3));g.setAttribute('normal',new T.BufferAttribute(data.normals,3));g.setIndex(new T.BufferAttribute(data.indices,1));for(const [start,count,slot] of data.groups)g.addGroup(start,count,slot);return g;});
  const day=options.stadium==='day',steel=material(0x727f87,{metalness:.75,roughness:.36});
  const mats=[material(0x263b49,{roughness:.91}),material(0x172b3c,{metalness:.5,roughness:.48}),material(day?0x84979f:0x283e53,{metalness:.24,roughness:.62,side:T.DoubleSide}),steel,material(0x101c28),material(0xdbeaff,{emissive:0xc7e1ff,emissiveIntensity:day?.4:2.2,roughness:.4})];
  const arena=mesh(g,mats);arena.name='arena-next-blender';arena.receiveShadow=true;arena.castShadow=options.quality!=='low';
  // Crowd is instanced in the bowl, with aisles rather than repeated photographs.
  const low=options.quality==='low',ultra=options.quality==='ultra',rows=options.preview?3:low?4:ultra?9:7,columns=options.preview?180:low?320:ultra?660:500,places=[];
  for(let tier=0;tier<3;tier++)for(let row=0;row<rows;row++)for(let i=0;i<columns;i++){
   if(i%32<2||(i*37+row*17)%101<4)continue;
   const a=(i+.5)/columns*Math.PI*2,r=(row+.5)/rows*8;
   places.push([...point(a,65+tier*9+r,45+tier*7+r*.795,1.35+tier*5.7+r*.548),a]);
  }
  const crowdMat=material(0xffffff,{roughness:.95}),bodies=new T.InstancedMesh(geometry('next-fan-body',()=>new T.CylinderGeometry(.165,.14,.45,5)),crowdMat,places.length),heads=new T.InstancedMesh(geometry('next-fan-head',()=>new T.SphereGeometry(.115,6,4)),crowdMat,places.length);
  bodies.name='arena-next-crowd';heads.name='arena-next-crowd-heads';scene.add(bodies,heads);
  const dummy=new T.Object3D(),color=new T.Color(),shirts=[0x8da9be,0xc5cdd0,0x354b68,0xa5274b,0x48687c,0x21364b,0xb7b3a4,0x274d6c],skins=[0xc29a7f,0x9c7459,0xddbd9b,0x805c47];
  function fan(i,bounce=0){const [x,y,z,a]=places[i];dummy.position.set(x,y+.36+bounce,z);dummy.rotation.set(0,-a+Math.PI/2,0);dummy.scale.set(1,1+(i%7)*.018,1);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);dummy.position.y=y+.71+bounce;dummy.scale.set(1,1.06,1);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);}
  places.forEach((p,i)=>{fan(i);color.set(shirts[(i*13+Math.floor(p[0]))&7]);bodies.setColorAt(i,color);color.set(skins[i%4]);heads.setColorAt(i,color);});
  // Real local light sources; only the main key light casts dynamic shadows.
  for(const x of [-46,46])for(const z of [-32,32]){const light=new T.SpotLight(0xe3edff,day?220:3900,160,.66,.65,2);light.position.set(x,22,z);light.target.position.set(x*.2,0,z*.15);light.name='arena-next-floodlight';scene.add(light,light.target);}
  const ribbonCanvas=canvas(1024,80),ctx=ribbonCanvas.getContext('2d');ctx.fillStyle='#0b1a2c';ctx.fillRect(0,0,1024,80);ctx.fillStyle='#c4ff63';ctx.fillRect(0,75,1024,5);ctx.font='italic bold 36px Arial';ctx.textAlign='center';ctx.fillText('AURA  /  THE NEXT GAME',512,53);
  const map=texture(ribbonCanvas),led=material(0xffffff,{map,emissive:0xabc9ef,emissiveMap:map,emissiveIntensity:.48,side:T.DoubleSide});
  const rp=[],uv=[];for(let i=0;i<96;i++){const a=i/96*Math.PI*2,b=(i+1)/96*Math.PI*2,p=point(a,70.4,47.6,6.5),q=point(b,70.4,47.6,6.5),r=[...q],s=[...p];r[1]+=.9;s[1]+=.9;rp.push(...p,...q,...r,...p,...r,...s);const u=i/96*14,v=(i+1)/96*14;uv.push(u,0,v,0,v,1,u,0,v,1,u,1);}
  map.wrapS=T.RepeatWrapping;const rg=geometry('arena-next-ribbon',()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(rp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;});mesh(rg,led).name='arena-next-ribbon';
  let previous=-1000;
  return {roofY:data.roofY,roofZ:data.roofZ,update(now){if(now-previous<250)return;previous=now;map.offset.x=now*.000005;for(let i=0;i<Math.min(180,places.length);i++)fan(i,Math.sin(now*.003+i)*.035);bodies.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;}};
 }
 function softwareStadium(elements,seats,banks,quality){
  const add=(vertices,color)=>elements.push({vertices,color,center:vertices.reduce((a,p)=>a.map((n,i)=>n+p[i]/vertices.length),[0,0,0])});
  const seg=64,rows=quality==='low'?3:5,cols=quality==='low'?160:260;
  for(let tier=0;tier<3;tier++){
   for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2,y=1.2+tier*5.7,rx=65+tier*9,rz=45+tier*7;add([point(a,rx,rz,y),point(b,rx,rz,y),point(b,rx+8,rz+6.4,y+4.5),point(a,rx+8,rz+6.4,y+4.5)],tier%2?'#334b5c':'#293e50');add([point(a,rx-.1,rz-.1,y),point(b,rx-.1,rz-.1,y),point(b,rx-.1,rz-.1,y+.7),point(a,rx-.1,rz-.1,y+.7)],'#111e2c');if(tier>0)add([point(a,rx-.16,rz-.16,y+.12),point(b,rx-.16,rz-.16,y+.12),point(b,rx-.16,rz-.16,y+.23),point(a,rx-.16,rz-.16,y+.23)],'#d2edff');}
   for(let row=0;row<rows;row++)for(let i=0;i<cols;i++){const seed=(i*73+row*131+tier*311)%997;if(i%22<2||seed%31===0)continue;const r=(row+.5)/rows*8,p=point((i+.5+(seed%13-6)*.027)/cols*Math.PI*2,65+tier*9+r,45+tier*7+r*.795,1.35+tier*5.7+r*.548);seats.push({x:p[0],y:p[1],z:p[2],color:['#9baebf','#233b5b','#a9b6bd','#8a334c','#425c6c','#253a50','#b2afa3','#354b68'][seed%8]});}
  }
  for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;add([point(a,68,46,22.8),point(b,68,46,22.8),point(b,95,74,27),point(a,95,74,27)],'#324a5c');add([point(a,68,46,22.65),point(b,68,46,22.65),point(b,68,46,22.85),point(a,68,46,22.85)],'#e0f0ff');}
 }
 return {version:'10.0 Arena Next',headScale:1.08,point,lighting,budget,cameraFrame,pose,stadium,softwareStadium};
});

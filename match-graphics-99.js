/* Three.js renderer. All stadium meshes and textures are generated locally. */
const AuraGraphics=(()=>{
  "use strict";
  let webglUnavailable=false;
  const palettes={
    barcelona:["#b51d4a","#16439b","#e9c64a"],madrid:["#f4f1e8","#ede7db","#b99751"],
    city:["#71bddb","#e9edf3","#173b58"],liverpool:["#ca2734","#a71924","#f4e8c2"],
    boca:["#164197","#e7bc29","#e7bc29"],river:["#ecece7","#cf3036","#252b34"],
    guayaquil:["#e7c62f","#111925","#df3133"],quito:["#eeeae4","#c43b39","#253c67"],
    arsenal:["#c52d3a","#f6f3e9","#f3e7d5"],paris:["#192b54","#d52c4b","#edebe6"],
    munich:["#c42c3d","#bf1b32","#f7f0ec"],milan:["#204190","#171d29","#e7e9ef"],
    acmilan:["#bb2536","#151a22","#f0e9df"],dortmund:["#e6cd3a","#20252c","#1c2129"],
    london:["#2753b9","#1d45a6","#eeeeeb"],united:["#c7333a","#212731","#e9e1d3"],
    juventus:["#e9e9e1","#171d26","#cbb387"],atletico:["#d03b41","#eeece6","#24468b"]
  };
  function kit(club,away=false){
    if(away)return ["#ebe6d9","#cdbf9e","#26343c"];
    const name=((club?.id||'')+' '+(club?.name||'aura')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const aliases=[[/barcelona sc/,'guayaquil'],[/atletico.*madrid/,'atletico'],[/real.*madrid/,'madrid'],[/ac milan/,'acmilan'],[/inter.*milan|internazionale/,'milan'],[/manchester united/,'united'],[/manchester city/,'city'],[/bayern/,'munich'],[/chelsea/,'london'],[/psg|paris saint/,'paris']];
    const known=palettes[club?.id]||palettes[aliases.find(([pattern])=>pattern.test(name))?.[1]]||Object.entries(palettes).find(([k])=>name.includes(k))?.[1];
    if(known)return known;
    let n=0;for(const c of name)n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;
    return ["#"+(0x294050+(n%0x8a7a7a)).toString(16).padStart(6,"0"),"#182c40","#eee6d8"];
  }
  function create(container,options={}){
    if(!globalThis.THREE||webglUnavailable)throw Error('WebGL no está disponible.');
    const T=THREE,P=AuraPresentation,M=typeof AuraMaterials!=='undefined'?AuraMaterials:null,L=typeof AuraLook!=='undefined'?AuraLook:null,lighting=L?L.light(options.stadium,options.weather):null,quality=options.quality||'medium',preview=!!options.preview;
    const F=typeof AuraFaces!=='undefined'?AuraFaces:null,FM=typeof AuraFaceMasks!=='undefined'?AuraFaceMasks:null;
    const low=quality==='low',ultra=quality==='ultra',high=ultra||quality==='high';
    const raining=options.weather==='rain',day=options.stadium==='day',sunset=options.stadium==='sunset';
    const profile={pixel:ultra?2:high?1.75:low?1:1.5,texture:ultra?4096:low?1024:2048,rows:ultra?16:high?13:low?5:9,columns:ultra?172:high?150:low?76:124};
    let renderer;
    try{renderer=new T.WebGLRenderer({antialias:!low,alpha:false,powerPreference:'high-performance'});}
    catch(error){webglUnavailable=true;throw error;}
    const basePixelRatio=Math.min(globalThis.devicePixelRatio||1,profile.pixel);
    renderer.setPixelRatio(basePixelRatio);renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=lighting?.exposure??(day?1.08:sunset?1.14:1.22);
    renderer.shadowMap.enabled=!low;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label','AURA VISION: partido 3D, césped detallado y estadio lleno');
    container.appendChild(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,1,.1,440);
    scene.background=new T.Color(lighting?.sky??(raining?(day?0x758087:0x182431):day?0x9ebac8:sunset?0x59576b:0x0b1425));
    scene.fog=new T.Fog(scene.background,raining?90:155,raining?240:350);
    const textures=new Set(),geometries=new Set(),materials=new Set(),skeletons=new Set(),geometryCache=new Map(),materialCache=new Map();
    let disposed=false,observer=null;
    function geometry(key,make){if(!geometryCache.has(key)){const g=make();geometryCache.set(key,g);geometries.add(g);}return geometryCache.get(key);}
    function material(color,extra={}){
      const shared=!Object.values(extra).some(value=>value?.isTexture),key=shared?JSON.stringify([color,extra]):null;
      if(shared&&materialCache.has(key))return materialCache.get(key);
      const m=new T.MeshStandardMaterial({color,roughness:.83,...extra});materials.add(m);
      if(shared)materialCache.set(key,m);return m;
    }
    function basic(options){const m=new T.MeshBasicMaterial(options);materials.add(m);return m;}
    function mesh(g,m,x=0,y=0,z=0,parent=scene){geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
    function box(w,h,d,m,x,y,z,parent=scene){return mesh(geometry('b:'+w+':'+h+':'+d,()=>new T.BoxGeometry(w,h,d)),m,x,y,z,parent);}
    function cylinder(r,h,m,x,y,z,parent=scene){return mesh(geometry('c:'+r+':'+h,()=>new T.CylinderGeometry(r,r,h,low?8:12)),m,x,y,z,parent);}
    function texture(c,color=true){const t=new T.CanvasTexture(c);if(color)t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(high?16:4,renderer.capabilities.getMaxAnisotropy());textures.add(t);return t;}
    const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const faceLibrary=F?.create(canvas,typeof Image==='function'?Image:null),faceMaps=new Map(),maskLibrary=FM?.create(canvas,typeof Image==='function'?Image:null),maskMaterials=new Map();
    function photoMask(player){
      const entry=maskLibrary?.get(player);if(!entry)return null;
      if(!maskMaterials.has(entry.key)){const map=texture(entry.canvas),mat=basic({map,transparent:true,depthWrite:false,toneMapped:false,side:T.FrontSide});mat.visible=entry.ready;
        maskLibrary.get(player,()=>{if(!disposed){map.needsUpdate=true;mat.visible=true;}});maskMaterials.set(entry.key,mat);}
      const mat=maskMaterials.get(entry.key).clone();materials.add(mat);const mask=new T.Mesh(geometry('face-mask-plane',()=>new T.PlaneGeometry(FM.width,FM.height)),mat);mask.userData.entry=entry;return mask;
    }
    function faceMaterial(key){
      if(!faceMaps.has(key)){const entry=faceLibrary.get(key),map=texture(entry.canvas);map.flipY=false;
        faceLibrary.get(key,()=>{if(!disposed)map.needsUpdate=true;});
        const mat=material(0xffffff,{map,roughness:.78,metalness:0});mat.name='portrait-face:'+key;faceMaps.set(key,mat);}
      return faceMaps.get(key);
    }
    let seed=8721;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const concrete=material(0x28333d),rail=material(0x8b959a,{metalness:.55,roughness:.42}),black=material(0x111c29);
    const luminous=material(0xe8edfc,{emissive:0xc7ddff,emissiveIntensity:2.1,roughness:.4});
    const postMat=material(0xf3f3ef,{roughness:.33,metalness:.16});
    scene.add(new T.HemisphereLight(day?0xd7eaff:sunset?0xf5d9c1:0xbacdea,0x25301e,lighting?.ambient??(day?1.25:.78)));
    const sun=new T.DirectionalLight(lighting?.keyColor??(raining?0xe2e9ef:sunset?0xffd3a3:0xfff8ed),lighting?.key??(day?2.7:2.6));
    sun.position.set(day?-38:-24,day?62:48,day?30:-25);scene.add(sun);
    if(!low){sun.castShadow=true;sun.shadow.mapSize.set(ultra?3072:high?2048:1024,ultra?3072:high?2048:1024);
      Object.assign(sun.shadow.camera,{left:-66,right:66,top:49,bottom:-49,near:1,far:150});sun.shadow.bias=-.00018;sun.shadow.normalBias=.035;sun.shadow.radius=3;}
    // Follow the action so shadow texels cover the players rather than the whole empty pitch.
    const shadowTarget=new T.Object3D();scene.add(shadowTarget);sun.target=shadowTarget;
    const shadowReach=high?29:39;
    if(!low)Object.assign(sun.shadow.camera,{left:-shadowReach,right:shadowReach,top:shadowReach,bottom:-shadowReach});
    const fill=new T.DirectionalLight(day?0xbdd9fc:0xd5e3ff,lighting?.fill??(day?.5:.42));fill.position.set(32,34,35);scene.add(fill);
    const rim=new T.DirectionalLight(lighting?.rimColor??0xd2e4ff,lighting?.rim??.62);rim.position.set(0,24,-44);scene.add(rim);
    box(270,1.2,210,material(0x132329),0,-.8,0);
    box(121,.12,80,material(0x27452d),0,-.075,0);
    // Full-pitch albedo plus a separate repeating grass-fibre bump map.
    const turf=canvas(profile.texture,profile.texture/2),ctx=turf.getContext('2d'),tw=turf.width,th=turf.height;
    ctx.fillStyle='#345e2b';ctx.fillRect(0,0,tw,th);
    for(let i=0;i<20;i++){ctx.fillStyle=i%2?'#3d692f':'#355e2a';ctx.fillRect(i*tw/20,0,tw/20+1,th);}
    for(let i=0;i<(low?30000:140000);i++){
      const x=rnd()*tw,y=rnd()*th;ctx.fillStyle=rnd()>.52?'#bad17b28':'#112e1b30';
      ctx.fillRect(x,y,.5+rnd()*.8,1+rnd()*3.7);
    }
    for(const sign of [-1,1])for(let i=0;i<620;i++){
      const x=tw/2+sign*(tw*.465+rnd()*tw*.028),y=th*(.38+rnd()*.24);
      ctx.fillStyle=i%3?'#a49a5914':'#173b2522';ctx.fillRect(x,y,1+rnd()*7,1+rnd()*3);
    }
    const turfMap=texture(turf);
    if(typeof Image==='function'){
      const photo=new Image();photo.crossOrigin='anonymous';photo.onload=()=>{if(disposed)return;
        ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(photo,0,0,tw,th);turfMap.needsUpdate=true;
      };photo.src='./assets/textures/pitch-cinema-96.webp';
    }
    const fibres=canvas(256,256),fc=fibres.getContext('2d');fc.fillStyle='#808080';fc.fillRect(0,0,256,256);
    for(let i=0;i<12000;i++){fc.fillStyle=rnd()>.5?'#afafaf':'#505050';fc.fillRect(rnd()*256,rnd()*256,.7,.6+rnd()*4);}
    const fibreMap=texture(fibres,false);fibreMap.wrapS=fibreMap.wrapT=T.RepeatWrapping;fibreMap.repeat.set(75,49);
    const pitch=mesh(geometry('pitch',()=>new T.PlaneGeometry(105,68)),material(0xffffff,{map:turfMap,bumpMap:low?null:fibreMap,bumpScale:raining?.026:.052,roughness:raining?.58:.96}),0,.015,0);
    pitch.rotation.x=-Math.PI/2;pitch.receiveShadow=true;
    // World-space painted line widths stay readable without depending on GL line width.
    const paint=[];
    function line(x1,z1,x2,z2,width=.105){const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz)||1,ox=dz/length*width/2,oz=-dx/length*width/2;
      const a=[x1+ox,.031,z1+oz],b=[x2+ox,.031,z2+oz],c=[x2-ox,.031,z2-oz],d=[x1-ox,.031,z1-oz];paint.push(...a,...b,...c,...a,...c,...d);}
    function rect(x1,z1,x2,z2){line(x1,z1,x2,z1);line(x2,z1,x2,z2);line(x2,z2,x1,z2);line(x1,z2,x1,z1);}
    function arc(cx,cz,r,start=0,end=Math.PI*2){const steps=Math.max(12,Math.ceil((end-start)*r*2));for(let i=0;i<steps;i++){const a=start+(end-start)*i/steps,b=start+(end-start)*(i+1)/steps;line(cx+Math.cos(a)*r,cz+Math.sin(a)*r,cx+Math.cos(b)*r,cz+Math.sin(b)*r);}}
    rect(-52.5,-34,52.5,34);line(0,-34,0,34);arc(0,0,9.15);arc(0,0,.12);
    for(const sign of [-1,1]){rect(sign*52.5,-20.16,sign*36,20.16);rect(sign*52.5,-9.16,sign*47,9.16);arc(sign*41.5,0,.13);
      const angle=Math.acos(5.5/9.15);arc(sign*41.5,0,9.15,sign===1?Math.PI-angle:-angle,sign===1?Math.PI+angle:angle);}
    for(const x of [-52.5,52.5])for(const z of [-34,34]){const start=x>0?(z>0?Math.PI:Math.PI/2):(z>0?-Math.PI/2:0);arc(x,z,1,start,start+Math.PI/2);}
    const paintGeo=new T.BufferGeometry();paintGeo.setAttribute('position',new T.Float32BufferAttribute(paint,3));paintGeo.computeVertexNormals();
    mesh(paintGeo,material(0xf0efe4,{roughness:.95,side:T.DoubleSide}));
    const netMat=new T.LineBasicMaterial({color:0xe1e9e9,transparent:true,opacity:low?.38:.57});materials.add(netMat);const goalNets=[];
    for(const sign of [-1,1]){
      const x=sign*52.6,back=sign*54.9;
      cylinder(.065,2.44,postMat,x,1.22,-3.66);cylinder(.065,2.44,postMat,x,1.22,3.66);
      const cross=cylinder(.065,7.45,postMat,x,2.44,0);cross.rotation.x=Math.PI/2;
      const points=[],add=(a,b)=>points.push(...a,...b),step=low?.36:.2;
      for(let z=-3.66;z<=3.67;z+=step){add([back,.03,z],[back,2.42,z]);add([x,2.42,z],[back,2.42,z]);}
      for(let y=.03;y<=2.44;y+=step){add([back,y,-3.66],[back,y,3.66]);add([x,y,-3.66],[back,y,-3.66]);add([x,y,3.66],[back,y,3.66]);}
      for(let j=0;j<12;j++){const nx=x+(back-x)*j/11;add([nx,.03,-3.66],[nx,2.42,-3.66]);add([nx,.03,3.66],[nx,2.42,3.66]);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));geometries.add(g);scene.add(new T.LineSegments(g,netMat));goalNets.push({sign,geometry:g,base:new Float32Array(g.attributes.position.array),last:0});
    }
    function updateGoalNets(game){for(const net of goalNets){const impulse=P.goalNetImpulse(game,net.sign);if(Math.abs(impulse-net.last)<.002)continue;net.last=impulse;
      const a=net.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){const x=net.base[i],y=net.base[i+1],z=net.base[i+2];a[i]=x+net.sign*impulse*(Math.abs(x)>53.2?1:.1)*(1-Math.abs(z)/8)*(.5+y/4);}net.geometry.attributes.position.needsUpdate=true;}}
    // Dense stepped seating: shared instanced bodies and heads replace floating spheres.
    const seatPositions=[],tiers=low?2:3,rows=profile.rows,cols=profile.columns;
    const seatMat=material(0xffffff),dummy=new T.Object3D(),color=new T.Color();
    for(const side of [-1,1])for(let tier=0;tier<tiers;tier++){
      for(let row=0;row<rows;row++){
        const z=side*(42+tier*(rows*.72+2)+row*.72),y=1.4+tier*(rows*.43+1.7)+row*.43;
        box(138,.28,.76,concrete,0,y-.25,z);
        for(let col=0;col<cols;col++)if(col%27>1)seatPositions.push([-67+col*134/(cols-1),y,z,side<0?0:Math.PI]);
      }
      const z=side*(41.5+tier*(rows*.72+2));box(139,.12,.12,rail,0,1.5+tier*(rows*.43+1.7),z);
    }
    for(const side of [-1,1])for(let tier=0;tier<tiers;tier++)for(let row=0;row<rows;row++){
      const x=side*(62+tier*(rows*.72+2)+row*.72),y=1.4+tier*(rows*.43+1.7)+row*.43,endCols=Math.round(cols*.54);
      box(.76,.28,79,concrete,x,y-.25,0);
      for(let col=0;col<endCols;col++)if(col%24>1)seatPositions.push([x,y,-38+col*76/(endCols-1),side<0?Math.PI/2:-Math.PI/2]);
    }
    const seats=new T.InstancedMesh(geometry('seat',()=>new T.BoxGeometry(.46,.27,.42)),seatMat,seatPositions.length);scene.add(seats);
    seatPositions.forEach(([x,y,z,yaw],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();seats.setMatrixAt(i,dummy.matrix);color.set([0x243c66,0x64273c,0x243c66,0x425068][i%4]);seats.setColorAt(i,color);});
    const occupied=seatPositions.filter((p,i)=>i%(low?5:ultra?29:17)!==0),count=occupied.length;
    const crowdBodies=new T.InstancedMesh(geometry('fan-body',()=>new T.CylinderGeometry(.17,.14,.42,5)),seatMat,count);
    const crowdHeads=new T.InstancedMesh(geometry('fan-head',()=>new T.SphereGeometry(.122,6,4)),seatMat,count);scene.add(crowdBodies,crowdHeads);
    const fanColors=[0x253856,0x9f3048,0x3b5282,0xc2c5c7,0xccc7b6,0x304976,0x984336,0x252d36];
    const skinColors=[0xc29a78,0x926948,0xd0ad8d,0x78503a,0xbb8a67];
    for(let i=0;i<count;i++){const [x,y,z,yaw]=occupied[i],v=(i*7%13)/13;dummy.position.set(x,y+.38,z);dummy.rotation.set(0,yaw,0);dummy.scale.set(.9+v*.2,1,1);dummy.updateMatrix();crowdBodies.setMatrixAt(i,dummy.matrix);color.set(fanColors[(i*19+Math.floor(x))&7]);crowdBodies.setColorAt(i,color);
      dummy.position.y=y+.72;dummy.scale.set(1,1.1,1);dummy.updateMatrix();crowdHeads.setMatrixAt(i,dummy.matrix);color.set(skinColors[i%5]);crowdHeads.setColorAt(i,color);}
    let lastCrowdUpdate=-Infinity;
    function cheerCrowd(now,score){if(low||now-lastCrowdUpdate<350)return;lastCrowdUpdate=now;
      for(let i=0;i<Math.min(180,count);i++){const [x,y,z,yaw]=occupied[i],bounce=Math.sin(now*.003+i)*((score?.[0]||score?.[1])?.10:.035);
        dummy.rotation.set(0,yaw,0);dummy.scale.set(1,1,1);dummy.position.set(x,y+.38+bounce,z);dummy.updateMatrix();crowdBodies.setMatrixAt(i,dummy.matrix);dummy.position.y=y+.72+bounce;dummy.scale.set(1,1.1,1);dummy.updateMatrix();crowdHeads.setMatrixAt(i,dummy.matrix);}
      crowdBodies.instanceMatrix.needsUpdate=true;crowdHeads.instanceMatrix.needsUpdate=true;}
    if(typeof Image==='function'){
      const terrace=new Image();terrace.crossOrigin='anonymous';terrace.onload=()=>{if(disposed)return;
        const image=typeof AuraHumanSprites!=='undefined'?AuraHumanSprites.tileCrowd(terrace):terrace;
        const terraceMap=texture(image),m=material(0xffffff,{map:terraceMap,roughness:1,side:T.DoubleSide}),aisles=[];
        function bank(points){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1],2));g.computeVertexNormals();mesh(g,m);
          const a=points.slice(0,3),b=points.slice(3,6),c=points.slice(6,9),d=points.slice(15,18);
          const at=(u,v)=>a.map((n,k)=>(n*(1-u)+b[k]*u)*(1-v)+(d[k]*(1-u)+c[k]*u)*v+(k===1?.045:0));
          for(const u of [.14,.35,.57,.79]){const p=at(u-.004,0),q=at(u+.004,0),r=at(u+.004,1),t=at(u-.004,1);aisles.push(...p,...q,...r,...p,...r,...t);}
        }
        for(const sign of [-1,1])for(let tier=0;tier<tiers;tier++){
          const y=1.1+tier*(rows*.43+1.7),top=y+rows*.43+.8,z=sign*(41.75+tier*(rows*.72+2)),back=z+sign*(rows*.72);
          bank([-68,y,z,68,y,z,68,top,back,-68,y,z,68,top,back,-68,top,back]);
          const x=sign*(61.75+tier*(rows*.72+2)),far=x+sign*rows*.72;
          bank([x,y,-39,x,y,39,far,top,39,x,y,-39,far,top,39,far,top,-39]);
        }
        if(aisles.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(aisles,3));g.computeVertexNormals();mesh(g,material(0x727d77,{side:T.DoubleSide,roughness:1}));}
        crowdBodies.visible=crowdHeads.visible=seats.visible=false;
      };terrace.src='./assets/textures/crowd-photo.webp';
    }
    const roofY=3+tiers*(rows*.43+1.7),roofZ=42+tiers*(rows*.72+2),roofX=62+tiers*(rows*.72+2);
    for(const side of [-1,1]){
      box(156,.38,12,black,0,roofY,side*(roofZ-4));box(12,.38,90,black,side*(roofX-4),roofY,0);
      for(const x of [-66,-44,-22,0,22,44,66]){cylinder(.13,roofY,rail,x,roofY/2,side*(roofZ+1));box(.14,.18,12,rail,x,roofY-.55,side*(roofZ-4));}
    }
    for(const x of [-57,57])for(const z of [-43,43]){
      cylinder(.16,25,rail,x,12.5,z);box(8,.65,.65,black,x,25,z);
      for(let j=0;j<10;j++)box(.54,.34,.18,luminous,x-3.3+j*.73,25.02,z+.4);
    }
    function banner(text){const c=canvas(1024,96),cx=c.getContext('2d'),gradient=cx.createLinearGradient(0,0,1024,0);
      gradient.addColorStop(0,'#11283b');gradient.addColorStop(.5,'#182242');gradient.addColorStop(1,'#191c34');cx.fillStyle=gradient;cx.fillRect(0,0,1024,96);
      cx.fillStyle='#45e2e2';cx.fillRect(0,90,1024,6);cx.fillStyle='#eef6ff';cx.textAlign='center';cx.font='italic bold 46px Arial';cx.fillText(text,512,66);
      return basic({map:texture(c),side:T.DoubleSide,toneMapped:false});}
    const adMat=banner('AURA  /  VISION'),adAlt=banner('TU CLUB.  TU FÚTBOL.');
    for(const side of [-1,1]){
      box(114,.95,.2,black,0,.55,side*37.4);box(.2,.95,65,black,side*57.2,.55,0);
      for(const x of [-42,-14,14,42]){const a=mesh(geometry('ad',()=>new T.PlaneGeometry(27,.85)),x%28===14?adMat:adAlt,x,.59,side*37.25);a.rotation.y=side<0?0:Math.PI;}
      for(const z of [-23,0,23]){const a=mesh(geometry('end-ad',()=>new T.PlaneGeometry(21,.85)),adMat,side*57,.59,z);a.rotation.y=-side*Math.PI/2;}
    }
    for(const x of [-12,12]){
      box(10,.16,2.1,black,x,2.1,-39.8);box(10,1.4,.13,material(0x243249),x,1.25,-40.65);
      for(let i=0;i<9;i++)box(.55,.4,.6,material(0x334c70),x-4+i,.53,-39.9);
      for(const side of [-1,1])cylinder(.08,1.9,rail,x+side*4.8,1.05,-39.2);
    }
    // Stadium screen refreshes on score changes only, never uploads a texture each frame.
    const screenCanvas=canvas(512,256),screenCtx=screenCanvas.getContext('2d'),screenMap=texture(screenCanvas),screenMat=basic({map:screenMap,toneMapped:false});
    box(16,8,.45,black,0,roofY-2,-roofZ);mesh(geometry('bigscreen',()=>new T.PlaneGeometry(15.5,7.5)),screenMat,0,roofY-2,-roofZ+.3);let screenScore='';
    function updateScreen(game){const score=game?.score||[0,0],key=score.join(':');if(key===screenScore)return;screenScore=key;
      screenCtx.fillStyle='#0a1428';screenCtx.fillRect(0,0,512,256);screenCtx.textAlign='center';screenCtx.fillStyle='#50e6e0';screenCtx.font='bold 28px Arial';screenCtx.fillText('AURA VISION',256,49);screenCtx.fillStyle='#ffffff';screenCtx.font='bold 112px Arial';screenCtx.fillText(score[0]+' – '+score[1],256,177);screenCtx.font='18px Arial';screenCtx.fillText('EL FÚTBOL SE SIENTE.',256,224);screenMap.needsUpdate=true;}
    for(const x of [-52.5,52.5])for(const z of [-34,34]){cylinder(.025,1.45,postMat,x,.725,z);const f=mesh(geometry('flag',()=>new T.PlaneGeometry(.55,.35)),material(0xecd868,{side:T.DoubleSide}),x+.25,1.25,z);f.rotation.y=.4;}
    const kits=P.separateKits(kit(options.home),kit(options.away));
    if(L){const ledMap=texture(L.board(canvas)),led=material(0xffffff,{map:ledMap,emissive:0xc7c4ed,emissiveMap:ledMap,emissiveIntensity:.42,roughness:.7});
      for(const sign of [-1,1]){
        for(let x=-49.5;x<55;x+=11){const board=mesh(geometry('cinema-led',()=>new T.PlaneGeometry(11,1)),led,x,.62,sign*36.9);board.rotation.y=sign>0?Math.PI:0;}
        for(let z=-30;z<36;z+=12){const board=mesh(geometry('cinema-end-led',()=>new T.PlaneGeometry(12,1)),led,sign*58,.62,z);board.rotation.y=sign>0?-Math.PI/2:Math.PI/2;}
        cylinder(.018,1.05,rail,-66,1.6,sign*41.2);for(let x=-60;x<=66;x+=6)cylinder(.018,1.05,rail,x,1.6,sign*41.2);
        for(const y of [1.55,2.1]){const bar=cylinder(.018,134,rail,0,y,sign*41.2);bar.rotation.z=Math.PI/2;}
      }
    }

    const supporterFlags=[];
    const flagMaps=kits.map((colors,team)=>{
      const c=canvas(256,160),cx=c.getContext('2d');cx.fillStyle=colors[0];cx.fillRect(0,0,256,160);
      cx.fillStyle=colors[1];for(let x=0;x<256;x+=64)cx.fillRect(x,0,32,160);
      cx.fillStyle=colors[2];cx.font='italic bold 28px Arial';cx.textAlign='center';cx.fillText('AURA',128,95);
      const map=texture(c),crest=typeof AuraBadges!=='undefined'?AuraBadges.get(team===0?options.home:options.away):null;
      if(crest&&typeof Image==='function'){const badge=new Image();badge.crossOrigin='anonymous';badge.onload=()=>{if(disposed)return;cx.drawImage(badge,103,46,50,62);map.needsUpdate=true;};badge.src=crest;}
      return map;
    });
    for(const sign of [-1,1])for(const x of (low?[-34,34]:[-44,-22,22,44])){
      const z=sign*43,team=sign<0?0:1;
      cylinder(.028,4.05,rail,x,4.425,z);
      const g=new T.PlaneGeometry(2.6,1.5,8,4),flag=mesh(g,material(0xffffff,{map:flagMaps[team],side:T.DoubleSide,roughness:.95}),x+1.3,5.7,z);
      flag.name='supporter-flag';flag.castShadow=!low;
      supporterFlags.push({mesh:flag,position:flag.position.toArray(),geometry:g,base:new Float32Array(g.attributes.position.array),phase:x*.27+sign,time:null});
    }
    function updateFlags(time){
      for(const flag of supporterFlags){
        flag.mesh.visible=P.flagVisible(flag.position,cameraState);
        if(!flag.mesh.visible||flag.time===time)continue;flag.time=time;
        const a=flag.geometry.attributes.position.array;
        for(let i=0;i<a.length;i+=3){const u=(flag.base[i]+1.3)/2.6,v=(flag.base[i+1]+.75)/1.5;a[i+1]=flag.base[i+1]-.09*u*u;a[i+2]=P.flagWave(u,v,time,flag.phase);}
        flag.geometry.attributes.position.needsUpdate=true;flag.geometry.computeVertexNormals();
      }
    }
    const weaveCanvas=canvas(128,128),weaveCtx=weaveCanvas.getContext('2d');weaveCtx.fillStyle='#808080';weaveCtx.fillRect(0,0,128,128);
    for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){weaveCtx.fillStyle=(x+y)%4?'#a2a2a2':'#646464';weaveCtx.fillRect(x,y,1,2);}
    const weaveMap=texture(weaveCanvas,false);weaveMap.wrapS=weaveMap.wrapT=T.RepeatWrapping;weaveMap.repeat.set(10,10);
    const keeperColors=[['#4cafbd','#183845','#f3ecdc'],['#e1ac3c','#26312b','#fbf2d6']];
    function shirtTexture(colors,club,keeper,player){
      const c=canvas(256,256),cx=c.getContext('2d'),pair=M?M.jersey({club,colors,player,keeper,alternate:player?.team===1&&kits[1][0]!==kit(options.away)[0],canvas,crest:typeof AuraBadges!=='undefined'&&!keeper?AuraBadges.get(club):null,Image:typeof Image!=='undefined'?Image:null}):null;
      if(pair)M.wrapJersey(pair,c);else{cx.fillStyle=colors[0];cx.fillRect(0,0,c.width,c.height);}
      const map=texture(c);
      if(pair)pair.onChange=()=>{if(disposed||!textures.has(map))return;M.wrapJersey(pair,c);map.needsUpdate=true;};
      return map;
    }
    const joint=geometry('anatomy-sphere',()=>new T.SphereGeometry(1,low?8:12,low?6:10));
    // A single shared skinned geometry per hairstyle; nine material groups per athlete.
    // Limbs use bones instead of dozens of independently submitted cylinder meshes.
    const anatomical=typeof AuraHumanMesh!=='undefined'?AuraHumanMesh:null;
    const boneDefs=anatomical?.bones||[[-1,0,.86,0],[0,0,.22,0],[1,0,.25,0],[2,0,.18,0],[3,0,.16,0],
      [0,-.115,-.04,0],[5,0,-.39,0],[6,0,-.36,0],[0,.115,-.04,0],[8,0,-.39,0],[9,0,-.36,0],
      [2,-.285,.045,0],[11,0,-.29,0],[12,0,-.25,0],[2,.285,.045,0],[14,0,-.29,0],[15,0,-.25,0]];
    // Seven bounded, shareable 3D head-shape variants: no per-player mesh duplication.
    const crownWidths=[1,1.055,.96,1.085,.945,1.025,.985];
    const jawWidths=[1,.95,1.07,1.035,.92,1.065,.965];
    function faceX(x,y,shape){
      if(y<1.565||y>1.94)return x;
      const i=Math.max(0,Math.min(6,shape|0));
      const jaw=Math.max(0,Math.min(1,(1.715-y)/.13));
      return x*(crownWidths[i]*(1-jaw)+jawWidths[i]*jaw);
    }
    function humanGeometry(style,faceShape=0,faceKey=null,replaceHead=false){
      if(anatomical)return geometry('anatomical-human:'+style+':'+faceShape+':'+(faceKey||'base')+':'+replaceHead,()=>{
        const data=anatomical,g=new T.BufferGeometry(),positions=new Float32Array(data.positions);
        if(style===1)for(let i=0;i<positions.length;i+=3)if(positions[i+1]>1.82)positions[i+1]+=(positions[i+1]-1.82)*.25;
        g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.normals,3));
        g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(data.skinIndices,4));
        g.setAttribute('skinWeight',new T.Float32BufferAttribute(data.skinWeights,4));g.setIndex(new T.BufferAttribute(data.indices,1));
        // Material detail is baked once into shared geometry, without extra draw calls.
        const shades=new Float32Array(positions.length),slots=new Uint8Array(data.vertexCount);
        data.groups.forEach(([start,count,slot])=>{for(let i=start;i<start+count;i++)slots[data.indices[i]]=slot;});
        // Modify only face, hair and eyelid vertices; leave joints and 17-bone rig intact.
        for(let i=0;i<data.vertexCount;i++){
          const slot=slots[i],offset=i*3,y=positions[offset+1],x=positions[offset],z=positions[offset+2];
          if((slot===2||slot===5||slot===7)&&y>1.565){
            positions[offset]=faceX(x,y,faceShape);
            if(slot===2&&z>.055&&y>1.615&&y<1.745&&Math.abs(x)<.037){
              const bridge=Math.max(0,1-Math.abs(x)/.037)*Math.max(0,1-Math.abs(y-1.683)/.065);
              positions[offset+2]+=bridge*[0,.0025,.006,-.002,.004,.005,-.001][faceShape];
            }
          }
        }
        for(let i=0;i<data.vertexCount;i++){
          const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2],ny=data.normals[i*3+1],slot=slots[i];
          const cloth=slot===0||slot===1||slot===3;
          const fold=cloth?Math.sin(y*79+x*23)*Math.sin(z*63-y*17)*.036:0;
          const ambient=.86+Math.max(0,ny)*.12+fold;
          const cheek=slot===2&&y>1.58&&y<1.72&&z>.07?.035:0;
          shades[i*3]=Math.min(1,ambient+cheek);shades[i*3+1]=ambient-cheek*.5;shades[i*3+2]=ambient-cheek;
        }
        for(let i=0;i<data.vertexCount;i++){
          const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2],slot=slots[i];
          if(slot===0||slot===1){const fold=Math.sin(y*113+x*29)*Math.sin(z*97-y*31)*.0022;for(let k=0;k<3;k++)positions[i*3+k]+=data.normals[i*3+k]*fold;}
          if(slot===5&&(style===2||style===4)&&y>1.8)positions[i*3+1]=1.8+(y-1.8)*.66;
          if(slot===2&&z>.109&&Math.abs(x)>.022&&Math.abs(x)<.073&&y>1.733&&y<1.745)for(let k=0;k<3;k++)shades[i*3+k]*=.25;
          if(slot===2&&z>.125&&Math.abs(x)<.041&&y>1.673&&y<1.692){shades[i*3]*=.78;shades[i*3+1]*=.49;shades[i*3+2]*=.47;}
        }
        if(faceKey&&F){const uv=new Float32Array(data.uv);
          for(let i=0;i<data.vertexCount;i++){const o=i*3,slot=slots[i],x=data.positions[o],y=data.positions[o+1],z=data.positions[o+2];
            if((slot===2||slot===5||slot===7)&&y>1.59){positions.set(F.morph(x,slot===5?positions[o+1]:y,z,faceKey),o);
              if(slot!==5){const t=F.uv(x,y);uv.set(t,i*2);shades.set([1,1,1],o);}}}
          g.setAttribute('uv',new T.BufferAttribute(uv,2));g.computeVertexNormals();
        }
        g.setAttribute('color',new T.Float32BufferAttribute(shades,3));
        const index=[],sleeves=[],face=[],headParts=[[],[],[]];
        for(const [start,count,mat] of data.groups){const offset=index.length;
          for(let i=start;i<start+count;i+=3){const tri=[data.indices[i],data.indices[i+1],data.indices[i+2]],arm=mat===0&&tri.filter(v=>data.skinIndices[v*4]>=11).length>=2;const portrait=faceKey&&F&&(mat===7||mat===2&&tri.every(v=>data.positions[v*3+1]>1.615)&&tri.reduce((n,v)=>n+data.positions[v*3+2]/3,0)>.070);const headPart=replaceHead&&[2,5,7].includes(mat)&&tri.every(v=>data.positions[v*3+1]>1.615)?[2,5,7].indexOf(mat):-1;(headPart>=0?headParts[headPart]:portrait?face:arm?sleeves:index).push(...tri);}
          if(index.length>offset)g.addGroup(offset,index.length-offset,mat);
        }
        const offset=index.length;index.push(...sleeves);if(sleeves.length)g.addGroup(offset,sleeves.length,8);const faceOffset=index.length;index.push(...face);if(face.length)g.addGroup(faceOffset,face.length,9);headParts.forEach((part,i)=>{const offset=index.length;index.push(...part);if(part.length)g.addGroup(offset,part.length,9+i);});g.setIndex(new T.BufferAttribute(new Uint16Array(index),1));return g;
      });
      return geometry('human:'+style,()=>{
      const buckets=Array.from({length:8},()=>({p:[],n:[],uv:[],si:[],sw:[]})),matrix=new T.Matrix4(),q=new T.Quaternion();
      function add(g,slot,bone,x,y,z,sx=1,sy=1,sz=1,blend=false){const source=g.index?g.toNonIndexed():g.clone();matrix.compose(new T.Vector3(x,y,z),q,new T.Vector3(sx,sy,sz));source.applyMatrix4(matrix);
        const b=buckets[slot],p=source.attributes.position,n=source.attributes.normal,uv=source.attributes.uv;
        for(let i=0;i<p.count;i++){b.p.push(p.getX(i),p.getY(i),p.getZ(i));b.n.push(n.getX(i),n.getY(i),n.getZ(i));b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
          const t=blend?Math.max(0,Math.min(1,(p.getY(i)-1.03)/.31)):0;b.si.push(bone,blend?2:0,0,0);b.sw.push(1-t,t,0,0);}
        source.dispose();}
      const torso=geometry('athletic-torso',()=>new T.LatheGeometry([[.195,0],[.209,.08],[.21,.18],[.235,.32],[.282,.44],[.267,.50],[.19,.55]].map(p=>new T.Vector2(...p)),low?10:16));
      add(torso,0,1,0,.88,0,1,1,.64,true);add(joint,1,0,0,.83,0,.22,.115,.154);
      add(joint,2,3,0,1.49,0,.063,.102,.063);add(joint,2,4,0,1.69,0,.153,.199,.145);
      add(joint,2,4,0,1.67,.146,.029,.043,.040);add(joint,2,4,-.149,1.68,0,.028,.048,.026);add(joint,2,4,.149,1.68,0,.028,.048,.026);
      const hairGeo=geometry('hair-cap:'+style,()=>new T.SphereGeometry(1,low?8:12,8,0,Math.PI*2,0,Math.PI*(style===2?.35:.55)));
      add(hairGeo,5,4,0,1.745,-.009,.157,style===1?.19:.154,.149);
      if(!low){for(const x of [-.052,.052]){add(joint,7,4,x,1.72,.137,.012,.010,.009);add(joint,5,4,x,1.751,.135,.027,.007,.008);}add(joint,5,4,0,1.60,.123,.032,.006,.01);}
      add(joint,6,2,0,1.43,0,.19,.018,.125);
      const tube=geometry('limb',()=>new T.CylinderGeometry(1,.92,1,low?8:12));
      for(const sign of [-1,1]){const x=sign*.115,upper=sign<0?5:8,knee=upper+1,foot=upper+2,arm=sign<0?11:14,elbow=arm+1,hand=arm+2,ax=sign*.285;
        add(tube,1,upper,x,.715,0,.102,.21,.10);add(tube,2,upper,x,.54,0,.084,.18,.081);add(joint,2,knee,x,.43,0,.077,.085,.079);
        add(tube,3,knee,x,.255,0,.067,.31,.069);add(tube,6,knee,x,.39,0,.070,.026,.071);
        add(joint,4,foot,x,.071,.059,.074,.052,.144);add(joint,6,foot,x,.079,.14,.054,.012,.038);
        add(joint,0,arm,ax,1.36,0,.104,.105,.108);add(tube,0,arm,ax,1.279,0,.087,.17,.087);
        add(tube,2,arm,ax,1.145,0,.064,.13,.065);add(joint,2,elbow,ax,1.085,0,.061,.065,.064);
        add(tube,2,elbow,ax,.962,0,.049,.23,.051);add(joint,2,hand,ax,.811,.006,.051,.071,.033);
      }
      const g=new T.BufferGeometry(),out={p:[],n:[],uv:[],si:[],sw:[]};let start=0;
      buckets.forEach((b,index)=>{g.addGroup(start,b.p.length/3,index);start+=b.p.length/3;for(const key of Object.keys(out))out[key].push(...b[key]);});
      g.setAttribute('position',new T.Float32BufferAttribute(out.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(out.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(out.uv,2));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(out.si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(out.sw,4));return g;
    });}
    function footballer(p){const root=new T.Group(),look=P.appearance(p),keeper=p.index===0,colors=keeper?keeperColors[p.team]:kits[p.team];root.name='player:'+p.id;scene.add(root);
      const cloth={bumpMap:low?null:weaveMap,bumpScale:.009,roughness:.91,vertexColors:!!anatomical};
      const club=p.team===0?options.home:options.away,shirtMap=shirtTexture(colors,club,keeper,p),shirt=material(0xffffff,{map:shirtMap,...cloth});
      const surface={vertexColors:!!anatomical};
      const mats=[shirt,material(colors[1],cloth),material(look.skin,{...surface,roughness:.46,metalness:.015}),material(colors[0],cloth),material(p.index%3===0?0xefebe3:p.index%3===1?0xe49a55:0x182436,{...surface,roughness:.48}),material(look.hairTop||look.hair,{...surface,roughness:.96}),material(colors[2],surface),material(anatomical?0xe8e6df:0x17202a,surface),M?.design(club,keeper,p.team===1&&kits[1][0]!==kit(options.away)[0])==='sleeves'?material(colors[1],cloth):shirt];
      const mask=photoMask(p),headMaterials=[];
      if(mask)for(const slot of [2,5,7]){const mat=mats[slot].clone();mat.name='replaceable-head';mat.transparent=true;headMaterials.push(mat);materials.add(mat);mats.push(mat);}
      else if(look.faceKey&&F)mats.push(faceMaterial(look.faceKey));
      const body=new T.SkinnedMesh(humanGeometry(look.hairStyle,look.faceShape||0,mask?null:look.faceKey,!!mask),mats),bones=boneDefs.map(()=>new T.Bone());
      boneDefs.forEach(([parent,x,y,z],i)=>{bones[i].position.set(x,y,z);if(parent>=0)bones[parent].add(bones[i]);});
      body.add(bones[0]);body.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);skeletons.add(skeleton);body.bind(skeleton);
      bones[4].scale.setScalar(look.headScale||1.4);
      if(mask){const head=boneDefs.slice(0,5).reduce((a,b)=>a.map((v,i)=>v+b[i+1]),[0,0,0]);mask.name='photo-face-mask:'+look.faceMaskKey;mask.position.set(...FM.center.map((n,i)=>n-head[i]));bones[4].add(mask);}
      if(anatomical&&(!look.faceKey||mask)){
        const group=anatomical.groups.find(g=>g[2]===7),eyes=[[],[]];
        if(group){const indices=new Set(anatomical.indices.slice(group[0],group[0]+group[1]));
          for(const index of indices){const x=anatomical.positions[index*3];eyes[x<0?0:1].push([faceX(x,anatomical.positions[index*3+1],look.faceShape||0),anatomical.positions[index*3+1],anatomical.positions[index*3+2]]);}
          const head=boneDefs.slice(0,5).reduce((p,b)=>p.map((v,i)=>v+b[i+1]),[0,0,0]);
          for(const vertices of eyes)if(vertices.length){const centre=vertices.reduce((p,v)=>p.map((n,i)=>n+v[i]/vertices.length),[0,0,0]);
            const z=Math.max(...vertices.map(v=>v[2]));
            const iris=mesh(geometry('human-iris',()=>new T.SphereGeometry(.0055,8,6)),material(look.eye||0x34382b),centre[0]-head[0],centre[1]-head[1],z-head[2],bones[4]);iris.scale.z=.2;
            const pupil=mesh(geometry('human-pupil',()=>new T.SphereGeometry(.0028,6,4)),material(0x10151b),centre[0]-head[0],centre[1]-head[1],z-head[2]+.001,bones[4]);pupil.scale.z=.2;
          }
        }
      }
      if(typeof AuraBootMesh!=='undefined'){
        const d=AuraBootMesh,g=geometry('football-boots-96',()=>{const q=new T.BufferGeometry(),positions=new Float32Array(d.positions),color=new Float32Array(positions.length);
          for(let i=0;i<positions.length;i+=3){const x=positions[i],y=positions[i+1],z=positions[i+2],sole=y<.033,lace=y>.082&&z>.01&&z<.16&&Math.abs(x)<.025&&Math.sin(z*193)>.2;
            const shade=sole?.10:lace?.24:1;color.set([shade,shade,shade],i);positions[i+1]-=d.anchor[0];positions[i+2]-=d.anchor[1];}
          q.setAttribute('position',new T.BufferAttribute(positions,3));q.setAttribute('normal',new T.Float32BufferAttribute(d.normals,3));q.setAttribute('color',new T.BufferAttribute(color,3));q.setIndex(new T.Uint16BufferAttribute(d.indices,1));return q;});
        const bootMat=material(p.index%3===0?0xefebe3:p.index%3===1?0xe49a55:0x182436,{vertexColors:true,roughness:.42});mats[4].visible=false;
        for(const bone of [7,10]){const boot=new T.Mesh(g,bootMat);boot.name='football-boot';boot.castShadow=!low;bones[bone].add(boot);}
      }
      if(look.hairStyle===4&&typeof AuraCurlMesh!=='undefined'){
        const d=AuraCurlMesh,g=geometry('curly-hair-98:'+look.hair+':'+look.hairTop,()=>{const q=new T.BufferGeometry(),p=new Float32Array(d.positions);for(let i=0;i<p.length;i++)p[i]-=d.head[i%3];q.setAttribute('position',new T.BufferAttribute(p,3));q.setAttribute('normal',new T.Float32BufferAttribute(d.normals,3));
          const base=new T.Color(look.hair),top=new T.Color(look.hairTop||look.hair),colors=new Float32Array(p.length);
          for(let i=0;i<p.length;i+=3){const t=Math.max(0,Math.min(1,(d.positions[i+1]-1.810)/.035));const c=base.clone().lerp(top,t);colors.set([c.r,c.g,c.b],i);}q.setAttribute('color',new T.BufferAttribute(colors,3));
          q.setIndex(new T.BufferAttribute(d.indices,1));return q;});
        const curls=new T.Mesh(g,material(0xffffff,{roughness:.88,vertexColors:true}));curls.name='curly-hair';if(look.faceKey==='lamine')curls.scale.setScalar(.78);curls.castShadow=!low;bones[4].add(curls);
      }
      body.castShadow=!low;body.receiveShadow=!low;body.frustumCulled=false;root.add(body);
      root.scale.set(look.build,look.height/1.88,look.build);
      return {id:p.id,root,body,bones,skeleton,shirtMap,shirt,mask,headMaterials,headObjects:bones[4].children.filter(o=>o!==mask),yaw:Math.atan2(p.faceX,p.faceZ)};
    }
    let actors=[];
    function releaseActor(a){scene.remove(a.root);for(const mat of [...a.headMaterials,...(a.mask?[a.mask.material]:[])]){mat.dispose();materials.delete(mat);}a.skeleton.dispose();skeletons.delete(a.skeleton);a.shirtMap.dispose();textures.delete(a.shirtMap);a.shirt.dispose();materials.delete(a.shirt);}
    // Shared soft contact shadows work at every quality, including without shadow maps.
    const shadowCanvas=canvas(64,64),sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(32,32,3,32,32,31);
    sg.addColorStop(0,'#0000008f');sg.addColorStop(.45,'#00000052');sg.addColorStop(1,'#00000000');sc.fillStyle=sg;sc.fillRect(0,0,64,64);
    const shadowMat=basic({map:texture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false});
    const actorShadows=new T.InstancedMesh(geometry('soft-shadow',()=>new T.PlaneGeometry(1.4,1.4)),shadowMat,22);actorShadows.frustumCulled=false;scene.add(actorShadows);
    const ballCanvas=canvas(512,256),ballCtx=ballCanvas.getContext('2d'),seamCanvas=canvas(512,256),seamCtx=seamCanvas.getContext('2d');
    ballCtx.fillStyle='#f3f4e9';ballCtx.fillRect(0,0,512,256);seamCtx.fillStyle='#b4b4b4';seamCtx.fillRect(0,0,512,256);
    const ballMap=texture(ballCanvas),seamMap=texture(seamCanvas,false);
    if(typeof Image==='function')for(const [path,context,map] of [['ball-albedo-95.png',ballCtx,ballMap],['ball-seams-95.png',seamCtx,seamMap]]){
      const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(disposed)return;context.drawImage(image,0,0,512,256);map.needsUpdate=true;};image.src='./assets/textures/'+path;
    }
    const ball=mesh(geometry('ball',()=>new T.SphereGeometry(.18,low?16:32,low?12:24)),material(0xffffff,{map:ballMap,bumpMap:low?null:seamMap,bumpScale:.0017,roughness:raining?.24:.46}));ball.name='match-ball';ball.castShadow=!low;ball.receiveShadow=!low;
    const ballShadowMat=basic({map:shadowMat.map,transparent:true,depthWrite:false,toneMapped:false});
    const ballShadow=mesh(geometry('ball-shadow',()=>new T.PlaneGeometry(.7,.7)),ballShadowMat,0,.04,0);ballShadow.rotation.x=-Math.PI/2;let ballSpin=null;
    // Real geometry gives the close camera a grass silhouette without burdening low/medium.
    let nearGrass=null,grassCell='';
    if(high&&!preview){
      const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.009,0,0,.009,0,0,.012,.105,.026,0,0,-.009,0,0,.009,-.02,.083,.007],3));blade.computeVertexNormals();
      nearGrass=new T.InstancedMesh(blade,material(0x638847,{side:T.DoubleSide,roughness:1}),ultra?6000:2600);nearGrass.name='near-turf-blades';nearGrass.frustumCulled=false;nearGrass.receiveShadow=true;scene.add(nearGrass);geometries.add(blade);
    }
    function updateGrass(game,cam){
      if(!nearGrass)return;nearGrass.visible=cam==='immersive'||cam==='tele'||cam==='replay'||cam==='stadium';if(!nearGrass.visible)return;
      const x=Math.round((game?.ball.x||0)/3)*3,z=Math.round((game?.ball.z||0)/3)*3,key=x+':'+z;if(key===grassCell)return;grassCell=key;
      for(let i=0;i<nearGrass.count;i++){
        const u=((i*0.61803398875)%1-.5)*24,v=((i*0.754877666)%1-.5)*20,px=x+u,pz=z+v;
        const inside=Math.abs(px)<52.4&&Math.abs(pz)<33.9,edge=Math.max(0,1-Math.max(Math.abs(u)/12,Math.abs(v)/10));
        dummy.position.set(px,.017,pz);dummy.rotation.set(0,i*2.39996,0);dummy.scale.set(1,inside?(edge*.7+.3)*(.6+(i%11)/16):0,1);dummy.updateMatrix();nearGrass.setMatrixAt(i,dummy.matrix);
        color.set([0x628442,0x80984f,0x4b733a,0x6a8946][i%4]);nearGrass.setColorAt(i,color);
      }nearGrass.instanceMatrix.needsUpdate=true;if(nearGrass.instanceColor)nearGrass.instanceColor.needsUpdate=true;
    }
    function indicator(color){const ring=mesh(geometry('selection-ring',()=>new T.RingGeometry(.59,.65,48)),basic({color,side:T.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;
      const marker=mesh(geometry('selection-marker',()=>new T.ConeGeometry(.16,.27,3)),basic({color}));marker.rotation.z=Math.PI;return {ring,marker};}
    const selection=indicator(0x45e5e5),awaySelection=indicator(0xad9aff);
    const rainCount=!preview&&raining?(low?100:ultra?650:350):0,rainCoords=new Float32Array(rainCount*6);let rainGeometry=null;
    if(rainCount){rainGeometry=new T.BufferGeometry();geometries.add(rainGeometry);rainGeometry.setAttribute('position',new T.BufferAttribute(rainCoords,3));const rm=new T.LineBasicMaterial({color:0xd5e3ef,transparent:true,opacity:.3,depthWrite:false,fog:false});materials.add(rm);const rain=new T.LineSegments(rainGeometry,rm);rain.frustumCulled=false;scene.add(rain);}
    function updateRain(now){if(!rainGeometry)return;const t=now*.001;for(let i=0;i<rainCount;i++){const u=(i*97.73)%109-54.5,z=(i*43.37)%68-34,y=((i*1.37-t*(12+i%6))%25+25)%25,at=i*6;rainCoords.set([u,y,z,u-.22,y+.85,z-.12],at);}rainGeometry.attributes.position.needsUpdate=true;}
    let lastTime=null,lastCamera=options.camera||'broadcast',cameraState=null,adaptiveRatio=basePixelRatio,slowFrames=0,fastFrames=0,lastVisualTime=null;
    function optimizeResolution(ms){if(preview||low||!Number.isFinite(ms)||ms<=0)return;slowFrames=ms>28?slowFrames+1:0;fastFrames=ms<18?fastFrames+1:0;
      if(slowFrames>=35&&adaptiveRatio>Math.max(.75,basePixelRatio*.58)){adaptiveRatio=Math.max(.75,basePixelRatio*.58,adaptiveRatio-.15);renderer.setPixelRatio(adaptiveRatio);slowFrames=fastFrames=0;}
      else if(fastFrames>=180&&adaptiveRatio<basePixelRatio){adaptiveRatio=Math.min(basePixelRatio,adaptiveRatio+.1);renderer.setPixelRatio(adaptiveRatio);fastFrames=slowFrames=0;}}
    function resize(){if(disposed)return;const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(container);resize();
    function render(game,cam=lastCamera,now=0){if(disposed)return;lastCamera=cam;const frameMs=lastTime===null?16.7:Math.max(0,now-lastTime),dt=Math.min(.1,frameMs/1000);optimizeResolution(frameMs);
      if(game){
        const sx=Math.max(-48,Math.min(48,game.ball.x)),sz=Math.max(-29,Math.min(29,game.ball.z));
        const snap=2*shadowReach/(ultra?3072:high?2048:1024),tx=Math.round(sx/snap)*snap,tz=Math.round(sz/snap)*snap;
        shadowTarget.position.set(tx,0,tz);sun.position.set(tx+(day?-38:-24),day?62:48,tz+(day?30:-25));
        if(!actors.length)actors=game.players.map(footballer);
        actorShadows.count=game.players.length;
        game.players.forEach((p,i)=>{if(actors[i].id!==p.id){releaseActor(actors[i]);actors[i]=footballer(p);}
          const a=actors[i],pose=P.pose(p,game),b=a.bones,angle=Math.atan2(p.faceX,p.faceZ);a.yaw+=Math.atan2(Math.sin(angle-a.yaw),Math.cos(angle-a.yaw))*(1-Math.exp(-dt*14));
          a.root.position.set(p.x,pose.jump+pose.saveLift-pose.crouch,p.z);a.root.rotation.set(0,a.yaw,pose.dive*1.12);a.root.visible=!p.sentOff;
          b[0].rotation.y=pose.hipTwist;b[2].rotation.y=pose.chestTwist;b[4].rotation.y=pose.headYaw;b[1].scale.y=1+pose.breath;
          if(a.mask){const vx=camera.position.x-p.x,vz=camera.position.z-p.z,front=(vx*Math.sin(a.yaw+b[4].rotation.y)+vz*Math.cos(a.yaw+b[4].rotation.y))/(Math.hypot(vx,vz)||1);
            const alpha=a.mask.userData.entry.ready?Math.max(0,Math.min(1,(front-.10)/.22)):0;
            a.mask.material.visible=alpha>0;a.mask.material.opacity=alpha;
            for(const mat of a.headMaterials){mat.opacity=1-alpha;mat.visible=alpha<1;mat.depthWrite=alpha===0;}
            for(const object of a.headObjects)object.visible=alpha<.5;
          }
          b[1].rotation.x=pose.lean-pose.kick*.13+pose.crouch*.30;b[2].rotation.z=pose.turn*.10*(p.faceZ>=0?1:-1);
          b[5].rotation.x=pose.stride-pose.kick*1.25-pose.tackle*.8-pose.crouch*.6;b[8].rotation.x=-pose.stride-pose.crouch*.6;
          b[6].rotation.x=pose.kneeLeft+pose.kick*.4+pose.crouch;b[9].rotation.x=pose.kneeRight+pose.crouch;
          b[7].rotation.x=-b[6].rotation.x*.26;b[10].rotation.x=-b[9].rotation.x*.26;
          for(let side=0;side<2;side++){const sign=side===0?-1:1,index=side===0?11:14;b[index].rotation.x=(side===0?-pose.stride:pose.stride)*.65-pose.highSave*1.4-pose.control*.14;
            b[index].rotation.z=sign*(.13+pose.celebrate*2.4+pose.save*.8+(p.index===0?.15:0)+pose.turn*.16);b[index+1].rotation.x=-.25-pose.speed*.5;}
          dummy.position.set(p.x,.038,p.z);dummy.rotation.set(-Math.PI/2,0,0);const size=p.sentOff?0:Math.max(.3,1-pose.jump);dummy.scale.set(size,size*.7,1);dummy.updateMatrix();actorShadows.setMatrixAt(i,dummy.matrix);
        });actorShadows.instanceMatrix.needsUpdate=true;
        const visualTime=Number.isFinite(game.visualTime)?game.visualTime:now*.001,spinDt=lastVisualTime===null?0:Math.max(-.12,Math.min(.12,visualTime-lastVisualTime));lastVisualTime=visualTime;
        ball.position.set(game.ball.x,game.ball.y,game.ball.z);if(M){ballSpin=M.ballSpin(ballSpin,game.ball,visualTime);ball.rotation.x=ballSpin.x;ball.rotation.z=ballSpin.z;}else{ball.rotation.z-=game.ball.vx*spinDt/.18;ball.rotation.x+=game.ball.vz*spinDt/.18;}
        ballShadow.position.set(game.ball.x,.04,game.ball.z);const shadow=M?M.ballShadow(game.ball.y):{spread:1,opacity:.6};ballShadow.scale.set(shadow.spread,shadow.spread,1);ballShadowMat.opacity=shadow.opacity;
        for(const [indicator,index,enabled] of [[selection,game.controlled,true],[awaySelection,game.awayControlled,game.localTwoPlayer]]){
          const p=game.players[index];indicator.ring.visible=indicator.marker.visible=!!enabled&&!!p&&!p.sentOff;if(p){indicator.ring.position.set(p.x,.052,p.z);indicator.marker.position.set(p.x,2.26,p.z);}}
      }else {actorShadows.count=0;selection.ring.visible=selection.marker.visible=awaySelection.ring.visible=awaySelection.marker.visible=false;}
      const desired=P.cameraFrame(game,cam,camera.aspect,preview);cameraState=P.smoothCamera(cameraState,desired,dt);camera.position.fromArray(cameraState.position);camera.lookAt(new T.Vector3().fromArray(cameraState.target));
      if(Math.abs(camera.fov-cameraState.fov)>.01){camera.fov=cameraState.fov;camera.updateProjectionMatrix();}lastTime=now;
      if(scene.fog){const distance=Math.hypot(...cameraState.position);scene.fog.near=cam==='tactical'?distance+20:(raining?90:155);scene.fog.far=cam==='tactical'?distance+160:(raining?240:350);}
      updateFlags(game?.visualTime??now*.001);cheerCrowd(now,game?.score);updateScreen(game);updateGoalNets(game);updateRain(now);updateGrass(game,cam);renderer.render(scene,camera);
    }
    function project(p){const v=new T.Vector3(p.x,2.2,p.z).project(camera);return {x:(v.x*.5+.5)*container.clientWidth,y:(-.5*v.y+.5)*container.clientHeight,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};}
    function dispose(){if(disposed)return;disposed=true;faceLibrary?.dispose();maskLibrary?.dispose();observer?.disconnect();skeletons.forEach(s=>s.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
      scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
    return {render,resize,dispose,project,mapInput:input=>P.cameraInput(input,cameraState),renderer,kits};
  }
  function fallback(container,options={}){
    if(typeof AuraSoftwareGraphics!=="undefined")return AuraSoftwareGraphics.create(container,options);
    const canvas=document.createElement("canvas");container.appendChild(canvas);const ctx=canvas.getContext("2d"),kits=[kit(options.home),kit(options.away)];
    function render(game){
      const dpr=Math.min(devicePixelRatio||1,1.5),w=container.clientWidth,h=container.clientHeight;
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+"px";canvas.style.height=h+"px";}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#15242d";ctx.fillRect(0,0,w,h);
      const s=Math.min((w-24)/112,(h-32)/76),cx=w/2,cy=h/2;ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);
      for(let i=0;i<20;i++){ctx.fillStyle=i%2?"#3a8045":"#37713f";ctx.fillRect(-52.5+i*5.25,-34,5.25,68);}
      ctx.strokeStyle="#b5c8af";ctx.lineWidth=.14;ctx.strokeRect(-52.5,-34,105,68);ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(0,34);ctx.moveTo(9.15,0);ctx.arc(0,0,9.15,0,Math.PI*2);ctx.stroke();
      for(const sign of [-1,1]){ctx.strokeRect(sign===1?36:-52.5,-20.16,16.5,40.32);ctx.strokeRect(sign===1?52.5:-55,-3.66,2.5,7.32);}
      if(game){game.players.forEach((p,i)=>{ctx.fillStyle=kits[p.team][0];ctx.beginPath();ctx.arc(p.x,p.z,.9,0,Math.PI*2);ctx.fill();if(i===game.controlled){ctx.strokeStyle="#d1ff76";ctx.lineWidth=.3;ctx.beginPath();ctx.arc(p.x,p.z,1.45,0,Math.PI*2);ctx.stroke();}});ctx.fillStyle="white";ctx.beginPath();ctx.arc(game.ball.x,game.ball.z,.42,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    return {render,resize(){},project:()=>({visible:false}),dispose:()=>canvas.remove(),kits,fallback:true};
  }
  return {create,fallback,kit};
})();

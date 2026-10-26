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
    const name=(club?.id||club?.name||"aura").toLowerCase(),known=palettes[name]||Object.entries(palettes).find(([k])=>name.includes(k))?.[1];
    if(known)return known;
    let n=0;for(const c of name)n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;
    return ["#"+(0x294050+(n%0x8a7a7a)).toString(16).padStart(6,"0"),"#182c40","#eee6d8"];
  }
  function create(container,options={}){
    if(!globalThis.THREE||webglUnavailable)throw Error("WebGL no está disponible.");
    const T=THREE,quality=options.quality||"medium",preview=!!options.preview;
    let renderer;
    try{renderer=new T.WebGLRenderer({antialias:quality!=="low",alpha:false,powerPreference:"high-performance"});}
    catch(error){webglUnavailable=true;throw error;}
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,quality==="high"?2:quality==="low"?1:1.5));
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
    renderer.shadowMap.enabled=quality==="high";renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label","Estadio y partido de fútbol en tres dimensiones");container.appendChild(renderer.domElement);
    const scene=new T.Scene(),day=options.stadium==="day",sunset=options.stadium==="sunset";
    scene.background=new T.Color(day?0x9aafb4:sunset?0x403f50:0x121c2b);scene.fog=new T.Fog(scene.background,130,285);
    const camera=new T.PerspectiveCamera(43,1,.1,400),objects=[],textures=new Set(),dynamic=[];
    const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,...extra});
    function mesh(geometry,mat,x=0,y=0,z=0,parent=scene){const o=new T.Mesh(geometry,mat);o.position.set(x,y,z);parent.add(o);objects.push(o);return o;}
    const box=(w,h,d,mat,x,y,z,parent)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);
    const cylinder=(r,h,mat,x,y,z,parent)=>mesh(new T.CylinderGeometry(r,r,h,10),mat,x,y,z,parent);
    const concrete=material(0x26323c),rail=material(0x758088,{metalness:.4}),black=material(0x101a23),lightMat=material(0xf4f1dc,{emissive:0xf4f1dc,emissiveIntensity:2});
    scene.add(new T.HemisphereLight(day?0xd7edff:0x95aecf,0x3d5b31,day?2.1:1.8));
    const sun=new T.DirectionalLight(sunset?0xffc78d:0xf2f5e4,day?3.2:2.8);sun.position.set(-28,60,32);scene.add(sun);
    if(quality==="high"){sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:48,bottom:-48,near:1,far:160});sun.shadow.bias=-.001;}
    const fill=new T.DirectionalLight(0x89a9df,1.4);fill.position.set(45,30,-55);scene.add(fill);
    box(260,2,200,material(0x11242a),0,-1.3,0);
    box(122,.18,82,material(0x285d3c),0,-.12,0);
    const grassCanvas=document.createElement("canvas");grassCanvas.width=1024;grassCanvas.height=512;const ctx=grassCanvas.getContext("2d");
    ctx.fillStyle="#3f7b45";ctx.fillRect(0,0,1024,512);
    for(let i=0;i<20;i++){ctx.fillStyle=i%2?"#44894c":"#387742";ctx.fillRect(i*51.2,0,52,512);}
    let seed=8721;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<42000;i++){ctx.fillStyle=rnd()>.5?"#b7d79715":"#132c161e";ctx.fillRect(rnd()*1024,rnd()*512,1,1+rnd()*4);}
    const grassTexture=new T.CanvasTexture(grassCanvas);textures.add(grassTexture);grassTexture.colorSpace=T.SRGBColorSpace;grassTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const pitch=mesh(new T.PlaneGeometry(105,68),material(0xffffff,{map:grassTexture}),0,.015,0);pitch.rotation.x=-Math.PI/2;pitch.receiveShadow=true;
    const lines=[];
    function line(x1,z1,x2,z2,y=.055){lines.push(x1,y,z1,x2,y,z2);}
    function rect(x1,z1,x2,z2){line(x1,z1,x2,z1);line(x2,z1,x2,z2);line(x2,z2,x1,z2);line(x1,z2,x1,z1);}
    function arc(cx,cz,r,start=0,end=Math.PI*2,y=.055){for(let i=0;i<80;i++){let a=start+(end-start)*i/80,b=start+(end-start)*(i+1)/80;line(cx+Math.cos(a)*r,cz+Math.sin(a)*r,cx+Math.cos(b)*r,cz+Math.sin(b)*r,y);}}
    rect(-52.5,-34,52.5,34);line(0,-34,0,34);arc(0,0,9.15);
    for(const sign of [-1,1]){rect(sign*52.5,-20.16,sign*36,20.16);rect(sign*52.5,-9.16,sign*47,9.16);arc(sign*41.5,0,.16);arc(sign*41.5,0,9.15,sign===1?Math.PI*.7:-Math.PI*.3,sign===1?Math.PI*1.3:Math.PI*.3);}
    arc(0,0,.18);
    const lineGeo=new T.BufferGeometry();lineGeo.setAttribute("position",new T.Float32BufferAttribute(lines,3));scene.add(new T.LineSegments(lineGeo,new T.LineBasicMaterial({color:0xe2ecd7,transparent:true,opacity:.88})));
    const netMat=new T.LineBasicMaterial({color:0xe1e4d7,transparent:true,opacity:.44});
    for(const sign of [-1,1]){
      const x=sign*52.8,back=sign*55;
      cylinder(.095,2.5,lightMat,x,1.25,-3.66);cylinder(.095,2.5,lightMat,x,1.25,3.66);
      const cross=cylinder(.095,7.5,lightMat,x,2.5,0);cross.rotation.x=Math.PI/2;
      const points=[];const add=(a,b)=>points.push(...a,...b);
      for(let z=-3.66;z<=3.7;z+=.37){add([back,.06,z],[back,2.48,z]);add([x,2.48,z],[back,2.48,z]);}
      for(let y=0;y<=2.5;y+=.35){add([back,y,-3.66],[back,y,3.66]);add([x,y,-3.66],[back,y,-3.66]);add([x,y,3.66],[back,y,3.66]);}
      const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(points,3));scene.add(new T.LineSegments(g,netMat));
    }
    // Three tiers, individual instanced seats and spectators: few draw calls.
    const seatPositions=[];
    for(const side of [-1,1])for(let tier=0;tier<3;tier++){
      const z=side*(43+tier*6.2),y=2+tier*3.9;
      box(136,3.5,6.2,concrete,0,y-1.6,z);
      box(138,.2,.18,rail,0,y+.3,z-side*3);
      for(let row=0;row<4;row++)for(let col=0;col<(quality==="low"?58:88);col++){
        const px=-65+col*(quality==="low"?2.25:1.49);seatPositions.push([px,y+row*.34,side*(40.7+tier*6.2+row*1.22)]);
      }
    }
    for(const side of [-1,1])for(let tier=0;tier<3;tier++){
      const x=side*(62+tier*5.8),y=2+tier*3.9;box(5.8,3.5,80,concrete,x,y-1.6,0);
      for(let row=0;row<4;row++)for(let col=0;col<(quality==="low"?32:48);col++)seatPositions.push([side*(59.8+tier*5.8+row*1.15),y+row*.34,-35+col*(quality==="low"?2.2:1.48)]);
    }
    const seats=new T.InstancedMesh(new T.BoxGeometry(.85,.46,.65),material(0xffffff),seatPositions.length),dummy=new T.Object3D(),color=new T.Color();
    seatPositions.forEach(([x,y,z],i)=>{dummy.position.set(x,y,z);dummy.updateMatrix();seats.setMatrixAt(i,dummy.matrix);color.set([0x294269,0x3c5479,0x5f243a,0x747568,0x253240][i%5]);seats.setColorAt(i,color);});scene.add(seats);
    const count=Math.floor(seatPositions.length*.72),crowd=new T.InstancedMesh(new T.SphereGeometry(.24,5,4),material(0xffffff),count);
    for(let i=0;i<count;i++){const p=seatPositions[(i*17)%seatPositions.length];dummy.position.set(p[0],p[1]+.52,p[2]);dummy.scale.set(1,1.25,1);dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);color.set([0xb1907b,0x293d62,0xbac3ca,0x9c394c,0xdec89c][i%5]);crowd.setColorAt(i,color);}scene.add(crowd);
    for(const side of [-1,1]){
      box(156,.65,13,black,0,17.2,side*58);box(14,.65,88,black,side*78,17,0);
      for(const x of [-63,-32,0,32,63])cylinder(.24,16,rail,x,8,side*61);
    }
    for(const x of [-61,61])for(const z of [-42,42]){
      cylinder(.28,23,rail,x,11.5,z);box(9,.65,1.2,lightMat,x,23,z);
      if(!day){const bulb=new T.PointLight(0xe3edff,35,90,2);bulb.position.set(x,22,z);scene.add(bulb);}
    }
    const adMat=material(0x142c39,{emissive:0x123642,emissiveIntensity:.5});
    for(const sign of [-1,1]){box(110,.9,.3,adMat,0,.7,sign*37.3);box(.3,.9,65,adMat,sign*57,.7,0);}
    function banner(text,w=512){const c=document.createElement("canvas");c.width=w;c.height=64;const c2=c.getContext("2d");c2.fillStyle="#12232b";c2.fillRect(0,0,w,64);c2.fillStyle="#c9ff69";c2.font="bold 29px Arial";c2.textAlign="center";c2.fillText(text,w/2,43);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;textures.add(tx);return new T.MeshBasicMaterial({map:tx,side:T.DoubleSide});}
    for(const x of [-39,-13,13,39]){const a=mesh(new T.PlaneGeometry(23,.8),banner("AURA  /  PLAY YOUR WAY"),x,.8,-37);scene.add(a);const c=mesh(new T.PlaneGeometry(23,.8),banner("EVOLUTION  /  FOOTBALL"),x,.8,37);c.rotation.y=Math.PI;}
    for(const x of [-53,53])for(const z of [-34,34]){cylinder(.035,1.4,material(0xf1dc79),x,.7,z);const flag=mesh(new T.PlaneGeometry(.7,.45),material(0xd1ff78,{side:T.DoubleSide}),x+.3,1.2,z);flag.rotation.y=.2;}
    const kits=[kit(options.home),kit(options.away)];
    const aColor=new T.Color(kits[0][0]),bColor=new T.Color(kits[1][0]);
    if(Math.hypot(aColor.r-bColor.r,aColor.g-bColor.g,aColor.b-bColor.b)<.32)kits[1]=kit(options.away,true);
    // Similar lightness/colour kits receive a neutral away strip.
    if(kits[0][0]===kits[1][0])kits[1]=kit(options.away,true);
    const skinColors=[0xc8906a,0xa66c43,0xe6b48c,0x794b36,0xd6a580,0x624333];
    function footballer(p){
      const root=new T.Group();scene.add(root);const keeper=p.index===0;
      const colors=keeper?[p.team===0?"#f0b348":"#b071b3","#152c28","#eee6d4"]:kits[p.team];
      const shirt=material(colors[0]),shorts=material(colors[1]),skin=material(skinColors[(p.index+p.team*3)%skinColors.length]),socks=material(colors[0]),boots=material(0x111b20);
      const torso=mesh(new T.CylinderGeometry(.31,.25,.66,8),shirt,0,1.11,0,root);torso.scale.z=.74;
      if(!keeper){const stripe=box(.13,.64,.42,material(colors[1]),0,1.12,.04,root);stripe.castShadow=true;}
      const head=mesh(new T.SphereGeometry(.235,10,8),skin,0,1.68,0,root);head.scale.y=1.1;
      const hair=mesh(new T.SphereGeometry(.24,8,6,0,Math.PI*2,0,Math.PI*.48),material(p.index%3?0x251d18:0x3b2920),0,1.79,-.025,root);
      const hip=box(.53,.24,.38,shorts,0,.69,0,root),legs=[],arms=[];
      for(const s of [-1,1]){
        const leg=new T.Group();leg.position.set(s*.15,.65,0);root.add(leg);cylinder(.095,.36,shorts,0,-.18,0,leg);cylinder(.075,.32,socks,0,-.5,0,leg);box(.17,.12,.31,boots,0,-.65,.06,leg);legs.push(leg);
        const arm=new T.Group();arm.position.set(s*.34,1.35,0);root.add(arm);cylinder(.08,.22,shirt,0,-.12,0,arm);cylinder(.06,.32,skin,0,-.36,0,arm);arms.push(arm);
      }
      root.traverse(o=>{if(o.isMesh)o.castShadow=quality==="high";});
      const shadow=mesh(new T.CircleGeometry(.6,16),new T.MeshBasicMaterial({color:0x101b18,transparent:true,opacity:.26,depthWrite:false}),p.x,.04,p.z);shadow.rotation.x=-Math.PI/2;
      return {root,legs,arms,shadow};
    }
    let actors=[];
    const ball=mesh(new T.IcosahedronGeometry(.24,1),material(0xf5f3e8,{roughness:.45}),0,.24,0);ball.castShadow=true;
    for(let i=0;i<8;i++){const patch=mesh(new T.CircleGeometry(.085,5),material(0x182734),0,0,0,ball);const angle=i*Math.PI*2/8;patch.position.set(Math.sin(angle)*.237,Math.cos(angle)*.15,Math.cos(angle)*.18);patch.lookAt(patch.position.clone().multiplyScalar(2));}
    const ballShadow=mesh(new T.CircleGeometry(.32,12),new T.MeshBasicMaterial({color:0x08160f,transparent:true,opacity:.35}),0,.06,0);ballShadow.rotation.x=-Math.PI/2;
    const ring=mesh(new T.RingGeometry(.68,.83,32),new T.MeshBasicMaterial({color:0xc8ff69,side:T.DoubleSide,transparent:true,opacity:.95}),0,.085,0);ring.rotation.x=-Math.PI/2;
    const marker=mesh(new T.ConeGeometry(.24,.36,3),new T.MeshBasicMaterial({color:0xc8ff69}),0,2.5,0);marker.rotation.z=Math.PI;
    let disposed=false,lastTime=0,lastCamera=options.camera||"broadcast";
    function resize(){if(disposed)return;const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;observer?.observe(container);resize();
    function render(game,cam=lastCamera,now=0){
      if(disposed)return;lastCamera=cam;
      if(game){
        if(!actors.length)actors=game.players.map(footballer);
        game.players.forEach((p,i)=>{
          const a=actors[i];a.root.position.set(p.x,0,p.z);a.root.rotation.y=Math.atan2(p.faceX,p.faceZ);
          const movement=Math.min(1,Math.hypot(p.vx,p.vz)/6),swing=Math.sin(p.run*1.9)*.72*movement;
          a.legs[0].rotation.x=swing;a.legs[1].rotation.x=-swing;a.arms[0].rotation.x=-swing*.8;a.arms[1].rotation.x=swing*.8;
          a.root.position.y=Math.abs(Math.sin(p.run*3.8))*.055*movement;a.shadow.position.set(p.x,.04,p.z);
        });
        ball.position.set(game.ball.x,game.ball.y,game.ball.z);ball.rotation.z+=game.ball.vx*.008;ball.rotation.x+=game.ball.vz*.008;ballShadow.position.set(game.ball.x,.06,game.ball.z);ballShadow.material.opacity=.34/Math.max(1,game.ball.y);
        const selected=game.players[game.controlled];ring.position.set(selected.x,.09,selected.z);marker.position.set(selected.x,2.5,selected.z);marker.rotation.y=now*.001;
      }else {ring.visible=false;marker.visible=false;}
      const bx=game?.ball.x||0,bz=game?.ball.z||0;
      const target=new T.Vector3(),position=new T.Vector3();
      if(preview){position.set(76,72,103);target.set(0,0,-2);}
      else if(cam==="tactical"){position.set(bx*.12,115,.1);target.set(bx*.12,0,0);}
      else if(cam==="wide"){position.set(bx*.12,77,99);target.set(bx*.15,0,0);}
      else {position.set(bx*.48,56,76+bz*.12);target.set(bx*.52,0,bz*.25);}
      const blend=lastTime?1-Math.exp(-Math.min(.1,(now-lastTime)/1000)*4):1;camera.position.lerp(position,blend);camera.lookAt(target);lastTime=now;
      renderer.render(scene,camera);
    }
    function project(player){const v=new T.Vector3(player.x,2.2,player.z).project(camera);return {x:(v.x*.5+.5)*container.clientWidth,y:(-.5*v.y+.5)*container.clientHeight,visible:v.z<1};}
    function dispose(){
      if(disposed)return;disposed=true;observer?.disconnect();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    }
    return {render,resize,dispose,project,renderer,kits};
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

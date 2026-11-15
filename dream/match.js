import * as THREE from './vendor/three.module.min.js';
import { FootballSimulation, FIELD } from './football.js';
import { VisionFrame } from './vision-adapter.js';

const $=q=>document.querySelector(q),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class SoccerMatch {
  constructor({state,byId,opponent,home,onFinish,onExit}){
    this.state=state;this.home=home;this.opponent=opponent;this.onFinish=onFinish;this.onExit=onExit;this.input={x:0,z:0,sprint:false};this.keys=new Set();this.listeners=[];this.playerMeshes=[];this.disposed=false;this.didFinish=false;this.toastTimer=null;this.frame=0;this.fpsFrames=0;this.fpsStart=0;
    const roster=state.lineup.map(id=>byId.get(id));
    this.sim=new FootballSimulation({roster,formation:state.formation,opponentRating:opponent.rating,duration:state.settings.duration,difficulty:state.settings.difficulty,seed:state.seed+state.played*103,onEvent:e=>this.event(e)});
  }
  start(){
    $('#home-short').textContent=this.home?'DREAM':this.opponent.name.split(' ').filter(x=>x.length>2)[0]?.slice(0,7).toUpperCase()||'RIVAL';
    $('#away-short').textContent=this.home?this.opponent.name.split(' ').filter(x=>x.length>2)[0]?.slice(0,7).toUpperCase()||'RIVAL':'DREAM';
    $('#match-score').innerHTML='0 <i>:</i> 0';$('#match-clock').textContent='00:00';$('#match-overlay').hidden=true;
    this.createScene();this.bindControls();this.resize();this.lastTime=performance.now();this.frame=requestAnimationFrame(t=>this.loop(t));
    this.showEvent('¡A JUGAR!','Tu club, tu historia.',1800);
  }
  listen(target,type,fn,options){target.addEventListener(type,fn,options);this.listeners.push(()=>target.removeEventListener(type,fn,options));}
  createScene(){
    if(typeof AuraGraphics!=='undefined'){
      const container=$('#match-canvas'),settings=this.state.settings;
      const options={home:{id:'dream',name:this.state.clubName,colors:['#baff57','#173a30','#f3f8e9']},away:{id:'dream-rival',name:this.opponent.name,colors:['#61a6de','#152d49','#f1f3f7']},quality:settings.quality||'high',stadium:settings.stadium||'night',weather:'clear',camera:settings.camera};
      container.replaceChildren();
      try{this.shared=AuraGraphics.create(container,options);}
      catch{this.shared=AuraGraphics.fallback(container,{...options,quality:'medium'});}
      this.visionFrame=new VisionFrame();$('#match-quality').textContent=this.shared.fallback?'VISTA COMPATIBLE':'VISION 10.0';
      if(this.shared.renderer)this.listen(this.shared.renderer.domElement,'webglcontextlost',e=>{e.preventDefault();this.pause();this.showEvent('3D INTERRUMPIDO','Sal del partido y vuelve a entrar para recuperar la imagen.',5000);});
      return;
    }
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#8eb7c5');this.scene.fog=new THREE.Fog('#8eb7c5',140,300);
    this.camera=new THREE.PerspectiveCamera(48,1,.3,400);
    try{this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}
    catch{
      this.software=new CompatibleRenderer(this.camera);$('#match-canvas').replaceChildren(this.software.canvas);this.camera.position.set(0,72,69);this.camera.lookAt(0,0,0);$('#match-quality').textContent='VISTA COMPATIBLE';return;
    }
    $('#match-quality').textContent='3D BETA';this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    $('#match-canvas').replaceChildren(this.renderer.domElement);
    this.listen(this.renderer.domElement,'webglcontextlost',e=>{e.preventDefault();this.pause();this.showEvent('3D INTERRUMPIDO','Reanuda o sal del partido para volver a intentarlo.',5000);});
    const hemi=new THREE.HemisphereLight('#d9f7ff','#274b32',2.2);this.scene.add(hemi);
    const sun=new THREE.DirectionalLight('#fff4d8',3.4);sun.position.set(-25,75,-40);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-75;sun.shadow.camera.right=75;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;sun.shadow.camera.far=200;sun.shadow.bias=-.001;this.scene.add(sun);
    this.addGround();this.addStadium();this.addGoals();
    for(const p of this.sim.players){const model=this.makePlayer(p);this.playerMeshes.push(model);this.scene.add(model.group);}
    const ballTexture=this.ballTexture();this.ballMesh=new THREE.Mesh(new THREE.SphereGeometry(.36,20,14),new THREE.MeshStandardMaterial({map:ballTexture,roughness:.75}));this.ballMesh.castShadow=true;this.scene.add(this.ballMesh);
    this.ballShadow=new THREE.Mesh(new THREE.CircleGeometry(.39,16),new THREE.MeshBasicMaterial({color:0x06170b,transparent:true,opacity:.3,depthWrite:false}));this.ballShadow.rotation.x=-Math.PI/2;this.ballShadow.position.y=.022;this.scene.add(this.ballShadow);
    this.marker=new THREE.Mesh(new THREE.RingGeometry(.82,1.04,32),new THREE.MeshBasicMaterial({color:'#c5ff49',side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}));this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.035;this.scene.add(this.marker);
    this.arrow=new THREE.Mesh(new THREE.ConeGeometry(.27,.52,3),new THREE.MeshBasicMaterial({color:'#c5ff49'}));this.arrow.rotation.z=Math.PI;this.scene.add(this.arrow);
    this.camera.position.set(0,72,69);this.camera.lookAt(0,0,0);
  }
  mesh(geometry,color,x,y,z,cast=false){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;this.scene.add(m);return m;}
  addGround(){
    this.mesh(new THREE.PlaneGeometry(400,300),'#315c4d',0,-.09,0).rotation.x=-Math.PI/2;
    const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;const ctx=canvas.getContext('2d');
    for(let i=0;i<20;i++){ctx.fillStyle=i%2?'#3b8d51':'#39834b';ctx.fillRect(i*76.8,0,78,1024);}
    // Deterministic grass grain stays inside the bundled canvas texture.
    for(let i=0;i<18000;i++){const x=(i*73.43)%1536,y=(i*137.19)%1024;ctx.fillStyle=i%2?'#c9f5b510':'#103d1a15';ctx.fillRect(x,y,1.1,2);}
    const sx=1536/105,sz=1024/68;ctx.strokeStyle='#e2f1d7';ctx.lineWidth=2.2;ctx.strokeRect(2,2,1532,1020);
    const line=(x1,z1,x2,z2)=>{ctx.beginPath();ctx.moveTo((x1+52.5)*sx,(z1+34)*sz);ctx.lineTo((x2+52.5)*sx,(z2+34)*sz);ctx.stroke();};
    line(0,-34,0,34);ctx.beginPath();ctx.ellipse(768,512,9.15*sx,9.15*sz,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e2f1d7';ctx.beginPath();ctx.arc(768,512,3,0,Math.PI*2);ctx.fill();
    for(const side of [-1,1]){
      const x=side<0?0:(105-16.5)*sx;ctx.strokeRect(x,(34-20.16)*sz,16.5*sx,40.32*sz);
      const gx=side<0?0:(105-5.5)*sx;ctx.strokeRect(gx,(34-9.16)*sz,5.5*sx,18.32*sz);
      const px=(52.5+side*41.5)*sx;ctx.beginPath();ctx.arc(px,512,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(px,512,9.15*sx,9.15*sz,0,side<0?-Math.PI/3:Math.PI*2/3,side<0?Math.PI/3:Math.PI*4/3);ctx.stroke();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    const pitch=new THREE.Mesh(new THREE.PlaneGeometry(105,68),new THREE.MeshStandardMaterial({map:texture,roughness:1}));pitch.rotation.x=-Math.PI/2;pitch.receiveShadow=true;this.scene.add(pitch);
    for(const x of [-52.5,52.5])for(const z of [-34,34]){this.mesh(new THREE.CylinderGeometry(.035,.035,1.8,5),'#f5f7ed',x,.9,z);const flag=this.mesh(new THREE.PlaneGeometry(.65,.4),'#c5ff49',x+.32,1.6,z);flag.material.side=THREE.DoubleSide;}
  }
  addStadium(){
    const base=new THREE.BoxGeometry(1,1,1);
    for(const side of [-1,1]){
      for(let tier=0;tier<6;tier++){const m=this.mesh(base,'#203e4c',0,.8+tier*1.5,side*(39+tier*2.1));m.scale.set(129,1.5,4.5);}
      const roof=this.mesh(base,'#142b39',0,12.2,side*48.5);roof.scale.set(135,.8,15);
      const stripe=this.mesh(base,'#b8e3ce',0,11.7,side*41.1);stripe.scale.set(130,.12,.2);
      for(const x of [-64,64]){const m=this.mesh(base,'#1e3c4c',x,4.2,0);m.scale.set(9,8,78);}
    }
    // A small instanced crowd, rather than thousands of separate draw calls.
    const crowdColors=['#6c9894','#b5c5b9','#6d9ab3','#38566d','#b7c593'];
    for(let c=0;c<crowdColors.length;c++){
      const count=360,inst=new THREE.InstancedMesh(new THREE.SphereGeometry(.28,5,4),new THREE.MeshLambertMaterial({color:crowdColors[c]}),count),obj=new THREE.Object3D();
      for(let i=0;i<count;i++){const side=i%2?1:-1,tier=Math.floor(i/2)%6,x=((i*7.3+c*4.3)%126)-63;obj.position.set(x,2+tier*1.5,side*(38.6+tier*2.1+(c%2)*.7));obj.scale.set(1,1.45,1);obj.updateMatrix();inst.setMatrixAt(i,obj.matrix);}this.scene.add(inst);
    }
    const ad=document.createElement('canvas');ad.width=1024;ad.height=96;const a=ad.getContext('2d');a.fillStyle='#10252b';a.fillRect(0,0,1024,96);a.fillStyle='#c5ff49';a.font='bold italic 42px Arial';a.textAlign='center';a.fillText('AURA DREAM    //    TU CLUB. TU HISTORIA.',512,61);const texture=new THREE.CanvasTexture(ad);texture.colorSpace=THREE.SRGBColorSpace;
    for(const z of [-35.5,35.5])for(let i=0;i<5;i++){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(23,1.55),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(-46+i*23,1,z);if(z>0)mesh.rotation.y=Math.PI;this.scene.add(mesh);}
    for(const x of [-62,62])for(const z of [-47,47]){this.mesh(new THREE.CylinderGeometry(.22,.35,25,7),'#71919b',x,12.5,z);const light=this.mesh(new THREE.BoxGeometry(5,1.6,1),'#f5ffec',x,25,z);light.material=new THREE.MeshBasicMaterial({color:'#fffbd1'});}
  }
  addGoals(){
    const lineMat=new THREE.LineBasicMaterial({color:'#dce8df',transparent:true,opacity:.45});
    for(const side of [-1,1]){
      const x=52.5*side,back=54.7*side;
      for(const z of [-3.66,3.66]){this.mesh(new THREE.CylinderGeometry(.10,.10,2.44,8),'#f5f8ee',x,1.22,z,true);}
      const cross=this.mesh(new THREE.CylinderGeometry(.10,.10,7.52,8),'#f5f8ee',x,2.44,0,true);cross.rotation.x=Math.PI/2;
      const vertices=[],segment=(a,b)=>vertices.push(...a,...b);
      for(let i=0;i<=15;i++){const z=-3.66+i*7.32/15;segment([back,0,z],[back,2.44,z]);segment([x,2.44,z],[back,2.44,z]);}
      for(let j=0;j<=6;j++){const y=j*2.44/6;segment([back,y,-3.66],[back,y,3.66]);for(const z of [-3.66,3.66])segment([x,y,z],[back,y,z]);}
      for(const z of [-3.66,3.66])segment([back,0,z],[back,2.44,z]);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));this.scene.add(new THREE.LineSegments(g,lineMat));
    }
  }
  makePlayer(p){
    const g=new THREE.Group(),skin=['#a9714e','#b8815e','#d4a080','#7f4d36','#e1b497'][Number(p.id.replace(/\D/g,''))%5||0];
    const jerseyColor=p.index===0?(p.team===0?'#ebbb5f':'#f2edcf'):(p.team===0?'#c1f947':'#6099c8');
    const jersey=new THREE.MeshStandardMaterial({color:jerseyColor,roughness:.9}),shorts=new THREE.MeshStandardMaterial({color:p.team===0?'#193028':'#142c49'}),skinMat=new THREE.MeshStandardMaterial({color:skin,roughness:1}),boot=new THREE.MeshStandardMaterial({color:p.team===0?'#e9edc9':'#edb48d'});
    const part=(geometry,mat,x,y,z)=>{const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;g.add(mesh);return mesh;};
    const torso=part(new THREE.CylinderGeometry(.43,.33,.88,7),jersey,0,1.40,0);torso.scale.z=.68;
    part(new THREE.BoxGeometry(.65,.34,.38),shorts,0,.88,0);
    const head=part(new THREE.SphereGeometry(.27,10,8),skinMat,0,2.07,0);head.scale.y=1.1;
    const hair=part(new THREE.SphereGeometry(.273,9,7),new THREE.MeshStandardMaterial({color:'#1c2223'}),0,2.23,-.02);hair.scale.set(1,.52,1);
    part(new THREE.SphereGeometry(.065,5,4),skinMat,0,2.04,.25);
    const legs=[],arms=[];
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*.20,.87,0);g.add(leg);
      const calf=new THREE.Mesh(new THREE.CylinderGeometry(.105,.09,.67,6),shorts);calf.position.y=-.37;leg.add(calf);
      const sock=new THREE.Mesh(new THREE.CylinderGeometry(.11,.09,.36,6),jersey);sock.position.y=-.58;leg.add(sock);
      const shoe=new THREE.Mesh(new THREE.BoxGeometry(.22,.15,.40),boot);shoe.position.set(0,-.80,.1);leg.add(shoe);legs.push(leg);
      const arm=new THREE.Group();arm.position.set(side*.42,1.72,0);g.add(arm);
      const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.15,.135,.31,6),jersey);sleeve.position.y=-.1;arm.add(sleeve);
      const fore=new THREE.Mesh(new THREE.CylinderGeometry(.09,.08,.40,6),skinMat);fore.position.y=-.43;arm.add(fore);arms.push(arm);
    }
    const c=document.createElement('canvas');c.width=64;c.height=64;const cx=c.getContext('2d');cx.fillStyle=p.team===0?'#172824':'#edf6ef';cx.font='bold 46px Arial';cx.textAlign='center';cx.fillText(String(p.index+1),32,51);const t=new THREE.CanvasTexture(c);const num=new THREE.Mesh(new THREE.PlaneGeometry(.34,.34),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide}));num.position.set(0,1.45,-.297);num.rotation.y=Math.PI;g.add(num);
    g.scale.setScalar(1.1);return{group:g,legs,arms};
  }
  ballTexture(){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#f3f5ef';x.fillRect(0,0,512,256);for(let r=0;r<4;r++)for(let col=0;col<8;col++){const px=col*72+(r%2)*35,py=r*78;x.beginPath();for(let k=0;k<5;k++){const angle=k/5*Math.PI*2;x.lineTo(px+20*Math.cos(angle),py+20*Math.sin(angle));}x.closePath();x.fillStyle='#162a2c';x.fill();x.strokeStyle='#a4aaa5';x.stroke();}return new THREE.CanvasTexture(c);}
  resize(){if(this.shared){this.shared.resize();return;}const width=window.innerWidth,height=window.innerHeight;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();if(this.software)this.software.resize(width,height);else this.renderer.setSize(width,height);}
  bindControls(){
    const block=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','ShiftLeft','ShiftRight'];
    this.listen(window,'keydown',e=>{if(block.includes(e.code))e.preventDefault();if(e.repeat)return;this.keys.add(e.code);if(e.code==='Escape'){this.sim.paused?this.resume():this.pause();return;}if(this.sim.paused||this.sim.finished)return;if(e.code==='Space')this.sim.shoot();if(e.code==='KeyE')this.sim.pass((this.aim||this.input).x,(this.aim||this.input).z);if(e.code==='KeyQ')this.sim.switchPlayer();});
    this.listen(window,'keyup',e=>{this.keys.delete(e.code);});
    this.listen(window,'resize',()=>this.resize());
    this.listen(window,'blur',()=>{this.keys.clear();if(!this.sim.finished)this.pause();});
    this.listen(document,'visibilitychange',()=>{if(document.hidden&&!this.sim.finished)this.pause();});
    this.listen($('#pause-match'),'click',()=>{if(this.sim.finished)return;this.sim.paused?this.resume():this.pause();});
    const press=(id,fn,release=null)=>{const b=$(id),run=()=>{if(!this.sim.paused&&!this.sim.finished)fn();};this.listen(b,'pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('pressed');if(release)run();});const stop=()=>{b.classList.remove('pressed');if(release)release();};this.listen(b,'pointerup',stop);this.listen(b,'pointercancel',stop);if(!release)this.listen(b,'click',run);};
    press('#touch-shoot',()=>this.sim.shoot());press('#touch-pass',()=>this.sim.pass((this.aim||this.input).x,(this.aim||this.input).z));press('#touch-switch',()=>this.sim.switchPlayer());press('#touch-sprint',()=>this.touchSprint=true,()=>this.touchSprint=false);
    const joy=$('#joystick');this.joy={x:0,z:0,active:false};
    const update=e=>{const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dz)||1,max=r.width*.32,scale=Math.min(d,max)/d;this.joy={active:true,x:dx*scale/max,z:dz*scale/max};$('#joystick-knob').style.transform=`translate(${dx*scale}px,${dz*scale}px)`;};
    this.listen(joy,'pointerdown',e=>{e.preventDefault();joy.setPointerCapture(e.pointerId);update(e);});this.listen(joy,'pointermove',e=>{if(this.joy.active)update(e);});
    const stop=e=>{e.preventDefault();this.joy={active:false,x:0,z:0};$('#joystick-knob').style.transform='';};this.listen(joy,'pointerup',stop);this.listen(joy,'pointercancel',stop);
    this.listen($('#match-overlay'),'click',e=>{const b=e.target.closest('[data-match]');if(!b)return;const action=b.dataset.match;if(action==='resume')this.resume();else if(action==='exit')this.onExit();else if(action==='abandon')this.confirmAbandon();else if(action==='confirm-abandon')this.abandon();else if(action==='market'){this.onExit();document.querySelector('[data-nav="market"]')?.click();}});
  }
  showEvent(title,subtitle='',duration=2400){clearTimeout(this.toastTimer);$('#match-event').innerHTML=`${escapeText(title)}${subtitle?`<small>${escapeText(subtitle)}</small>`:''}`;$('#match-event').style.opacity='1';this.toastTimer=setTimeout(()=>$('#match-event').style.opacity='0',duration);}
  event(e){
    this.visionFrame?.event(e,this.sim);
    if(e.type==='goal'){this.showEvent(e.team===0?'¡GOOOOOL!':'GOL DEL RIVAL',`${this.state.clubName} ${this.sim.score[0]} – ${this.sim.score[1]} ${this.opponent.name}`,2900);}
    else if(e.type==='halftime')this.showEvent('SEGUNDA PARTE','Cambiamos de campo. Ahora atacas hacia la izquierda.',2800);
    else if(e.type==='throw-in')this.showEvent('SAQUE DE BANDA',e.team===0?'Balón para tu club.':'Balón para el rival.',1200);
    else if(e.type==='goal-kick')this.showEvent('SAQUE DE PUERTA','',1200);
    else if(e.type==='corner')this.showEvent('CÓRNER',e.team===0?'Balón para tu club.':'Balón para el rival.',1200);
    else if(e.type==='save')this.showEvent('¡PARADÓN!','El portero se queda con el balón.',1100);
    else if(e.type==='end')this.finish();
  }
  loop(now){
    if(this.disposed)return;const dt=Math.min((now-this.lastTime)/1000,.05);this.lastTime=now;
    this.fpsStart=this.fpsStart||now;this.fpsFrames++;if(now-this.fpsStart>=1000){const fps=$('#match-fps');if(fps)fps.textContent=Math.round(this.fpsFrames*1000/(now-this.fpsStart))+' FPS';this.fpsStart=now;this.fpsFrames=0;}
    this.input.x=this.joy?.active?this.joy.x:(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0);
    this.input.z=this.joy?.active?this.joy.z:(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0);
    this.input.sprint=!!this.touchSprint||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');
    this.aim=this.shared?.mapInput?this.shared.mapInput(this.input):this.input;this.sim.update(dt,this.aim);this.draw(dt);this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  draw(dt){
    if(this.shared){this.shared.render(this.visionFrame.update(this.sim),this.state.settings.camera,performance.now());}else{
    if(!this.software)for(let i=0;i<this.sim.players.length;i++){
      const p=this.sim.players[i],m=this.playerMeshes[i];m.group.position.set(p.x,0,p.z);const target=Math.atan2(p.dirX,p.dirZ),angle=Math.atan2(Math.sin(target-m.group.rotation.y),Math.cos(target-m.group.rotation.y));m.group.rotation.y+=angle*Math.min(1,dt*12);
      const speed=Math.hypot(p.vx,p.vz),stride=Math.sin(this.sim.time*(speed>6?13:10)+p.phase)*Math.min(.65,speed*.085);m.legs[0].rotation.x=stride;m.legs[1].rotation.x=-stride;m.arms[0].rotation.x=-stride*.8;m.arms[1].rotation.x=stride*.8;m.group.position.y=Math.abs(stride)*.08;
    }
    const b=this.sim.ball,controlled=this.sim.selected;if(!this.software){this.ballMesh.position.set(b.x,b.y,b.z);this.ballMesh.rotation.z-=b.vx*dt*1.5;this.ballMesh.rotation.x+=b.vz*dt*1.5;this.ballShadow.position.x=b.x;this.ballShadow.position.z=b.z;this.ballShadow.material.opacity=.32/Math.max(1,b.y);
    this.marker.position.x=controlled.x;this.marker.position.z=controlled.z;this.arrow.position.set(controlled.x,3.25+Math.sin(this.sim.time*4)*.08,controlled.z);}
    const portrait=window.innerHeight>window.innerWidth,wide=this.state.settings.camera==='wide',targetX=b.x*(portrait?.74:.35),height=portrait?(wide?84:66):(wide?88:65),depth=portrait?54:(wide?85:65);
    const smoothing=1-Math.exp(-dt*2);this.camera.position.lerp(new THREE.Vector3(targetX,height,depth),smoothing);this.camera.lookAt(targetX,0,b.z*.20);if(this.software)this.software.render(this.sim);else this.renderer.render(this.scene,this.camera);
    }
    const controlled=this.sim.selected;
    const a=this.home?this.sim.score[0]:this.sim.score[1],c=this.home?this.sim.score[1]:this.sim.score[0];$('#match-score').innerHTML=`${a} <i>:</i> ${c}`;
    const minutes=Math.floor(this.sim.virtualMinute),secs=Math.floor((this.sim.virtualMinute-minutes)*60);$('#match-clock').textContent=`${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;$('#half-label').textContent=this.sim.half===1?'1.ª PARTE':'2.ª PARTE';
    $('#controlled-name').textContent=controlled.name;$('#controlled-number').textContent=controlled.index+1;$('#stamina-bar').style.width=(controlled.stamina*100)+'%';$('.attack-indicator').innerHTML=`ATACAS HACIA LA ${this.sim.attack===1?'DERECHA <span>→</span>':'IZQUIERDA <span>←</span>'}`;this.drawMinimap();
  }
  drawMinimap(){const c=$('#minimap'),ctx=c.getContext('2d'),w=c.width,h=c.height,px=x=>(x+55)/110*w,pz=z=>(z+36)/72*h;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#c4e1cf66';ctx.lineWidth=1;ctx.strokeRect(px(-52.5),pz(-34),105/110*w,68/72*h);ctx.beginPath();ctx.moveTo(w/2,3);ctx.lineTo(w/2,h-3);ctx.stroke();ctx.beginPath();ctx.ellipse(w/2,h/2,w*9.15/110,h*9.15/72,0,0,Math.PI*2);ctx.stroke();for(const p of this.sim.players){ctx.fillStyle=p===this.sim.selected?'#fff':p.team===0?'#c5ff49':'#71b4ed';ctx.beginPath();ctx.arc(px(p.x),pz(p.z),p===this.sim.selected?3.3:2.1,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px(this.sim.ball.x),pz(this.sim.ball.z),2,0,Math.PI*2);ctx.fill();}
  pause(){if(this.sim.finished||this.disposed)return;this.sim.paused=true;this.keys.clear();this.touchSprint=false;$('#match-overlay').hidden=false;$('#match-overlay').innerHTML=`<div class="match-modal"><span class="eyebrow">TÓMATE UN RESPIRO</span><h2>PARTIDO EN PAUSA</h2><p>WASD o flechas para moverte. Espacio para tirar o robar. E para pasar. Q para cambiar. Shift para correr.<br>En celular usa el joystick y los botones A, B y C.</p><button class="btn primary" data-match="resume">SEGUIR JUGANDO</button><button class="btn secondary" data-match="abandon">ABANDONAR PARTIDO</button></div>`;}
  resume(){if(this.sim.finished||this.disposed)return;this.sim.paused=false;this.keys.clear();this.lastTime=performance.now();$('#match-overlay').hidden=true;}
  confirmAbandon(){
    $('#match-overlay').innerHTML='<div class="match-modal"><h2>¿ABANDONAR EL PARTIDO?</h2><p>Se registrará una derrota mínima de 0–3, sin recompensa. El mercado cambiará. Si recargas la página, el mismo partido queda pendiente sin resultado.</p><button class="btn primary" data-match="resume">SEGUIR JUGANDO</button><button class="btn danger" data-match="confirm-abandon">CONFIRMAR ABANDONO</button></div>';
  }
  abandon(){if(this.didFinish)return;this.sim.score=[0,Math.max(3,this.sim.score[1])];this.sim.finished=true;this.finish('abandoned');}
  finish(mode='3d'){
    if(this.didFinish)return;this.didFinish=true;
    let record;
    try{record=this.onFinish({id:this.state.pending.id,homeGoals:this.home?this.sim.score[0]:this.sim.score[1],awayGoals:this.home?this.sim.score[1]:this.sim.score[0],mode,shots:this.sim.shots});}
    catch(e){this.didFinish=false;this.sim.paused=true;$('#match-overlay').hidden=false;$('#match-overlay').innerHTML=`<div class="match-modal"><h2>NO PUDIMOS GUARDAR EL RESULTADO</h2><p>${escapeText(e.message)}</p><button class="btn primary" data-match="exit">VOLVER AL MENÚ</button></div>`;return;}
    clearTimeout(this.toastTimer);$('#match-event').style.opacity='0';$('#match-overlay').hidden=false;
    const title=record.ourGoals>record.theirGoals?'¡VICTORIA!':record.ourGoals===record.theirGoals?'EMPATE':'VOLVEREMOS MÁS FUERTES';
    $('#match-overlay').innerHTML=`<div class="match-modal"><span class="eyebrow">${mode==='abandoned'?'PARTIDO ABANDONADO':'FINAL DEL PARTIDO'} · JORNADA ${record.round}</span><h2>${title}</h2><div class="result-score">${record.ourGoals}–${record.theirGoals}</div><p>${escapeText(this.state.clubName)} vs ${escapeText(this.opponent.name)}</p><div class="match-detail-stat"><span>Disparos</span><strong>${this.sim.shots[0]} – ${this.sim.shots[1]}</strong></div><p class="reward-line"><span class="coin">A</span> +${record.reward.toLocaleString('es-EC')} monedas</p><p>Ocho nuevas ofertas te esperan en el mercado.</p><button class="btn primary" data-match="market">VER NUEVOS FICHAJES →</button><button class="btn secondary" data-match="exit">VOLVER AL CLUB</button></div>`;
  }
  destroy(){this.shared?.dispose();this.disposed=true;cancelAnimationFrame(this.frame);clearTimeout(this.toastTimer);this.listeners.forEach(off=>off());const textures=new Set(),geometries=new Set(),materials=new Set();this.scene?.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);for(const mat of Array.isArray(obj.material)?obj.material:obj.material?[obj.material]:[]){materials.add(mat);for(const v of Object.values(mat))if(v?.isTexture)textures.add(v);}});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer?.dispose();$('#match-canvas').replaceChildren();$('#match-overlay').hidden=true;$('#match-event').innerHTML='';$('#joystick-knob').style.transform='';}
}

// Projects the same world coordinates and simulation when WebGL is unavailable.
// No result is simulated on behalf of the player in this compatibility view.
class CompatibleRenderer{
  constructor(camera){this.camera=camera;this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d');this.vector=new THREE.Vector3();}
  resize(width,height){this.width=width;this.height=height;this.ratio=Math.min(window.devicePixelRatio||1,1.5);this.canvas.width=width*this.ratio;this.canvas.height=height*this.ratio;this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';}
  project(x,y,z){const v=this.vector.set(x,y,z).project(this.camera);return [(v.x*.5+.5)*this.width,(-v.y*.5+.5)*this.height];}
  path(points,fill,stroke,width=1){const c=this.ctx;c.beginPath();points.forEach((v,i)=>{const [x,y]=this.project(...v);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);});if(fill){c.closePath();c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  ground(x,z,w,d,color){this.path([[x,0,z],[x+w,0,z],[x+w,0,z+d],[x,0,z+d]],color);}
  box(x,y,z,w,h,d,color,top='#6e8790',side='#243c4b'){
    this.path([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],color);
    this.path([[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]],top);
    this.path([[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]],side);
  }
  line(points,color='#dfefd5',width=1.2){this.path(points,null,color,width);}
  circle(x,y,z,r,color,stroke=null){const pts=[];for(let i=0;i<=36;i++){const a=i/36*Math.PI*2;pts.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);}this.path(pts,color,stroke);}
  render(sim){
    const c=this.ctx;c.setTransform(this.ratio,0,0,this.ratio,0,0);this.camera.updateMatrixWorld();
    const gradient=c.createLinearGradient(0,0,0,this.height);gradient.addColorStop(0,'#88adbe');gradient.addColorStop(.6,'#bdd2cb');gradient.addColorStop(1,'#446b56');c.fillStyle=gradient;c.fillRect(0,0,this.width,this.height);
    this.ground(-180,-120,360,240,'#2c5e4c');
    for(let i=5;i>=0;i--)this.box(-65,i*1.4,-38-i*2.2,130,1.5,3.5,'#476776','#6e8993','#243e4d');
    this.box(-68,11,-54,136,.8,14,'#273c49','#68838d','#243b48');
    // Small crowd marks are projected from fixed world positions.
    for(let i=0;i<380;i++){const tier=i%6,x=((i*7.17)%128)-64,z=-38.5-tier*2.2;const [px,py]=this.project(x,tier*1.4+2,z);c.fillStyle=['#b4cbbf','#7fabb1','#b8c8ab','#789aaf'][i%4];c.fillRect(px,py,2.4,3.5);}
    this.ground(-52.5,-34,105,68,'#3f8e55');for(let i=0;i<20;i++)this.ground(-52.5+i*5.25,-34,5.25,68,i%2?'#38874e':'#3e9255');
    this.line([[-52.5,.02,-34],[52.5,.02,-34],[52.5,.02,34],[-52.5,.02,34],[-52.5,.02,-34]],'#d0e9c6',1.1);this.line([[0,.02,-34],[0,.02,34]]);this.circle(0,.02,0,9.15,null,'#d0e9c6');this.circle(0,.02,0,.25,'#e5f2dc');
    for(const side of [-1,1]){
      const x=52.5*side,inside=36*side;
      this.line([[x,.03,-20.16],[inside,.03,-20.16],[inside,.03,20.16],[x,.03,20.16]]);
      this.line([[x,.03,-9.16],[47*side,.03,-9.16],[47*side,.03,9.16],[x,.03,9.16]]);this.circle(41.5*side,.03,0,.18,'#e5f2dc');
      this.line([[x,0,-3.66],[x,2.44,-3.66],[x,2.44,3.66],[x,0,3.66]],'#f5f7ed',2.4);
      const back=54.7*side;for(let i=0;i<=10;i++){const z=-3.66+i*.732;this.line([[x,2.44,z],[back,2.44,z],[back,0,z]],'#c7dbce6b',.65);}for(let i=0;i<=5;i++)this.line([[back,i*.488,-3.66],[back,i*.488,3.66]],'#c7dbce6b',.65);
    }
    for(const x of [-52.5,52.5])for(const z of [-34,34]){this.line([[x,0,z],[x,1.8,z]],'#eaf0e4',1.2);this.path([[x,1.8,z],[x+.7,1.5,z],[x,1.4,z]],'#c5ff49');}
    const drawables=sim.players.map(p=>({z:p.z,player:p}));drawables.push({z:sim.ball.z,ball:sim.ball});drawables.sort((a,b)=>a.z-b.z);
    for(const item of drawables){
      if(item.ball){const b=item.ball;this.circle(b.x,.04,b.z,.45,'#102d2280');const [x,y]=this.project(b.x,b.y,b.z),[ex]=this.project(b.x+.36,b.y,b.z),r=Math.max(2,Math.abs(ex-x));c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle='#fbfcf0';c.fill();c.strokeStyle='#152c2b';c.lineWidth=.7;c.stroke();c.fillStyle='#203433';c.fillRect(x-r*.3,y-r*.5,r*.65,r*.6);continue;}
      const p=item.player,x=p.x,z=p.z,selected=p===sim.selected,jersey=p.index===0?(p.team===0?'#efc467':'#eee6d7'):(p.team===0?'#c5ff49':'#69a8dd'),skin=['#bd8b65','#9a6447','#e1ad89','#825136','#d29c7e'][p.index%5];
      this.circle(x,.04,z,.7,'#0e2c254d');if(selected)this.circle(x,.06,z,1.04,null,'#c5ff49');
      const speed=Math.hypot(p.vx,p.vz),stride=Math.sin(sim.time*11+p.phase)*Math.min(.45,speed*.07);
      this.line([[x-.2,.9,z],[x-.24,.15,z+stride]],'#172d34',3.5);this.line([[x+.2,.9,z],[x+.24,.15,z-stride]],'#172d34',3.5);
      this.line([[x-.24,.16,z+stride],[x-.24,.12,z+stride+.25]],'#dceacf',3);this.line([[x+.24,.16,z-stride],[x+.24,.12,z-stride+.25]],'#dceacf',3);
      this.path([[x-.34,.85,z],[x+.34,.85,z],[x+.44,1.76,z],[x-.44,1.76,z]],jersey,'#102e2833',.5);
      this.line([[x-.42,1.65,z],[x-.65,1.05,z-stride]],skin,3);this.line([[x+.42,1.65,z],[x+.65,1.05,z+stride]],skin,3);
      const [hx,hy]=this.project(x,2.13,z),[edge]=this.project(x+.29,2.13,z),r=Math.max(2,Math.abs(edge-hx));c.beginPath();c.ellipse(hx,hy,r,r*1.13,0,0,Math.PI*2);c.fillStyle=skin;c.fill();c.beginPath();c.ellipse(hx,hy-r*.6,r,r*.5,0,0,Math.PI*2);c.fillStyle='#20292b';c.fill();
      const [nx,ny]=this.project(x,1.32,z);c.fillStyle=p.team===0?'#23372b':'#e7f5f9';c.font=`bold ${Math.max(5,r*1.6)}px Arial`;c.textAlign='center';c.fillText(p.index+1,nx,ny);
      if(selected){const [ax,ay]=this.project(x,3.35,z);c.fillStyle='#c5ff49';c.beginPath();c.moveTo(ax-5,ay);c.lineTo(ax+5,ay);c.lineTo(ax,ay+7);c.fill();}
    }
    for(let i=0;i<5;i++){
      const pts=[[-57+i*23,0,-35.5],[-34+i*23,0,-35.5],[-34+i*23,1.6,-35.5],[-57+i*23,1.6,-35.5]];this.path(pts,'#152f35');const [x,y]=this.project(-45.5+i*23,.45,-35.5);c.fillStyle='#c5ff49';c.font='bold 9px Arial';c.textAlign='center';c.fillText('AURA DREAM',x,y);
    }
    // Near-side seating remains below the pitch edge in the broadcast camera.
    for(let i=0;i<4;i++)this.box(-70,i*1.4,38+i*2.6,140,1.5,3,'#263e4a','#536e77','#1c3340');
    c.setTransform(1,0,0,1,0,0);
  }
}

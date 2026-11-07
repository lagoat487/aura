/* Perspective 3D on Canvas 2D for devices where WebGL is disabled. */
const AuraSoftwareGraphics=(()=>{
  "use strict";
  const norm=v=>{const n=Math.hypot(...v)||1;return v.map(c=>c/n);};
  const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function create(container,options={}){
    const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false});container.appendChild(canvas);
    const P=AuraPresentation,M=typeof AuraMaterials!=='undefined'?AuraMaterials:null,preview=!!options.preview,night=options.stadium!=="day",sunset=options.stadium==="sunset",raining=options.weather==="rain";
    let width=1,height=1,focal=1,camera=[0,63,88],right=[1,0,0],up=[0,1,0],forward=[0,0,-1],disposed=false,backgroundKey="",cameraState=null,lastTime=null,ballSpin=null,ballAxis=0;
    const background=document.createElement("canvas"),backgroundCtx=background.getContext("2d");
    const kits=P.separateKits(AuraGraphics.kit(options.home),AuraGraphics.kit(options.away));
    const detailed=options.quality==='high'||options.quality==='ultra',low=options.quality==='low';
    const grass=document.createElement('canvas');grass.width=256;grass.height=256;const gc=grass.getContext('2d');let seed=416;
    for(let i=0;i<14000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%256,y=(seed>>>8)%256;gc.fillStyle=i%2?'#c5d9902c':'#1227122a';gc.fillRect(x,y,.7,1.5);}
    const grain=ctx.createPattern(grass,'repeat');
    const human=typeof AuraHumanSprites!=='undefined'?AuraHumanSprites.create({home:options.home,away:options.away,kits,quality:options.quality,awayAlternate:kits[1][0]!==AuraGraphics.kit(options.away)[0]}):null;
    const elements=[],seats=[],ads=[],terraceBanks=[];let terrain=null,terrainEpoch=-1;
    function setCamera(position,target){camera=position;forward=norm(target.map((n,i)=>n-camera[i]));right=norm(cross(forward,[0,1,0]));up=norm(cross(right,forward));}
    function screen(v){const scale=focal/(Math.abs(v.depth)<.0001?.0001:v.depth);return {...v,x:width/2+v.vx*scale,y:height/2-v.vy*scale,scale};}
    function point(x,y,z){const dx=x-camera[0],dy=y-camera[1],dz=z-camera[2];return screen({vx:dx*right[0]+dy*right[1]+dz*right[2],vy:dx*up[0]+dy*up[1]+dz*up[2],depth:dx*forward[0]+dy*forward[1]+dz*forward[2]});}
    function crossing(a,b){const t=(.35-a.depth)/(b.depth-a.depth);return screen({vx:a.vx+(b.vx-a.vx)*t,vy:a.vy+(b.vy-a.vy)*t,depth:.35,u:(a.u||0)+((b.u||0)-(a.u||0))*t,v:(a.v||0)+((b.v||0)-(a.v||0))*t});}
    function clipped(vertices){const out=[];let previous=vertices.at(-1);for(const current of vertices){if((previous.depth>=.35)!==(current.depth>=.35))out.push(crossing(previous,current));if(current.depth>=.35)out.push(current);previous=current;}return out;}
    function polygon(vertices,color,stroke){const points=clipped(vertices.map(p=>point(...p)));if(points.length<3)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.5;ctx.stroke();}}
    function segment(a,b,color,lineWidth=1){let p=point(...a),q=point(...b);if(p.depth<.35&&q.depth<.35)return;if(p.depth<.35)p=crossing(p,q);if(q.depth<.35)q=crossing(q,p);ctx.strokeStyle=color;ctx.lineWidth=Math.max(.25,Math.min(12,Number.isFinite(lineWidth)?lineWidth:1));ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
    function quad(x1,z1,x2,z2,y,color){polygon([[x1,y,z1],[x2,y,z1],[x2,y,z2],[x1,y,z2]],color);}
    function addBox(w,h,d,x,y,z,colors){
      const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,lo=y-h/2,hi=y+h/2;
      for(const [vertices,color] of [
        [[[a,hi,c],[b,hi,c],[b,hi,e],[a,hi,e]],colors[0]],
        [[[a,lo,e],[b,lo,e],[b,hi,e],[a,hi,e]],colors[1]||colors[0]],
        [[[a,lo,c],[a,lo,e],[a,hi,e],[a,hi,c]],colors[2]||colors[0]],
        [[[b,lo,c],[b,hi,c],[b,hi,e],[b,lo,e]],colors[1]||colors[0]]
      ])elements.push({vertices,color,center:vertices.reduce((a,p)=>a.map((n,i)=>n+p[i]/4),[0,0,0])});
    }
    const rows=low?4:detailed?10:7,cols=low?84:detailed?164:132;
    for(const sign of [-1,1])for(let tier=0;tier<3;tier++){
      const start=sign*(41.8+tier*(rows*.72+1.4)),end=start+sign*rows*.72,base=1.1+tier*(rows*.43+1.4),top=base+rows*.43+.8;
      terraceBanks.push([[-68,top,end],[68,top,end],[68,base,start],[-68,base,start]]);
      for(let row=0;row<rows;row++){
        const z=sign*(42+tier*(rows*.72+1.4)+row*.72),y=1.4+tier*(rows*.43+1.4)+row*.43;
        // A single sloped bank is subdivided visually by seats and stairs.
        if(row===0)addBox(138,rows*.43,rows*.72,0,y+rows*.21-1.1,z+sign*rows*.36,["#303c47","#202c38","#283440"]);
        for(let col=0;col<cols;col++)if(col%26>1)seats.push({x:-67+col*134/(cols-1),y,z,color:["#263c61","#4c2640","#253752","#566170"][(col*7+row*3+tier)%4]});
      }
    }
    for(const sign of [-1,1])for(let tier=0;tier<3;tier++){
      const start=sign*(61.8+tier*(rows*.72+1.4)),end=start+sign*rows*.72,base=1.1+tier*(rows*.43+1.4),top=base+rows*.43+.8;
      terraceBanks.push([[end,top,-39],[end,top,39],[start,base,39],[start,base,-39]]);
      for(let row=0;row<rows;row++){
        const x=sign*(62+tier*(rows*.72+1.4)+row*.72),y=1.4+tier*(rows*.43+1.4)+row*.43,endCols=Math.round(cols*.56);
        if(row===0)addBox(rows*.72,rows*.43,80,x+sign*rows*.36,y+rows*.21-1.1,0,["#303c47","#202c38","#283440"]);
        for(let col=0;col<endCols;col++)if(col%24>1)seats.push({x,y,z:-38+col*76/(endCols-1),color:["#34435b","#583145","#354965","#626571"][(col*3+row+tier)%4]});
      }
    }
    const roofHeight=3+3*(rows*.43+1.4),roofEdge=42+3*(rows*.72+1.4);
    for(const z of [-roofEdge,roofEdge])addBox(158,.4,9,0,roofHeight,z,["#23313d","#131f2a","#35424b"]);
    for(const x of [-roofEdge-20,roofEdge+20])addBox(9,.4,84,x,roofHeight,0,["#293b47","#17232e","#354550"]);
    const pitchLines=[];const line=(a,b)=>pitchLines.push([a,b]);
    function rect(x1,z1,x2,z2){line([x1,.04,z1],[x2,.04,z1]);line([x2,.04,z1],[x2,.04,z2]);line([x2,.04,z2],[x1,.04,z2]);line([x1,.04,z2],[x1,.04,z1]);}
    function arc(cx,cz,r,start=0,end=Math.PI*2){for(let i=0;i<64;i++){const a=start+(end-start)*i/64,b=start+(end-start)*(i+1)/64;line([cx+Math.cos(a)*r,.04,cz+Math.sin(a)*r],[cx+Math.cos(b)*r,.04,cz+Math.sin(b)*r]);}}
    rect(-52.5,-34,52.5,34);line([0,.04,-34],[0,.04,34]);arc(0,0,9.15);
    for(const s of [-1,1]){rect(s*52.5,-20.16,s*36,20.16);rect(s*52.5,-9.16,s*47,9.16);arc(s*41.5,0,.15);arc(s*41.5,0,9.15,s===1?Math.PI*.7:-Math.PI*.3,s===1?Math.PI*1.3:Math.PI*.3);}
    function texturedTriangle(image,a,b,c,ua,ub,uc){
      if([a,b,c].some(p=>p.depth<.35)){
        const points=clipped([{...a,u:ua[0],v:ua[1]},{...b,u:ub[0],v:ub[1]},{...c,u:uc[0],v:uc[1]}]);
        for(let i=1;i<points.length-1;i++){const [p,q,r]=[points[0],points[i],points[i+1]];texturedTriangle(image,p,q,r,[p.u,p.v],[q.u,q.v],[r.u,r.v]);}return;
      }
      if(Math.max(a.x,b.x,c.x)<0||Math.min(a.x,b.x,c.x)>width||Math.max(a.y,b.y,c.y)<0||Math.min(a.y,b.y,c.y)>height)return;
      const d=ua[0]*(ub[1]-uc[1])+ub[0]*(uc[1]-ua[1])+uc[0]*(ua[1]-ub[1]);if(Math.abs(d)<1e-8)return;
      const m1=(a.x*(ub[1]-uc[1])+b.x*(uc[1]-ua[1])+c.x*(ua[1]-ub[1]))/d;
      const m2=(a.y*(ub[1]-uc[1])+b.y*(uc[1]-ua[1])+c.y*(ua[1]-ub[1]))/d;
      const m3=(a.x*(uc[0]-ub[0])+b.x*(ua[0]-uc[0])+c.x*(ub[0]-ua[0]))/d;
      const m4=(a.y*(uc[0]-ub[0])+b.y*(ua[0]-uc[0])+c.y*(ub[0]-ua[0]))/d;
      const m5=(a.x*(ub[0]*uc[1]-uc[0]*ub[1])+b.x*(uc[0]*ua[1]-ua[0]*uc[1])+c.x*(ua[0]*ub[1]-ub[0]*ua[1]))/d;
      const m6=(a.y*(ub[0]*uc[1]-uc[0]*ub[1])+b.y*(uc[0]*ua[1]-ua[0]*uc[1])+c.y*(ua[0]*ub[1]-ub[0]*ua[1]))/d;
      const centre={x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3},expand=p=>{const dx=p.x-centre.x,dy=p.y-centre.y,n=Math.hypot(dx,dy)||1;return [p.x+dx/n*.45,p.y+dy/n*.45];};
      ctx.save();ctx.beginPath();ctx.moveTo(...expand(a));ctx.lineTo(...expand(b));ctx.lineTo(...expand(c));ctx.closePath();ctx.clip();ctx.transform(m1,m2,m3,m4,m5,m6);ctx.drawImage(image,0,0);ctx.restore();
    }
    function texturedSurface(image,corners,columns=16,lines=10){
      const [tl,tr,br,bl]=corners,w=image.width,h=image.height;
      const world=(u,v)=>tl.map((n,k)=>(n*(1-u)+tr[k]*u)*(1-v)+(bl[k]*(1-u)+br[k]*u)*v);
      for(let y=0;y<lines;y++)for(let x=0;x<columns;x++){
        const u=x/columns,v=y/lines,du=1/columns,dv=1/lines;
        const a=point(...world(u,v)),b=point(...world(u+du,v)),c=point(...world(u+du,v+dv)),d=point(...world(u,v+dv));
        const ta=[u*w,v*h],tb=[(u+du)*w,v*h],tc=[(u+du)*w,(v+dv)*h],td=[u*w,(v+dv)*h];
        texturedTriangle(image,a,b,c,ta,tb,tc);texturedTriangle(image,a,c,d,ta,tc,td);
      }
    }
    function photographicTerrain(assets){
      if(!assets.grass)return null;if(terrain&&terrainEpoch===assets.epoch)return terrain;
      terrainEpoch=assets.epoch;terrain=document.createElement('canvas');terrain.width=2048;terrain.height=1326;const tc=terrain.getContext('2d'),tile=terrain.width/28;
      for(let x=0;x<terrain.width;x+=tile)for(let y=0;y<terrain.height;y+=tile)tc.drawImage(assets.grass,x,y,tile+1,tile+1);
      tc.fillStyle='#3c492b48';tc.fillRect(0,0,terrain.width,terrain.height);
      for(let i=0;i<20;i++){tc.fillStyle=i%2?'#d0dcba13':'#102f1b1a';tc.fillRect(i*terrain.width/20,0,terrain.width/20+1,terrain.height);}
      let wearSeed=8721;
      const rnd=()=>{wearSeed=(Math.imul(wearSeed,1664525)+1013904223)>>>0;return wearSeed/4294967296;};
      for(let i=0;i<160;i++){
        const x=rnd()*terrain.width,y=rnd()*terrain.height,r=terrain.width*(.006+rnd()*.02),fade=tc.createRadialGradient(x,y,0,x,y,r);
        fade.addColorStop(0,i%3?'#0e241b18':'#c2af611c');fade.addColorStop(1,'#33452a00');tc.fillStyle=fade;tc.fillRect(x-r,y-r,r*2,r*2);
      }
      return terrain;
    }
    function stadium(){
      const assets=typeof AuraHumanSprites!=='undefined'?AuraHumanSprites.assets():{};
      const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,raining?"#435361":night?sunset?"#5f5260":"#111e2e":"#a1bec5");gradient.addColorStop(1,"#182e30");ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
      quad(-150,-110,150,110,-2,"#122831");
      for(const e of elements)e.depth=(e.center[0]-camera[0])*forward[0]+(e.center[1]-camera[1])*forward[1]+(e.center[2]-camera[2])*forward[2];
      elements.sort((a,b)=>b.depth-a.depth).forEach(e=>polygon(e.vertices,e.color));
      if(!assets.terrace)seats.forEach((s,i)=>{const p=point(s.x,s.y,s.z);if(p.depth<1||p.x<-10||p.x>width+10||p.y<-10||p.y>height+10)return;
        ctx.fillStyle=s.color;ctx.fillRect(p.x,p.y,Math.max(1,p.scale*.7),Math.max(1,p.scale*.45));
        if(i%19!==0){const r=Math.max(.7,p.scale*.16);ctx.fillStyle=['#b99b7c','#85634b','#d1b598'][i%3];ctx.beginPath();ctx.arc(p.x+p.scale*.35,p.y-p.scale*.39,r,0,Math.PI*2);ctx.fill();ctx.fillStyle=['#b0b5bb','#783145','#273c5d','#777f75'][i%4];ctx.fillRect(p.x+p.scale*.11,p.y-p.scale*.21,p.scale*.48,p.scale*.5);}
      });
      if(assets.terrace)for(const bank of terraceBanks){
        texturedSurface(assets.terrace,bank,12,3);
        const [a,b,c,d]=bank,at=(u,v)=>a.map((n,k)=>(n*(1-u)+b[k]*u)*(1-v)+(d[k]*(1-u)+c[k]*u)*v+(k===1?.045:0));
        for(const u of [.14,.35,.57,.79]){polygon([at(u-.004,0),at(u+.004,0),at(u+.004,1),at(u-.004,1)],'#727d77');
          if(detailed)for(let v=.1;v<1;v+=.1)segment(at(u-.004,v),at(u+.004,v),'#b3bab36b',.65);
        }
      }
      quad(-58,-39,58,39,-.02,"#244d37");
      const turf=photographicTerrain(assets);
      if(turf)texturedSurface(turf,[[-52.5,.006,-34],[52.5,.006,-34],[52.5,.006,34],[-52.5,.006,34]],low?12:22,low?8:14);
      else {for(let i=0;i<18;i++)quad(-52.5+i*105/18,-34,-52.5+(i+1)*105/18,34,0,i%2?'#426e30':'#385f2b');ctx.globalAlpha=.15;quad(-52.5,-34,52.5,34,.002,grain);ctx.globalAlpha=1;}
      const light=ctx.createRadialGradient(width*.48,height*.42,0,width*.48,height*.42,width*.72);light.addColorStop(0,night?'#f0f4d006':'#fff8cd10');light.addColorStop(1,'#081d152d');quad(-52.5,-34,52.5,34,.008,light);
      // Paint has a physical width on the turf; projected endpoint scales can diverge at the near plane.
      for(const [a,b] of pitchLines){const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz)||1,ox=dz/length*.0525,oz=-dx/length*.0525;
        polygon([[a[0]+ox,a[1],a[2]+oz],[b[0]+ox,b[1],b[2]+oz],[b[0]-ox,b[1],b[2]-oz],[a[0]-ox,a[1],a[2]-oz]],'#edf1d9c9');
      }
      for(const sign of [-1,1]){
        polygon([[-55,.1,sign*37],[55,.1,sign*37],[55,1,sign*37],[-55,1,sign*37]],"#142c3d");
        for(let x=-45;x<50;x+=22){const p=point(x,.8,sign*37);if(p.depth<1)continue;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#b8f6f1dc';ctx.font='700 '+Math.max(6,p.scale*.55)+'px Arial';ctx.fillText('AURA   /   VISION',0,0);ctx.restore();}
        for(const x of [-52.5,52.5]){segment([x,0,sign*34],[x,1.5,sign*34],"#dacb8b",1);polygon([[x,1.5,sign*34],[x+.65,1.45,sign*34],[x,1.1,sign*34]],"#d1ff7c");}
      }
      for(const x of [-62,62])for(const z of [-43,43]){
        segment([x,0,z],[x,22,z],"#526779",Math.max(1,height/500));const p=point(x,22,z);segment([x,22,z],[x+7,22,z],"#f4f6eb",3);
        if(night&&p.depth>1){const radius=Math.min(80,12+p.scale*1.7),glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);glow.addColorStop(0,"#f3f8ffaf");glow.addColorStop(.12,"#e7f0ff55");glow.addColorStop(1,"#eff6ff00");ctx.fillStyle=glow;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}
      }
    }
    function flags(time){
      for(const sign of [-1,1])for(const x of (low?[-34,34]:[-44,-22,22,44])){
        const z=sign*43,anchor=point(x,5.7,z);if(!P.flagVisible([x+1.3,5.7,z],cameraState)||anchor.x<-150||anchor.x>width+150||anchor.y<-100||anchor.y>height+100)continue;
        const colors=kits[sign<0?0:1],at=(u,v)=>[x+u*2.6,5.7+(v-.5)*1.5-.09*u*u,z+P.flagWave(u,v,time,x*.27+sign)];
        segment([x,2.4,z],[x,6.45,z],'#b7c2c0',Math.max(.7,anchor.scale*.035));
        for(let i=0;i<8;i++){const u=i/8,v=(i+1)/8;polygon([at(u,0),at(v,0),at(v,1),at(u,1)],colors[i%2]);}
      }
    }
    function goals(game){
      for(const s of [-1,1]){
        const x=s*52.6,back=s*55+s*P.goalNetImpulse(game,s);
        polygon([[x,0,-3.66],[back,0,-3.66],[back,2.44,-3.66],[x,2.44,-3.66]],"#ccd9c815");
        for(let z=-3.66;z<=3.7;z+=(detailed?.24:.5)){segment([back,0,z],[back,2.44,z],"#e4ead466",.65);segment([x,2.44,z],[back,2.44,z],"#e4ead466",.65);}
        for(let y=0;y<=2.45;y+=(detailed?.24:.4))segment([back,y,-3.66],[back,y,3.66],"#e4ead466",.65);
        for(const side of [-1,1])for(let i=0;i<9;i++){
          const xx=x+(back-x)*i/8;segment([xx,0,side*3.66],[xx,2.44,side*3.66],"#e4ead455",.65);
        }
        const postWidth=Math.max(1.4,point(x,1,0).scale*.13);
        segment([x,0,-3.66],[x,2.44,-3.66],"#edf0dc",postWidth);segment([x,0,3.66],[x,2.44,3.66],"#edf0dc",postWidth);segment([x,2.44,-3.66],[x,2.44,3.66],"#edf0dc",postWidth);
      }
    }
    function castShadow(p,game){
      const ground=point(p.x,.03,p.z);if(ground.depth<.7||ground.x<-180||ground.x>width+180||ground.y<-180||ground.y>height+180)return;
      const pose=P.pose(p,game),look=P.appearance(p),light=M?M.shadowVector(options.stadium,look.height):{x:1.2,z:1.1,opacity:.2};
      const tip=point(p.x+light.x,.035,p.z+light.z),edge=point(p.x+right[0],.03,p.z+right[2]);
      if(tip.depth<.7||edge.depth<.7||Math.hypot(tip.x-ground.x,tip.y-ground.y)>180)return;
      if(human?.drawShadow?.(ctx,p,pose,look,camera,ground,tip,edge,light.opacity))return;
      const fade=ctx.createLinearGradient(ground.x,ground.y,tip.x,tip.y);fade.addColorStop(0,night?'#08151d44':'#10251a55');fade.addColorStop(1,'#14221e00');
      ctx.save();ctx.lineCap='round';ctx.strokeStyle=fade;ctx.lineWidth=Math.min(12,ground.scale*.34);ctx.beginPath();ctx.moveTo(ground.x,ground.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.restore();
    }
    function player(p,selected,game){
      const pose=P.pose(p,game),look=P.appearance(p),keeper=p.index===0,scale=look.height/1.88;
      const colors=keeper?[p.team===0?'#e2a72f':'#9266bf','#19342e','#f2edd9']:kits[p.team];
      const f=[p.faceX,p.faceZ],side=[p.faceZ,-p.faceX],elevation=pose.jump+pose.saveLift-pose.crouch,tilt=pose.dive*1.05;
      const world=(x,y,z)=>[p.x+(side[0]*(x+pose.turn*y*.025)+f[0]*(z+pose.lean*y*.035))*look.build,y*scale*Math.cos(tilt)+elevation,p.z+(side[1]*(x+pose.turn*y*.025)+f[1]*(z+pose.lean*y*.035))*look.build+y*scale*Math.sin(tilt)];
      const ground=point(p.x,.02,p.z),size=Math.max(2,ground.scale*.22),head=point(...world(0,1.70,0));
      if(ground.depth<.7||ground.x<-200||ground.x>width+200||ground.y<-200||head.y>height+200)return;
      const shade=ctx.createRadialGradient(ground.x,ground.y,0,ground.x,ground.y,size*2.2);shade.addColorStop(0,'#0920167a');shade.addColorStop(1,'#09201600');ctx.save();ctx.translate(ground.x,ground.y);ctx.scale(1,.38);ctx.fillStyle=shade;ctx.beginPath();ctx.arc(0,0,size*2.1,0,Math.PI*2);ctx.fill();ctx.restore();
      if(selected){ctx.strokeStyle=p.team===1?'#ad9aff':'#45e5e5';ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(ground.x,ground.y,size*2.25,size*.66,0,0,Math.PI*2);ctx.stroke();}
      if(human?.draw(ctx,p,pose,look,camera,ground)){
        if(selected){const h=point(p.x,2.10,p.z);ctx.fillStyle=p.team===1?'#ad9aff':'#45e5e5';ctx.beginPath();ctx.moveTo(h.x-3,h.y-4);ctx.lineTo(h.x+3,h.y-4);ctx.lineTo(h.x,h.y+1);ctx.fill();}
        return;
      }
      function limb(a,b,color,thickness){const u=point(...a),v=point(...b);ctx.lineCap='round';ctx.strokeStyle='#10271f70';ctx.lineWidth=Math.max(1,u.scale*thickness)+.65;ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=Math.max(.8,u.scale*thickness);ctx.stroke();}
      const bone=(x,y,z,angle,length)=>[x,y-Math.cos(angle)*length,z-Math.sin(angle)*length];
      for(let i=0;i<2;i++){
        const sign=i===0?-1:1,x=sign*.125,angle=(i===0?pose.stride-pose.kick*1.25-pose.tackle*.8:-pose.stride)-pose.crouch*.6,kneeAngle=angle+(i===0?pose.kneeLeft:pose.kneeRight)+pose.crouch;
        const hip=[x,.81,0],knee=bone(...hip,angle,.36),ankle=bone(...knee,kneeAngle,.34);
        const hem=hip.map((v,i)=>v+(knee[i]-v)*.48);
        limb(world(...hip),world(...hem),colors[1],.19);limb(world(...hem),world(...knee),look.skin,.15);limb(world(...knee),world(...ankle),colors[0],.13);
        limb(world(ankle[0],ankle[1],ankle[2]-.02),world(ankle[0],ankle[1],ankle[2]+.15),p.index%3===0?'#e5e8ce':p.index%3===1?'#d88455':'#16282c',.12);
      }
      function torso(z,color){polygon([world(-.22,.84,z),world(.22,.84,z),world(.29,1.43,z),world(-.29,1.43,z)],color);}
      const front=f[0]*(camera[0]-p.x)+f[1]*(camera[2]-p.z)>0;
      torso(front?-.16:.16,colors[1]);
      polygon([world(-.22,.84,-.17),world(-.22,.84,.17),world(-.29,1.43,.17),world(-.29,1.43,-.17)],colors[1]);
      polygon([world(.22,.84,-.17),world(.22,.84,.17),world(.29,1.43,.17),world(.29,1.43,-.17)],colors[1]);
      torso(front?.175:-.175,colors[0]);
      if(front&&!keeper)for(const x of [-.15,.09])polygon([world(x,.88,.181),world(x+.065,.88,.181),world(x+.065,1.42,.181),world(x,1.42,.181)],colors[1]);
      for(let i=0;i<2;i++){
        const sign=i===0?-1:1,swing=(i===0?-pose.stride:pose.stride)*.22,raised=pose.celebrate+pose.highSave;
        const shoulder=[sign*.29,1.38,0],elbow=[sign*(.34+raised*.11),1.10+raised*.51,swing-pose.save*.28],hand=[sign*(.34+raised*.22),.86+raised*.91,swing-.08-pose.save*.3];
        const sleeve=shoulder.map((v,i)=>v+(elbow[i]-v)*.52);
        limb(world(...shoulder),world(...sleeve),colors[0],.16);limb(world(...sleeve),world(...elbow),look.skin,.12);limb(world(...elbow),world(...hand),look.skin,.105);
        if(keeper)limb(world(...hand),world(hand[0],hand[1]-.04,hand[2]+.04),'#e6e5cf',.14);
      }
      const neck=world(0,1.48,0);limb(neck,world(0,1.57,0),look.skin,.12);
      const r=Math.max(1.5,head.scale*.16),face=ctx.createRadialGradient(head.x-r*.35,head.y-r*.4,.2,head.x,head.y,r*1.4);face.addColorStop(0,look.skin);face.addColorStop(1,'#654638');ctx.fillStyle=face;ctx.beginPath();ctx.ellipse(head.x,head.y,r,r*1.19,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=look.hair;ctx.beginPath();ctx.ellipse(head.x,head.y-r*.35,r*1.01,r*.76,0,Math.PI,Math.PI*2);ctx.fill();
      const label=point(...world(0,1.15,front?.19:-.19));ctx.fillStyle=colors[2];ctx.textAlign='center';ctx.font='700 '+Math.max(5,label.scale*(front?.11:.27))+'px Arial';ctx.fillText(front?'A':String(p.number),label.x,label.y+label.scale*.10);
      if(selected){const h=point(p.x,2.22,p.z);ctx.fillStyle=p.team===1?'#ad9aff':'#45e5e5';ctx.beginPath();ctx.moveTo(h.x-4,h.y-5);ctx.lineTo(h.x+4,h.y-5);ctx.lineTo(h.x,h.y+1);ctx.fill();}
    }
    function resize(){const dpr=Math.min(globalThis.devicePixelRatio||1,options.quality==='low'?1:detailed?2:1.5);width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';}ctx.setTransform(dpr,0,0,dpr,0,0);}
    function render(game,cam='broadcast',now=0){
      if(disposed)return;if(lastTime!==null&&now>lastTime&&now-lastTime<1000/30)return;
      const dt=lastTime===null?1/30:Math.max(0,Math.min(.1,(now-lastTime)/1000));lastTime=now;resize();
      const desired=P.cameraFrame(game,cam,width/height,preview);cameraState=P.smoothCamera(cameraState,desired,dt);setCamera(cameraState.position,cameraState.target);focal=height/(2*Math.tan(cameraState.fov*Math.PI/360));
      const assetEpoch=typeof AuraHumanSprites!=='undefined'?AuraHumanSprites.assets().epoch:0;
      const key=[assetEpoch,width,height,...camera.map(n=>Math.round(n*40)),...forward.map(n=>Math.round(n*4000))].join(',');
      if(key!==backgroundKey){
        stadium();if(background.width!==canvas.width||background.height!==canvas.height){background.width=canvas.width;background.height=canvas.height;}backgroundCtx.drawImage(canvas,0,0);backgroundKey=key;
      }else ctx.drawImage(background,0,0,width,height);
      flags(game?.visualTime??now*.001);
      if(game){
        if(M)ballSpin=M.ballSpin(ballSpin,game.ball,game.visualTime||0);
        game.players.filter(p=>!p.sentOff).forEach(p=>castShadow(p,game));
        const entities=game.players.filter(p=>!p.sentOff).map(p=>({depth:point(p.x,0,p.z).depth,draw:()=>player(p,game.players[game.controlled]===p||(game.localTwoPlayer&&game.players[game.awayControlled]===p),game)}));
        entities.push({depth:point(game.ball.x,game.ball.y,game.ball.z).depth,draw:()=>{
          const ball=game.ball,b=point(ball.x,ball.y,ball.z),shadow=point(ball.x,.025,ball.z),radius=Math.max(2.2,b.scale*.18);
          if(b.depth<.35)return;
          if(shadow.depth>.7){const cast=M?M.ballShadow(ball.y):{spread:1,opacity:.4},r=Math.max(2.2,shadow.scale*.18)*cast.spread;ctx.save();ctx.globalAlpha=cast.opacity;ctx.fillStyle='#0e271b';ctx.beginPath();ctx.ellipse(shadow.x,shadow.y,r*1.1,r*.4,0,0,Math.PI*2);ctx.fill();ctx.restore();}
          const assets=typeof AuraHumanSprites!=='undefined'?AuraHumanSprites.assets():null;
          if(assets?.ball&&ballSpin){
            const vx=(ball.vx||0)*right[0]+(ball.vz||0)*right[2],vz=(ball.vx||0)*forward[0]+(ball.vz||0)*forward[2];
            if(Math.hypot(vx,vz)>.02)ballAxis=Math.abs(vx)>=Math.abs(vz)?0:1;
            const axis=ballAxis===0?right:forward,phase=-ballSpin.z*axis[0]+ballSpin.x*axis[2],frames=assets.ballMeta.frames,frame=((Math.floor(phase/(Math.PI*2)*frames)%frames)+frames)%frames;
            ctx.drawImage(assets.ball,frame*64,ballAxis*64,64,64,b.x-radius,b.y-radius,radius*2,radius*2);return;
          }
          const light=ctx.createRadialGradient(b.x-radius*.35,b.y-radius*.35,.1,b.x,b.y,radius);light.addColorStop(0,'#fffef0');light.addColorStop(.7,'#e5e9da');light.addColorStop(1,'#a1b3a1');ctx.fillStyle=light;ctx.beginPath();ctx.arc(b.x,b.y,radius,0,Math.PI*2);ctx.fill();
          ctx.save();ctx.translate(b.x,b.y);ctx.rotate(ballSpin?ballSpin.x-ballSpin.z:(game.visualTime||0)*1.8);ctx.fillStyle='#263834';ctx.beginPath();for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;const x=Math.cos(angle)*radius*.43,y=Math.sin(angle)*radius*.43;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.restore();
        }});
        entities.sort((a,b)=>b.depth-a.depth).forEach(e=>e.draw());
      }
      goals(game);
      if(raining&&!preview){
        // Screen-space rain: fixed budget, no per-frame textures or DOM nodes.
        ctx.save();ctx.strokeStyle="rgba(215,230,242,.34)";ctx.lineWidth=.85;
        const drops=low?48:detailed?180:105;
        const t=Math.max(0,now)*.1;
        ctx.beginPath();
        for(let i=0;i<drops;i++){
          const x=((i*149.27+t*.18)%Math.max(1,width)+width)%Math.max(1,width);
          const y=((i*83.31+t*(.8+i%4*.1))%Math.max(1,height)+height)%Math.max(1,height);
          ctx.moveTo(x,y);ctx.lineTo(x-2,y+10);
        }
        ctx.stroke();ctx.restore();
      }
      // A gentle vignette gives the pitch the same broadcast framing as WebGL.
      const shade=ctx.createRadialGradient(width*.5,height*.5,height*.28,width*.5,height*.5,Math.max(width,height)*.8);shade.addColorStop(0,"#06111900");shade.addColorStop(1,"#06111940");ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
    }
    return {render,resize,mapInput:input=>P.cameraInput(input,cameraState),project:p=>{const q=point(p.x,2.3,p.z);return {x:q.x,y:q.y,visible:q.depth>.1&&q.x>0&&q.x<width&&q.y>0&&q.y<height};},dispose:()=>{disposed=true;human?.dispose();terrain=null;canvas.remove();},kits,fallback:true};
  }
  return {create};
})();

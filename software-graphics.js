/* Perspective 3D on Canvas 2D for devices where WebGL is disabled. */
const AuraSoftwareGraphics=(()=>{
  "use strict";
  const norm=v=>{const n=Math.hypot(...v)||1;return v.map(c=>c/n);};
  const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function create(container,options={}){
    const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false});container.appendChild(canvas);
    const P=AuraPresentation,preview=!!options.preview,night=options.stadium!=="day",sunset=options.stadium==="sunset";
    let width=1,height=1,focal=1,camera=[0,63,88],right=[1,0,0],up=[0,1,0],forward=[0,0,-1],disposed=false,backgroundKey="",cameraState=null,lastTime=null;
    const background=document.createElement("canvas"),backgroundCtx=background.getContext("2d");
    const kits=P.separateKits(AuraGraphics.kit(options.home),AuraGraphics.kit(options.away));
    const grass=document.createElement('canvas');grass.width=128;grass.height=128;const gc=grass.getContext('2d');let seed=416;
    for(let i=0;i<5000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%128,y=(seed>>>8)%128;gc.fillStyle=i%2?'#d4df8840':'#12271235';gc.fillRect(x,y,.7,1.5);}
    const grain=ctx.createPattern(grass,'repeat');
    const elements=[],seats=[],ads=[];
    function setCamera(position,target){camera=position;forward=norm(target.map((n,i)=>n-camera[i]));right=norm(cross(forward,[0,1,0]));up=norm(cross(right,forward));}
    function point(x,y,z){const dx=x-camera[0],dy=y-camera[1],dz=z-camera[2],depth=dx*forward[0]+dy*forward[1]+dz*forward[2],scale=focal/depth;return {x:width/2+(dx*right[0]+dy*right[1]+dz*right[2])*scale,y:height/2-(dx*up[0]+dy*up[1]+dz*up[2])*scale,depth,scale};}
    function polygon(vertices,color,stroke){const points=vertices.map(p=>point(...p));if(points.some(p=>p.depth<=.1))return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.5;ctx.stroke();}}
    function segment(a,b,color,lineWidth=1){const p=point(...a),q=point(...b);if(p.depth<=.1||q.depth<=.1)return;ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
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
    for(const sign of [-1,1])for(let tier=0;tier<3;tier++){
      // The front stand is lower, preserving a clear broadcast view of the pitch.
      const z=sign*(44+tier*5),y=1.4+tier*3;
      addBox(130,3.5,5,0,y-1.5,z,["#303d49","#1e2b36","#263440"]);
      for(let row=0;row<3;row++)for(let col=0;col<65;col++)seats.push({x:-63+col*1.95,y:y+row*.42,z:sign*(42.2+tier*5+row*1.15),color:["#647084","#405778","#873d50","#818377","#3f5878"][(col*7+row*3+tier)%5]});
    }
    for(const sign of [-1,1])for(let tier=0;tier<3;tier++){
      const x=sign*(62+tier*4.5),y=1.5+tier*3;
      addBox(4.5,3.5,80,x,y-1.5,0,["#303f49","#202e39","#283945"]);
      for(let row=0;row<3;row++)for(let col=0;col<35;col++)seats.push({x:sign*(60.4+tier*4.5+row*1.2),y:y+row*.42,z:-34+col*2,color:["#777e8d","#4a6082","#823d50","#9b9a8b","#405570"][(col*3+row+tier)%5]});
    }
    for(const z of [-58,58])addBox(153,.55,10,0,14.5,z,["#23333f","#131f2a","#35424b"]);
    for(const x of [-76,76])addBox(10,.5,84,x,14,0,["#293b47","#17232e","#354550"]);
    const pitchLines=[];const line=(a,b)=>pitchLines.push([a,b]);
    function rect(x1,z1,x2,z2){line([x1,.04,z1],[x2,.04,z1]);line([x2,.04,z1],[x2,.04,z2]);line([x2,.04,z2],[x1,.04,z2]);line([x1,.04,z2],[x1,.04,z1]);}
    function arc(cx,cz,r,start=0,end=Math.PI*2){for(let i=0;i<64;i++){const a=start+(end-start)*i/64,b=start+(end-start)*(i+1)/64;line([cx+Math.cos(a)*r,.04,cz+Math.sin(a)*r],[cx+Math.cos(b)*r,.04,cz+Math.sin(b)*r]);}}
    rect(-52.5,-34,52.5,34);line([0,.04,-34],[0,.04,34]);arc(0,0,9.15);
    for(const s of [-1,1]){rect(s*52.5,-20.16,s*36,20.16);rect(s*52.5,-9.16,s*47,9.16);arc(s*41.5,0,.15);arc(s*41.5,0,9.15,s===1?Math.PI*.7:-Math.PI*.3,s===1?Math.PI*1.3:Math.PI*.3);}
    function stadium(){
      const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,night?sunset?"#5f5260":"#111e2e":"#a1bec5");gradient.addColorStop(1,"#182e30");ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
      quad(-150,-110,150,110,-2,"#122831");
      for(const e of elements)e.depth=(e.center[0]-camera[0])*forward[0]+(e.center[1]-camera[1])*forward[1]+(e.center[2]-camera[2])*forward[2];
      elements.sort((a,b)=>b.depth-a.depth).forEach(e=>polygon(e.vertices,e.color));
      seats.forEach((s,i)=>{const p=point(s.x,s.y,s.z);if(p.depth<1||p.x<-10||p.x>width+10||p.y<-10||p.y>height+10)return;
        ctx.fillStyle=s.color;ctx.fillRect(p.x,p.y,Math.max(1,p.scale*.7),Math.max(1,p.scale*.45));
        if(i%5!==0){const r=Math.max(.7,p.scale*.16);ctx.fillStyle=['#b99b7c','#85634b','#d1b598'][i%3];ctx.beginPath();ctx.arc(p.x+p.scale*.35,p.y-p.scale*.39,r,0,Math.PI*2);ctx.fill();ctx.fillStyle=['#c7cbd0','#7c3542','#2e4d69','#9b9f88'][i%4];ctx.fillRect(p.x+p.scale*.11,p.y-p.scale*.21,p.scale*.48,p.scale*.5);}
      });
      quad(-58,-39,58,39,-.02,"#244d37");
      for(let i=0;i<18;i++)quad(-52.5+i*105/18,-34,-52.5+(i+1)*105/18,34,0,i%2?'#3e813e':'#377739');
      ctx.globalAlpha=.22;quad(-52.5,-34,52.5,34,.002,grain);ctx.globalAlpha=1;
      const light=ctx.createRadialGradient(width*.48,height*.42,0,width*.48,height*.42,width*.72);light.addColorStop(0,night?'#e8f4b90d':'#fff8cd12');light.addColorStop(1,'#04241c24');quad(-52.5,-34,52.5,34,.003,light);
      pitchLines.forEach(([a,b])=>segment(a,b,'#edf1d9c9',Math.max(.8,point(...a).scale*.10)));
      for(const sign of [-1,1]){
        polygon([[-55,.1,sign*37],[55,.1,sign*37],[55,1,sign*37],[-55,1,sign*37]],"#142c3d");
        for(let x=-45;x<50;x+=22){const p=point(x,.8,sign*37);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#dceccbc9';ctx.font='700 '+Math.max(6,p.scale*.55)+'px Arial';ctx.fillText('AURA   /   MATCHDAY',0,0);ctx.restore();}
        for(const x of [-52.5,52.5]){segment([x,0,sign*34],[x,1.5,sign*34],"#dacb8b",1);polygon([[x,1.5,sign*34],[x+.65,1.45,sign*34],[x,1.1,sign*34]],"#d1ff7c");}
      }
      for(const x of [-62,62])for(const z of [-43,43]){
        segment([x,0,z],[x,22,z],"#526779",Math.max(1,height/500));const p=point(x,22,z),q=point(x+7,22,z);ctx.strokeStyle="#eaf0dc";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
        if(night){const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,28);glow.addColorStop(0,"#efffdd50");glow.addColorStop(1,"#efffdd00");ctx.fillStyle=glow;ctx.fillRect(p.x-28,p.y-28,56,56);}
      }
    }
    function goals(){
      for(const s of [-1,1]){
        const x=s*52.6,back=s*55;
        polygon([[x,0,-3.66],[back,0,-3.66],[back,2.44,-3.66],[x,2.44,-3.66]],"#ccd9c815");
        for(let z=-3.66;z<=3.7;z+=.5){segment([back,0,z],[back,2.44,z],"#e4ead440",.55);segment([x,2.44,z],[back,2.44,z],"#e4ead440",.55);}
        for(let y=0;y<=2.45;y+=.4)segment([back,y,-3.66],[back,y,3.66],"#e4ead440",.55);
        segment([x,0,-3.66],[x,2.44,-3.66],"#edf0dc",1.6);segment([x,0,3.66],[x,2.44,3.66],"#edf0dc",1.6);segment([x,2.44,-3.66],[x,2.44,3.66],"#edf0dc",1.6);
      }
    }
    function player(p,selected,game){
      const pose=P.pose(p,game),look=P.appearance(p),keeper=p.index===0,scale=look.height/1.88;
      const colors=keeper?[p.team===0?'#e2a72f':'#9266bf','#19342e','#f2edd9']:kits[p.team];
      const f=[p.faceX,p.faceZ],side=[p.faceZ,-p.faceX],elevation=pose.jump+pose.save*.25;
      const world=(x,y,z)=>[p.x+(side[0]*x+f[0]*z)*look.build+pose.dive*y*.55, y*scale+elevation,p.z+(side[1]*x+f[1]*z)*look.build];
      const ground=point(p.x,.02,p.z),size=Math.max(2,ground.scale*.22),head=point(...world(0,1.70,0));
      const shade=ctx.createRadialGradient(ground.x,ground.y,0,ground.x,ground.y,size*2.2);shade.addColorStop(0,'#0920167a');shade.addColorStop(1,'#09201600');ctx.save();ctx.translate(ground.x,ground.y);ctx.scale(1,.38);ctx.fillStyle=shade;ctx.beginPath();ctx.arc(0,0,size*2.1,0,Math.PI*2);ctx.fill();ctx.restore();
      if(selected){ctx.strokeStyle='#d5ff83';ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(ground.x,ground.y,size*2.25,size*.66,0,0,Math.PI*2);ctx.stroke();}
      function limb(a,b,color,thickness){const u=point(...a),v=point(...b);ctx.lineCap='round';ctx.strokeStyle='#10271f70';ctx.lineWidth=Math.max(1,u.scale*thickness)+.65;ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=Math.max(.8,u.scale*thickness);ctx.stroke();}
      const bone=(x,y,z,angle,length)=>[x,y-Math.cos(angle)*length,z-Math.sin(angle)*length];
      for(let i=0;i<2;i++){
        const sign=i===0?-1:1,x=sign*.125,angle=(i===0?pose.stride-pose.kick*1.25-pose.tackle*.8:-pose.stride),kneeAngle=angle+(i===0?pose.kneeLeft:pose.kneeRight);
        const hip=[x,.81,0],knee=bone(...hip,angle,.36),ankle=bone(...knee,kneeAngle,.34);
        limb(world(...hip),world(...knee),colors[1],.19);limb(world(...knee),world(...ankle),colors[0],.13);
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
        const sign=i===0?-1:1,swing=(i===0?-pose.stride:pose.stride)*.22,raised=pose.celebrate+pose.save;
        const shoulder=[sign*.29,1.38,0],elbow=[sign*(.34+raised*.11),1.10+raised*.51,swing-pose.save*.28],hand=[sign*(.34+raised*.22),.86+raised*.91,swing-.08-pose.save*.3];
        limb(world(...shoulder),world(...elbow),colors[0],.16);limb(world(...elbow),world(...hand),look.skin,.105);
        if(keeper)limb(world(...hand),world(hand[0],hand[1]-.04,hand[2]+.04),'#e6e5cf',.14);
      }
      const neck=world(0,1.48,0);limb(neck,world(0,1.57,0),look.skin,.12);
      const r=Math.max(1.5,head.scale*.16),face=ctx.createRadialGradient(head.x-r*.35,head.y-r*.4,.2,head.x,head.y,r*1.4);face.addColorStop(0,look.skin);face.addColorStop(1,'#654638');ctx.fillStyle=face;ctx.beginPath();ctx.ellipse(head.x,head.y,r,r*1.19,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=look.hair;ctx.beginPath();ctx.ellipse(head.x,head.y-r*.35,r*1.01,r*.76,0,Math.PI,Math.PI*2);ctx.fill();
      const label=point(...world(0,1.15,front?.19:-.19));ctx.fillStyle=colors[2];ctx.textAlign='center';ctx.font='700 '+Math.max(5,label.scale*(front?.11:.27))+'px Arial';ctx.fillText(front?'A':String(p.number),label.x,label.y+label.scale*.10);
      if(selected){const h=point(p.x,2.22,p.z);ctx.fillStyle='#d5ff83';ctx.beginPath();ctx.moveTo(h.x-4,h.y-5);ctx.lineTo(h.x+4,h.y-5);ctx.lineTo(h.x,h.y+1);ctx.fill();}
    }
    function resize(){const dpr=Math.min(globalThis.devicePixelRatio||1,options.quality==='low'?1:options.quality==='high'?2:1.5);width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';}ctx.setTransform(dpr,0,0,dpr,0,0);}
    function render(game,cam='broadcast',now=0){
      if(disposed)return;if(lastTime!==null&&now>lastTime&&now-lastTime<1000/30)return;
      const dt=lastTime===null?1/30:Math.max(0,Math.min(.1,(now-lastTime)/1000));lastTime=now;resize();
      const desired=P.cameraFrame(game,cam,width/height,preview);cameraState=P.smoothCamera(cameraState,desired,dt);setCamera(cameraState.position,cameraState.target);focal=height/(2*Math.tan(cameraState.fov*Math.PI/360));
      const key=[width,height,...camera.map(n=>Math.round(n*40)),...forward.map(n=>Math.round(n*4000))].join(',');
      if(key!==backgroundKey){
        stadium();if(background.width!==canvas.width||background.height!==canvas.height){background.width=canvas.width;background.height=canvas.height;}backgroundCtx.drawImage(canvas,0,0);backgroundKey=key;
      }else ctx.drawImage(background,0,0,width,height);
      if(game){
        const entities=game.players.map((p,i)=>({depth:point(p.x,0,p.z).depth,draw:()=>player(p,i===game.controlled,game)}));
        entities.push({depth:point(game.ball.x,game.ball.y,game.ball.z).depth,draw:()=>{
          const ball=game.ball,b=point(ball.x,ball.y,ball.z),shadow=point(ball.x,0,ball.z),radius=Math.max(2.2,b.scale*.18);
          ctx.fillStyle='#0e271b66';ctx.beginPath();ctx.ellipse(shadow.x,shadow.y,radius*1.1,radius*.4,0,0,Math.PI*2);ctx.fill();
          const light=ctx.createRadialGradient(b.x-radius*.35,b.y-radius*.35,.1,b.x,b.y,radius);light.addColorStop(0,'#fffef0');light.addColorStop(.7,'#e5e9da');light.addColorStop(1,'#a1b3a1');ctx.fillStyle=light;ctx.beginPath();ctx.arc(b.x,b.y,radius,0,Math.PI*2);ctx.fill();
          ctx.save();ctx.translate(b.x,b.y);ctx.rotate((game.visualTime||0)*1.8);ctx.fillStyle='#263834';ctx.beginPath();for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;const x=Math.cos(angle)*radius*.43,y=Math.sin(angle)*radius*.43;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.restore();
        }});
        entities.sort((a,b)=>b.depth-a.depth).forEach(e=>e.draw());
      }
      goals();
      // A gentle vignette gives the pitch the same broadcast framing as WebGL.
      const shade=ctx.createRadialGradient(width*.5,height*.5,height*.28,width*.5,height*.5,Math.max(width,height)*.8);shade.addColorStop(0,"#06111900");shade.addColorStop(1,"#06111940");ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
    }
    return {render,resize,project:p=>{const q=point(p.x,2.3,p.z);return {x:q.x,y:q.y,visible:q.depth>.1&&q.x>0&&q.x<width&&q.y>0&&q.y<height};},dispose:()=>{disposed=true;canvas.remove();},kits,fallback:true};
  }
  return {create};
})();

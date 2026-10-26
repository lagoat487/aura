/* Perspective 3D on Canvas 2D for devices where WebGL is disabled. */
const AuraSoftwareGraphics=(()=>{
  "use strict";
  const norm=v=>{const n=Math.hypot(...v)||1;return v.map(c=>c/n);};
  const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function create(container,options={}){
    const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false});container.appendChild(canvas);
    const preview=!!options.preview,night=options.stadium!=="day",sunset=options.stadium==="sunset";
    let width=1,height=1,focal=1,camera=[0,63,88],right=[1,0,0],up=[0,1,0],forward=[0,0,-1],disposed=false,backgroundKey="";
    const background=document.createElement("canvas"),backgroundCtx=background.getContext("2d");
    const kits=[AuraGraphics.kit(options.home),AuraGraphics.kit(options.away)];if(kits[0][0]===kits[1][0])kits[1]=AuraGraphics.kit(options.away,true);
    const elements=[],seats=[],ads=[];
    function setCamera(position,target){camera=position;forward=norm(target.map((n,i)=>n-camera[i]));right=norm(cross(forward,[0,1,0]));up=norm(cross(right,forward));}
    function point(x,y,z){const d=[x-camera[0],y-camera[1],z-camera[2]],depth=dot(d,forward);return {x:width/2+dot(d,right)*focal/depth,y:height/2-dot(d,up)*focal/depth,depth,scale:focal/depth};}
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
      elements.sort((a,b)=>point(...b.center).depth-point(...a.center).depth).forEach(e=>polygon(e.vertices,e.color));
      seats.sort((a,b)=>point(b.x,b.y,b.z).depth-point(a.x,a.y,a.z).depth).forEach(s=>{const p=point(s.x,s.y,s.z);ctx.fillStyle=s.color;ctx.fillRect(p.x,p.y,Math.max(1,p.scale*.72),Math.max(1,p.scale*.54));if((Math.round(s.x)+Math.round(s.z))%3){ctx.fillStyle="#c3b09a";ctx.fillRect(p.x+1,p.y-p.scale*.5,Math.max(1,p.scale*.3),Math.max(1,p.scale*.32));}});
      quad(-58,-39,58,39,-.02,"#244d37");
      for(let i=0;i<20;i++)quad(-52.5+i*5.25,-34,-52.5+(i+1)*5.25,34,0,i%2?"#438647":"#3b7841");
      pitchLines.forEach(([a,b])=>segment(a,b,"#d1dec4b0",Math.max(.6,height/700)));
      for(const sign of [-1,1]){
        polygon([[-55,.1,sign*37],[55,.1,sign*37],[55,1,sign*37],[-55,1,sign*37]],"#142c3d");
        for(let x=-45;x<50;x+=26){const p=point(x,.8,sign*37);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle="#c9ff70a0";ctx.font='700 '+Math.max(6,p.scale*.55)+'px Arial';ctx.fillText("AURA  /  EVOLUTION",0,0);ctx.restore();}
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
    function player(p,selected){
      const ground=point(p.x,0,p.z),head=point(p.x,1.72,p.z),size=Math.max(2,head.scale*.23),speed=Math.min(1,Math.hypot(p.vx,p.vz)/6),stride=Math.sin(p.run*1.9)*.31*speed;
      ctx.fillStyle="#0d241d4d";ctx.beginPath();ctx.ellipse(ground.x,ground.y,size*1.65,size*.47,0,0,Math.PI*2);ctx.fill();
      if(selected){ctx.strokeStyle="#d3ff76";ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(ground.x,ground.y,size*2.4,size*.8,0,0,Math.PI*2);ctx.stroke();}
      const side=[p.faceZ*.19,0,-p.faceX*.19],walk=[p.faceX*stride,0,p.faceZ*stride],colors=p.index===0?[p.team===0?"#ecb751":"#b480c2","#153a30","#f3e1b4"]:kits[p.team];
      function limb(a,b,color,thickness){const u=point(...a),v=point(...b);ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,head.scale*thickness);ctx.lineCap="round";ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);ctx.stroke();}
      for(const sign of [-1,1]){const x=p.x+side[0]*sign,z=p.z+side[2]*sign;limb([x,.74,z],[x+walk[0]*sign,.12,z+walk[2]*sign],colors[1],.17);limb([x+walk[0]*sign,.4,z+walk[2]*sign],[x+walk[0]*sign,.09,z+walk[2]*sign],colors[0],.13);}
      const sx=p.faceZ*.29,sz=-p.faceX*.29,fx=p.faceX*.19,fz=p.faceZ*.19;
      polygon([[p.x-sx-fx,.74,p.z-sz-fz],[p.x+sx-fx,.74,p.z+sz-fz],[p.x+sx-fx,1.4,p.z+sz-fz],[p.x-sx-fx,1.4,p.z-sz-fz]],colors[1]);
      polygon([[p.x-sx+fx,.74,p.z-sz+fz],[p.x+sx+fx,.74,p.z+sz+fz],[p.x+sx+fx,1.4,p.z+sz+fz],[p.x-sx+fx,1.4,p.z-sz+fz]],colors[0]);
      const body=point(p.x,1.08,p.z);ctx.fillStyle=colors[1];ctx.fillRect(body.x-size*.2,body.y-size*.8,Math.max(1,size*.25),size*1.5);
      for(const sign of [-1,1])limb([p.x+sx*sign,1.3,p.z+sz*sign],[p.x+sx*1.4*sign-walk[0]*sign,.89,p.z+sz*1.4*sign-walk[2]*sign],["#c99c76","#885c40","#d7b08a","#6e4938"][(p.index+p.team)%4],.13);
      ctx.fillStyle=["#d6ac82","#986845","#dfb894","#77533d"][(p.index+p.team)%4];ctx.beginPath();ctx.arc(head.x,head.y,size,0,Math.PI*2);ctx.fill();ctx.fillStyle="#2c251e";ctx.beginPath();ctx.arc(head.x,head.y-size*.18,size,Math.PI,Math.PI*2);ctx.fill();
      if(selected){const h=point(p.x,2.5,p.z);ctx.fillStyle="#d3ff76";ctx.beginPath();ctx.moveTo(h.x-3,h.y-3);ctx.lineTo(h.x+3,h.y-3);ctx.lineTo(h.x,h.y+2);ctx.fill();}
    }
    function resize(){const dpr=Math.min(globalThis.devicePixelRatio||1,1.3);width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+"px";canvas.style.height=height+"px";}ctx.setTransform(dpr,0,0,dpr,0,0);focal=height/(2*Math.tan(43*Math.PI/360));}
    function render(game,cam="broadcast"){
      if(disposed)return;resize();const bx=game?.ball.x||0,bz=game?.ball.z||0;
      if(preview)setCamera([72,81,112],[0,0,-2]);
      else if(cam==="tactical")setCamera([bx*.1,117,.1],[bx*.1,0,0]);
      else if(cam==="wide")setCamera([bx*.12,77,103],[bx*.15,0,0]);
      else setCamera([bx*.45,55,79+bz*.1],[bx*.52,0,bz*.23]);
      const key=[width,height,...camera,...forward].join(",");
      if(key!==backgroundKey){
        stadium();background.width=canvas.width;background.height=canvas.height;backgroundCtx.drawImage(canvas,0,0);backgroundKey=key;
      }else ctx.drawImage(background,0,0,width,height);
      if(game){
        const entities=game.players.map((p,i)=>({depth:point(p.x,0,p.z).depth,draw:()=>player(p,i===game.controlled)}));
        entities.push({depth:point(game.ball.x,game.ball.y,game.ball.z).depth,draw:()=>{const b=point(game.ball.x,game.ball.y,game.ball.z),shadow=point(game.ball.x,0,game.ball.z),radius=Math.max(2,b.scale*.235);ctx.fillStyle="#0e271b77";ctx.beginPath();ctx.ellipse(shadow.x,shadow.y,radius*1.1,radius*.45,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f5f3e7";ctx.beginPath();ctx.arc(b.x,b.y,radius,0,Math.PI*2);ctx.fill();ctx.fillStyle="#293e40";ctx.fillRect(b.x-radius*.35,b.y-radius*.35,radius*.65,radius*.65);}});
        entities.sort((a,b)=>b.depth-a.depth).forEach(e=>e.draw());
      }
      goals();
      // A gentle vignette gives the pitch the same broadcast framing as WebGL.
      const shade=ctx.createRadialGradient(width*.5,height*.5,height*.2,width*.5,height*.5,Math.max(width,height)*.7);shade.addColorStop(0,"#06111900");shade.addColorStop(1,"#06111970");ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
    }
    return {render,resize,project:p=>{const q=point(p.x,2.3,p.z);return {x:q.x,y:q.y,visible:q.depth>0};},dispose:()=>{disposed=true;canvas.remove();},kits,fallback:true};
  }
  return {create};
})();

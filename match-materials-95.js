/* Shared uniform designs, projected shirt coordinates, lighting and ball motion. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraMaterials=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function design(club,keeper=false,alternate=false){
  if(keeper||alternate)return 'plain';
  const name=String(club?.id||'')+' '+String(club?.name||'');
  if(/boca/i.test(name))return 'band';
  if(/river|per[uú]/i.test(name))return 'sash';
  if(/arsenal/i.test(name))return 'sleeves';
  if(/barcelona|milan|juventus|atl[eé]tico|argentina/i.test(name))return 'stripes';
  return 'plain';
 }
 function paintShirt(ctx,size,style,colors,player,side){
  const s=size;ctx.fillStyle=colors[0];ctx.fillRect(0,0,s,s);
  ctx.fillStyle=colors[1];
  if(style==='stripes')for(let i=0;i<6;i++)if(i%2===0)ctx.fillRect(i*s/6,0,s/6,s);
  if(style==='band')ctx.fillRect(0,s*.37,s,s*.24);
  if(style==='sash'){ctx.beginPath();ctx.moveTo(s*.9,0);ctx.lineTo(s,0);ctx.lineTo(s,s*.2);ctx.lineTo(s*.15,s);ctx.lineTo(0,s);ctx.lineTo(0,s*.83);ctx.closePath();ctx.fill();}
  for(let y=0;y<s;y+=3){ctx.fillStyle=y%2?'#ffffff08':'#00000009';ctx.fillRect(0,y,s,1);}
  ctx.strokeStyle=colors[2];ctx.lineWidth=Math.max(1,s*.014);ctx.beginPath();ctx.moveTo(s*.33,s*.025);ctx.lineTo(s*.5,s*.1);ctx.lineTo(s*.67,s*.025);ctx.stroke();
  ctx.textAlign='center';ctx.fillStyle=colors[2];
  if(side==='back'){
   ctx.font='bold '+Math.round(s*.07)+'px Arial';ctx.fillText(String(player?.name||'AURA').split(' ').at(-1).toUpperCase().slice(0,12),s*.5,s*.23,s*.82);
   ctx.font='bold '+Math.round(s*.49)+'px Arial';ctx.fillText(String(player?.number||1),s*.5,s*.69,s*.72);
  }else{
   ctx.font='italic bold '+Math.round(s*.105)+'px Arial';ctx.fillText('AURA',s*.5,s*.48,s*.78);
  }
 }
 function jersey(options){
  const {colors,player,canvas,crest,Image:ImageType}=options,size=128,style=design(options.club,options.keeper,options.alternate);
  const front=canvas(size,size),back=canvas(size,size),f=front.getContext('2d'),b=back.getContext('2d');
  paintShirt(f,size,style,colors,player,'front');paintShirt(b,size,style,colors,player,'back');
  const read=ctx=>{try{const pixels=ctx.getImageData?.(0,0,size,size)?.data;return pixels?.length===size*size*4?pixels:null;}catch{return null;}};
  const result={front,back,size,style,frontPixels:read(f),backPixels:read(b),revision:0,onChange:null};
  if(crest&&typeof ImageType==='function'){
   const image=new ImageType();image.onload=()=>{f.drawImage(image,size*.65,size*.15,size*.16,size*.21);result.frontPixels=read(f);result.revision++;result.onChange?.();};image.src=crest;
  }
  return result;
 }
 function wrapJersey(pair,target){
  const ctx=target.getContext('2d'),w=target.width,h=target.height,s=pair.size;
  ctx.drawImage(pair.front,0,0,s,s,w*.25,0,w*.5,h);
  ctx.drawImage(pair.back,0,0,s*.5,s,w*.75,0,w*.25,h);
  ctx.drawImage(pair.back,s*.5,0,s*.5,s,0,0,w*.25,h);
  return target;
 }
 function triangle(a,b,c,uvA,uvB,uvC){
  const d=a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]);
  if(Math.abs(d)<.01)return null;
  const axis=(x,y,z)=>[(x*(b[1]-c[1])+y*(c[1]-a[1])+z*(a[1]-b[1]))/d,(x*(c[0]-b[0])+y*(a[0]-c[0])+z*(b[0]-a[0]))/d,(x*(b[0]*c[1]-c[0]*b[1])+y*(c[0]*a[1]-a[0]*c[1])+z*(a[0]*b[1]-b[0]*a[1]))/d];
  return [...axis(uvA[0],uvB[0],uvC[0]),...axis(uvA[1],uvB[1],uvC[1])];
 }
 function shirtMapper(quad){
  if(!quad||quad.length!==8||!quad.every(Number.isFinite))return null;
  const q=[quad.slice(0,2),quad.slice(2,4),quad.slice(4,6),quad.slice(6,8)];
  const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  if(area(q[0],q[1],q[2])*area(q[0],q[2],q[3])<=0)return null;
  return [triangle(q[0],q[1],q[2],[0,0],[1,0],[1,1]),triangle(q[0],q[2],q[3],[0,0],[1,1],[0,1])];
 }
 function shirtUV(map,x,y,out){
  if(!map)return false;
  for(let i=0;i<2;i++){const m=map[i];if(!m)continue;
   const u=m[0]*x+m[1]*y+m[2],v=m[3]*x+m[4]*y+m[5];
   if(u>=0&&u<=1&&v>=0&&v<=1&&(i===0?u>=v:u<=v)){out[0]=u;out[1]=v;return true;}
  }return false;
 }
 function ballSpin(previous,ball,time){
  const t=Number.isFinite(time)?time:0,dt=previous?clamp(t-previous.time,-.12,.12):0;
  return {time:t,x:(previous?.x||0)+(Number.isFinite(ball?.vz)?ball.vz:0)*dt/.18,z:(previous?.z||0)-(Number.isFinite(ball?.vx)?ball.vx:0)*dt/.18};
 }
 function ballShadow(y){const height=Math.max(0,(Number.isFinite(y)?y:.18)-.18);return {spread:1+height*.35,opacity:.62/(1+height*.28)};}
 function shadowVector(stadium,height=1.8){
  const [x,y,z]=stadium==='day'?[-38,62,30]:[-24,48,-25];return {x:-x/y*height,z:-z/y*height,opacity:stadium==='day'?.24:.19};
 }
 return {design,paintShirt,jersey,wrapJersey,shirtMapper,shirtUV,ballSpin,ballShadow,shadowVector};
});

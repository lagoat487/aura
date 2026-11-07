/* Material-encoded animation pages baked from the same clothed CC0 mesh as WebGL. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraHumanSprites=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const META={width:128,height:224,directions:16,poses:22,rows:6,pages:4,pixelsPerMeter:88,anchorY:205,elevation:.60};
 let atlas=[],grass=null,terrace=null,started=false,epoch=0;
 const rgb=c=>[1,3,5].map(i=>parseInt(String(c).slice(i,i+2),16)||0);
 function tileCrowd(image){const c=document.createElement('canvas');c.width=4096;c.height=512;const ctx=c.getContext('2d');for(let y=0;y<2;y++)for(let i=0;i<8;i++)ctx.drawImage(image,i*512,y*256,512,256);return c;}
 function start(){
  if(started||typeof Image!=='function'||typeof document==='undefined')return;started=true;
  function load(src,receive){const image=new Image();image.onload=()=>{try{receive(image);epoch++;}catch{}};image.src=src;}
  for(let page=0;page<META.pages;page++)load('./assets/models/human-motion-94-'+page+'.png',image=>{
   const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);atlas[page]={width:c.width,pixels:ctx.getImageData(0,0,c.width,c.height).data};
  });
  load('./assets/textures/turf-photo.webp',image=>{grass=image;});
  load('./assets/textures/crowd-photo.webp',image=>{terrace=tileCrowd(image);});
 }
 function frame(p,pose){
  if(pose.celebrate>.1)return 17;
  if(pose.save>.2)return p.action==='smother'?19:pose.highSave>.9?20:pose.dive&&Math.abs(pose.dive)>.3?16:15;
  if(pose.tackle>.2)return 18;
  if(pose.kick>.2)return pose.kick>.65?14:13;
  if(pose.control>.65&&pose.speed<.4)return 21;
  if(pose.speed<.13)return 0;
  const phase=Number.isFinite(pose.cycle)?pose.cycle:(Number.isFinite(p.run)?p.run:0)*2.8;
  return 1+((Math.floor(phase*12/(Math.PI*2))%12)+12)%12;
 }
 function direction(p,camera){const facing=Math.atan2(p.faceX||0,p.faceZ||0),view=Math.atan2(camera[0]-p.x,camera[2]-p.z),n=Math.round((view-facing)*META.directions/(Math.PI*2));return ((n%META.directions)+META.directions)%META.directions;}
 function create(options={}){
  start();const cache=new Map(),limit=options.quality==='low'?64:options.quality==='high'||options.quality==='ultra'?224:144;let disposed=false;
  function sprite(p,pose,view,look){
   if(disposed)return null;
   const poseIndex=frame(p,pose),page=atlas[Math.floor(poseIndex/META.rows)];if(!page)return null;
   const keeper=p.index===0,colors=keeper?(p.team===0?['#4cafbd','#183845','#f3ecdc']:['#e1ac3c','#26312b','#fbf2d6']):options.kits[p.team];
   const club=(p.team===0?options.home:options.away)||{},striped=!keeper&&/barcelona|milan|juventus|atletico/i.test(String(club.id)+' '+String(club.name));
   const angle=direction(p,view),boot=p.index%3===0?'#eee8d8':p.index%3===1?'#e09248':'#15232d';
   const key=[colors.join(''),look.skin,look.hair,look.eye,!!look.beard,boot,poseIndex,angle,striped].join('|');
   if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;}
   const c=document.createElement('canvas');c.width=META.width;c.height=META.height;const ctx=c.getContext('2d'),image=ctx.createImageData(c.width,c.height),out=image.data;
   const palette=[colors[0],colors[1],look.skin,colors[0],boot,look.hair,colors[2],'#e9e6de'].map(rgb),secondary=rgb(colors[1]),iris=rgb(look.eye||'#353929'),skin=palette[2],hair=palette[5];
   const lips=skin.map((v,i)=>v*[.82,.57,.57][i]),beard=skin.map((v,i)=>v*.35+hair[i]*.65);
   const w=META.width,h=META.height,source=page.pixels,sourceWidth=page.width,row=poseIndex%META.rows;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const a=((row*h+y)*sourceWidth+angle*w+x)*4,b=(y*w+x)*4,mat=source[a]-1;
    if(mat<0||mat>=palette.length||!source[a+3])continue;
    const flag=source[a+2];
    const color=mat===7&&flag===2?iris:mat===2&&flag===3?lips:mat===2&&flag===4&&look.beard?beard:mat===0&&striped&&flag===1?secondary:palette[mat];
    const shade=.30+source[a+1]/255*.85;
    out[b]=Math.min(255,color[0]*shade);out[b+1]=Math.min(255,color[1]*shade);out[b+2]=Math.min(255,color[2]*shade);out[b+3]=source[a+3];
   }
   ctx.putImageData(image,0,0);cache.set(key,c);if(cache.size>limit)cache.delete(cache.keys().next().value);return c;
  }
  function draw(ctx,p,pose,look,view,ground){
   const image=sprite(p,pose,view,look);if(!image)return false;
   const scale=ground.scale/META.pixelsPerMeter,sy=scale*look.height/1.88*(1+(pose.breath||0)),sx=scale*look.build;
   const lift=(pose.jump+pose.saveLift-pose.crouch)*ground.scale;
   const vx=view[0]-p.x,vz=view[2]-p.z,length=Math.hypot(vx,vz)||1;
   const lateral=(p.faceZ*vz+p.faceX*vx)/length,roll=-(pose.dive||0)*lateral*1.1;
   if(Math.abs(roll)>.001&&typeof ctx.save==='function'){
    ctx.save();ctx.translate(ground.x,ground.y-lift);ctx.rotate(roll);ctx.drawImage(image,-META.width/2*sx,-META.anchorY*sy,META.width*sx,META.height*sy);ctx.restore();
   }else ctx.drawImage(image,ground.x-META.width/2*sx,ground.y-META.anchorY*sy-lift,META.width*sx,META.height*sy);
   return true;
  }
  return {draw,dispose(){disposed=true;cache.clear();},get cacheSize(){return cache.size;}};
 }
 return {create,frame,direction,tileCrowd,meta:META,assets(){start();return {grass,terrace,epoch};}};
});

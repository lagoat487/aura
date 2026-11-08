/* Material-encoded animation pages baked from the same clothed CC0 mesh as WebGL. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraHumanSprites=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const LOW_META={width:128,height:224,directions:16,poses:22,rows:6,pages:4,pixelsPerMeter:88,anchorY:205,elevation:.60};
 const META={...LOW_META,width:192,height:336,pixelsPerMeter:132,anchorY:307.5};
 const atlases=[[],[]],curls=[],headMasks=[],headMasksLoading=[],loaded=[false,false];let grass=null,pitch=null,terrace=null,ball=null,started=false,epoch=0;
 const rgb=c=>[1,3,5].map(i=>parseInt(String(c).slice(i,i+2),16)||0);
 function tileCrowd(image){const c=document.createElement('canvas');c.width=4096;c.height=512;const ctx=c.getContext('2d');for(let y=0;y<2;y++)for(let i=0;i<8;i++)ctx.drawImage(image,i*512,y*256,512,256);return c;}
 function start(quality){
  if(typeof Image!=='function'||typeof document==='undefined')return;
  function load(src,receive){const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{try{receive(image);epoch++;}catch{}};image.src=src;}
  function pixels(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return {width:c.width,pixels:ctx.getImageData(0,0,c.width,c.height).data};}
  if(quality){const tier=quality==='low'?0:1;if(!loaded[tier]){loaded[tier]=true;for(let page=0;page<4;page++){
   load('./assets/models/human-motion-'+(tier?'96':'94')+'-'+page+'.png',image=>{atlases[tier][page]=pixels(image);});
   if(tier)load('./assets/models/human-curls-96-'+page+'.png',image=>{curls[page]=pixels(image);});
   if(!headMasksLoading[page]){headMasksLoading[page]=true;load('./assets/models/human-head-mask-99-'+page+'.png',image=>{headMasks[page]=pixels(image);});}
  }}}
  if(started)return;started=true;
  load('./assets/textures/ball-motion-95.png',image=>{ball=image;});
  load('./assets/textures/turf-photo.webp',image=>{grass=image;});
  load('./assets/textures/pitch-cinema-96.webp',image=>{pitch=image;});
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
  const meta=options.quality==='low'?LOW_META:META,atlas=atlases[options.quality==='low'?0:1],detail=typeof AuraHumanDetail!=='undefined'?AuraHumanDetail:null;
  start(options.quality||'medium');const cache=new Map(),jerseys=new Map(),shadowCache=new Map(),M=typeof AuraMaterials!=='undefined'?AuraMaterials:null,landmarks=typeof AuraKitLandmarks!=='undefined'?AuraKitLandmarks:null,limit=options.quality==='low'?64:options.quality==='high'||options.quality==='ultra'?144:96;let disposed=false;
  const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const FM=typeof AuraFaceMasks!=='undefined'?AuraFaceMasks:null,faces=FM?.create(makeCanvas),layout=typeof AuraHeadMaskLayout!=='undefined'?AuraHeadMaskLayout:null;
  function playerJersey(p,colors,club,keeper){
   if(!M||!landmarks)return null;
   const key=[p.id,p.name,p.number,colors.join(''),keeper,!!options.awayAlternate].join('|');
   if(jerseys.has(key))return jerseys.get(key);
   const pair=M.jersey({club,colors,player:p,keeper,alternate:p.team===1&&options.awayAlternate,canvas:makeCanvas,crest:typeof AuraBadges!=='undefined'&&!keeper?AuraBadges.get(club):null,Image:typeof Image!=='undefined'?Image:null});
   jerseys.set(key,pair);if(jerseys.size>32)jerseys.delete(jerseys.keys().next().value);return pair;
  }
  function sprite(p,pose,view,look){
   if(disposed)return null;
   const poseIndex=frame(p,pose),page=atlas[Math.floor(poseIndex/meta.rows)];if(!page)return null;
   const keeper=p.index===0,colors=keeper?(p.team===0?['#4cafbd','#183845','#f3ecdc']:['#e1ac3c','#26312b','#fbf2d6']):options.kits[p.team];
   const club=(p.team===0?options.home:options.away)||{},striped=M?M.design(club,keeper,p.team===1&&options.awayAlternate)==='stripes':!keeper&&/barcelona|milan|juventus|atletico/i.test(String(club.id)+' '+String(club.name));
   const angle=direction(p,view),boot=p.index%3===0?'#eee8d8':p.index%3===1?'#e09248':'#15232d';
   const jersey=playerJersey(p,colors,club,keeper),back=angle>4&&angle<12,shirtPixels=back?jersey?.backPixels:jersey?.frontPixels;
   const quad=landmarks?.quads[poseIndex*meta.directions+angle],mapper=M&&quad?M.shirtMapper(quad.slice(back?8:0,back?16:8).map(n=>n*meta.width/LOW_META.width)):null,uv=[0,0],shirtColor=[0,0,0];
   const face=faces?.get(p);
   const key=[epoch,faces?.revision||0,look.faceMaskKey,look.headScale,look.hairTop,p.id,p.originalId,p.name,p.number,jersey?.revision||0,colors.join(''),look.skin,look.hair,look.hairStyle,!!curls[Math.floor(poseIndex/meta.rows)],look.eye,!!look.beard,boot,poseIndex,angle,striped].join('|');
   if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;}
   const c=document.createElement('canvas');c.width=meta.width;c.height=meta.height;const ctx=c.getContext('2d'),image=ctx.createImageData(c.width,c.height),out=image.data;
   const palette=[colors[0],colors[1],look.skin,colors[0],boot,look.hairTop||look.hair,colors[2],'#e9e6de'].map(rgb),secondary=rgb(colors[1]),iris=rgb(look.eye||'#353929'),skin=palette[2],hair=rgb(look.hair),hairTop=look.hairTop?rgb(look.hairTop):hair;
   const fade=skin.map((v,i)=>v*.38+hair[i]*.62),brows=hair.map(v=>v*.85),nostril=skin.map(v=>v*.35);
   const sole=[23,29,34],laces=palette[4].reduce((a,b)=>a+b,0)<180?[180,187,185]:[42,48,51];
   const lips=skin.map((v,i)=>v*[.82,.57,.57][i]),beard=skin.map((v,i)=>v*.35+hair[i]*.65);
   const w=meta.width,h=meta.height,source=page.pixels,sourceWidth=page.width,row=poseIndex%meta.rows;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const a=((row*h+y)*sourceWidth+angle*w+x)*4,b=(y*w+x)*4,mat=source[a]-1;
    if(mat<0||mat>=palette.length||!source[a+3])continue;
    const flag=source[a+2];
    let color=mat===4&&flag===10?sole:mat===4&&flag===11?laces:mat===7&&flag===2?iris:mat===2&&flag===3?lips:mat===2&&flag===4&&look.beard?beard:mat===2&&flag===5?brows:mat===2&&flag===7?nostril:mat===2&&flag===9&&(look.hairStyle===2||look.hairStyle===4)?fade:mat===0&&striped&&flag===1?secondary:palette[mat];
    if(mat===0&&shirtPixels&&M.shirtUV(mapper,x+.5,y+.5,uv)){
     const u=Math.max(0,Math.min(jersey.size-1,Math.floor(uv[0]*jersey.size))),v=Math.max(0,Math.min(jersey.size-1,Math.floor(uv[1]*jersey.size))),at=(v*jersey.size+u)*4;
     shirtColor[0]=shirtPixels[at];shirtColor[1]=shirtPixels[at+1];shirtColor[2]=shirtPixels[at+2];color=shirtColor;
    }else if(mat===0&&jersey?.style==='sleeves')color=palette[1];
    const shade=meta===LOW_META?.30+source[a+1]/255*.85:source[a+1]/255*1.25;
    out[b]=Math.min(255,color[0]*shade);out[b+1]=Math.min(255,color[1]*shade);out[b+2]=Math.min(255,color[2]*shade);out[b+3]=source[a+3];
   }
   const curl=curls[Math.floor(poseIndex/meta.rows)],origin=detail?.origins[poseIndex*meta.directions+angle];
   if(meta!==LOW_META&&look.hairStyle===4&&curl&&origin){
    for(let y=0;y<96;y++)for(let x=0;x<64;x++){
     const a=((row*96+y)*curl.width+angle*64+x)*4,alpha=curl.pixels[a+3]/255,shrink=look.faceKey==='lamine'?.78:1,xx=Math.round(origin[0]+32+(x-32)*shrink),yy=Math.round(origin[1]+12+(y-12)*shrink);
     if(!alpha||xx<0||xx>=w||yy<0||yy>=h)continue;
     const b=(yy*w+xx)*4,shade=curl.pixels[a+1]/255*1.25,tint=look.hairTop&&y<45?hairTop:hair,oldAlpha=out[b+3]/255,total=alpha+oldAlpha*(1-alpha);
     for(let k=0;k<3;k++)out[b+k]=(tint[k]*shade*alpha+out[b+k]*oldAlpha*(1-alpha))/total;
     out[b+3]=total*255;
    }
   }
   const headPage=headMasks[Math.floor(poseIndex/meta.rows)],placement=layout?.frames[poseIndex*meta.directions+angle];
   let head=null;
   const ratio=meta.width/META.width,scale=look.headScale||FM?.headScale||1.4;
   if(headPage&&origin&&placement){
    const hw=Math.ceil(64*ratio),hh=Math.ceil(96*ratio);head=makeCanvas(hw,hh);const hx=head.getContext('2d'),pixels=hx.createImageData(hw,hh);
    for(let y=0;y<hh;y++)for(let x=0;x<hw;x++){
     const mx=Math.min(63,Math.floor(x/ratio)),my=Math.min(95,Math.floor(y/ratio)),a=((row*96+my)*headPage.width+angle*64+mx)*4;
     const curlAt=curl?((row*96+my)*curl.width+angle*64+mx)*4:0;
     const coverage=Math.max(headPage.pixels[a+3],meta!==LOW_META&&look.hairStyle===4&&curl?curl.pixels[curlAt+3]:0);
     const xx=Math.floor(origin[0]*ratio)+x,yy=Math.floor(origin[1]*ratio)+y;if(!coverage||xx<0||xx>=w||yy<0||yy>=h)continue;
     const at=(yy*w+xx)*4,b=(y*hw+x)*4;for(let k=0;k<3;k++)pixels.data[b+k]=out[at+k];pixels.data[b+3]=out[at+3]*coverage/255;
     out[at+3]*=1-coverage/255;
    }
    hx.putImageData(pixels,0,0);
   }
   ctx.putImageData(image,0,0);
   const maskAlpha=face?.ready&&placement?Math.max(0,Math.min(1,(placement.front-.10)/.22)):0;
   if(head&&maskAlpha<1){ctx.save();ctx.globalAlpha=1-maskAlpha;const [px,py]=placement.pivot.map(n=>n*ratio);ctx.drawImage(head,px+(origin[0]*ratio-px)*scale,py+(origin[1]*ratio-py)*scale,head.width*scale,head.height*scale);ctx.restore();}
   if(face?.ready&&placement)FM.draw(ctx,face,placement.quad.map(n=>n*ratio),placement.front);
   cache.set(key,c);if(cache.size>limit)cache.delete(cache.keys().next().value);return c;
  }
  function draw(ctx,p,pose,look,view,ground){
   const image=sprite(p,pose,view,look);if(!image)return false;
   const horizontal=Math.hypot(view[0]-p.x,view[2]-p.z),foreshorten=Math.max(.4,Math.min(1.2,horizontal/Math.hypot(horizontal,view[1])/Math.cos(meta.elevation)));
   const scale=ground.scale/meta.pixelsPerMeter,sy=scale*look.height/1.88*(1+(pose.breath||0))*foreshorten,sx=scale*look.build;
   const lift=(pose.jump+pose.saveLift-pose.crouch)*ground.scale;
   const vx=view[0]-p.x,vz=view[2]-p.z,length=Math.hypot(vx,vz)||1;
   const lateral=(p.faceZ*vz+p.faceX*vx)/length,roll=-(pose.dive||0)*lateral*1.1;
   if(Math.abs(roll)>.001&&typeof ctx.save==='function'){
    ctx.save();ctx.translate(ground.x,ground.y-lift);ctx.rotate(roll);ctx.drawImage(image,-meta.width/2*sx,-meta.anchorY*sy,meta.width*sx,meta.height*sy);ctx.restore();
   }else ctx.drawImage(image,ground.x-meta.width/2*sx,ground.y-meta.anchorY*sy-lift,meta.width*sx,meta.height*sy);
   return true;
  }
  function drawShadow(ctx,p,pose,look,view,ground,tip,edge,opacity){
   if(disposed||!Number.isFinite(ground.x+ground.y+tip.x+tip.y+edge.x+edge.y))return false;
   const poseIndex=frame(p,pose),page=atlas[Math.floor(poseIndex/meta.rows)];if(!page)return false;
   const angle=direction(p,view),key=poseIndex+':'+angle;
   let image=shadowCache.get(key);
   if(!image){
    image=makeCanvas(meta.width/2,meta.height/2);const context=image.getContext('2d'),pixels=context.createImageData(image.width,image.height),out=pixels.data;
    for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
     let alpha=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)alpha+=page.pixels[(((poseIndex%meta.rows*meta.height+y*2+dy)*page.width+angle*meta.width+x*2+dx)*4)+3];
     const at=(y*image.width+x)*4;out[at]=7;out[at+1]=17;out[at+2]=20;out[at+3]=Math.round(alpha/4);
    }
    context.putImageData(pixels,0,0);shadowCache.set(key,image);if(shadowCache.size>(options.quality==='low'?64:96))shadowCache.delete(shadowCache.keys().next().value);
   }
   const a=(edge.x-ground.x)*look.build/(meta.pixelsPerMeter/2),b=(edge.y-ground.y)*look.build/(meta.pixelsPerMeter/2),scale=meta.pixelsPerMeter/2*1.88*Math.cos(meta.elevation),c=-(tip.x-ground.x)/scale,d=-(tip.y-ground.y)/scale;
   ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,opacity/(1+(pose.jump||0)*1.8)));
   ctx.transform(a,b,c,d,ground.x-a*image.width/2-c*meta.anchorY/2,ground.y-b*image.width/2-d*meta.anchorY/2);ctx.drawImage(image,0,0);ctx.restore();return true;
  }
  return {draw,drawShadow,dispose(){disposed=true;faces?.dispose();cache.clear();jerseys.clear();shadowCache.clear();},get cacheSize(){return cache.size;},get shadowCacheSize(){return shadowCache.size;}};
 }
 return {create,frame,direction,tileCrowd,meta:META,lowMeta:LOW_META,assets(){start();return {grass,pitch,terrace,ball,ballMeta:{width:64,height:64,frames:24},epoch};}};
});

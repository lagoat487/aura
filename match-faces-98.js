/* Portrait projection and bounded head morphs for the live match rig.
   These are approximate photo-textured heads, not EA's scanned 3D models.
   Reference provenance: assets/faces/sources.json. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraFaces=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const size=256,bounds={left:-.13,right:.13,bottom:1.60,top:1.84};
 const profiles={
  lamine:{id:'277643',names:['lamine yamal','lamine yamal yamal','lamine yamal nasraoui ebana'],skin:'#ad7a58',hair:'#221e1a',hairTop:'#dcb57b',hairStyle:4,height:1.80,build:.94,
   x:[0,36,65,89,113,143,180],y:[0,49,69,83,110,132,166,180],width:1.02,jaw:.94,nose:.001,noseWidth:1.07,chin:-.003,eye:1.02},
  messi:{id:'158023',names:['messi','lionel messi','lionel andres messi'],skin:'#bf9478',hair:'#30261f',hairStyle:1,height:1.70,build:1.02,
   x:[0,37,66,87,108,140,180],y:[0,39,66,80,103,123,161,180],width:.97,jaw:1.04,nose:.008,noseWidth:.95,chin:.004,eye:.99},
  mbappe:{id:'231747',names:['kylian mbappe','kylian mbappe lottin','mbappe'],skin:'#a77956',hair:'#221f1c',hairStyle:2,height:1.78,build:1.02,
   x:[0,39,68,91,115,145,180],y:[0,48,73,85,107,123,156,180],width:1.04,jaw:1.09,nose:-.003,noseWidth:1.10,chin:.001,eye:1.07},
  vinicius:{id:'238794',names:['vinicius junior','vinicius jose paixao de oliveira junior','vini jr','vini jr.'],skin:'#8a6249',hair:'#1a1a17',hairStyle:2,height:1.76,build:.97,
   x:[0,33,61,85,108,140,180],y:[0,50,74,87,107,125,157,180],width:.98,jaw:1.04,nose:.002,noseWidth:1.08,chin:.002,eye:1.04},
  haaland:{id:'239085',names:['erling haaland','erling braut haaland','haaland'],skin:'#d9b7a3',hair:'#89765d',hairTop:'#b9a58a',hairStyle:1,height:1.95,build:1.04,
   x:[0,38,67,90,112,144,180],y:[0,42,74,89,110,127,157,180],width:1.06,jaw:1.12,nose:.002,noseWidth:.91,chin:.006,eye:1.04}
 };
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const byId=new Map(Object.entries(profiles).map(([key,p])=>[p.id,key]));
 const byName=new Map(Object.entries(profiles).flatMap(([key,p])=>p.names.map(name=>[name,key])));
 function resolve(player){
  const original=String(player?.originalId||''),id=String(player?.id||'');
  const numeric=/^real:(\d+)$/.exec(original)||/^real:(\d+)$/.exec(id);
  // A known numeric identity takes precedence over a stale card name.
  if(numeric)return byId.get(numeric[1])||null;
  return byName.get(normalize(player?.name))||null;
 }
 function profile(key){return profiles[key]||null;}
 function appearance(player){const key=resolve(player),p=profile(key);return p?{faceKey:key,skin:p.skin,hair:p.hair,hairTop:p.hairTop,hairStyle:p.hairStyle,height:p.height,build:p.build}:{};}
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 function morph(x,y,z,key){
  const p=profile(key);if(!p||y<1.59)return [x,y,z];
  const neck=clamp((y-1.59)/.065),jaw=clamp((1.72-y)/.11),front=clamp((z-.06)/.07);
  let xx=x*(1+neck*((p.width-1)*(1-jaw)+(p.jaw-1)*jaw));
  const nose=Math.exp(-Math.pow(x/.022,2)-Math.pow((y-1.708)/.034,2))*front;
  xx*=1+(p.noseWidth-1)*nose;
  // Eyelids and eye helpers use the same deformation, so the gaze remains seated.
  xx*=1+(p.eye-1)*Math.exp(-Math.pow((y-1.754)/.024,2))*front;
  return [xx,y,z+p.nose*nose+p.chin*jaw*front*neck];
 }
 function uv(x,y){return [(x-bounds.left)/(bounds.right-bounds.left),(bounds.top-y)/(bounds.top-bounds.bottom)];}
 const targetX=[-.13,-.078,-.031,0,.031,.078,.13];
 const targetY=[1.84,1.815,1.772,1.755,1.710,1.682,1.626,1.60];
 function interpolate(value,axis,source){
  for(let i=0;i<axis.length-1;i++)if(value<=axis[i+1])return source[i]+clamp((value-axis[i])/(axis[i+1]-axis[i]))*(source[i+1]-source[i]);
  return source.at(-1);
 }
 function paint(key,image,canvas){
  const p=profile(key),c=canvas(size,size),cx=c.getContext('2d',{willReadFrequently:true});
  const raw=canvas(image.width,image.height),r=raw.getContext('2d',{willReadFrequently:true});r.drawImage(image,0,0);
  const input=r.getImageData(0,0,raw.width,raw.height).data,output=cx.createImageData(size,size),out=output.data;
  const skin=[1,3,5].map(i=>parseInt(p.skin.slice(i,i+2),16)),ys=targetY.map(y=>bounds.top-y);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const wx=bounds.left+x/(size-1)*(bounds.right-bounds.left),wy=bounds.top-y/(size-1)*(bounds.top-bounds.bottom);
   const px=clamp(interpolate(wx,targetX,p.x)/180)*(raw.width-1),py=clamp(interpolate(bounds.top-wy,ys,p.y)/180)*(raw.height-1);
   const ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy,rgba=[0,0,0,0];
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const at=(Math.min(raw.height-1,iy+dy)*raw.width+Math.min(raw.width-1,ix+dx))*4,w=(dx?fx:1-fx)*(dy?fy:1-fy);
    for(let k=0;k<4;k++)rgba[k]+=input[at+k]*w;
   }
   const edge=clamp((.095-Math.abs(wx))/.023)*clamp((wy-1.610)/.023)*clamp((1.84-wy)/.02),alpha=rgba[3]/255*edge,at=(y*size+x)*4;
   for(let k=0;k<3;k++)out[at+k]=skin[k]*(1-alpha)+rgba[k]*alpha;
   out[at+3]=255;
  }
  cx.putImageData(output,0,0);return {canvas:c,pixels:out,size};
 }
 // One small local photograph per present star. Failed loads keep the skin material.
 function create(canvas,ImageType=typeof Image==='function'?Image:null){
  const entries=new Map();let disposed=false,revision=0;
  function get(key,onChange){
   if(disposed||!profile(key))return null;
   if(entries.has(key)){const e=entries.get(key);if(onChange)e.listeners.add(onChange);return e;}
   const c=canvas(size,size),ctx=c.getContext('2d');ctx.fillStyle=profile(key).skin;ctx.fillRect(0,0,size,size);
   const e={canvas:c,pixels:null,size,ready:false,listeners:new Set(onChange?[onChange]:[])};entries.set(key,e);
   if(ImageType){const image=new ImageType();image.crossOrigin='anonymous';image.onload=()=>{if(disposed)return;try{const p=paint(key,image,canvas);ctx.drawImage(p.canvas,0,0);e.pixels=p.pixels;e.ready=true;revision++;for(const listener of e.listeners)listener(e);}catch{e.failed=true;}};image.onerror=()=>{e.failed=true;};image.src='./assets/faces/'+key+'-fc27.png';}
   return e;
  }
  return {get,get revision(){return revision;},dispose(){disposed=true;entries.forEach(e=>e.listeners.clear());entries.clear();}};
 }
 return {resolve,profile,appearance,morph,uv,paint,create,size,bounds,keys:Object.keys(profiles)};
});

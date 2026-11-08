/* Exact photograph decals attached to the animated head. No facial warping. */
(function(root,factory){const api=factory(root,typeof module==='object'&&module.exports?require('./portraits-fc27'):root.AuraPortraits,typeof module==='object'&&module.exports?require('./match-faces-98'):root.AuraFaces);if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraFaceMasks=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root,Portraits,Faces){
 'use strict';
 const headScale=1.4,width=.22,height=.30,center=[0,1.76,.065],limit=64;
 const local={'277643':'lamine-reference-99.png','158023':'messi-fc27.png','231747':'mbappe-fc27.png','238794':'vinicius-fc27.png','239085':'haaland-fc27.png'};
 function resolve(player){
  if(typeof player==='string')player={id:player.startsWith('real:')?player:'real:'+player};
  if(!player)return null;
  const authoritative=/^real:(\d{3,9})$/.exec(String(player.originalId||''))||/^real:(\d{3,9})$/.exec(String(player.id||''));
  let id=authoritative?.[1]||Portraits?.identity({...player,real:true});
  if(!id&&!authoritative&&(!player.id||player.real||/^(wc26|sigma|argentina|flashback|muralla|barcelona|magia|sbc):/.test(String(player.id)))){const key=Faces?.resolve(player);if(key)id=Faces.profile(key).id;}
  const external=Portraits?.sources({...player,id:id?'real:'+id:player.id,real:true})||[];
  const sources=[...(local[id]?['./assets/faces/'+local[id]]:[]),...external];
  if(!sources.length)return null;
  return {key:id?'real:'+id:player.photo,id:id||null,sources:[...new Set(sources)],reference:id==='277643'};
 }
 function prepare(image,canvas,reference=false){
  const out=canvas(256,320),ctx=out.getContext('2d');ctx.clearRect(0,0,256,320);
  if(reference)ctx.drawImage(image,0,0,image.width,image.height,0,0,256,320);
  else{
   // Keep the portrait's real eyes, smile and nose. Remove the shirt/neck margin.
   ctx.save();ctx.beginPath();ctx.ellipse(128,157,124,157,0,0,Math.PI*2);ctx.clip();
   ctx.drawImage(image,image.width*.10,0,image.width*.80,image.height*.91,0,0,256,320);ctx.restore();
  }
  return out;
 }
 function create(canvas,ImageType=typeof Image==='function'?Image:null){
  const entries=new Map();let disposed=false,revision=0;
  function get(player,onChange){
   const descriptor=resolve(player);if(disposed||!descriptor)return null;
   if(entries.has(descriptor.key)){const e=entries.get(descriptor.key);if(onChange)e.listeners.add(onChange);return e;}
   if(entries.size>=limit)return null;
   const entry={...descriptor,canvas:canvas(256,320),ready:false,failed:false,listeners:new Set(onChange?[onChange]:[]),index:0};entries.set(entry.key,entry);
   function attempt(){
    if(disposed||entry.index>=entry.sources.length||!ImageType){entry.failed=true;return;}
    const image=new ImageType(),source=entry.sources[entry.index++];image.crossOrigin='anonymous';
    image.onerror=attempt;image.onload=()=>{
     if(disposed)return;
     try{const prepared=prepare(image,canvas,entry.reference&&source.includes('lamine-reference-99'));entry.canvas.getContext('2d').drawImage(prepared,0,0);entry.ready=true;entry.source=source;revision++;for(const listener of entry.listeners)listener(entry);}
     catch{attempt();}
    };image.src=source;
   }
   attempt();return entry;
  }
  return {get,get revision(){return revision;},get size(){return entries.size;},dispose(){disposed=true;entries.forEach(e=>e.listeners.clear());entries.clear();}};
 }
 function drawTriangle(ctx,image,source,target){
  const [a,b,c]=source,[p,q,r]=target,den=a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]);if(Math.abs(den)<1e-7)return;
  const solve=k=>[(p[k]*(b[1]-c[1])+q[k]*(c[1]-a[1])+r[k]*(a[1]-b[1]))/den,(p[k]*(c[0]-b[0])+q[k]*(a[0]-c[0])+r[k]*(b[0]-a[0]))/den,(p[k]*(b[0]*c[1]-c[0]*b[1])+q[k]*(c[0]*a[1]-a[0]*c[1])+r[k]*(a[0]*b[1]-b[0]*a[1]))/den];
  const x=solve(0),y=solve(1);ctx.save();ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.lineTo(...r);ctx.closePath();ctx.clip();ctx.transform(x[0],y[0],x[1],y[1],x[2],y[2]);ctx.drawImage(image,0,0);ctx.restore();
 }
 function draw(ctx,entry,quad,front=1){
  if(!entry?.ready||front<=.10||quad.length!==8||!quad.every(Number.isFinite))return false;
  const q=Array.from({length:4},(_,i)=>quad.slice(i*2,i*2+2)),s=[[0,0],[256,0],[256,320],[0,320]];
  ctx.save();ctx.globalAlpha=Math.min(1,(front-.10)/.22);drawTriangle(ctx,entry.canvas,[s[0],s[1],s[2]],[q[0],q[1],q[2]]);drawTriangle(ctx,entry.canvas,[s[0],s[2],s[3]],[q[0],q[2],q[3]]);ctx.restore();return true;
 }
 return {headScale,width,height,center,resolve,prepare,create,draw,limit};
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js'),Cinema=require('../match-cinema-100');
function fixture({depth=true,hdr=true,fail=false}={}){
 const calls=[],drawingSize=new T.Vector2(1200,800),screen={name:'original-target'};
 let target=screen;
 const renderer={capabilities:{isWebGL2:depth},extensions:{has:key=>key==='EXT_color_buffer_float'?hdr:depth},toneMapping:T.ACESFilmicToneMapping,
  getDrawingBufferSize:out=>out.copy(drawingSize),getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},
  render:(scene,camera)=>{calls.push({scene,camera,target,tone:renderer.toneMapping});if(fail&&calls.length===2)throw Error('lost context');}};
 return {renderer,calls,drawingSize,screen};
}
test('10.0 renders linear scene, reduced bloom and final ACES image in order; resizes with adaptive resolution',()=>{
 const f=fixture(),scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,440),pipeline=Cinema.create(T,f.renderer,scene,camera,{quality:'ultra'});
 pipeline.render();assert.equal(f.calls.length,3);assert.equal(f.calls[0].scene,scene);assert.equal(f.calls[0].tone,T.NoToneMapping);
 const frame=f.calls[0].target,bloom=f.calls[1].target;
 assert.equal(frame.width,1200);assert.equal(frame.height,800);assert.equal(bloom.width,600);assert.equal(bloom.height,400);assert.equal(frame.texture.type,T.HalfFloatType);
 assert.equal(f.calls[2].target,f.screen);assert.equal(f.calls[2].tone,T.ACESFilmicToneMapping);assert.equal(f.renderer.getRenderTarget(),f.screen);
 f.drawingSize.set(840,560);pipeline.render();assert.equal(frame.width,840);assert.equal(bloom.width,420);
 let released=0;frame.addEventListener('dispose',()=>released++);bloom.addEventListener('dispose',()=>released++);pipeline.dispose();pipeline.dispose();pipeline.render();assert.equal(released,2);assert.equal(f.calls.length,6);
});
test('10.0 preserves renderer state after a failed pass and supports devices without depth or HDR extensions',()=>{
 const f=fixture({depth:false,hdr:false,fail:true}),p=Cinema.create(T,f.renderer,new T.Scene(),new T.PerspectiveCamera(),{quality:'high'});
 assert.throws(()=>p.render(),/lost context/);assert.equal(f.renderer.getRenderTarget(),f.screen);assert.equal(f.renderer.toneMapping,T.ACESFilmicToneMapping);assert.equal(f.calls[0].target.depthTexture,null);assert.equal(f.calls[0].target.texture.type,T.UnsignedByteType);p.dispose();
 for(const quality of ['low','medium'])assert.equal(Cinema.create(T,f.renderer,new T.Scene(),new T.PerspectiveCamera(),{quality}),null);
 assert.equal(Cinema.create(T,f.renderer,new T.Scene(),new T.PerspectiveCamera(),{quality:'ultra',preview:true}),null);
});

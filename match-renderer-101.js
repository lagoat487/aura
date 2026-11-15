/* Shared recovery for match graphics. The football state never belongs to the renderer. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraMatchRenderer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function create(container,options={},dependencies={}){
  const graphics=dependencies.graphics||(typeof AuraGraphics!=='undefined'?AuraGraphics:null);
  if(!graphics)throw Error('No se ha cargado el motor del partido.');
  let active=null,disposed=false,lost=false,unbind=()=>{},lastFailure=null;
  function status(reason){lastFailure=reason||null;options.onStatus?.({mode:active?.fallback?'compatible':'accelerated',recovered:!!reason});}
  function release(){unbind();unbind=()=>{};const old=active;active=null;try{old?.dispose();}catch{}container.replaceChildren?.();}
  function install(next,reason){active=next;lost=false;const canvas=next.renderer?.domElement;
   if(canvas?.addEventListener){const handler=e=>{e.preventDefault();lost=true;};canvas.addEventListener('webglcontextlost',handler);unbind=()=>canvas.removeEventListener('webglcontextlost',handler);}
   status(reason);
  }
  function compatible(reason){release();install(graphics.fallback(container,options),reason);}
  try{install(graphics.create(container,options));}catch(error){compatible(error);}
  function render(game,camera,now){
   if(disposed)return;
   if(lost)compatible(Error('La aceleración gráfica se ha interrumpido.'));
   try{active.render(game,camera,now);}
   catch(error){
    if(active.fallback)throw error;
    // A failed image effect can recover without losing the accelerated scene.
    if(active.disableEffects?.()){
     try{active.render(game,camera,now);status(error);return;}catch{}
    }
    compatible(error);active.render(game,camera,now);
   }
  }
  return {render,resize(){active?.resize?.();},project(player){return active?.project?.(player)||{visible:false};},mapInput(input){return active?.mapInput?.(input)||input;},
   retry(){if(disposed)return false;release();try{install(graphics.create(container,options));return true;}catch(error){compatible(error);return false;}},
   get kits(){return active.kits;},get fallback(){return !!active?.fallback;},get renderer(){return active?.renderer;},get lastFailure(){return lastFailure;},
   dispose(){if(disposed)return;disposed=true;release();}};
 }
 return {create};
});

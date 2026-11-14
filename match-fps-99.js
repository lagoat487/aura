/* AURA VISION 9.9 · Measure real match render calls, never estimate GPU FPS. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AuraFPS99=api;
  if(root.document&&root.MutationObserver)api.install(root.document,root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function createMeter(windowMs=1000){
    const times=[];
    return {
      push(now){
        if(!Number.isFinite(now))return null;
        if(times.length&&now<=times[times.length-1]){
          if(now===times[times.length-1])return null;
          times.length=0;
        }
        times.push(now);
        while(times.length>2&&now-times[0]>windowMs)times.shift();
        const elapsed=now-times[0];
        if(times.length<2||elapsed<500)return null;
        const frames=times.length-1,ms=elapsed/frames;
        return {fps:Math.round(1000/ms),ms:Math.round(ms*10)/10,frames};
      },
      reset(){times.length=0;}
    };
  }
  function install(doc,root){
    if(!doc.body||typeof root.MutationObserver!=='function')return null;
    let active=null;
    function release(){
      if(!active)return;
      if(active.graphics.render===active.wrapped)active.graphics.render=active.original;
      active=null;
    }
    function attach(){
      const node=doc.getElementById('arena');
      if(active?.node===node&&node?.isConnected)return;
      release();
      if(!node)return;
      // AuraMatchUI is a global lexical binding from a classic script.
      const ui=typeof AuraMatchUI!=='undefined'?AuraMatchUI:null;
      const session=ui?.getSession?.();
      if(!session||session.node!==node||typeof session.graphics?.render!=='function')return;
      const graphics=session.graphics,meter=createMeter();
      const panel=doc.createElement('div');
      panel.className='aura-fps-meter';
      const button=doc.createElement('button');
      button.type='button';button.textContent='FPS · —';
      button.setAttribute('aria-label','Mostrar u ocultar detalles de rendimiento');
      button.setAttribute('aria-expanded','false');
      const detail=doc.createElement('span');
      detail.className='aura-fps-details';detail.hidden=true;
      button.addEventListener('click',()=>{
        detail.hidden=!detail.hidden;
        button.setAttribute('aria-expanded',String(!detail.hidden));
      });
      panel.append(button,detail);node.appendChild(panel);
      let lastLabel=0;
      const original=graphics.render;
      const wrapped=function(...args){
        const value=original.apply(this,args);
        // This timestamp comes from the *actual match* requestAnimationFrame.
        // Count only completed calls to graphics.render, not an independent loop.
        const now=Number(args[2]);
        if(doc.hidden||!node.isConnected)return value;
        const sample=meter.push(now);
        if(sample&&(!lastLabel||now-lastLabel>=400)){
          const quality=String(ui.settings?.quality||'').toUpperCase();
          button.textContent=sample.fps+' FPS';
          button.dataset.level=sample.fps>=55?'high':sample.fps>=30?'medium':'low';
          detail.textContent=sample.ms+' ms/fotograma · '+(graphics.fallback?'Compatible':'WebGL')+(quality?' · '+quality:'');
          lastLabel=now;
        }
        return value;
      };
      graphics.render=wrapped;
      active={node,graphics,original,wrapped,meter,button,detail};
    }
    const observer=new root.MutationObserver(attach);
    observer.observe(doc.body,{childList:true});
    doc.addEventListener('visibilitychange',()=>{
      if(active){
        active.meter.reset();
        active.button.textContent='FPS · —';
        active.detail.textContent='Recalculando…';
      }
    });
    attach();
    return {disconnect(){observer.disconnect();release();},get active(){return !!active;}};
  }
  return {createMeter,install};
});

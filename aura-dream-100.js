/* DREAM runs as a same-origin AURA mode. Career and UT stay alive behind it. */
(function(root){
 'use strict';
 let shell=null,frame=null,returnFocus=null,previousHash='',app=null;
 function origin(){return location.origin==='null'?'*':location.origin;}
 function ensure(){
  if(shell)return;
  shell=document.createElement('section');shell.id='aura-dream-mode';shell.className='aura-dream-mode';shell.hidden=true;shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','AURA DREAM / DLS PRO');
  shell.innerHTML='<header class="aura-dream-toolbar"><button type="button" data-dream-close>← VOLVER A AURA</button><strong>AURA <span>10.0</span> / DREAM</strong><span class="aura-dream-toolbar-note">TU CARRERA · TU CLUB</span></header><div class="aura-dream-loading" role="status">Preparando AURA DREAM…</div>';
  frame=document.createElement('iframe');frame.id='aura-dream-frame';frame.title='AURA DREAM / DLS PRO';frame.setAttribute('allow','fullscreen; gamepad');frame.src=new URL('./dream/index.html?v=10.0-recovery3',document.baseURI).href;
  frame.addEventListener('load',()=>{shell.querySelector('.aura-dream-loading').hidden=true;});
  shell.appendChild(frame);document.body.appendChild(shell);
  shell.querySelector('[data-dream-close]').addEventListener('click',()=>close());
 }
 function open(changeHistory=true){
  if(shell&&!shell.hidden)return true;
  if(typeof AuraArena!=='undefined'&&AuraArena.isRunning())return false;
  returnFocus=document.activeElement;
  if(location.hash!=='#dream')previousHash=location.hash;
  ensure();shell.hidden=false;app=document.querySelector('.app-shell');if(app)app.inert=true;
  document.body.classList.add('aura-dream-open');
  if(typeof AuraEvolution!=='undefined')AuraEvolution.stopPreview();
  if(typeof AuraTourUI!=='undefined')AuraTourUI.audio.suspend();
  if(changeHistory&&location.hash!=='#dream')history.pushState({auraDream:true},'','#dream');
  shell.querySelector('[data-dream-close]').focus();return true;
 }
 function close(changeHistory=true){
  if(!shell||shell.hidden)return;
  frame.contentWindow?.postMessage({type:'AURA_DREAM_PAUSE'},origin());shell.hidden=true;
  document.body.classList.remove('aura-dream-open');if(app)app.inert=false;
  if(changeHistory&&location.hash==='#dream')history.replaceState(null,'',location.pathname+location.search+previousHash);
  returnFocus?.focus?.();
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-dream-open]')){event.preventDefault();open();}
 });
 root.addEventListener('message',event=>{
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin)return;
  if(event.data?.type==='AURA_DREAM_CLOSE')close();
 });
 root.addEventListener('hashchange',()=>location.hash==='#dream'?open(false):close(false));
 root.addEventListener('popstate',()=>location.hash==='#dream'?open(false):close(false));
 document.addEventListener('DOMContentLoaded',()=>{if(location.hash==='#dream')open(false);});
 root.AuraDream={open,close,isOpen:()=>!!shell&&!shell.hidden};
})(globalThis);

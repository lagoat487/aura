/* AURA 4.2 — Ultimate Sigma. Scoped exclusively to Ultimate Team. */
(function(){
"use strict";
const U=AuraUT,UI=AuraUTUI,escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const coins=n=>n.toLocaleString("es-ES");
let active=false;
const originalRender=UI.render.bind(UI),originalClick=UI.handleClick.bind(UI);
function sigmaCard(p){
 return '<button class="sigma-player-card" data-sigma-inspect="'+escape(p.id)+'" aria-label="'+escape(p.name)+' '+p.overall+' GRL"><span class="sigma-card-flare">✦ ULTIMATE SIGMA</span><span class="sigma-card-overall">'+p.overall+'<small>'+escape(p.pos)+'</small></span><div class="sigma-player-face">'+AuraPortraits.html(p)+'</div><strong>'+escape(p.name)+'</strong><span class="sigma-player-bottom">AURA 27 · EDICIÓN 4.2</span></button>';
}
function eventView(){
 const club=UI.getClub(),cards=U.eventCards(UI.pool());if(!club)return '';
 return '<section class="sigma-event"><header class="sigma-event-hero"><div><span class="sigma-kicker">⚡ AURA 27 · PRIMER EVENTO UT · 4.2</span><h2>ULTIMATE<br><em>SIGMA</em></h2><p>Diez cartas especiales de 87 GRL o más. Precios fijos, una edición única por jugador y cartas exclusivas de Ultimate Team.</p><span class="sigma-live">● EVENTO DISPONIBLE</span></div>'+sigmaCard(cards[0])+'</header>'+
 '<section class="sigma-bonus"><div><small>REGALO DE ESTRENO · UNA VEZ POR CLUB</small><h3>+150.000 MONEDAS</h3><p>Reclama tu bono para poder empezar a fichar cartas del evento.</p></div><button class="btn primary" data-sigma-gift '+(club.sigmaGiftClaimed?'disabled':'')+'>'+(club.sigmaGiftClaimed?'Bono reclamado ✓':'Reclamar regalo →')+'</button></section>'+
 '<div class="sigma-title"><small>LAS 10 CARTAS DEL EVENTO</small><h3>ELIGE A TU SIGMA.</h3></div><div class="sigma-grid">'+cards.map(p=>{
 const owned=club.owned.some(q=>q.id===p.id),disabled=owned||club.coins<U.price(p);
 return '<article class="sigma-product">'+sigmaCard(p)+'<b>'+coins(U.price(p))+' <small>MONEDAS</small></b><button class="btn primary" data-sigma-buy="'+escape(p.id)+'" '+(disabled?'disabled':'')+'>'+(owned?'En tu club ✓':disabled?'Monedas insuficientes':'Fichar Sigma →')+'</button></article>';
 }).join('')+'</div><p class="sigma-disclaimer">Las medias y precios son ediciones ficticias de AURA, no valores oficiales de otros juegos. Las monedas solo existen dentro del juego.</p></section>';
}
UI.render=function(){
 const html=originalRender();
 const club=UI.getClub();
 if(!club)return html;
 const button='<button data-sigma-open="yes" '+(active?'aria-current="page"':'')+'>⚡ Ultimate Sigma</button>';
 const withNav=html.replace(/(<nav class="ut-nav"[^>]*>)/,'$1'+button);
 if(!active)return withNav;
 const navEnd=withNav.indexOf('</nav>');if(navEnd<0)return withNav;
 return withNav.slice(0,navEnd+6)+eventView()+'<footer class="ut-footnote">AURA 4.2 · ULTIMATE SIGMA · SOLO ULTIMATE TEAM</footer></div>';
};
UI.handleClick=function(t){
 if(t.dataset.sigmaOpen!==undefined){active=true;render();return true;}
 if(t.dataset.utTab){active=false;return originalClick(t);}
 if(t.dataset.sigmaGift!==undefined){
  const club=UI.getClub();if(!club)return true;
  const r=U.claimSigmaGift(club);if(r.error)notify(r.error);else{UI.saveClub();render();notify('¡+150.000 monedas para Ultimate Sigma!');}
  return true;
 }
 if(t.dataset.sigmaInspect){
  const club=UI.getClub(),p=club?.owned.find(q=>q.id===t.dataset.sigmaInspect)||U.eventCards(UI.pool()).find(q=>q.id===t.dataset.sigmaInspect);
  if(!p)return true;
  const owned=club.owned.some(q=>q.id===p.id);
  openModal('ULTIMATE SIGMA · '+p.overall+' GRL','<div class="sigma-modal">'+sigmaCard(p)+'<p>'+escape(p.name)+' · '+escape(p.pos)+' · '+escape(p.nationality)+'</p><b>'+coins(U.price(p))+' monedas</b><p>'+(owned?'Esta edición Sigma ya está en tu club.':'Carta de evento exclusiva de Ultimate Team.')+'</p><button class="btn primary" data-sigma-buy="'+escape(p.id)+'" '+(owned||club.coins<U.price(p)?'disabled':'')+'>'+(owned?'Ya la tienes':club.coins<U.price(p)?'Monedas insuficientes':'Comprar carta →')+'</button></div>');
  return true;
 }
 if(t.dataset.sigmaBuy){
  const club=UI.getClub(),p=U.eventCards(UI.pool()).find(q=>q.id===t.dataset.sigmaBuy);
  const r=U.buy(club,p);
  if(r.error)notify(r.error);else{UI.saveClub();closeModal();render();notify('¡'+p.name+' SIGMA fichado! -'+coins(r.cost)+' monedas');}
  return true;
 }
 if(t.dataset.ut==="lobby")active=false;
 return originalClick(t);
};
})();
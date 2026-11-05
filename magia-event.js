/* MAGIA · four creative collector editions and a welcome gift for every UT club. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./ultimate-team"):root.AuraUT,typeof module==="object"&&module.exports?require("./portraits"):root.AuraPortraits);if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraMagiaEvent=api;})(typeof globalThis!=="undefined"?globalThis:this,function(U,Portraits){
  "use strict";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const coins=n=>n.toLocaleString("es-ES");
  function card(p,hero=false){
    return '<div class="mag-card'+(hero?' mag-card--hero':'')+'" role="img" aria-label="'+esc(p.name)+' · '+p.overall+' GRL · MAGIA">'+
      '<div class="mag-card-top"><span>AURA 27</span><b>✧ MAGIA</b></div><div class="mag-card-body"><span class="mag-rating">'+p.overall+'<small>'+esc(p.pos)+'</small><i>✧</i></span>'+Portraits.html(p)+'</div>'+
      '<strong class="mag-card-name">'+esc(p.name)+'</strong><span class="mag-card-country">'+esc(p.nationality)+'</span><div class="mag-card-bottom">EL TALENTO NO TIENE LÍMITES</div></div>';
  }
  function view(club,pool=[]){
    const cards=U.magiaCards(pool),owned=cards.filter(p=>club.owned.some(q=>q.id===p.id)).length,messi=cards.find(p=>p.id==="magia:messi");
    return '<section class="mag-event"><header class="mag-hero"><div class="mag-hero-copy"><span class="mag-kicker"><i></i> NUEVO EVENTO · ULTIMATE TEAM</span><h2>MAGIA<span>EL TALENTO CAMBIA TODO.</span></h2>'+
      '<p>Una jugada imposible. Un pase que nadie vio. Cuatro futbolistas para convertir tu equipo en un espectáculo.</p><div class="mag-facts"><span><b>04</b> JUGADORES</span><span><b>88–97</b> GRL</span><span><b>'+owned+'/4</b> EN TU CLUB</span></div>'+
      '<div class="mag-star-price"><b>LIONEL MESSI 97</b><span>3.000.000 de monedas</span></div><a class="btn primary" href="#magia-collection">DESCUBRIR LAS CARTAS ↓</a></div><div class="mag-star">'+card(messi,true)+'</div></header>'+
      '<section class="mag-welcome" aria-label="Regalo de bienvenida MAGIA"><div><span class="mag-kicker">PARA TODOS LOS CLUBES</span><h3>+400.000 <small>MONEDAS</small></h3><p>Un regalo de bienvenida para todos. Reclámalo una sola vez por club, aunque tu equipo ya existiera antes del evento.</p></div><button class="btn primary" data-ut="magia-gift" '+(club.magiaGiftClaimed?'disabled':'')+'>'+(club.magiaGiftClaimed?'✓ REGALO YA RECLAMADO':'RECLAMAR 400.000 MONEDAS →')+'</button></section>'+
      '<div class="mag-collection-heading" id="magia-collection"><div><span class="mag-kicker">CREA. REGATEA. DECIDE.</span><h3>CUATRO FORMAS DE HACER MAGIA.</h3></div><p>Precios fijos · Cartas especiales de AURA</p></div><div class="mag-grid">'+cards.map((p,i)=>{
        const have=club.owned.some(q=>q.id===p.id),cost=U.price(p),poor=club.coins<cost;
        return '<article class="mag-product"><div class="mag-product-edition"><span>MAGIA / 0'+(i+1)+'</span><b>'+esc(p.pos)+'</b></div>'+card(p)+'<div class="mag-price"><b>'+coins(cost)+'</b><span>MONEDAS</span></div><button class="btn primary" data-ut="magia-buy" data-player="'+esc(p.id)+'" '+(have||poor?'disabled':'')+'>'+(have?'✓ EN TU CLUB':poor?'MONEDAS INSUFICIENTES':'FICHAR A '+esc(p.name.toUpperCase())+' →')+'</button></article>';
      }).join('')+'</div><p class="mag-note">Las cartas compradas y el regalo reclamado se guardan en tu club. Puedes usar estas ediciones en tu plantilla de Ultimate Team. Medias y precios especiales de AURA.</p></section>';
  }
  return {card,view};
});

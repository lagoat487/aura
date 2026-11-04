/* MURALLA: nine defensive collector cards, exclusively in AURA Ultimate Team. */
const AuraMurallaEvent=(()=>{
  "use strict";
  const U=AuraUT;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const coins=n=>Math.round(n).toLocaleString("es-ES");
  function card(p,hero=false){
    return '<div class="mur-card'+(hero?' mur-card-hero':'')+'" role="img" aria-label="'+esc(p.name)+' · '+p.overall+' GRL · MURALLA">'+
      '<div class="mur-card-top"><span>AURA 27</span><b>◈ MURALLA</b></div>'+
      '<div class="mur-card-body"><span class="mur-rating">'+p.overall+'<small>'+esc(p.pos)+'</small></span>'+AuraPortraits.html(p)+'</div>'+
      '<div class="mur-card-name">'+esc(p.name)+'</div><div class="mur-card-country">'+esc(p.nationality)+'</div>'+
      '<div class="mur-card-bottom"><span>DEFENSA DE ÉLITE</span><b>◆</b></div></div>';
  }
  function view(club,pool){
    const cards=U.murallaCards(pool),owned=cards.filter(p=>club.owned.some(q=>q.id===p.id)).length;
    return '<section class="mur-event"><header class="mur-hero"><div class="mur-copy">'+
      '<span class="mur-kicker"><i></i> NUEVO EVENTO · ULTIMATE TEAM</span>'+
      '<h2>MURALLA<span>EL GOL TERMINA AQUÍ.</span></h2>'+
      '<p>Nueve defensas. Una fortaleza. Refuerza tu equipo con cartas exclusivas de centrales y laterales.</p>'+
      '<div class="mur-facts"><span><b>09</b> CARTAS</span><span><b>85–91</b> GRL</span><span><b>'+owned+'/9</b> EN TU CLUB</span></div>'+
      '<a class="btn primary" href="#muralla-collection">VER LOS DEFENSAS ↓</a></div>'+card(cards[8],true)+'</header>'+
      '<div class="mur-collection-head" id="muralla-collection"><div><span class="mur-kicker">LA ÚLTIMA LÍNEA</span><h3>CONSTRUYE TU FORTALEZA.</h3></div>'+
      '<p>300.000–600.000 monedas por carta.<br>Precios fijos · Una edición por jugador</p></div>'+
      '<div class="mur-grid">'+cards.map((p,i)=>{
        const have=club.owned.some(q=>q.id===p.id),cost=U.price(p),poor=club.coins<cost;
        return '<article class="mur-product"><div class="mur-product-index">MURALLA / '+String(i+1).padStart(2,"0")+'<span>'+esc(p.pos)+'</span></div>'+card(p)+
          '<div class="mur-price"><b>'+coins(cost)+'</b><span>MONEDAS</span></div>'+
          '<button class="btn primary" data-ut="muralla-buy" data-player="'+esc(p.id)+'" '+(have||poor?'disabled':'')+'>'+
          (have?'✓ EN TU CLUB':poor?'MONEDAS INSUFICIENTES':'FICHAR DEFENSA →')+'</button></article>';
      }).join('')+'</div><p class="mur-note">Ediciones especiales y medias de AURA. Las cartas compradas se guardan en tu club y se pueden usar en tu plantilla de Ultimate Team.</p></section>';
  }
  return {card,view};
})();

/* FC Barcelona collector editions. Membership is from the official first-team roster. */
const AuraBarcelonaEvent=(()=>{
  "use strict";
  const U=AuraUT;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const coins=n=>n.toLocaleString("es-ES");
  const groups=[
    {id:"attack",name:"Delanteros",positions:["DC","EI","ED","SD"]},
    {id:"midfield",name:"Centrocampistas",positions:["MCD","MC","MCO","MI","MD"]},
    {id:"defense",name:"Defensas",positions:["LI","DFC","LD"]},
    {id:"keepers",name:"Porteros",positions:["POR"]}
  ];
  function card(p,hero=false){
    return '<div class="barca-card'+(hero?' barca-card-hero':'')+'" role="img" aria-label="'+esc(p.name)+' · '+p.overall+' GRL · FC Barcelona">'+
      '<div class="barca-card-top"><span>AURA 27</span><b>EDICIÓN CULÉ</b></div>'+
      '<div class="barca-card-body"><div class="barca-rating">'+p.overall+'<small>'+esc(p.pos)+'</small><span class="barca-monogram" aria-hidden="true">FCB</span></div>'+AuraPortraits.html(p)+'</div>'+
      '<strong class="barca-card-name">'+esc(p.name)+'</strong><span class="barca-card-nation">'+esc(p.nationality)+'</span>'+
      '<div class="barca-card-bottom">FC BARCELONA <i>✦</i> BLAUGRANA</div></div>';
  }
  function product(p,club){
    const have=club.owned.some(q=>q.id===p.id),cost=U.price(p),poor=club.coins<cost;
    return '<article class="barca-product"><div class="barca-product-edition"><span>EDICIÓN AZULGRANA</span><b>'+esc(p.pos)+'</b></div>'+card(p)+
      '<div class="barca-price"><b>'+coins(cost)+'</b><span>MONEDAS</span></div>'+
      '<button class="btn primary" data-ut="barcelona-buy" data-player="'+esc(p.id)+'" '+(have||poor?'disabled':'')+'>'+
      (have?'✓ EN TU CLUB':poor?'MONEDAS INSUFICIENTES':'FICHAR A '+esc(p.name.toUpperCase())+' →')+'</button></article>';
  }
  function view(club,pool){
    const cards=U.barcelonaCards(pool),owned=cards.filter(p=>club.owned.some(q=>q.id===p.id)).length;
    return '<section class="barca-event"><header class="barca-hero"><div class="barca-copy">'+
      '<span class="barca-kicker"><i></i> NUEVO EVENTO · ULTIMATE TEAM</span><h2>FC BARCELONA<span>EL FUTURO ES CULÉ.</span></h2>'+
      '<p>Los colores que nos unen. Toda la primera plantilla en una colección de cartas azulgranas, con Lamine Yamal como la gran estrella.</p>'+
      '<div class="barca-facts"><span><b>27</b> JUGADORES</span><span><b>85–93</b> GRL</span><span><b>'+owned+'/27</b> EN TU CLUB</span></div>'+
      '<div class="barca-feature-price"><b>LAMINE YAMAL 93</b><span>1.000.000 de monedas</span></div><a class="btn primary" href="#barca-collection">VER LA PLANTILLA ↓</a></div>'+card(cards[0],true)+'</header>'+
      '<section class="barca-welcome" aria-label="Regalo de bienvenida FC Barcelona"><div><span class="barca-kicker">REGALO EXCLUSIVO DEL EVENTO</span><h3>+500.000 <small>MONEDAS</small></h3><p>Una sola vez por club. Reclama tu regalo aquí y ficha tus primeras cartas azulgranas.</p></div>'+
      '<button class="btn primary" data-ut="barcelona-gift" '+(club.barcelonaGiftClaimed?'disabled':'')+'>'+(club.barcelonaGiftClaimed?'✓ REGALO YA RECLAMADO':'RECLAMAR 500.000 MONEDAS →')+'</button></section>'+
      '<div class="barca-collection-head" id="barca-collection"><div><span class="barca-kicker">UNA PLANTILLA. TUS COLORES.</span><h3>CONSTRUYE TU BARÇA.</h3></div><p>Yamal: 1.000.000 · Resto: 300.000–900.000<br>Precios fijos · Cartas desde 85 GRL</p></div>'+
      '<nav class="barca-position-links" aria-label="Posiciones FC Barcelona">'+groups.map(g=>'<a href="#barca-'+g.id+'">'+g.name+' <b>'+cards.filter(p=>g.positions.includes(p.pos)).length+'</b></a>').join('')+'</nav>'+
      groups.map(g=>'<section class="barca-position-group" id="barca-'+g.id+'"><h3>'+g.name.toUpperCase()+'</h3><div class="barca-grid">'+cards.filter(p=>g.positions.includes(p.pos)).map(p=>product(p,club)).join('')+'</div></section>').join('')+
      '<p class="barca-note">Plantilla verificada al 4 de noviembre de 2026 en la <a href="'+U.barcelona.source+'" target="_blank" rel="noopener noreferrer">web oficial del FC Barcelona</a>. Las medias y los precios de estas ediciones son de AURA. Las compras se guardan en Mi club y puedes colocar las cartas en tu plantilla.</p></section>';
  }
  return {card,view};
})();

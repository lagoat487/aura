/* AURA Ultimate Team: Flashback fantasy event. Five gold-and-white collector cards. */
const AuraFlashbackEvent=(()=>{
 "use strict";
 const U=AuraUT;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const coins=n=>Math.round(n).toLocaleString("es-ES");
 function card(p,hero=false){
   return '<div class="fb-card'+(hero?' fb-card-hero':'')+'" role="img" aria-label="'+esc(p.name)+' · '+p.overall+' GRL · Carta Flashback dorada y blanca">'+
     '<span class="fb-card-foil" aria-hidden="true"></span>'+
     '<div class="fb-card-masthead">✦ AURA 27 <b>FLASHBACK</b></div>'+
     '<div class="fb-card-mid"><span class="fb-card-rating">'+p.overall+'<small>'+esc(p.pos)+'</small></span>'+
     '<div class="fb-card-portrait">'+AuraPortraits.html(p)+'</div></div>'+
     '<div class="fb-card-name">'+esc(p.name)+'</div>'+
     '<div class="fb-card-club">'+esc(p.sourceClub||"EDICIÓN ESPECIAL")+'</div>'+
     '<div class="fb-card-footer">◈ EDICIÓN RETRO · ORO & BLANCO ◈</div></div>';
 }
 function view(club,pool){
   const all=U.flashbackCards(pool),welcome=!!club.flashbackGiftClaimed;
   const played=club.flashbackPlayed||0,wins=club.flashbackWins||0,earned=club.flashbackEarned||0;
   const featured=all.find(p=>p.id==="flashback:kitu-diaz")||all[0];
   return '<section class="fb-event">'+
     '<header class="fb-event-hero"><div class="fb-hero-copy">'+
     '<span class="fb-kicker">✦ NUEVO EVENTO · EXCLUSIVO ULTIMATE TEAM</span>'+
     '<h2>FLASH<span>BACK</span></h2>'+
     '<p class="fb-hero-intro">Las leyendas vuelven. Cinco cartas con diseño <strong>dorado y blanco</strong>, medias especiales y precios fijos en monedas de AURA.</p>'+
     '<div class="fb-hero-tags"><span>5 CARTAS ESPECIALES</span><span>+70.000 POR PARTIDO</span><span>SIN BUCKS</span></div>'+
     '<div class="fb-hero-stats"><span><strong>'+played+'</strong> PARTIDOS</span>'+
       '<span><strong>'+wins+'</strong> VICTORIAS</span>'+
       '<span><strong>'+coins(earned)+'</strong> MONEDAS GANADAS</span></div>'+
     '</div>'+card(featured,true)+'</header>'+
     '<section class="fb-welcome" aria-label="Regalo de bienvenida Flashback">'+
       '<div><span>01 / REGALO EXCLUSIVO DE BIENVENIDA</span>'+
       '<h3>+200.000 <small>MONEDAS</small></h3>'+
       '<p>Una sola vez por club de Ultimate Team. Se guarda incluso si cierras el navegador.</p></div>'+
       '<button class="btn primary" data-ut="flashback-gift" '+(welcome?'disabled':'')+'>'+
         (welcome?'✓ Regalo ya reclamado':'Reclamar 200.000 monedas →')+'</button></section>'+
     '<section class="fb-matches" aria-label="Partidos exclusivos de Flashback">'+
       '<div class="fb-section-head"><span>02 / PARTIDOS FLASHBACK</span>'+
       '<h3>70.000 MONEDAS <em>POR PARTIDO</em></h3>'+
       '<p>La recompensa se entrega <strong>solo aquí</strong> al terminar cada encuentro, ganes, empates o pierdas. Abandonar o repetir el resultado no entrega monedas.</p></div>'+
       '<div class="fb-opponents">'+[
         ["guayaquil","BARCELONA SC","El regreso del Kitu","✦"],
         ["madrid","REAL MADRID","Reto galáctico","★"],
         ["barcelona","FC BARCELONA","Clásico retro","◈"],
         ["paris","PARIS SAINT-GERMAIN","Noche de estrellas","◆"]
       ].map(([id,name,tag,symbol],i)=>
         '<article><span class="fb-match-no">FLASHBACK / '+String(i+1).padStart(2,"0")+'</span>'+
         '<div class="fb-match-symbol" aria-hidden="true">'+symbol+'</div>'+
         '<h4>'+name+'</h4><p>'+tag+' · +70.000 monedas al finalizar</p>'+
         '<button class="btn primary" data-ut="flashback-play" data-opponent="'+id+'">Jugar partido →</button></article>').join('')+'</div></section>'+
     '<section class="fb-market" aria-label="Mercado de las cinco cartas Flashback">'+
       '<div class="fb-section-head"><span>03 / COLECCIÓN FLASHBACK</span>'+
       '<h3>EL ORO DE <em>LOS RECUERDOS</em></h3>'+
       '<p>Las cinco cartas son exclusivas del evento, con precios fijos. Una edición de cada futbolista por club.</p></div>'+
       '<div class="fb-market-grid">'+all.map(p=>{
         const owned=club.owned.some(q=>q.id===p.id),cost=U.price(p),poor=typeof U.canAfford==='function'?!U.canAfford(club,cost):club.coins<cost;
         return '<article class="fb-product">'+card(p)+
           '<div class="fb-product-cost"><strong>'+coins(cost)+'</strong><span>MONEDAS</span></div>'+
           '<button class="btn primary" data-ut="flashback-buy" data-player="'+esc(p.id)+'" '+(owned||poor?'disabled':'')+'>'+
           (owned?'✓ EN TU CLUB':poor?'MONEDAS INSUFICIENTES':'FICHAR FLASHBACK →')+'</button></article>';
       }).join('')+'</div>'+
       '<p class="fb-footnote">Cartas y GRL ficticios creados para AURA 27. No son valoraciones oficiales. Sin compras reales ni Bucks: solo monedas virtuales del juego.</p></section>'+
     '</section>';
 }
 return {view,card};
})();

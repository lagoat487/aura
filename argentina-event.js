/* AURA Ultimate Team · Fantasy Liga Argentina event.
 * The selection is fictional and never changes actual team rosters. */
const AuraArgentinaEvent=(()=>{
  "use strict";
  const U=AuraUT;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const coins=n=>Math.round(n).toLocaleString("es-ES");
  function card(p){
    return '<div class="arg-card" aria-label="'+esc(p.name)+' '+p.overall+' GRL Liga Argentina">'+
      '<div class="arg-card-header">✦ AURA 27 · LIGA ARGENTINA</div>'+
      '<div class="arg-card-body"><span class="arg-card-overall">'+p.overall+'<small>'+esc(p.pos)+'</small></span>'+
      '<div class="arg-card-image">'+AuraPortraits.html(p)+'</div></div>'+
      '<div class="arg-card-player">'+esc(p.name)+'</div>'+
      '<div class="arg-card-footer">EDICIÓN ESPECIAL · AZUL Y BLANCO</div></div>';
  }
  function view(club,pool){
    const cards=U.argentinaCards(pool);
    const played=club.argentinaPlayed||0,wins=club.argentinaWins||0,earned=club.argentinaEarned||0;
    return '<section class="arg-event">'+
      '<header class="arg-event-hero"><div>'+
      '<span class="arg-kicker">🇦🇷 NUEVO EVENTO · SOLO ULTIMATE TEAM</span>'+
      '<h2>LIGA<br><em>ARGENTINA</em></h2>'+
      '<p>Ocho cartas exclusivas azul y blanco. Juega contra la IA y gana <b>35.000 monedas en cada partido completado</b>, ganes, empates o pierdas. Abandonar no da recompensa.</p>'+
      '<div class="arg-stats"><span><strong>'+played+'</strong> partidos</span><span><strong>'+wins+'</strong> victorias</span><span><strong>'+coins(earned)+'</strong> monedas conseguidas</span></div>'+
      '</div>'+card(cards[3])+'</header>'+
      '<section class="arg-fixtures"><div class="arg-section-heading"><span>01 / JUGAR EL EVENTO</span><h3>35.000 MONEDAS POR PARTIDO</h3>'+
      '<p>Se cobra una vez al terminar cada encuentro. Estas monedas no se entregan en otros modos.</p></div>'+
      '<div class="arg-opponents"><article><span>🇦🇷 PARTIDO ESPECIAL 01</span><h4>BOCA JUNIORS</h4>'+
      '<p>Duelo contra la IA en un escenario argentino.</p>'+
      '<button class="btn primary" data-ut="argentina-play" data-opponent="boca">Jugar contra Boca →</button></article>'+
      '<article><span>🇦🇷 PARTIDO ESPECIAL 02</span><h4>RIVER PLATE</h4>'+
      '<p>Demuestra tu nivel ante River con tu equipo de Ultimate Team.</p>'+
      '<button class="btn primary" data-ut="argentina-play" data-opponent="river">Jugar contra River →</button></article></div></section>'+
      '<section class="arg-market"><div class="arg-section-heading"><span>02 / MERCADO DEL EVENTO</span>'+
      '<h3>LAS OCHO CARTAS ESPECIALES</h3>'+
      '<p>Precios fijos de 300.000 a 500.000 monedas. Las cartas adquiridas permanecen en tu club.</p></div>'+
      '<div class="arg-market-grid">'+cards.map(p=>{
        const owned=club.owned.some(q=>q.id===p.id),price=U.price(p);
        return '<article class="arg-product">'+card(p)+
          '<strong>'+coins(price)+' <small>MONEDAS</small></strong>'+
          '<button class="btn primary" data-ut="argentina-buy" data-player="'+esc(p.id)+'" '+
            (owned||club.coins<price?'disabled':'')+'>'+
            (owned?'En tu club ✓':club.coins<price?'Monedas insuficientes':'Comprar carta →')+'</button></article>';
      }).join('')+'</div>'+
      '<p class="arg-disclaimer">Evento de fantasía de AURA: clubes, selección y valoraciones no representan plantillas ni medias oficiales. Las monedas son virtuales y solo sirven dentro de AURA.</p></section>'+
      '</section>';
  }
  return {view,card};
})();
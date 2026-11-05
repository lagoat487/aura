/* AURA 6.0: one entry point for the active Ultimate Team collections. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./ultimate-team"):root.AuraUT,typeof module==="object"&&module.exports?require("./portraits"):root.AuraPortraits);if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraCurrentEvents=api;})(typeof globalThis!=="undefined"?globalThis:this,function(U,Portraits){
  "use strict";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const coins=n=>n.toLocaleString("es-ES");
  function catalogue(pool=[]){
    return [
      ...(U.magia&&typeof U.magiaCards==="function"?[{tab:"magia",name:U.magia.name,tag:"CREATIVIDAD SIN LÍMITES",description:"Olise, Nico Paz, Messi y Yan Diomande. El talento que cambia un partido.",cards:U.magiaCards(pool),gift:U.magia.welcome,flag:"magiaGiftClaimed",star:"magia:messi"}]:[]),
      {tab:"barcelona",name:U.barcelona.name,tag:"AZULGRANA",description:"La plantilla culé. Lamine Yamal 93 lidera la colección.",cards:U.barcelonaCards(pool),gift:U.barcelona.welcome,flag:"barcelonaGiftClaimed",star:"barcelona:lamine-yamal"},
      {tab:"muralla",name:U.muralla.name,tag:"DEFENSA DE ÉLITE",description:"Centrales y laterales para construir tu fortaleza.",cards:U.murallaCards(pool),gift:U.muralla.welcome,flag:"murallaGiftClaimed",star:"muralla:van-dijk"},
      {tab:"flashback",name:U.flashback.name,tag:"REGRESAN LAS LEYENDAS",description:"Kitu Díaz, Vardy, Kanté, Neymar y Keylor Navas.",cards:U.flashbackCards(pool),gift:U.flashback.welcome,flag:"flashbackGiftClaimed",reward:U.flashback.reward,star:"flashback:neymar-junior"},
      {tab:"argentina",name:U.argentina.name,tag:"PASIÓN ALBICELESTE",description:"Ocho ediciones especiales y partidos exclusivos.",cards:U.argentinaCards(pool),reward:U.argentina.reward,star:"argentina:leandro-paredes"}
    ];
  }
  function preview(event){
    let p=event.cards.find(p=>p.id===event.star)||event.cards[0];
    if(event.tab==="flashback"&&!p.photo)p={...p,photo:U.sbcRewardCard("brasil",[]).photo};
    return '<div class="ut-event-preview" role="img" aria-label="'+esc(p.name)+' · '+p.overall+' GRL"><span class="ut-event-preview-rating">'+p.overall+'<small>'+esc(p.pos)+'</small></span>'+Portraits.html(p)+'<strong>'+esc(p.name)+'</strong><span>'+esc(event.tag)+'</span></div>';
  }
  function tile(event,club,index){
    const prices=event.cards.map(p=>U.price(p)),ratings=event.cards.map(p=>p.overall),owned=event.cards.filter(p=>club.owned.some(q=>q.id===p.id)).length;
    const gift=event.gift?(club[event.flag]?'✓ Regalo reclamado':'+'+coins(event.gift)+' de bienvenida'):'Partidos exclusivos';
    return '<article class="ut-event-tile ut-event-tile--'+event.tab+'"><div class="ut-event-tile-top"><span>0'+(index+1)+' / EVENTO ACTUAL</span><span class="ut-event-live">ACTIVO</span></div>'+
      '<div class="ut-event-tile-main"><div class="ut-event-copy"><span class="ut-event-tag">'+esc(event.tag)+'</span><h3>'+esc(event.name)+'</h3><p>'+esc(event.description)+'</p><div class="ut-event-facts"><span><b>'+event.cards.length+'</b> CARTAS</span><span><b>'+Math.min(...ratings)+'–'+Math.max(...ratings)+'</b> GRL</span></div><p class="ut-event-price">'+coins(Math.min(...prices))+'–'+coins(Math.max(...prices))+' monedas</p></div>'+preview(event)+'</div>'+
      '<div class="ut-event-perks"><span>'+gift+'</span>'+(event.reward?'<span>'+coins(event.reward)+' por partido del evento</span>':'')+'<span>'+owned+'/'+event.cards.length+' cartas en tu club</span></div>'+
      '<button class="btn primary" data-ut-tab="'+event.tab+'">Entrar a '+esc(event.name)+' →</button></article>';
  }
  function view(club,pool=[]){
    const events=catalogue(pool),count=events.reduce((n,e)=>n+e.cards.length,0);
    return '<section class="ut-current-events"><header class="ut-events-hero"><div><span class="eyebrow">AURA 6.0 / ULTIMATE TEAM</span><h2>EVENTOS<br><em>ACTUALES.</em></h2><p>Elige tu colección. Descubre sus estrellas, reclama sus regalos y juega sus desafíos desde un solo lugar.</p></div><div class="ut-events-summary"><span><b>'+String(events.length).padStart(2,"0")+'</b> EVENTOS ACTIVOS</span><span><b>'+count+'</b> CARTAS ESPECIALES</span><span class="ut-events-signal">COLECCIONA. JUEGA. EVOLUCIONA.</span></div></header><div class="ut-events-grid">'+events.map((e,i)=>tile(e,club,i)).join('')+'</div><p class="ut-events-note">Los regalos se reclaman dentro de cada evento, una vez por club. Las monedas por partido corresponden al evento indicado.</p></section>';
  }
  return {catalogue,view};
});

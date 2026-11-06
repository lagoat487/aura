/* Original console-style AURA UT experience; all opponents and prices are local AI. */
const AuraUTUI=(()=>{
  "use strict";
  const U=AuraUT,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Ignore quote style and repeated spaces in searches; keep card names intact.
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’‘ʼ“”"]/g,'').replace(/\s+/g,' ');
  // Independent, versioned Ultimate Team backup; never change career saves.
  const SAVE_KEY=AuraUTSave.KEY;
  const allFormations=new Set(Object.keys(AuraSquad.formations));
  function restoreSaved(){
    const restored=AuraUTSave.load(typeof localStorage==='undefined'?null:localStorage,allFormations);
    return restored.snapshot?{club:restored.snapshot.club,tab:restored.snapshot.tab,matchToken:restored.snapshot.matchToken}:null;
  }
  function persistClub(){
    if(!club)return false;
    return AuraUTSave.save(typeof localStorage==='undefined'?null:localStorage,{version:2,club,tab,matchToken},allFormations);
  }
  const restored=restoreSaved();
  let club=restored?.club||null,tab=restored?.tab||'home',pickerSlot=0,marketQuery='',clubQuery='',position='all',marketMin=0,marketMax=0,marketOrder='price',packIndex=0,matchToken=restored?.matchToken||0,playMode='battles',sbcType='silver',sbcSelection=new Set(),cachedPool=null,signature='';
  let adminPending=false;
  const tabs=[['home','Inicio'],['events','Eventos actuales'],['squad','Plantilla'],['play','Jugar'],['store','Tienda'],['market','Mercado'],['sbc','DCP'],['objectives','Objetivos'],['club','Mi club'],['evolutions','Evoluciones'],['backup','Respaldo']];
  function pool(){
    const stamp=World.getStats().players;if(cachedPool&&signature===stamp)return cachedPool;signature=stamp;
    const defs=Competitions.definitions.filter(d=>d.external).slice().sort((a,b)=>b.id.length-a.id.length);
    cachedPool=AuraEvolution.pool().map(p=>{const def=defs.find(d=>String(p.catalogClub||p.club).startsWith(d.id+'-'));return {...p,leagueId:def?.id||'reference',leagueLabel:def?.name||'Referencia mundial'};});return cachedPool;
  }
  const title=(eyebrow,heading,body='')=>'<div class="ut-title"><span class="eyebrow">'+eyebrow+'</span><h2>'+heading+'</h2>'+(body?'<p>'+body+'</p>':'')+'</div>';
  function stats(p){const ov=p.overall,def=['DFC','LI','LD','MCD'].includes(p.pos),att=['DC','ED','EI','SD'].includes(p.pos);return [['RIT',Math.max(35,Math.min(96,ov+(att?3:-5)))],['TIR',Math.max(25,ov+(att?1:def?-27:-8))],['PAS',Math.max(30,ov+(att?-10:def?-7:1))],['REG',Math.max(30,ov+(def?-15:1))],['DEF',Math.max(20,ov+(def?1:att?-40:-13))],['FIS',Math.max(35,Math.min(95,ov+(def?2:-8)))]];}
  function card(p,action='',data='',small=false){
    const rarity=p?.event===U.magia.id?'magia':p?.event===U.barcelona.id?'barcelona':p?.event==='sbc-stars'?'sbc-star':p?.event===U.muralla.id?'muralla':p?.event===U.ecuadorSbc.id?'ecuador':p?.event===U.sigma.id?'sigma':p?.event===U.argentina.id?'argentina':p?.event===U.flashback.id?'flashback':p.overall>=75?'gold':p.overall>=65?'silver':'bronze';
    return '<button class="ut-card '+rarity+(p?.evolutionLevel?' evolved':'')+' '+(small?'compact':'')+'" '+(action?'data-ut="'+action+'" '+data:'disabled')+' aria-label="'+esc(p.name+', '+p.pos+', GRL '+p.overall)+'"><span class="ut-card-rating">'+p.overall+'<small>'+esc(p.pos)+'</small></span>'+AuraPortraits.html(p)+'<strong>'+esc(p.name)+'</strong>'+(p?.evolutionLevel?'<span class="ut-sigma-label">EVOLUCIÓN NIV. '+p.evolutionLevel+'</span>':'')+(rarity==='magia'?'<span class="ut-sigma-label">✧ MAGIA</span>':rarity==='barcelona'?'<span class="ut-sigma-label">FC BARCELONA</span>':rarity==='sbc-star'?'<span class="ut-sigma-label">✦ ESTRELLAS SBC</span>':rarity==='ecuador'?'<span class="ut-sigma-label">🇪🇨 ECUADOR · DCP</span>':rarity==='muralla'?'<span class="ut-sigma-label">◈ MURALLA</span>':rarity==='sigma'?'<span class="ut-sigma-label">⚡ SIGMA</span>':rarity==='argentina'?'<span class="ut-sigma-label">🇦🇷 LIGA ARGENTINA</span>':rarity==='flashback'?'<span class="ut-sigma-label">✦ FLASHBACK</span>':'')+'<div class="ut-card-stats">'+stats(p).map(([s,n])=>'<span><b>'+n+'</b>'+s+'</span>').join('')+'</div><small class="ut-card-club">'+esc(clubs.find(c=>c.id===p.club)?.name||p.sourceClub||p.nationality||'AURA')+'</small></button>';
  }
  function top(){return '<header class="ut-top"><div><span class="eyebrow">AURA / ULTIMATE TEAM</span><h1>'+esc(club?.name||'TU CLUB. TUS CARTAS.')+'</h1></div>'+(club?'<div class="ut-currency"><span>MONEDAS<b>'+club.coins.toLocaleString('es-ES')+'</b></span><span>QUÍMICA<b>'+U.chemistry(club).total+'<small>/33</small></b></span><span>VALORACIÓN<b>'+U.rating(club)+'</b></span></div>':'')+'<button class="btn" data-ut="lobby">← Modos de juego</button></header>';}
  function start(){const leagues=[...new Map(pool().filter(p=>p.leagueId!=='reference').map(p=>[p.leagueId,p.leagueLabel])).entries()];return top()+title('UN CLUB POR CONSTRUIR','TU ONCE. TU IDENTIDAD.','Elige una liga inicial, reúne cartas reales y mejora tu equipo jugando.')+'<section class="arg-start-banner magia-home-promo"><strong>✧ NUEVO EVENTO: MAGIA</strong><p>Olise 91 · Nico Paz 88 · Messi 97 · Yan Diomande 89 · 400.000 monedas de bienvenida. Crea tu club para entrar.</p></section><section class="arg-start-banner barca-home-promo"><strong>🔵🔴 NUEVO EVENTO: FC BARCELONA</strong><p>27 cartas azulgranas · Lamine Yamal 93 por 1.000.000 de monedas · Toda la plantilla desde 85 GRL. Crea tu club para entrar.</p></section><section class="arg-start-banner mur-start-promo"><strong>◈ NUEVO EVENTO: MURALLA</strong><p>9 defensas especiales · 85–91 GRL · De 300.000 a 600.000 monedas por carta. Crea tu club para entrar.</p></section><section class="arg-start-banner fb-home-promo"><strong>✦ NUEVO EVENTO: FLASHBACK</strong><p>5 cartas doradas y blancas · 200.000 monedas de bienvenida · 70.000 monedas por partido completado.</p></section>'+
    '<section class="ut-onboarding"><div><h3>CREA TU CLUB</h3><label>Nombre del club<input id="ut-club-name" value="AURA FC" maxlength="24"></label><label>Liga del sobre inicial<select id="ut-starter-league"><option value="all">Selección internacional</option>'+leagues.map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('')+'</select></label><button class="btn primary" data-ut="create">Recibir 23 cartas y 10.000 monedas →</button><p>Monedas de juego. Guardado automático en este navegador. Sin compras con dinero real.</p></div><div class="ut-starter-art">'+pool().filter(p=>p.overall>=86&&p.overall<=90).slice(0,3).map(p=>card(p)).join('')+'</div></section>';}
  function home(){const chemistry=U.chemistry(club),next=U.objectives(club).find(o=>!o.claimed);return title('CENTRAL DE CLUB','EL SIGUIENTE PASO ES TUYO.','Conecta jugadores, cambia tu once y sal al campo.')+'<section class="ut-current-events-promo"><div><span class="eyebrow">'+String(U.activeEvents.length).padStart(2,'0')+' EVENTOS · '+U.activeEvents.reduce((n,e)=>n+e.cards.length,0)+' CARTAS ESPECIALES</span><h3>TU PRÓXIMA ESTRELLA<br>ESTÁ AQUÍ.</h3><p>MAGIA · FC Barcelona · Muralla · Flashback</p></div><button class="btn primary" data-ut-tab="events">Ver eventos actuales →</button></section><div class="ut-home-grid"><button class="ut-hub-tile feature" data-ut-tab="squad"><span>01 / TU EQUIPO</span><h3>EL TALENTO<br>EN SU SITIO.</h3><p>'+club.formation+' · '+U.rating(club)+' GRL · '+chemistry.total+'/33 química</p><b>Editar plantilla →</b></button><button class="ut-hub-tile" data-ut-tab="play"><span>02 / JUEGA</span><h3>SQUAD<br>BATTLES</h3><p>'+club.battlePoints+' puntos · rivales controlados por IA</p><b>Elegir rival →</b></button><button class="ut-hub-tile gold-tile" data-ut-tab="store"><span>03 / TIENDA</span><h3>TU PRÓXIMO<br>FICHAJE.</h3><p>Sobres de plata, oro y oro premium.</p><b>Ver sobres →</b></button><button class="ut-hub-tile" data-ut-tab="objectives"><span>04 / OBJETIVOS</span><h3>'+esc(next?.name||'OBJETIVOS COMPLETADOS')+'</h3><p>'+(next?Math.min(next.current,next.target)+' / '+next.target+' · '+next.coins+' monedas':'Sigue compitiendo con tu equipo.')+'</p><b>Ver recompensas →</b></button></div>'+'<div class="ut-panel sbc-stars-promo"><h3>✦ 5 NUEVOS SBC · 5 ESTRELLAS</h3><p>Gavi 88 · Neymar 90 · Di María 89 · Rúben Dias 90 · Messi 92</p><button class="btn primary" data-ut="stars-sbc-open">Ver los nuevos SBC →</button></div><div class="ut-panel ecuador-sbc-promo"><h3>🇪🇨 NUEVO SBC · MOISÉS CAICEDO 87</h3><p>11 ecuatorianos de cualquier media por una carta exclusiva de Ecuador.</p><button class="btn primary" data-ut="ecuador-sbc-open">Completar SBC Ecuador →</button></div>'+
    ''+(club.lastPack.length?'<div class="ut-panel"><div class="panel-title"><h3>ÚLTIMO SOBRE</h3><button class="btn small" data-ut-tab="club">Ir a mi club →</button></div><div class="ut-card-grid">'+club.lastPack.map(p=>card(p,'inspect','data-player="'+esc(p.duplicate?p.uid:p.id)+'"'+(p.duplicate?' data-duplicate="yes"':''))).join('')+'</div></div>':'');}
  function squad(){const shape=AuraSquad.formations[club.formation],chem=U.chemistry(club),bench=U.bench(club);return title('PLANTILLA / '+esc(club.formation),'CONSTRUYE CONEXIONES.','Selecciona una carta para cambiarla. Compartir club, liga o nacionalidad aumenta la química; jugar fuera de posición la deja en cero.')+'<div class="ut-squad-toolbar"><label>Formación<select id="ut-formation">'+Object.keys(AuraSquad.formations).map(f=>'<option '+(f===club.formation?'selected':'')+'>'+f+'</option>').join('')+'</select></label><button class="btn" data-ut="auto">Mejor once →</button><span>Química '+chem.total+'/33 · GRL '+U.rating(club)+'</span></div><section class="ut-pitch"><div class="ut-pitch-circle"></div>'+shape.map(([pos,x,y],i)=>{const p=club.owned.find(p=>p.id===club.xi[i]);return '<div class="ut-pitch-slot" style="left:'+x+'%;top:'+(y*.91)+'%">'+card(p,'pick','data-slot="'+i+'"',true)+'<span class="ut-chem-dots" aria-label="Química '+chem.players[i]+' de 3">'+[1,2,3].map(n=>'<i class="'+(chem.players[i]>=n?'on':'')+'"></i>').join('')+'</span><small>'+pos+'</small></div>';}).join('')+'</section><section class="ut-panel"><h3>SUPLENTES CONVOCADOS</h3><p>Las mejores reservas por GRL, con un portero si está disponible. Todas tus cartas siguen en Mi club.</p><div class="ut-bench">'+bench.map(p=>card(p,'inspect','data-player="'+esc(p.id)+'"',true)).join('')+'</div></section>';}
  function play(){return title('JUGAR / CONTRA LA IA','DEMUESTRA LO QUE TIENES.','Los partidos se disputan en el campo. Abandonar no entrega monedas ni puntos.')+'<div class="ut-play-tabs"><button class="btn '+(playMode==='battles'?'primary':'')+'" data-ut-mode="battles">Squad Battles</button><button class="btn '+(playMode==='divisions'?'primary':'')+'" data-ut-mode="divisions">Divisiones contra IA</button></div>'+(playMode==='divisions'?'<section class="ut-division"><span>DIVISIÓN</span><strong>'+club.division+'</strong><p>'+(club.division===1?'División máxima alcanzada. '+club.divisionPoints+' puntos en División 1.':club.divisionPoints+' / 9 puntos para ascender.')+' Victoria 3 puntos, empate 1.</p><button class="btn primary" data-ut="play" data-opponent="'+['madrid','liverpool','city','barcelona'][club.played%4]+'">Jugar partido de división →</button></section>':'<div class="ut-battle-bar"><div><b>'+club.battlePoints+' puntos</b><span>'+ (club.battlePoints>=5000?'Oro':club.battlePoints>=2500?'Plata':club.battlePoints>=1000?'Bronce':'Sin rango')+' · Serie '+(club.battleCycle+1)+'</span></div><button class="btn" data-ut="battle-claim" '+(club.battlePoints<1000?'disabled':'')+'>Cobrar serie →</button></div><div class="ut-opponents">'+['betis','atletico','liverpool','madrid'].map((id,i)=>{const c=getClub(id);return '<article>'+AuraEvolution.badge(c,55)+'<span class="eyebrow">RIVAL '+(i+1)+'</span><h3>'+esc(c.name)+'</h3><p>'+c.rating+' GRL</p><button class="btn primary" data-ut="play" data-opponent="'+id+'">Preparar partido →</button></article>';}).join('')+'</div>');}
  function store(){return title('TIENDA / SOBRES','UN SOBRE. NUEVAS OPCIONES.','Todos los sobres utilizan monedas ganadas dentro de AURA.')+'<div class="ut-store-grid">'+Object.entries(U.packs).map(([id,p])=>'<article class="ut-pack '+id+'"><span class="ut-pack-icon">A<span>UT</span></span><span class="eyebrow">'+p.count+' CARTAS DE JUGADOR</span><h3>'+p.name+'</h3><p>'+(p.guaranteed?'Incluye una carta de 82 GRL o más.':p.min+'–'+p.max+' GRL. Las cartas de mayor media son menos frecuentes.')+'</p><b>'+p.cost.toLocaleString('es-ES')+' monedas</b><button class="btn primary" data-ut="pack" data-pack="'+id+'" '+(club.coins<p.cost?'disabled':'')+'>Abrir sobre →</button></article>').join('')+'</div><p class="save-info">Los repetidos se guardan para DCP o venta rápida si son transferibles. No desaparecen ni se cambian por otra persona.</p>';}
  function filteredMarket(){
    const query=norm(marketQuery).trim(),defaultRange=!query&&position==='all'&&marketMin===0&&marketMax===0&&marketOrder==='price';
    // Keep the starter catalogue only when no explicit filter or advanced order is chosen.
    return pool().filter(p=>(!defaultRange||p.overall>=75&&p.overall<=83)&&!club.owned.some(q=>q.id===p.id)&&(position==='all'||p.pos===position)&&(p.overall>=marketMin)&&(!marketMax||U.marketPrice(club,p)<=marketMax)&&(!query||norm(p.name+' '+p.nationality+' '+(clubs.find(c=>c.id===p.club)?.name||p.sourceClub)).includes(query))).sort((a,b)=>marketOrder==='overall'?b.overall-a.overall||U.marketPrice(club,a)-U.marketPrice(club,b):U.marketPrice(club,a)-U.marketPrice(club,b)||b.overall-a.overall).slice(0,24);
  }
  function marketResults(){const ps=filteredMarket();return '<div class="ut-market-grid">'+ps.map(p=>'<article>'+card(p,'inspect','data-player="'+esc(p.id)+'"')+'<b>'+U.marketPrice(club,p).toLocaleString('es-ES')+' monedas</b><button class="btn primary" data-ut="buy" data-player="'+esc(p.id)+'" '+(club.coins<U.marketPrice(club,p)?'disabled':'')+'>Comprar ahora</button></article>').join('')+'</div>'+(ps.length?'':'<p>No encontramos jugadores con esos filtros.</p>');}
  function market(){return title('MERCADO / AURA','EL REFUERZO QUE TE FALTA.','Fichajes con monedas de juego a precios de AURA. Este mercado no conecta con otros usuarios.')+'<div class="ut-filters"><label>Jugador, club o país<input id="ut-market-query" value="'+esc(marketQuery)+'" placeholder="Busca a Lamine, Messi, Mbappé…"></label><label>Posición<select id="ut-market-position">'+['all','POR','LI','DFC','LD','MCD','MI','MC','MD','MCO','EI','SD','DC','ED'].map(p=>'<option value="'+p+'" '+(position===p?'selected':'')+'>'+(p==='all'?'Todas':p)+'</option>').join('')+'</select></label><label>GRL mínimo<select id="ut-market-min">'+[0,75,80,85,90].map(v=>'<option value="'+v+'" '+(marketMin===v?'selected':'')+'>'+(v?v+'+':'Cualquiera')+'</option>').join('')+'</select></label><label>Precio máximo<select id="ut-market-max">'+[0,5000,15000,50000,150000,500000].map(v=>'<option value="'+v+'" '+(marketMax===v?'selected':'')+'>'+(v?v.toLocaleString('es-ES'):'Sin límite')+'</option>').join('')+'</select></label><label>Ordenar<select id="ut-market-order"><option value="price" '+(marketOrder==='price'?'selected':'')+'>Menor precio</option><option value="overall" '+(marketOrder==='overall'?'selected':'')+'>Mayor GRL</option></select></label></div><div id="ut-market-results">'+marketResults()+'</div>';}
  function sbc(){
    const def=U.challenges[sbcType],eligible=U.sbcPool(club,sbcType),available=new Set(eligible.map(p=>p.uid));
    for(const uid of sbcSelection)if(!available.has(uid))sbcSelection.delete(uid);
    const preview=U.sbcPreview(club,sbcType,[...sbcSelection]),ecuador=sbcType==='ecuador',completed=U.sbcCompleted(club,sbcType),rewardCard=U.sbcRewardCard(sbcType,pool());
    const hero=ecuador?'<section class="ecuador-sbc-hero"><div><span class="ecuador-sbc-kicker">🇪🇨 NUEVO SBC · LA TRICOLOR</span><h3>MOISÉS<br>CAICEDO <b>87</b></h3><p>Entrega <strong>11 jugadores ecuatorianos</strong> de cualquier media y posición para recibir esta carta exclusiva con los colores de Ecuador.</p><div class="ecuador-sbc-tags"><span>CUALQUIER GRL</span><span>UNA VEZ POR CLUB</span><span>INTRANSFERIBLE</span></div></div>'+card(U.ecuadorSbcCard(pool()))+'</section>':rewardCard?'<section class="sbc-star-hero"><div><span class="barca-kicker">✦ ESTRELLAS SBC · NUEVO DESAFÍO</span><h3>'+esc(rewardCard.name)+' <b>'+rewardCard.overall+'</b></h3><p>Completa este desafío para recibir una edición exclusiva de '+esc(rewardCard.name)+'. Elige tus reservas o repetidos y revisa las cartas antes de entregarlas.</p><div class="sbc-star-tags"><span>UNA VEZ POR CLUB</span><span>INTRANSFERIBLE</span></div></div>'+card(rewardCard)+'</section>':'';
    const tabs='<div class="ut-play-tabs">'+Object.entries(U.challenges).map(([id,d])=>'<button class="btn '+(id===sbcType?'primary':'')+'" data-ut-sbc="'+id+'">'+d.name+'</button>').join('')+'</div>';
    const heading=title('SBC / DESAFÍOS DE CREACIÓN DE PLANTILLAS','TRANSFORMA TU CLUB.','Selecciona reservas o repetidos y revisa la entrega antes de confirmar. Las cartas elegidas se consumen al completar el desafío.');
    if(completed)return heading+tabs+hero+'<section class="ut-panel ecuador-sbc-complete"><h3>✓ DCP COMPLETADO</h3><p>Ya recibiste a '+esc(rewardCard.name)+' '+rewardCard.overall+'. Su carta y la finalización del desafío se guardan en tu club.</p><button class="btn primary" data-ut-tab="club">Ver mi club →</button></section>';
    const requirements=ecuador?'11 cartas de Ecuador · Cualquier GRL y posición · Reservas o repetidos':def.count+' cartas'+(def.nationality?' de '+def.nationality:'')+' · '+def.min+'–'+def.max+' GRL'+(def.positions?' · Defensas: '+def.positions.join(', '):'')+(def.score?' · '+def.score+' puntos de artículo.':' · Reservas o repetidos');
    const progress=sbcSelection.size+'/'+def.count+' cartas'+(ecuador?' de Ecuador':def.score?' · '+(preview.score||0)+'/'+def.score+' puntos':' seleccionadas');
    const full=sbcSelection.size>=def.count,choices=eligible.map(p=>{
      const selected=sbcSelection.has(p.uid);
      return '<div class="ut-sbc-card '+(selected?'selected':'')+'">'+card(p,'sbc-pick','id="ut-sbc-card-'+esc(p.uid)+'" data-uid="'+esc(p.uid)+'" aria-pressed="'+selected+'"'+(full&&!selected?' disabled':''))+'<span>'+(selected?'Seleccionada · ':'')+(ecuador?'Ecuador · ':def.score?U.itemScore(p)+' puntos · ':esc(p.nationality||p.pos)+' · ')+(p.duplicate?'Repetido':'Reserva')+'</span></div>';
    }).join('');
    return heading+tabs+hero+'<section class="ut-sbc-status"><div><h3>'+def.name+'</h3><p>'+requirements+'</p><b>'+progress+'</b></div><div class="ecuador-sbc-actions">'+
      (rewardCard?'<button class="btn" data-ut="sbc-auto" '+(eligible.length<def.count?'disabled':'')+'>Elegir los '+def.count+' de menor GRL</button>':'')+
      '<button class="btn primary" data-ut="sbc-review" '+(!preview.ok?'disabled':'')+'>Revisar entrega →</button></div></section>'+
      (full?'<p class="save-info" role="status">Cupo completo. Desmarca una carta para elegir otra.</p>':'')+'<div class="ut-card-grid">'+choices+'</div>'+(eligible.length?'':ecuador?'<p>No tienes reservas ecuatorianas elegibles. Los titulares se protegen: cámbialos desde Plantilla si quieres usar sus cartas.</p>':'<p>No tienes reservas elegibles. Recibe cartas en la tienda o en el mercado.</p>');
  }
  function objectives(){return title('OBJETIVOS / FUNDAMENTOS','CADA PASO CUENTA.')+'<div class="ut-objectives">'+U.objectives(club).map(o=>'<article class="'+(o.claimed?'claimed':'')+'"><span class="eyebrow">'+(o.claimed?'RECOMPENSA RECIBIDA':o.complete?'COMPLETADO':'EN PROGRESO')+'</span><h3>'+o.name+'</h3><p>'+Math.min(o.current,o.target)+' / '+o.target+'</p><progress max="'+o.target+'" value="'+Math.min(o.current,o.target)+'"></progress><b>'+o.coins+' monedas</b><button class="btn" data-ut="objective" data-objective="'+o.id+'" '+(!o.complete||o.claimed?'disabled':'')+'>'+(o.claimed?'Recibida':'Cobrar recompensa')+'</button></article>').join('')+'</div>';}
  function collection(){const query=norm(clubQuery).trim(),ps=club.owned.filter(p=>norm(p.name).includes(query));return '<div class="ut-card-grid">'+ps.map(p=>card(p,'inspect','data-player="'+esc(p.id)+'"')).join('')+'</div>';}
  function myClub(){return title('MI CLUB / '+club.owned.length+' FUTBOLISTAS','TODAS TUS CARTAS.','Las cartas titulares se cambian desde Plantilla. Los intransferibles se pueden utilizar en DCP.')+'<label class="ut-club-filter">Buscar en mi club<input id="ut-club-query" value="'+esc(clubQuery)+'" placeholder="Nombre del jugador"></label><div id="ut-club-results">'+collection()+'</div>'+(club.duplicates.length?'<section class="ut-panel"><h3>ALMACÉN DE REPETIDOS · '+club.duplicates.length+'</h3><div class="ut-card-grid">'+club.duplicates.map(p=>'<div>'+card(p,'inspect','data-player="'+esc(p.uid)+'" data-duplicate="yes"')+(p.tradeable?'<button class="btn small" data-ut="sell" data-player="'+esc(p.uid)+'" data-duplicate="yes">Venta rápida</button>':'<small>Intransferible · disponible para DCP</small>')+'</div>').join('')+'</div></section>':'');}
  function evolutions(){
    const eligible=club.owned.filter(p=>U.evolutionCost(p)!==null).sort((a,b)=>b.overall-a.overall);
    return title("ULTIMATE TEAM / EVOLUCIONES","LLEVA TUS CARTAS MÁS LEJOS.","Mejora una carta de tu club en +2 GRL pagando monedas conseguidas en AURA. Cada edición admite hasta dos evoluciones, con máximo 92 GRL.")+
      '<p class="save-info">Evoluciones completadas: '+(club.evolutions||0)+'. Se conserva la identidad del jugador, su sitio en el once y toda tu colección.</p>'+
      '<div class="ut-market-grid">'+eligible.map(p=>'<article>'+card(p,'inspect','data-player="'+esc(p.id)+'"')+
      '<p>'+p.overall+' → '+Math.min(92,p.overall+2)+' GRL · Nivel '+((p.evolutionLevel||0)+1)+'/2</p>'+
      '<b>'+U.evolutionCost(p).toLocaleString("es-ES")+' monedas</b>'+
      '<button class="btn primary" data-ut="evolve" data-player="'+esc(p.id)+'" '+(club.coins<U.evolutionCost(p)?'disabled':'')+'>Evolucionar carta →</button></article>').join('')+'</div>'+
      (eligible.length?'':'<p>Las cartas de tu club ya no tienen evoluciones disponibles.</p>');
  }
  function currentEvents(){return AuraCurrentEvents.view(club,pool());}
  function magiaEvent(){return AuraMagiaEvent.view(club,pool());}
  function barcelonaEvent(){return AuraBarcelonaEvent.view(club,pool());}
  function murallaEvent(){return AuraMurallaEvent.view(club,pool());}
  function flashbackEvent(){return typeof AuraFlashbackEvent!=="undefined"?AuraFlashbackEvent.view(club,pool()):'<p>El evento Flashback está cargando.</p>';}
  function backup(){
    return title("PROTECCIÓN DE TU CLUB","TU EQUIPO. TU RESPALDO.","Descarga tu plantilla y vuelve a cargarla si cambias de dispositivo. Los guardados son locales a cada navegador.")+
      '<section class="ut-panel"><h3>EXPORTAR EQUIPO</h3><p>Incluye monedas, cartas, once, suplentes y progreso Ultimate Team.</p><button class="btn primary" data-ut="export">Descargar respaldo →</button></section>'+
      '<section class="ut-panel"><h3>IMPORTAR RESPALDO</h3><p>El archivo reemplazará el club actual solo después de verificar los datos.</p><input id="ut-import-file" type="file" accept=".json,application/json"><button class="btn" data-ut="import">Importar archivo verificado →</button></section>'+
      '<section class="ut-panel"><h3>RECUPERACIÓN</h3><p>Restablecer el respaldo automático anterior a tu último guardado.</p><button class="btn" data-ut="rollback">Recuperar copia anterior →</button></section>'+
      '<section class="ut-panel ut-admin-local"><h3>CÓDIGO PRIVADO</h3><p>Se aplica al club guardado en este navegador.</p><label for="ut-admin-code">Código de administrador<input type="password" id="ut-admin-code" maxlength="96" autocomplete="off" spellcheck="false" placeholder="Pega tu código privado"></label><button class="btn primary" data-ut="admin-local-credit">Canjear código →</button></section>';
  }
  function render(){if(tab==='argentina')tab='events';if(!club)return '<div class="ut-shell">'+start()+'</div>';return '<div class="ut-shell">'+top()+'<nav class="ut-nav" aria-label="Ultimate Team">'+tabs.map(([id,label])=>'<button data-ut-tab="'+id+'" '+(id===tab||id==='events'&&['magia','barcelona','muralla','flashback'].includes(tab)?'aria-current="page"':'')+'>'+label+'</button>').join('')+'</nav>'+(['magia','barcelona','muralla','flashback'].includes(tab)?'<div class="ut-event-breadcrumb"><button class="btn small" data-ut-tab="events">← Eventos actuales</button><span>TU COLECCIÓN / '+esc(tab==='barcelona'?'FC BARCELONA':tab.toUpperCase())+'</span></div>':'')+({home,events:currentEvents,squad,play,store,market,sbc,objectives,club:myClub,magia:magiaEvent,barcelona:barcelonaEvent,muralla:murallaEvent,flashback:flashbackEvent,evolutions,backup}[tab]||home)()+'<footer class="ut-footnote">AURA UT · Guardado automático en este navegador · Monedas de juego · Atributos estimados por AURA</footer></div>';}
  function reveal(){const p=club.lastPack[packIndex];if(!p)return;openModal('SOBRE ABIERTO','<div class="ut-reveal '+(p.overall>=86?'walkout':'')+'"><span class="eyebrow">'+(p.overall>=86?'JUGADOR DESTACADO':p.overall>=82?'CARTA ESPECIAL DE TU SOBRE':'NUEVO JUGADOR')+'</span>'+card(p)+'<p>'+(p.duplicate?'Repetido: guardado para DCP o venta rápida.':'Añadido a tu club.')+'</p><button class="btn primary" data-ut="reveal-next">'+(packIndex<club.lastPack.length-1?'Ver siguiente carta →':'Ir a mi club →')+'</button><button class="btn subtle" data-ut="reveal-skip">Ver todas las cartas</button></div>');}
  function playMatch(requestedMode,requestedOpponent){
    if(requestedMode===U.argentina.id)return;
    const u=club,eventMode=requestedMode===U.flashback.id?U.flashback.id:null,
          token=(eventMode===U.flashback.id?'ut:flashback:':'ut:')+ ++matchToken,chosen=u.xi.map(id=>u.owned.find(p=>p.id===id)),chem=U.chemistry(u),home={id:'aura-ut',name:u.name,rating:U.rating(u)},controlled=AuraArena.team(home,null,chosen),shape=AuraSquad.formations[u.formation];
    controlled.formation=u.formation;controlled.slots=shape;controlled.players=chosen.map((p,i)=>({...p,overall:clamp(Math.round(AuraSquad.effective(p,shape[i][0]))+Math.floor(chem.players[i]/2),1,99)}));controlled.bench=U.bench(u).map(p=>({...p,slotRatings:shape.map(([pos])=>Math.round(AuraSquad.effective(p,pos)))}));
    const mode=eventMode||playMode,
          opponent=mode===U.flashback.id?(requestedOpponent||"madrid"):playMatch.opponent||"betis";
    let settled=false;
    AuraArena.preMatch(controlled,AuraArena.team(getClub(opponent)),{label:mode===U.flashback.id?'✦ FLASHBACK · +70.000 MONEDAS':mode==='battles'?'SQUAD BATTLES · AURA UT':'DIVISIONES CONTRA IA · DIVISIÓN '+u.division,tactic:u.tactic,onFinish:result=>{if(club!==u||settled)return;settled=true;const coins=U.reward(u,token,result,mode,AuraArena.settings.difficulty);if(coins){tab=mode===U.flashback.id?'flashback':'play';renderGame();notify('Partido terminado: +'+coins.toLocaleString('es-ES')+' monedas.');}}});
  }
  function renderGame(){persistClub();renderMain();}
  // Main render is named differently here to keep the public renderer pure.
  function renderMain(){globalRender();}
  let globalRender=()=>{};
  function bindRender(fn){globalRender=fn;}
  function inspect(id,duplicate=false){
    const p=duplicate?club.duplicates.find(p=>p.uid===id):club.owned.find(p=>p.id===id)||pool().find(p=>p.id===id)||U.argentinaCards(pool()).find(p=>p.id===id)||U.flashbackCards(pool()).find(p=>p.id===id)||U.murallaCards(pool()).find(p=>p.id===id)||U.barcelonaCards(pool()).find(p=>p.id===id)||U.magiaCards(pool()).find(p=>p.id===id);
    if(!p)return;
    const owned=duplicate||club.owned.some(q=>q.id===p.id);
    if(!owned&&p.event===U.argentina.id){notify('El evento Liga Argentina ha finalizado.');return;}
    const sellable=owned&&p.tradeable&&(duplicate||!club.xi.includes(p.id));
    const saleId=duplicate?p.uid:p.id,saleFlag=duplicate?' data-duplicate="yes"':'';
    openModal('FICHA DE JUGADOR','<div class="ut-inspector">'+card(p)+'<p>'+esc(p.nationality||'Nacionalidad sin referencia')+' · '+esc(p.leagueLabel||'Liga de referencia')+'</p><p>Valor de compra en AURA: '+U.marketPrice(club,p).toLocaleString('es-ES')+' monedas.</p>'+(owned?'<p>'+(duplicate?'Repetido · ':'')+(p.tradeable?'Transferible':'Intransferible')+'</p>'+(sellable?'<button class="btn" data-ut="sell" data-player="'+esc(saleId)+'"'+saleFlag+'>Venta rápida · '+Math.max(100,Math.round(U.price(p)*.2))+' monedas</button>':''):'<button class="btn primary" data-ut="buy" data-player="'+esc(p.id)+'">Comprar ahora</button>')+'</div>');
  }
  function handleClick(t){
    const d=t.dataset,legacy=d.tour?.startsWith('ut-')?d.tour.slice(3):null,action=d.ut||legacy;
    if(action==='argentina-buy'||action==='argentina-play')return true;
    if(d.utTab){tab=d.utTab==='argentina'?'events':d.utTab;renderGame();return true;}if(d.utMode){if(d.utMode===U.argentina.id)return true;playMode=d.utMode;renderGame();return true;}if(d.utSbc&&U.challenges[d.utSbc]){sbcType=d.utSbc;sbcSelection.clear();renderGame();return true;}if(!action)return false;
    try{
      if(action==='lobby'){goToModes();return true;}
      if(action==='create'){club=U.create(pool(),document.getElementById('ut-starter-league')?.value||'all',document.getElementById('ut-club-name')?.value||'Mi AURA FC');tab=['events','magia','barcelona','muralla','flashback'].includes(tab)?tab:'home';renderGame();}
      if(!club)return true;
      if(action==='admin-local-credit'){
        if(adminPending)return true;
        if(typeof AuraAdminLocal==='undefined'){notify('Recarga AURA para cargar los códigos privados.');return true;}
        const current=club,field=document.getElementById('ut-admin-code'),code=field?.value||'';
        adminPending=true;
        AuraAdminLocal.redeem(typeof localStorage==='undefined'?null:localStorage,{version:2,club,tab,matchToken},code,allFormations,()=>club===current).then(result=>{
          if(club!==current)return;
          if(result.ok){Object.assign(club,result.club);if(field)field.value='';renderMain();notify('¡30.000.000 de monedas añadidas a tu club local!');}
          else notify(result.error);
        }).catch(()=>notify('No se pudo verificar el código.')).finally(()=>{adminPending=false;});
        return true;
      }
      if(action==='magia-gift'){
        if(tab!=='magia')return true;
        const result=U.claimMagiaGift(club);
        if(result.error)notify(result.error);
        else{renderGame();notify('¡400.000 monedas de bienvenida MAGIA reclamadas!');}
        return true;
      }
      if(action==='magia-buy'){
        if(tab!=='magia')return true;
        const candidate=U.magiaCards(pool()).find(p=>p.id===d.player);
        if(!candidate){notify('Esta carta MAGIA no está disponible.');return true;}
        const result=U.buy(club,candidate);
        if(result.error)notify(result.error);
        else{closeModal();renderGame();notify('¡'+candidate.name+' MAGIA fichado!');}
        return true;
      }
      if(action==='barcelona-gift'){
        if(tab!=='barcelona')return true;
        const result=U.claimBarcelonaGift(club);
        if(result.error)notify(result.error);
        else{renderGame();notify('¡500.000 monedas de bienvenida FC BARCELONA reclamadas!');}
        return true;
      }
      if(action==='barcelona-buy'){
        if(tab!=='barcelona')return true;
        const candidate=U.barcelonaCards(pool()).find(p=>p.id===d.player);
        if(!candidate){notify('Esta carta FC Barcelona no está disponible.');return true;}
        const result=U.buy(club,candidate);
        if(result.error)notify(result.error);
        else{closeModal();renderGame();notify('¡'+candidate.name+' FC BARCELONA fichado!');}
        return true;
      }
      if(action==='muralla-gift'){
        if(tab!=='muralla')return true;
        const result=U.claimMurallaGift(club);
        if(result.error)notify(result.error);
        else{renderGame();notify('¡300.000 monedas de bienvenida MURALLA reclamadas!');}
        return true;
      }
      if(action==='muralla-buy'){
        if(tab!=='muralla')return true;
        const candidate=U.murallaCards(pool()).find(p=>p.id===d.player);
        if(!candidate){notify('Esta carta Muralla no está disponible.');return true;}
        const result=U.buy(club,candidate);
        if(result.error)notify(result.error);
        else{closeModal();renderGame();notify('¡'+candidate.name+' MURALLA fichado!');}
        return true;
      }
      if(action==='flashback-gift'){
        if(tab!=='flashback')return true;
        const result=U.claimFlashbackGift(club);
        if(result.error)notify(result.error);
        else{renderGame();notify('¡200.000 monedas de bienvenida Flashback reclamadas!');}
        return true;
      }
      if(action==='flashback-buy'){
        if(tab!=='flashback')return true;
        const candidate=U.flashbackCards(pool()).find(p=>p.id===d.player);
        if(!candidate){notify('Esta carta Flashback no está disponible.');return true;}
        const result=U.buy(club,candidate);
        if(result.error)notify(result.error);
        else{closeModal();renderGame();notify('¡Flashback fichado: '+candidate.name+'!');}
        return true;
      }
      if(action==='flashback-play'){
        if(tab!=='flashback')return true;
        const opponents=['guayaquil','madrid','barcelona','paris'];
        if(!opponents.includes(d.opponent)){notify('Rival Flashback no válido.');return true;}
        playMatch(U.flashback.id,d.opponent);
        return true;
      }
      if(action==='export'){
        const data=AuraUTSave.exportData({version:2,club,tab,matchToken},allFormations);
        const blob=new Blob([data],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
        link.href=url;link.download="aura-ut-respaldo.json";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify("Respaldo descargado.");
      }
      if(action==='import'){
        const file=document.getElementById("ut-import-file")?.files?.[0];
        if(!file||file.size>AuraUTSave.MAX_BYTES+1000){notify("Elige un respaldo JSON válido de hasta 3 MB.");return true;}
        file.text().then(data=>{
          const next=AuraUTSave.importData(data,allFormations);
          if(!next){notify("Respaldo inválido o alterado. Tu equipo sigue intacto.");return;}
          if(!AuraUTSave.save(localStorage,next,allFormations)){notify("No se pudo guardar. Tu equipo sigue intacto.");return;}
          club=next.club;tab="backup";matchToken=next.matchToken;renderMain();notify("Equipo importado y verificado.");
        }).catch(()=>notify("No se pudo leer el respaldo."));
      }
      if(action==='rollback'){
        const previous=AuraUTSave.restoreBackup(localStorage,allFormations);
        if(!previous){notify("No existe una copia anterior válida.");return true;}
        club=previous.club;tab="backup";matchToken=previous.matchToken;renderMain();notify("Copia anterior recuperada.");
      }
      if(action==='evolve'){
        const r=U.evolve(club,d.player);
        if(r.error)notify(r.error);
        else{closeModal();renderGame();notify("¡Carta evolucionada! "+r.player.name+" ahora tiene "+r.overall+" GRL.");}
      }
      if(action==='auto'){U.auto(club);renderGame();}
      if(action==='pick'){pickerSlot=Number(d.slot);const pos=AuraSquad.formations[club.formation][pickerSlot][0];openModal('ELEGIR '+pos,'<div class="ut-card-grid">'+club.owned.slice().sort((a,b)=>(b.overall-AuraSquad.positionPenalty(b,pos)*2)-(a.overall-AuraSquad.positionPenalty(a,pos)*2)).map(p=>card(p,'choose','data-player="'+esc(p.id)+'"')).join('')+'</div>');}
      if(action==='choose'){if(!U.setPlayer(club,pickerSlot,d.player)){notify('Ya tienes otra edición de este jugador en el once. Sustitúyela en su puesto.');return true;}closeModal();renderGame();}
      if(action==='inspect')inspect(d.player,d.duplicate==='yes');
      if(action==='pack'){const r=U.draw(club,pool(),d.pack||'gold');if(r.error)notify(r.error);else{packIndex=0;renderGame();reveal();}}
      if(action==='reveal-next'){packIndex++;if(packIndex<club.lastPack.length)reveal();else{closeModal();tab='club';clubQuery='';renderGame();}}
      if(action==='reveal-skip'){closeModal();tab='club';clubQuery='';renderGame();}
      if(action==='buy'){const r=U.buy(club,pool().find(p=>p.id===d.player));if(r.error)notify(r.error);else{closeModal();renderGame();notify('Jugador añadido a tu club.');}}
      if(action==='sell'){const r=U.quickSell(club,d.player,d.duplicate==='yes');if(r.error)notify(r.error);else{closeModal();renderGame();notify('Venta rápida: +'+r.coins+' monedas.');}}
      if(action==='objective'){const r=U.claim(club,d.objective);if(r.error)notify(r.error);else{renderGame();notify('Recompensa: +'+r.coins+' monedas.');}}
      if(action==='sbc-pick'){
        const focused=document.activeElement===t;
        if(sbcSelection.has(d.uid))sbcSelection.delete(d.uid);else if(sbcSelection.size<U.challenges[sbcType].count)sbcSelection.add(d.uid);
        renderGame();
        if(focused)document.getElementById('ut-sbc-card-'+d.uid)?.focus?.({preventScroll:true});
      }
      if(action==='stars-sbc-open'){tab='sbc';sbcType='cantera';sbcSelection.clear();renderGame();return true;}
      if(action==='ecuador-sbc-open'){tab='sbc';sbcType='ecuador';sbcSelection.clear();renderGame();return true;}
      if(action==='sbc-auto'){
        const available=U.sbcPool(club,sbcType).sort((a,b)=>a.overall-b.overall||Number(!!b.duplicate)-Number(!!a.duplicate));
        sbcSelection.clear();available.slice(0,U.challenges[sbcType].count).forEach(p=>sbcSelection.add(p.uid));renderGame();return true;
      }
      if(action==='sbc-reward-close'){closeModal();return true;}
      if(action==='sbc-review'){const preview=U.sbcPreview(club,sbcType,[...sbcSelection]);if(preview.ok)openModal('CONFIRMAR ENTREGA DCP','<p>Estas '+preview.cards.length+' cartas saldrán de tu club y recibirás '+(U.sbcRewards[sbcType]?esc(U.sbcRewards[sbcType].name)+' '+U.sbcRewards[sbcType].overall+(sbcType==='ecuador'?' · Ecuador':''):U.packs[preview.reward].name)+'.</p><div class="ut-card-grid">'+preview.cards.map(p=>card(p)).join('')+'</div><button class="btn primary" data-ut="sbc-confirm">Entregar cartas y recibir recompensa →</button>');}
      if(action==='sbc-confirm'){
        const r=U.submitSBC(club,sbcType,[...sbcSelection],pool());
        if(r.error)notify(r.error);
        else{
          sbcSelection.clear();packIndex=0;
          if(r.kind==='player'){
            tab='club';clubQuery='';renderGame();
            openModal(sbcType==='ecuador'?'SBC ECUADOR COMPLETADO':'SBC COMPLETADO','<div class="ut-shell '+(sbcType==='ecuador'?'ecuador-sbc-reward':'sbc-star-reward')+'"><span class="ecuador-sbc-kicker">'+(sbcType==='ecuador'?'🇪🇨':'✦')+' TU NUEVO JUGADOR</span>'+card(r.cards[0])+'<h3>¡'+esc(r.cards[0].name.toUpperCase())+' '+r.cards[0].overall+' ES TUYO!</h3><p>La carta se ha guardado en tu club. Puedes colocarla en tu plantilla.</p><button class="btn primary" data-ut="sbc-reward-close">Ver en mi club →</button></div>');
          }else{renderGame();reveal();}
        }
      }
      if(action==='battle-claim'){const r=U.claimBattles(club);if(r.error)notify(r.error);else{renderGame();notify('Serie completada: +'+r.coins+' monedas.');}}
      if(action==='play'){playMatch.opponent=d.opponent||'madrid';playMatch();}
    }catch(error){notify(error.message);}return true;
  }
  function change(e){
    const {id,value}=e.target;
    if(id==='ut-formation'&&club)U.setFormation(club,value);
    else if(id==='ut-market-position')position=value;
    else if(id==='ut-market-min')marketMin=Number(value)||0;
    else if(id==='ut-market-max')marketMax=Number(value)||0;
    else if(id==='ut-market-order')marketOrder=value==='overall'?'overall':'price';
    else return;
    renderGame();
    document.getElementById(id)?.focus?.({preventScroll:true});
  }
  function input(e){if(e.target.id==='ut-market-query'){marketQuery=e.target.value.slice(0,70);const results=document.getElementById('ut-market-results');if(results)results.innerHTML=marketResults();}if(e.target.id==='ut-club-query'){clubQuery=e.target.value.slice(0,70);const results=document.getElementById('ut-club-results');if(results)results.innerHTML=collection();}}
  function openArgentinaEvent(){tab='events';renderGame();return !!club;}
  return {render,bindRender,handleClick,change,input,getClub:()=>club,pool,saveClub:persistClub,openArgentinaEvent};
})();

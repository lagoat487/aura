/* AURA career interface; shared state is kept in this page's session only. */
const AuraCareerUI=(()=>{
  "use strict";
  const Squad=AuraSquad,Deals=AuraNegotiations;
  let selectedPlayer=null,squadTab="lineup",squadSearch="",positionFilter="all",swapFrom=null,activeDealId=null,dragged=null;
  const status={enquiry:"Consulta pendiente",club:"Negociando traspaso",contract:"Negociando contrato",ready:"Listo para firmar",signed:"Fichado",sold:"Vendido",renewed:"Renovado",failed:"Negociación rota",withdrawn:"Retirada"};
  const compact=n=>n>=1000000?"€"+(n/1000000).toLocaleString("es-ES",{maximumFractionDigits:1})+" M":n>=1000?"€"+(n/1000).toLocaleString("es-ES",{maximumFractionDigits:0})+" mil":money(n);
  const initials=p=>p.name.split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase();
  const shortName=p=>p.name.length<19?p.name:p.name.split(/\s+/).slice(0,2).join(" ");
  function face(p,large=false){
    if(typeof AuraTourUI!=="undefined")return AuraTourUI.face(p,large);
    const image=p.photo&&/^https:\/\/cdn\.sofifa\.net\/players\/\d+\/\d+\/26_120\.png$/.test(p.photo)?'<img src="'+p.photo+'" alt="" loading="lazy" onerror="this.hidden=true">':'';
    return '<span class="career-face '+(large?'large':'')+'" aria-hidden="true"><span>'+safeText(initials(p))+'</span>'+image+'</span>';
  }
  function group(p){return p.pos==="POR"?"POR":["DFC","LI","LD"].includes(p.pos)?"DEF":["MC","MCD","MCO","MI","MD"].includes(p.pos)?"MED":"DEL"}
  function current(){const ps=clubPlayers(state.club);return ps.find(p=>p.id===selectedPlayer)||ps[0]}
  function playerButton(p,kind="list",slot){
    const sheet=Squad.ensure(state),starting=sheet.xi.includes(p.id),active=p.id===selectedPlayer;
    const label=kind==="pitch"?'<span class="shirt" style="--kit-a:'+AuraGraphics.kit(myClub())[0]+';--kit-b:'+AuraGraphics.kit(myClub())[1]+'"><b>'+p.overall+'</b></span><span class="pitch-name">'+safeText(shortName(p))+'</span><span class="pitch-position">'+slot+(Squad.positionPenalty(p,slot)>3?' <i title="Fuera de su posición">!</i>':'')+(sheet.captain===p.id?' · C':'')+'</span>':
      face(p)+'<span class="player-row-name"><strong>'+safeText(shortName(p))+'</strong><small>'+safeText(p.pos)+' · '+(starting?'Titular':'Suplente')+(sheet.captain===p.id?' · Capitán':'')+'</small></span><b class="rating-number">'+p.overall+'</b>';
    return '<button type="button" class="squad-player '+kind+' '+(active?'selected':'')+' '+(swapFrom===p.id?'swap-source':'')+'" data-squad-player="'+safeText(p.id)+'" draggable="true" aria-pressed="'+active+'" aria-label="'+safeText(p.name+', '+p.pos+', GRL '+p.overall)+'">'+label+'</button>';
  }
  function rosterList(){
    const roster=clubPlayers(state.club),sheet=Squad.ensure(state),query=squadSearch.toLocaleLowerCase();
    const filtered=roster.filter(p=>(positionFilter==="all"||group(p)===positionFilter)&&p.name.toLocaleLowerCase().includes(query));
    filtered.sort((a,b)=>Number(sheet.xi.includes(b.id))-Number(sheet.xi.includes(a.id))||b.overall-a.overall);
    return filtered.map(p=>playerButton(p)).join("")||'<p class="save-info">No hay jugadores con ese filtro.</p>';
  }
  function profile(){
    const p=current(),sheet=Squad.ensure(state),index=sheet.xi.indexOf(p.id),slot=index>=0?Squad.formations[sheet.formation][index][0]:null;
    return '<aside class="player-inspector"><div class="inspector-top"><span class="eyebrow">'+(index>=0?'ONCE TITULAR':'BANQUILLO')+'</span><span class="inspector-rating">'+p.overall+'<small>GRL</small></span></div><div class="inspector-portrait">'+face(p,true)+'</div><h2>'+safeText(p.name)+'</h2><p class="player-meta">'+safeText(p.pos)+' <span>·</span> '+p.age+' años <span>·</span> POT '+p.potential+'</p>'+
      '<div class="player-state"><div><span>Moral</span><b>'+Squad.moraleLabel(p)+'</b></div><progress value="'+p.morale+'" max="100" aria-label="Moral: '+p.morale+' de 100"></progress><div><span>Energía</span><b>'+p.fitness+' %</b></div><progress value="'+p.fitness+'" max="100" aria-label="Energía: '+p.fitness+' de 100"></progress></div>'+
      '<dl class="player-facts"><div><dt>Rol acordado</dt><dd>'+p.role+'</dd></div><div><dt>Contrato</dt><dd>Hasta '+p.contractEnd+'</dd></div><div><dt>Sueldo semanal</dt><dd>'+money(p.wage)+'</dd></div><div><dt>Valor estimado</dt><dd>'+compact(p.value)+'</dd></div><div><dt>Partidos jugados</dt><dd>'+p.appearances+'</dd></div>'+
      (p.releaseClause?'<div><dt>Cláusula de salida</dt><dd>'+compact(p.releaseClause)+'</dd></div>':'')+
      (slot?'<div><dt>GRL efectivo en '+slot+'</dt><dd class="'+(Squad.positionPenalty(p,slot)>3?'warning-text':'accent')+'">'+Math.round(Squad.effective(p,slot))+'</dd></div>':'')+'</dl>'+
      '<div class="inspector-actions"><button class="btn primary" data-squad-action="swap">'+(swapFrom?'Cancelar cambio':'⇄ Cambiar jugador')+'</button><button class="btn" data-squad-action="captain" '+(index<0?'disabled':'')+'>© Nombrar capitán</button><button class="btn" data-renew="'+safeText(p.id)+'">Renovar contrato</button><button class="btn subtle" data-sell="'+safeText(p.id)+'">Negociar venta ↗</button></div></aside>';
  }
  function renderSquad(){
    const sheet=Squad.ensure(state),roster=clubPlayers(state.club);if(!roster.some(p=>p.id===selectedPlayer))selectedPlayer=sheet.xi[0];
    const coverage=realRosterCoverage(state.club),bench=roster.filter(p=>!sheet.xi.includes(p.id)).sort((a,b)=>b.overall-a.overall);
    const nav='<div class="career-tabs" role="group" aria-label="Vistas de plantilla"><button data-squad-tab="lineup" class="'+(squadTab==="lineup"?'active':'')+'" aria-pressed="'+(squadTab==="lineup")+'">ALINEACIÓN</button><button data-squad-tab="hub" class="'+(squadTab==="hub"?'active':'')+'" aria-pressed="'+(squadTab==="hub")+'">CENTRAL DE PLANTILLA</button></div>';
    const banner='<div class="squad-heading"><div><span class="eyebrow">'+safeText(myClub().name)+' / DIRECCIÓN DEPORTIVA</span><h1>TU EQUIPO. <em>TUS REGLAS.</em></h1></div><div class="squad-metrics"><div><b>'+Squad.strength(state)+'</b><span>GRL DEL ONCE</span></div><div><b>'+roster.length+'</b><span>JUGADORES</span></div><div><b>'+compact(state.wageBudget-Squad.wages(state))+'</b><span>MARGEN / SEM.</span></div></div></div>';
    const note='<div class="squad-footnote">'+coverage.real+' jugadores reales · '+coverage.generated+' canteranos · Valores y contratos de simulación. <button class="btn small" data-action="real-roster">⚽ PONER JUGADORES REALES EN MI PLANTILLA</button></div>';
    if(squadTab==="hub")return banner+nav+'<div class="squad-hub"><section class="roster-hub"><div class="panel-title"><h3>CENTRAL DE PLANTILLA</h3><span class="save-info">Selecciona para gestionar</span></div><div class="table-wrap"><table class="table squad-contract-table"><thead><tr><th>Jugador</th><th>GRL</th><th>Moral</th><th>Rol</th><th>Sueldo / sem.</th><th>Fin contrato</th></tr></thead><tbody>'+roster.map(p=>'<tr class="'+(p.id===selectedPlayer?'highlight':'')+'"><td><button class="table-player" data-squad-player="'+safeText(p.id)+'">'+face(p)+'<span>'+safeText(shortName(p))+'<small>'+safeText(p.pos)+'</small></span></button></td><td class="accent">'+p.overall+'</td><td>'+Squad.moraleLabel(p)+'</td><td>'+p.role+'</td><td>'+money(p.wage)+'</td><td>'+p.contractEnd+'</td></tr>').join("")+'</tbody></table></div><div class="hub-wages"><span>Masa salarial semanal <b>'+money(Squad.wages(state))+'</b></span><span>Tope semanal <b>'+money(state.wageBudget)+'</b></span></div></section>'+profile()+'</div>'+note;
    return banner+nav+'<div class="squad-workspace"><section class="squad-roster-panel"><div class="panel-title"><h3>PLANTILLA</h3><span>'+roster.length+'</span></div><label class="sr-only" for="squad-search">Buscar en la plantilla</label><input id="squad-search" type="search" value="'+safeText(squadSearch)+'" placeholder="Buscar jugador…"><label class="sr-only" for="squad-filter">Filtrar por posición</label><select id="squad-filter">'+[["all","Todas las posiciones"],["POR","Porteros"],["DEF","Defensas"],["MED","Mediocampistas"],["DEL","Delanteros"]].map(([id,label])=>'<option value="'+id+'" '+(positionFilter===id?'selected':'')+'>'+label+'</option>').join("")+'</select><div id="squad-list" class="squad-player-list">'+rosterList()+'</div></section>'+
      '<section class="team-sheet"><div class="sheet-toolbar"><div><span class="eyebrow">HOJA DE EQUIPO</span><label class="sr-only" for="squad-formation">Formación</label><select id="squad-formation">'+Object.keys(Squad.formations).map(f=>'<option '+(f===sheet.formation?'selected':'')+'>'+f+'</option>').join("")+'</select></div><button class="btn small" data-squad-action="auto">Mejor once ↗</button></div><div class="pitch-help" role="status">'+(swapFrom?'Selecciona otro jugador para completar el cambio.':'Elige un jugador para ver sus datos. Arrastra para intercambiar.')+'</div><div class="tactical-pitch"><div class="pitch-markings" aria-hidden="true"><span class="pitch-circle"></span><span class="pitch-box top"></span><span class="pitch-box bottom"></span><span class="pitch-midline"></span></div>'+Squad.formations[sheet.formation].map(([slot,x,y],i)=>{
        const p=roster.find(p=>p.id===sheet.xi[i]);return p?'<div class="pitch-slot" style="left:'+x+'%;top:'+y+'%">'+playerButton(p,"pitch",slot)+'</div>':'';
      }).join("")+'</div><div class="bench-heading"><h3>SUPLENTES Y RESERVAS</h3><span>'+bench.length+'</span></div><div class="bench-strip">'+bench.map(p=>playerButton(p,"bench")).join("")+'</div></section>'+profile()+'</div>'+note;
  }
  function transferHub(){
    const deals=Deals.initialize(state),active=deals.filter(d=>!Deals.terminal.has(d.stage)),done=deals.filter(d=>["signed","sold","renewed"].includes(d.stage));
    return '<section class="transfer-hub"><div class="panel-title"><div><span class="eyebrow">TU MESA DE OPERACIONES</span><h3>CENTRAL DE NEGOCIACIONES</h3></div><div class="row"><span class="pill">'+active.length+' abiertas</span><span class="pill">'+done.length+' cerradas</span></div></div>'+
      (deals.length?'<div class="deal-list">'+deals.slice().reverse().slice(0,12).map(d=>'<button class="deal-list-item" data-open-deal="'+d.id+'"><span class="deal-type">'+(d.mode==="buy"?'↙':d.mode==="sell"?'↗':'↻')+'</span><span><strong>'+safeText(shortName(d.player))+'</strong><small>'+(d.mode==="buy"?'Fichaje':d.mode==="sell"?'Venta':'Renovación')+' · '+safeText(d.sourceName)+'</small></span><span class="deal-status '+(Deals.terminal.has(d.stage)?'':'accent')+'">'+status[d.stage]+(d.rival?' · rival en puja':'')+'</span><span>→</span></button>').join("")+'</div>':'<p class="empty-deals">Tu próximo gran fichaje empieza con una llamada. Busca un jugador y pulsa <b>Negociar</b>.</p>')+'</section>';
  }
  function buyerFor(player){
    const candidates=clubs.filter(c=>c.id!==state.club&&c.rating>=player.overall-14&&c.budget>=player.value*.85);
    return candidates[(player.id.length+state.round)%Math.max(1,candidates.length)]||clubs.find(c=>c.id!==state.club);
  }
  function start(id,mode="buy"){
    if(mode==="sell"&&state.playerCareer?.playerId===id)return notify("Tu futbolista está en carrera de jugador. Gestiona a los demás desde la plantilla.");
    const found=findPlayer(id);if(!found)return notify("No se encontró al jugador.");
    const source=clubs.find(c=>c.id===found.cid),buyer=mode==="sell"?buyerFor(found.p):null;
    const result=Deals.start(state,found.p,{mode,sourceId:found.cid,sourceName:mode==="sell"?buyer.name:source?.name||found.p.sourceClub||"Club de origen",buyer,buyerRating:myClub().rating});
    if(result.error)return notify(result.error);
    openDeal(result.deal.id);
  }
  function moneyInput(id,label,value,min=0){return '<label class="deal-field" for="'+id+'"><span>'+label+'</span><span class="currency-input"><i>€</i><input id="'+id+'" name="'+id+'" type="number" inputmode="numeric" min="'+min+'" max="2000000000" step="1" required value="'+Math.round(value)+'"></span></label>'}
  function selectInput(id,label,options,value){return '<label class="deal-field" for="'+id+'"><span>'+label+'</span><select id="'+id+'">'+options.map(x=>'<option value="'+safeText(x)+'" '+(x===value?'selected':'')+'>'+safeText(x)+'</option>').join("")+'</select></label>'}
  function steps(d){
    const list=d.mode==="renew"?["Contrato","Firma"]:d.mode==="sell"?["Oferta del club","Confirmación"]:["Consulta","Club vendedor","Contrato","Firma"];
    const index=d.mode==="renew"?(d.stage==="contract"?0:1):d.mode==="sell"?(d.stage==="club"?0:1):({enquiry:0,club:1,contract:2,ready:3,signed:3}[d.stage]??0);
    return '<ol class="deal-steps">'+list.map((name,i)=>'<li class="'+(i===index?'current':i<index?'complete':'')+'"><span>'+(i<index?'✓':i+1)+'</span>'+name+'</li>').join("")+'</ol>';
  }
  function callPanel(d){
    const agent=d.stage==="contract"||d.mode==="renew"||d.stage==="ready"&&d.mode==="buy",contact=agent?'Agente de '+shortName(d.player):d.mode==="sell"?d.buyer.name:d.sourceName;
    return '<section class="call-panel"><div class="call-top"><span class="live-dot"></span> SIMULACIÓN · EN LLAMADA <span>↗</span></div><div class="contact-portrait">'+(agent?face(d.player,true):'<span class="contact-monogram">'+safeText(contact.split(/\s+/).slice(0,2).map(x=>x[0]).join(""))+'</span>')+'</div><h3>'+safeText(contact)+'</h3><p>'+(agent?'Representante del jugador':'Dirección deportiva')+'</p><div class="call-wave" aria-hidden="true">'+Array.from({length:19},(_,i)=>'<i style="height:'+(9+((i*17)%31))+'px"></i>').join("")+'</div><div class="negotiation-tension"><div><span>TENSIÓN</span><b>'+(d.tension>=75?'Alta':d.tension>=45?'Moderada':'Baja')+' · '+d.tension+' %</b></div><progress class="'+(d.tension>=75?'high':'')+'" max="100" value="'+d.tension+'" aria-label="Tensión de la negociación: '+d.tension+' %"></progress><small>Una propuesta muy alejada puede romper las conversaciones.</small></div><div class="call-transcript" aria-live="polite">'+d.history.slice(-3).map(h=>'<div><span>'+safeText(h.speaker)+'</span><p>'+safeText(h.text)+'</p></div>').join("")+'</div></section>';
  }
  function costPreview(d,upfront,weekly){return '<div id="deal-cost-preview" class="deal-costs"><div><span>Coste al firmar</span><b>'+money(upfront)+'</b></div><div><span>Presupuesto restante</span><b class="'+(state.budget<upfront?'warning-text':'accent')+'">'+money(state.budget-upfront)+'</b></div>'+(weekly!==undefined?'<div><span>Margen salarial restante / sem.</span><b class="'+(state.wageBudget<weekly?'warning-text':'')+'">'+money(state.wageBudget-weekly)+'</b></div>':'')+'</div>'}
  function formPanel(d){
    let content='';
    if(d.stage==="enquiry")content='<span class="eyebrow">PRIMER CONTACTO</span><h3>¿Un nuevo capítulo?</h3><p>Consulta si el club y el jugador están dispuestos a negociar con '+safeText(myClub().name)+'.</p><dl class="offer-facts"><div><dt>Valor estimado</dt><dd>'+compact(d.player.value)+'</dd></div><div><dt>Sueldo actual / sem.</dt><dd>'+money(d.player.wage)+'</dd></div><div><dt>Proyecto deportivo</dt><dd>GRL de tu club '+myClub().rating+'</dd></div></dl><p class="save-info">La disponibilidad y los importes pertenecen a esta simulación.</p><button class="btn primary" data-deal-action="enquire">Enviar consulta ↗</button>';
    if(d.stage==="club"){
      const offer=d.lastOffer||{fee:Math.round(d.player.value*(d.mode==="sell"?1.2:.9)/100)*100,sellOn:0};
      content='<span class="eyebrow">'+(d.mode==="sell"?'NEGOCIAR VENTA':'ACUERDO ENTRE CLUBES')+'</span><h3>Todo empieza con una oferta.</h3><p>'+(d.mode==="sell"?'Fija tu precio de salida y escucha al club comprador.':'Ajusta el traspaso y, si quieres, añade un porcentaje de una futura venta.')+'</p><form id="deal-form"><div class="offer-fields">'+moneyInput("deal-fee",d.mode==="sell"?"Precio que pides":"Importe del traspaso",offer.fee,1)+
        (d.mode==="buy"?'<label class="deal-field" for="deal-sellon"><span>Porcentaje de futura venta</span><input id="deal-sellon" type="number" min="0" max="25" step="1" value="'+offer.sellOn+'"><small>Se descuenta si vendes al jugador después.</small></label>':'')+'</div>'+
        (d.counter?'<div class="counter-offer"><span>'+(d.turns?'CONTRAOFERTA':'PETICIÓN INICIAL')+'</span><strong>'+money(d.counter.fee)+'</strong><small>'+(d.counter.sellOn?d.counter.sellOn+' % de futura venta':'Sin porcentaje adicional')+'</small></div>':'')+
        (d.mode==="buy"?costPreview(d,offer.fee):'<p class="save-info">Ingresarás el precio acordado al confirmar la venta. Se descontarán las cláusulas previas de futura venta, si existen.</p>')+'<p class="deal-error" id="deal-error" role="alert"></p><div class="offer-buttons"><button class="btn primary" type="submit">Enviar oferta</button>'+(d.counter?'<button class="btn" type="button" data-deal-action="accept-club">Aceptar '+(d.turns?'contraoferta':'petición')+'</button>':'')+'</div></form>';
    }
    if(d.stage==="contract"){
      const terms=d.lastTerms||{...d.contract,wage:Math.round(d.contract.wage*.9),bonus:0,role:"Rotación"};
      const costs=Deals.contractCosts(state,d,terms);
      content='<span class="eyebrow">'+(d.mode==="renew"?'RENOVACIÓN':'CONDICIONES PERSONALES')+'</span><h3>Convence al jugador.</h3><p>El agente busca un rol de <b>'+d.contract.role+'</b> y '+money(d.contract.wage)+' por semana. La moral también depende de cumplir ese rol.</p><form id="deal-form"><div class="offer-fields">'+selectInput("deal-role","Rol en el equipo",Squad.roles,terms.role)+selectInput("deal-years","Duración (años)",["1","2","3","4","5"],String(terms.years))+moneyInput("deal-wage","Sueldo semanal",terms.wage,1)+moneyInput("deal-bonus","Prima de fichaje",terms.bonus)+moneyInput("deal-agent","Comisión del agente",terms.agent)+moneyInput("deal-clause","Cláusula de salida (0 = sin cláusula)",terms.releaseClause)+'</div>'+costPreview(d,costs.upfront,costs.weekly)+'<p class="deal-error" id="deal-error" role="alert"></p><div class="offer-buttons"><button class="btn primary" type="submit">Proponer contrato</button><button class="btn" type="button" data-deal-action="accept-contract">Aceptar condiciones del agente</button></div></form>';
    }
    if(d.stage==="ready"){
      const costs=d.mode==="sell"?null:Deals.contractCosts(state,d,d.terms);
      content='<span class="eyebrow">ACUERDO ALCANZADO</span><h3>Tu firma cambia la historia.</h3><dl class="offer-facts"><div><dt>Jugador</dt><dd>'+safeText(d.player.name)+'</dd></div><div><dt>Importe del traspaso</dt><dd>'+money(d.fee)+'</dd></div>'+(d.terms?'<div><dt>Contrato</dt><dd>'+d.terms.years+' años · '+d.terms.role+'</dd></div><div><dt>Sueldo semanal</dt><dd>'+money(d.terms.wage)+'</dd></div><div><dt>Prima y comisión</dt><dd>'+money(d.terms.bonus+d.terms.agent)+'</dd></div><div><dt>Futura venta al club de origen</dt><dd>'+d.sellOn+' %</dd></div>':'')+'</dl>'+(costs?costPreview(d,costs.upfront,costs.weekly):'<div class="counter-offer"><span>INGRESO NETO PREVISTO</span><strong>'+money(d.fee-Math.round(d.fee*(d.player.sellOnClause?.percentage||0)/100))+'</strong></div>')+'<p class="deal-error" id="deal-error" role="alert"></p><button class="btn primary" data-deal-action="sign">'+(d.mode==="sell"?'Confirmar venta':d.mode==="renew"?'Firmar renovación':'Confirmar fichaje')+' →</button>';
    }
    return '<section class="offer-panel">'+content+'</section>';
  }
  function reveal(d){
    const success=["signed","sold","renewed"].includes(d.stage);
    return '<div class="deal-reveal '+(success?'success':'')+'"><span class="eyebrow">'+(success?'OPERACIÓN COMPLETADA':'LLAMADA FINALIZADA')+'</span><div class="reveal-face">'+face(d.player,true)+'</div><h2>'+(d.stage==="signed"?'BIENVENIDO A '+safeText(myClub().name):d.stage==="renewed"?'LA HISTORIA CONTINÚA':status[d.stage].toUpperCase())+'</h2><h3>'+safeText(d.player.name)+'</h3><p>'+safeText(d.history[d.history.length-1].text)+'</p>'+(success?'<div class="reveal-summary"><span>'+d.player.pos+' · GRL '+d.player.overall+'</span><span>'+(d.mode==="sell"?'Ingreso neto '+money(d.net):'Coste total '+money(d.paid))+'</span><span>Presupuesto '+money(state.budget)+'</span></div>':'<p class="save-info">No se ha descontado dinero del presupuesto.</p>')+'<button class="btn primary" data-deal-action="squad">'+(success&&d.mode!=="sell"?'Ver en mi plantilla':'Volver al mercado')+' →</button></div>';
  }
  function openDeal(id){
    const d=state.negotiations?.find(x=>x.id===id);if(!d)return;
    activeDealId=id;
    const body='<div class="deal-screen"><div class="deal-title"><div>'+face(d.player)+'<div><span class="eyebrow">'+(d.mode==="buy"?'FICHAJE':d.mode==="sell"?'VENTA':'RENOVACIÓN')+'</span><h3>'+safeText(d.player.name)+'</h3><p>'+safeText(d.player.pos)+' · '+d.player.age+' años · GRL '+d.player.overall+'</p></div></div><span class="pill">'+status[d.stage]+'</span></div>'+steps(d)+(d.rival&&!Deals.terminal.has(d.stage)?'<div class="rival-alert">⚡ '+safeText(d.rival.name)+' también está negociando. El agente ha mejorado sus exigencias.</div>':'')+(Deals.terminal.has(d.stage)?reveal(d):'<div class="negotiation-workspace">'+callPanel(d)+formPanel(d)+'</div><div class="deal-footer"><span>El dinero se mueve únicamente al confirmar la firma.</span><div class="row"><button class="btn small" data-deal-action="pause">Pausar y cerrar</button><button class="btn small subtle" data-deal-action="withdraw">Retirarse de la negociación</button></div></div>')+'</div>';
    openModal("CENTRAL DE NEGOCIACIÓN",body);
  }
  function dealAction(action){
    const deal=state.negotiations?.find(d=>d.id===activeDealId);if(!deal)return;
    let result;
    if(action==="pause"){closeModal();render();return}
    if(action==="enquire")result=Deals.enquire(state,deal);
    if(action==="accept-club")result=Deals.offerClub(state,deal,{...deal.counter});
    if(action==="accept-contract")result=Deals.offerContract(state,deal,{...deal.contractCounter||deal.contract});
    if(action==="withdraw")Deals.withdraw(state,deal);
    if(action==="sign"){
      result=Deals.complete(state,deal);
      if(result.ok){
        state.news.unshift((deal.mode==="buy"?'Nuevo fichaje: ':deal.mode==="sell"?'Venta confirmada: ':'Contrato renovado: ')+deal.player.name);
        state.news=state.news.slice(0,20);save();
      }
    }
    if(action==="squad"){
      closeModal();screen=["signed","renewed"].includes(deal.stage)?"squad":"market";selectedPlayer=deal.playerId;squadTab="lineup";render();return;
    }
    if(result?.error){const el=$("deal-error");if(el)el.textContent=result.error;else notify(result.error);return}
    render();openDeal(deal.id);
  }
  function termsFromForm(){return {wage:Number($("deal-wage").value),years:Number($("deal-years").value),role:$("deal-role").value,bonus:Number($("deal-bonus").value),agent:Number($("deal-agent").value),releaseClause:Number($("deal-clause").value)}}
  function submit(e){
    if(e.target.id!=="deal-form"||!state)return;
    e.preventDefault();const d=state.negotiations.find(d=>d.id===activeDealId);if(!d)return;
    const result=d.stage==="club"?Deals.offerClub(state,d,{fee:Number($("deal-fee").value),sellOn:d.mode==="buy"?Number($("deal-sellon").value):0}):Deals.offerContract(state,d,termsFromForm());
    if(result.error){$("deal-error").textContent=result.error;return}
    render();openDeal(d.id);
  }
  function handleClick(t){
    const data=t.dataset;
    if(data.squadPlayer){
      if(swapFrom&&swapFrom!==data.squadPlayer){if(Squad.swap(state,swapFrom,data.squadPlayer))notify("Cambio realizado en tu alineación.");else notify("Selecciona al menos un titular para intercambiar.");swapFrom=null;}
      selectedPlayer=data.squadPlayer;render();return true;
    }
    if(data.squadTab){squadTab=data.squadTab;swapFrom=null;render();return true}
    if(data.squadAction){
      const p=current();
      if(data.squadAction==="swap")swapFrom=swapFrom?null:p.id;
      if(data.squadAction==="captain"){state.squad.captain=p.id;notify(p.name+" es el nuevo capitán.")}
      if(data.squadAction==="auto"){Squad.autoPick(state);swapFrom=null;notify("Once elegido según posición, media y estado.")}
      render();return true;
    }
    if(data.renew){start(data.renew,"renew");return true}
    if(data.openDeal){openDeal(data.openDeal);return true}
    if(data.dealAction){dealAction(data.dealAction);return true}
    return false;
  }
  function input(e){
    if(e.target.id==="squad-search"){
      squadSearch=e.target.value.slice(0,80);$("squad-list").innerHTML=rosterList();return;
    }
    if(!e.target.id.startsWith("deal-"))return;
    const d=state?.negotiations?.find(d=>d.id===activeDealId),preview=$("deal-cost-preview");if(!d||!preview)return;
    if(d.stage==="contract"){const c=Deals.contractCosts(state,d,termsFromForm());preview.outerHTML=costPreview(d,c.upfront,c.weekly)}
    if(d.stage==="club"&&d.mode==="buy")preview.outerHTML=costPreview(d,Number($("deal-fee").value));
  }
  function change(e){
    if(e.target.id==="squad-formation"){Squad.setFormation(state,e.target.value);swapFrom=null;render();notify("Formación actualizada: "+state.squad.formation)}
    if(e.target.id==="squad-filter"){positionFilter=e.target.value;$("squad-list").innerHTML=rosterList()}
    if(e.target.id.startsWith("deal-"))input(e);
  }
  function dragStart(e){const el=e.target.closest?.("[data-squad-player]");if(el){dragged=el.dataset.squadPlayer;e.dataTransfer?.setData("text/plain",dragged)}}
  function dragOver(e){if(dragged&&e.target.closest?.("[data-squad-player]"))e.preventDefault()}
  function drop(e){const el=e.target.closest?.("[data-squad-player]");if(!el||!dragged)return;e.preventDefault();if(Squad.swap(state,dragged,el.dataset.squadPlayer)){selectedPlayer=el.dataset.squadPlayer;notify("Alineación actualizada.");render()}dragged=null;swapFrom=null}
  function reset(){selectedPlayer=null;squadTab="lineup";squadSearch="";positionFilter="all";swapFrom=null;activeDealId=null;dragged=null}
  return {renderSquad,transferHub,start,openDeal,handleClick,input,change,submit,dragStart,dragOver,drop,reset};
})();

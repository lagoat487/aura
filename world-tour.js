/* World Tour 4.0. Original AURA rules; no official ratings or market quotations. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraTour=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  function hash(s){let n=17;for(const c of String(s))n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;return n;}
  const KITU_SOURCE="https://www.barcelonasc.com.ec/2026/08/26/damian-diaz-barcelona-sc-2027/";
  const kitu={id:"verified:kitu-diaz",name:"Damián ‘Kitu’ Díaz",aliases:["Kitu Díaz","Damián Díaz"],pos:"MCO",age:40,overall:73,potential:73,value:200000,wage:4500,club:"guayaquil",nationality:"Ecuador",real:true,estimated:true,form:80,contractEnd:2027,sourceClub:"Barcelona SC",membershipSource:KITU_SOURCE,membershipVerifiedAt:"2026-10-28",rosterSnapshot:"2026-10-28"};
  const verifiedSquads={
    madrid:{source:"https://www.realmadrid.com/en-US/football/first-team/players",names:["Thibaut Courtois","Andriy Lunin","Asencio","Éder Militão","Dean Huijsen","Trent Alexander-Arnold","Ibrahima Konaté","Cucurella","Álvaro Carreras","Antonio Rüdiger","Ferland Mendy","Denzel Dumfries","Jude Bellingham","Eduardo Camavinga","Federico Valverde","Aurélien Tchouaméni","Arda Güler","Bernardo Silva","Thiago Pitarch","Brahim","Vini Jr.","Endrick","Kylian Mbappé","Rodrygo","Carlos Espí","Yan Diomande"]},
    liverpool:{source:"https://www.liverpoolfc.com/teams/mens-team?position=all",names:["Alexander Isak","Federico Chiesa","Cody Gakpo","Hugo Ekitiké","Víctor Muñoz","Bradley Barcola","Lewis Koumas","Rio Ngumoha","Jayden Danns","Wataru Endo","Florian Wirtz","Dominik Szoboszlai","Alexis Mac Allister","Ryan Gravenberch","Trey Nyoni","James McConnell","Joe Gomez","Virgil van Dijk","Jérémy Jacquet","Milos Kerkez","Conor Bradley","Giovanni Leoni","Kostas Tsimikas","Jeremie Frimpong","Ronald Araújo","Luke Chambers","Alisson","Giorgi Mamardashvili","Freddie Woodman","Vítězslav Jaroš","Harvey Davies"]}
  };
  function value(player){
    const age=Number(player.age)||24,ov=clamp(Number(player.overall)||60,35,99),pot=Number(player.potential)||ov;
    const ageFactor=age<22?1.3:age<26?1.12:age<30?1:age<33?.7:age<36?.38:age<39?.15:.035;
    const prospect=age<24?1+Math.max(0,pot-ov)*.025:1;
    const performance=clamp(.85+(Number(player.form)||80)/500,.9,1.08);
    return Math.round(clamp(5000000*Math.exp((ov-70)/6.5)*ageFactor*prospect*performance,50000,250000000)/10000)*10000;
  }
  function price(player){return {...player,value:player.id===kitu.id?kitu.value:value(player),valueEstimated:true,valueModel:"AURA 4.0 · edad, GRL, potencial y forma"};}
  function poisson(lambda,rng){const limit=Math.exp(-lambda);let n=0,p=1;do{n++;p*=Math.max(.000001,rng());}while(p>limit&&n<15);return n-1;}
  function simulate(home,away,rng=Math.random){
    // A log strength ratio preserves upsets, with stronger sides winning more often.
    const difference=clamp(Number(home)-Number(away),-40,40),ratio=Math.exp(difference*.045);
    const total=clamp(2.65+Math.abs(difference)*.012,2.65,3.1),homeShare=ratio*1.14/(1+ratio*1.14);
    let h=poisson(total*homeShare,rng),a=poisson(total*(1-homeShare),rng);
    // Shared low-scoring outcomes provide a modest draw correction.
    if(h+a<=2&&h!==a&&rng()<.12){if(h>a)h--;else a--;}
    return {home:h,away:a};
  }
  function initialize(game){
    if(!game.tour)game.tour={season:game.season,processed:[],stats:{},weekly:[],monthly:[],annual:[],events:[],regens:[],cups:[],youth:null};
    return game.tour;
  }
  function weighted(players,rng){
    const weight=p=>p.pos==="POR"?.03:["DC","SD","EI","ED"].includes(p.pos)?4:["MCO","MC","MI","MD"].includes(p.pos)?1.5:.35;
    let n=rng()*players.reduce((s,p)=>s+weight(p),0);return players.find(p=>(n-=weight(p))<=0)||players[0];
  }
  function selectXI(records){
    const slots=["POR","DEF","DEF","DEF","DEF","MED","MED","MED","DEL","DEL","DEL"],left=records.slice(),xi=[];
    const group=p=>p.pos==="POR"?"POR":["DFC","LD","LI"].includes(p.pos)?"DEF":["MC","MCD","MCO","MI","MD"].includes(p.pos)?"MED":"DEL";
    for(const slot of slots){left.sort((a,b)=>(b.rating-(group(b)===slot?0:3))-(a.rating-(group(a)===slot?0:3))||a.id.localeCompare(b.id));if(left.length)xi.push(left.shift());}
    return xi;
  }
  function afterRound(game,squadAPI){
    const t=initialize(game),stamp=game.season+":"+game.round;
    if(t.processed.includes(stamp)||game.round<1)return null;
    t.processed.push(stamp);
    const rng=random(hash(game.club+stamp)),fixtures=game.competition?.fixtures[game.round-1]||[],week=[];
    for(const f of fixtures){if(!f.score)continue;
      for(const [cid,gf,ga] of [[f.home,f.score.home,f.score.away],[f.away,f.score.away,f.score.home]]){
        const roster=game.rosters[cid]||[],ids=cid===game.club?game.history?.[0]?.match?.participants?.[0]:null;
        const xi=ids?roster.filter(p=>ids.includes(p.id)):cid===game.club&&squadAPI?squadAPI.players(game):squadAPI?squadAPI.choose(roster,"4-3-3").map(id=>roster.find(p=>p.id===id)).filter(Boolean):roster.slice(0,11);
        if(!xi.length)continue;
        const goals={};
        const recorded=cid===game.club?game.history?.[0]?.scorers:null;
        for(let i=0;i<gf;i++){const p=recorded?.[i]?xi.find(p=>norm(p.name)===norm(recorded[i]))||weighted(xi,rng):weighted(xi,rng);goals[p.id]=(goals[p.id]||0)+1;}
        for(const p of xi){
          const clean=ga===0&&["POR","DFC","LD","LI"].includes(p.pos),rating=Math.round(clamp(6.1+(gf>ga?.65:gf===ga?.1:-.35)+(goals[p.id]||0)*1.05+(clean?.7:0)+(rng()-.5)*.7,3,10)*10)/10;
          const row={id:p.id,name:p.name,pos:p.pos,club:cid,overall:p.overall,photo:p.photo,goals:goals[p.id]||0,rating,round:game.round};week.push(row);
          const s=t.stats[p.id]||(t.stats[p.id]={id:p.id,name:p.name,pos:p.pos,club:cid,appearances:0,goals:0,points:0,monthPoints:0,monthApps:0});
          s.appearances++;s.goals+=row.goals;s.points+=rating;s.monthPoints+=rating;s.monthApps++;
          if(game.playerCareer?.playerId===p.id){const pc=game.playerCareer;pc.appearances++;pc.goals+=row.goals;pc.lastRating=rating;pc.xp+=Math.round(20+Math.max(0,rating-6)*20);if(pc.xp>=100&&p.overall<p.potential){pc.xp-=100;p.overall++;}else if(p.overall>=p.potential)pc.xp=Math.min(pc.xp,99);}
        }
      }
    }
    if(week.length)t.weekly.unshift({season:game.season,round:game.round,players:selectXI(week)});
    t.weekly=t.weekly.slice(0,8);
    if(game.round%4===0){
      const candidates=Object.values(t.stats).filter(p=>p.monthApps>=2).sort((a,b)=>(b.monthPoints/b.monthApps)-(a.monthPoints/a.monthApps)||b.goals-a.goals);
      if(candidates.length)t.monthly.unshift({...candidates[0],season:game.season,period:game.round/4,rating:Math.round(candidates[0].monthPoints/candidates[0].monthApps*10)/10});
      for(const p of Object.values(t.stats)){p.monthPoints=0;p.monthApps=0;}
      for(const roster of Object.values(game.rosters))for(const p of roster){p.value=price(p).value;p.valueEstimated=true;}
    }
    if(game.round===(game.competition?.fixtures.length||38)&&!t.annual.some(a=>a.season===game.season)){
      const shortlist=Object.values(t.stats).sort((a,b)=>b.points-a.points||b.goals-a.goals).slice(0,10);
      if(shortlist.length)t.annual.unshift({season:game.season,winner:shortlist[0],shortlist});
    }
    // Events change gameplay values and are processed once per league round.
    if(rng()<.32){
      const roster=game.rosters[game.club]||[],p=roster[Math.floor(rng()*roster.length)],kind=Math.floor(rng()*4);let text="";
      if(p&&kind===0){p.fitness=Math.max(50,(p.fitness??95)-18);text=p.name+" termina con molestias: −18 energía. Usa recuperación o rota el once.";}
      if(p&&kind===1){p.morale=clamp((p.morale??75)+10,20,100);text=p.name+" recibe el apoyo de la afición: +10 moral.";}
      if(kind===2){game.budget+=100000;text="Un patrocinador local aporta €100.000 al presupuesto del club.";}
      if(p&&kind===3){p.trainingXP=(p.trainingXP||0)+15;text=p.name+" brilla en una sesión sorpresa: +15 EXP de entrenamiento.";}
      if(text){t.events.unshift({id:stamp,round:game.round,season:game.season,text});t.events=t.events.slice(0,16);game.news.unshift(text);}
    }
    return {week:t.weekly[0],monthly:t.monthly[0],annual:t.annual[0]};
  }
  function rollover(game){
    const t=initialize(game),stamp="rollover:"+game.season;if(t.processed.includes(stamp))return [];
    t.processed.push(stamp);const retired=[],rng=random(hash(stamp+game.club));
    for(const [cid,roster] of Object.entries(game.rosters))for(let i=0;i<roster.length;i++){
      const p=roster[i];p.age++;
      if(p.age>=(p.pos==="POR"?41:38)&&(p.age>=42||rng()<.45)){
        const regen=price({id:"regen:"+game.season+":"+p.id,name:"Canterano "+["Mora","Reyes","Vega","Ríos","Costa"][Math.floor(rng()*5)]+" "+(i+1),pos:p.pos,age:17,overall:60+Math.floor(rng()*9),potential:clamp(Math.max(p.potential||p.overall,p.overall),75,94),nationality:p.nationality,club:cid,real:false,academy:true,regenOf:p.name,form:75,fitness:95,morale:75,wage:1500,contractEnd:game.season+4});
        roster[i]=regen;retired.push({season:game.season,retired:p.name,player:{...regen}});
        if(!game.retiredPlayers)game.retiredPlayers={};game.retiredPlayers[p.id]={...p,retired:true};
        if(game.playerCareer?.playerId===p.id){game.playerCareer.playerId=regen.id;game.playerCareer.xp=0;}
      }else {if(p.age>32)p.overall=Math.max(45,p.overall-1);p.value=price(p).value;}
    }
    t.regens.push(...retired);t.stats={};t.season=game.season+1;return retired;
  }
  const cupTypes=[
    {id:"champions",name:"Champions League",region:"europe",size:16},
    {id:"europa",name:"Europa League",region:"europe",size:16},
    {id:"conference",name:"Conference League",region:"europe",size:16},
    {id:"libertadores",name:"Copa Libertadores",region:"south",size:16},
    {id:"sudamericana",name:"Copa Sudamericana",region:"south",size:16},
    {id:"world",name:"Mundial",region:"world",national:true,size:16},
    {id:"euro",name:"Eurocopa",region:"europe",national:true,size:16},
    {id:"america",name:"Copa América",region:"americas",national:true,size:16},
    {id:"youth",name:"Copa de Canteranos Sub-21",region:"youth",size:8,youth:true}
  ];
  function createCup(type,entrants,user,seed=Date.now()){
    const def=cupTypes.find(c=>c.id===type);if(!def)throw Error("Copa desconocida.");
    if(entrants.length!==def.size||new Set(entrants.map(t=>t.id)).size!==def.size)throw Error("Participantes insuficientes o repetidos.");
    if(!entrants.some(t=>t.id===user))throw Error("El equipo elegido no participa.");
    const shuffled=entrants.map(t=>({...t})),rng=random(seed);
    for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    return {id:type,name:def.name,user,seed,entrants:shuffled,rounds:[],current:shuffled.map(t=>t.id),champion:null};
  }
  function cupFixture(cup){if(cup.champion)return null;const i=cup.current.indexOf(cup.user);return i<0?null:{home:cup.current[i-i%2],away:cup.current[i-i%2+1]};}
  function advanceCup(cup,provided=null){
    if(cup.champion)return false;
    if(provided&&(!Number.isInteger(provided.home)||!Number.isInteger(provided.away)||provided.home<0||provided.away<0))throw Error("Resultado inválido.");
    const rng=random(cup.seed+cup.rounds.length*7919),winner=[],matches=[];
    for(let i=0;i<cup.current.length;i+=2){const h=cup.current[i],a=cup.current[i+1],home=cup.entrants.find(t=>t.id===h),away=cup.entrants.find(t=>t.id===a);
      const score=provided&&(h===cup.user||a===cup.user)?{...provided}:simulate(home.rating,away.rating,rng);
      const penalties=score.home===score.away?(rng()<.5?{home:5,away:4}:{home:4,away:5}):null;
      const win=(penalties?penalties.home>penalties.away:score.home>score.away)?h:a;
      winner.push(win);matches.push({home:h,away:a,score,penalties,winner:win});
    }
    cup.rounds.push(matches);cup.current=winner;if(winner.length===1)cup.champion=winner[0];return matches;
  }
  function youthRoster(club,source,season=2026){
    const young=source.filter(p=>p.age<=21).map(p=>({...p})).slice(0,18),positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","DC","MC","DFC","EI","ED","LD"];
    const rng=random(hash(club.id+season));
    // Generated academy players explicitly fill uncovered positions.
    if(!young.some(p=>p.pos==="POR"))young.unshift({id:"youth:"+club.id+":gk",name:"Canterano Portero",pos:"POR",age:18,overall:58+Math.floor(rng()*9),academy:true,real:false});
    while(young.length<18){const i=young.length;young.push({id:"youth:"+club.id+":"+i,name:"Canterano "+(i+1),pos:positions[i],age:17+Math.floor(rng()*4),overall:55+Math.floor(rng()*14),academy:true,real:false});}
    return young;
  }
  function startPlayer(game,id,customName="",pos="DC"){
    const roster=game.rosters[game.club];let player=roster.find(p=>p.id===id);
    if(id==="new"){
      if(roster.length>=28)throw Error("Plantilla llena: elige un futbolista existente o libera una plaza.");
      if(!["DC","EI","ED","MCO","MC","MCD","DFC","LI","LD"].includes(pos))throw Error("Posición no válida.");
      player=price({id:"pro:"+game.club,name:String(customName||"Mi jugador").trim().slice(0,32)||"Mi jugador",pos,age:18,overall:68,potential:92,club:game.club,real:false,academy:true,form:80,fitness:95,morale:75,wage:2000});roster.push(player);
    }
    if(!player||player.pos==="POR")throw Error("Elige un jugador de campo.");
    game.playerCareer={playerId:player.id,xp:0,appearances:0,goals:0,lastRating:null};return player;
  }
  function ultimate(pool,choose){
    const eligible=pool.filter(p=>p.overall>=62&&p.overall<=79),xi=choose(eligible,"4-3-3"),owned=xi.map(id=>({...eligible.find(p=>p.id===id)}));
    if(owned.length!==11||owned.some(p=>!p.id))throw Error("Catálogo insuficiente para crear un once.");
    return {coins:10000,owned,xi:xi.slice(),played:0,wins:0,draws:0,losses:0,claimed:[],lastPack:[]};
  }
  function openPack(ut,pool,rng=Math.random){
    if(ut.coins<2500)return {error:"Necesitas 2.500 monedas de juego."};
    const candidates=pool.filter(p=>p.overall>=72&&p.overall<=92);if(candidates.length<3)return {error:"Catálogo insuficiente."};
    ut.coins-=2500;const cards=[],used=new Set();
    for(let i=0;i<3;i++){const tier=rng()<.12?84:72,options=candidates.filter(p=>!used.has(p.id)&&p.overall>=tier);const available=options.length?options:candidates.filter(p=>!used.has(p.id));const p=available[Math.floor(rng()*available.length)];used.add(p.id);const duplicate=ut.owned.some(c=>c.id===p.id);if(duplicate)ut.coins+=200;else ut.owned.push({...p});cards.push({...p,duplicate});}
    ut.lastPack=cards;return {ok:true,cards};
  }
  function rewardUltimate(ut,token,result){
    if(ut.claimed.includes(token))return false;
    if(!result||!Number.isInteger(result.home)||!Number.isInteger(result.away)||result.home<0||result.away<0)return false;
    ut.claimed.push(token);ut.played++;const outcome=result.home>result.away?"wins":result.home===result.away?"draws":"losses";ut[outcome]++;const reward=outcome==="wins"?1200:outcome==="draws"?600:350;ut.coins+=reward;return reward;
  }
  return {kitu,KITU_SOURCE,verifiedSquads,price,value,simulate,random,hash,initialize,afterRound,rollover,selectXI,cupTypes,createCup,cupFixture,advanceCup,youthRoster,startPlayer,ultimate,openPack,rewardUltimate};
});

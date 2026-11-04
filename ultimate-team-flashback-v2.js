/* AURA UT club economy and progression. All coins/items are session-only game data. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./squad"):root.AuraSquad);if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraUT=api;})(typeof globalThis!=="undefined"?globalThis:this,function(Squad){
  "use strict";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const packs={silver:{name:"Sobre de plata",cost:750,count:3,min:65,max:74},gold:{name:"Sobre de oro",cost:2500,count:3,min:75,max:92},premium:{name:"Oro premium 82+",cost:7500,count:3,min:75,max:92,guaranteed:82}};
  const challenges={silver:{name:"De plata a oro",count:3,min:65,max:74,score:900,reward:"gold"},gold:{name:"Mejora 82+",count:3,min:75,max:83,score:1900,reward:"premium"},elite:{name:"Desafío élite 82+",count:4,min:82,max:90,score:4400,reward:"premium"}};

  // AURA 4.2: limited-edition fantasy boosts. These cards exist only in Ultimate Team.
  const sigma=Object.freeze({id:"ultimate-sigma",name:"ULTIMATE SIGMA",version:"4.2",cards:Object.freeze([
    {id:"sigma:rashford",name:"Marcus Rashford",overall:88,pos:"EI",price:450000,nationality:"Inglaterra",sourceClub:"FC Barcelona"},
    {id:"sigma:espart",name:"Xavi Espart",overall:87,pos:"LD",price:150000,nationality:"España",sourceClub:"FC Barcelona"},
    {id:"sigma:yamal",name:"Lamine Yamal",overall:91,pos:"ED",price:900000,nationality:"España",sourceClub:"FC Barcelona"},
    {id:"sigma:mbappe",name:"Kylian Mbappé",overall:92,pos:"DC",price:1200000,nationality:"Francia",sourceClub:"Real Madrid"},
    {id:"sigma:haaland",name:"Erling Haaland",overall:91,pos:"DC",price:1000000,nationality:"Noruega",sourceClub:"Manchester City"},
    {id:"sigma:bellingham",name:"Jude Bellingham",overall:90,pos:"MCO",price:760000,nationality:"Inglaterra",sourceClub:"Real Madrid"},
    {id:"sigma:pedri",name:"Pedri",overall:90,pos:"MC",price:650000,nationality:"España",sourceClub:"FC Barcelona"},
    {id:"sigma:vinicius",name:"Vinícius Júnior",overall:90,pos:"EI",price:840000,nationality:"Brasil",sourceClub:"Real Madrid"},
    {id:"sigma:raphinha",name:"Raphinha",overall:89,pos:"ED",price:540000,nationality:"Brasil",sourceClub:"FC Barcelona"},
    {id:"sigma:salah",name:"Mohamed Salah",overall:89,pos:"ED",price:580000,nationality:"Egipto",sourceClub:"Liverpool"}
  ])});
  // AURA fantasy event: player selection and ratings are not official league rosters.
  const argentina=Object.freeze({id:"liga-argentina",name:"LIGA ARGENTINA",reward:35000,cards:Object.freeze([
    {id:"argentina:enner-valencia",name:"Enner Valencia",overall:89,pos:"DC",price:420000,nationality:"Ecuador"},
    {id:"argentina:angel-di-maria",name:"Ángel Di María",overall:88,pos:"ED",price:390000,nationality:"Argentina"},
    {id:"argentina:nicolas-otamendi",name:"Nicolás Otamendi",overall:87,pos:"DFC",price:330000,nationality:"Argentina"},
    {id:"argentina:leandro-paredes",name:"Leandro Paredes",overall:90,pos:"MCD",price:500000,nationality:"Argentina"},
    {id:"argentina:paulo-dybala",name:"Paulo Dybala",overall:87,pos:"MCO",price:470000,nationality:"Argentina"},
    {id:"argentina:marcos-acuna",name:"Marcos Acuña",overall:87,pos:"LI",price:340000,nationality:"Argentina"},
    {id:"argentina:thiago-almada",name:"Thiago Almada",overall:87,pos:"MCO",price:315000,nationality:"Argentina"},
    {id:"argentina:exequiel-palacios",name:"Exequiel Palacios",overall:87,pos:"MC",price:325000,nationality:"Argentina"}
  ])});
  // FLASHBACK: fantasy Ultimate Team edition; fixed virtual coin prices, no real-money currency.
  const flashback=Object.freeze({id:"flashback",name:"FLASHBACK",welcome:200000,reward:70000,cards:Object.freeze([
    {id:"flashback:kitu-diaz",name:"Kitu Díaz",overall:89,pos:"MCO",price:750000,nationality:"Ecuador",sourceClub:"Barcelona SC",aliases:["Damián Díaz","Kitu Díaz"]},
    {id:"flashback:jamie-vardy",name:"Jamie Vardy",overall:88,pos:"DC",price:500000,nationality:"Inglaterra",sourceClub:"Leicester City"},
    {id:"flashback:ngolo-kante",name:"N'Golo Kanté",overall:88,pos:"MCD",price:450000,nationality:"Francia",sourceClub:"Chelsea",aliases:["N'Golo Kanté","N'Golo Kante","N'Golo Kante"]},
    {id:"flashback:neymar-junior",name:"Neymar Júnior",overall:91,pos:"EI",price:800000,nationality:"Brasil",sourceClub:"FC Barcelona",aliases:["Neymar","Neymar Jr","Neymar Júnior"]},
    {id:"flashback:keylor-navas",name:"Keylor Navas",overall:87,pos:"POR",price:200000,nationality:"Costa Rica",sourceClub:"Real Madrid"}
  ])});
  // MURALLA: defensive collector editions with fixed virtual coin prices.
  const muralla=Object.freeze({id:"muralla",name:"MURALLA",welcome:300000,cards:Object.freeze([
    {id:"muralla:saliba",name:"William Saliba",overall:90,pos:"DFC",price:550000,nationality:"Francia",playerId:"243715",aliases:["William Alain André Gabriel Saliba"]},
    {id:"muralla:cubarsi",name:"Pau Cubarsí",overall:89,pos:"DFC",price:450000,nationality:"España",playerId:"278046"},
    {id:"muralla:pacho",name:"Willian Pacho",overall:90,pos:"DFC",price:500000,nationality:"Ecuador",playerId:"256196",aliases:["Willian Joel Pacho Tenorio"]},
    {id:"muralla:nuno-mendes",name:"Nuno Mendes",overall:90,pos:"LI",price:550000,nationality:"Portugal",playerId:"252145",aliases:["Nuno Alexandre Tavares Mendes"]},
    {id:"muralla:hincapie",name:"Piero Hincapié",overall:87,pos:"DFC",price:350000,nationality:"Ecuador",playerId:"256197",aliases:["Piero Martin Hincapié Reyna"]},
    {id:"muralla:hakimi",name:"Achraf Hakimi",overall:90,pos:"LD",price:600000,nationality:"Marruecos",playerId:"235212"},
    {id:"muralla:gerard-martin",name:"Gerard Martín",overall:85,pos:"LI",price:300000,nationality:"España",playerId:"74462"},
    {id:"muralla:rudiger",name:"Antonio Rüdiger",overall:87,pos:"DFC",price:400000,nationality:"Alemania",playerId:"205452"},
    {id:"muralla:van-dijk",name:"Virgil van Dijk",overall:91,pos:"DFC",price:600000,nationality:"Países Bajos",playerId:"203376"}
  ])});
  const normalizeName=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  function murallaCards(pool){
    const available=Array.isArray(pool)?pool:[];
    return muralla.cards.map(def=>{
      const aliases=[def.name,...(def.aliases||[])].map(normalizeName);
      const base=available.find(p=>p.real&&p.id==="real:"+def.playerId)||
        available.find(p=>p.real&&aliases.includes(normalizeName(p.name)));
      const portrait=def.playerId.padStart(6,"0");
      return {...(base||{}),id:def.id,originalId:base?.originalId||base?.id||"real:"+def.playerId,
        name:def.name,overall:def.overall,pos:def.pos,real:true,event:muralla.id,eventPrice:def.price,
        nationality:def.nationality,sourceClub:base?.sourceClub||"Edición MURALLA",
        photo:base?.photo||"https://cdn.sofifa.net/players/"+portrait.slice(0,-3)+"/"+portrait.slice(-3)+"/26_120.png",
        tradeable:true,leagueId:base?.leagueId||"reference",leagueLabel:"Muralla · AURA 27"};
    });
  }
  function eventCards(pool){
    const available=Array.isArray(pool)?pool:[];
    return sigma.cards.map(def=>{
      const wanted=normalizeName(def.name);
      const base=available.find(p=>p.real&&(normalizeName(p.name)===wanted||normalizeName(p.name).startsWith(wanted+" ")||wanted.startsWith(normalizeName(p.name)+" ")));
      return {...(base||{}),id:def.id,originalId:base?.id||null,name:def.name,overall:def.overall,pos:def.pos,real:true,event:sigma.id,eventPrice:def.price,
        nationality:base?.nationality||def.nationality,sourceClub:def.sourceClub,tradeable:true,leagueId:base?.leagueId||"reference",leagueLabel:base?.leagueLabel||"Referencia mundial"};
    });
  }
  function argentinaCards(pool){
    const available=Array.isArray(pool)?pool:[];
    return argentina.cards.map(def=>{
      const wanted=normalizeName(def.name);
      const base=available.find(p=>p.real&&
        (normalizeName(p.name)===wanted||normalizeName(p.name).startsWith(wanted+" ")||wanted.startsWith(normalizeName(p.name)+" ")));
      return {...(base||{}),id:def.id,originalId:base?.id||null,name:def.name,
        overall:def.overall,pos:def.pos,real:true,event:argentina.id,eventPrice:def.price,
        nationality:base?.nationality||def.nationality,sourceClub:"Edición especial Liga Argentina",
        tradeable:true,leagueId:base?.leagueId||"reference",leagueLabel:base?.leagueLabel||"Evento AURA"};
    });
  }
  function flashbackCards(pool){
    const available=Array.isArray(pool)?pool:[];
    return flashback.cards.map(def=>{
      const aliases=(def.aliases||[def.name]).map(normalizeName);
      const base=available.find(p=>p.real&&aliases.some(alias=>{
        const name=normalizeName(p.name);
        return name===alias||name.startsWith(alias+" ")||alias.startsWith(name+" ");
      }));
      return {...(base||{}),id:def.id,originalId:base?.id||null,name:def.name,
        overall:def.overall,pos:def.pos,real:true,event:flashback.id,eventPrice:def.price,
        nationality:base?.nationality||def.nationality,sourceClub:def.sourceClub,tradeable:true,
        leagueId:base?.leagueId||"reference",leagueLabel:"Flashback · AURA 27"};
    });
  }
  function claimMurallaGift(u){
    if(!u||u.murallaGiftClaimed)return {error:"Ya reclamaste las 300.000 monedas de bienvenida Muralla."};
    if(!Number.isSafeInteger(u.coins)||u.coins<0||u.coins>1e12-muralla.welcome)
      return {error:"El saldo del club no permite entregar el bono."};
    u.coins+=muralla.welcome;u.murallaGiftClaimed=true;
    return {ok:true,coins:muralla.welcome};
  }
  function claimFlashbackGift(u){
    if(!u||u.flashbackGiftClaimed)return {error:"Ya reclamaste las 200.000 monedas de bienvenida Flashback."};
    if(!Number.isSafeInteger(u.coins)||u.coins<0||u.coins>1e12-flashback.welcome)
      return {error:"El saldo del club no permite entregar el bono."};
    u.coins+=flashback.welcome;u.flashbackGiftClaimed=true;
    return {ok:true,coins:flashback.welcome};
  }
  function claimSigmaGift(u){if(u.sigmaGiftClaimed)return {error:"Ya reclamaste el bono Ultimate Sigma."};u.coins+=150000;u.sigmaGiftClaimed=true;return {ok:true,coins:150000};}
  function league(p){if(p.leagueId==='reference')return '';return p.leagueId||p.league||String(p.catalogClub||p.club||"").replace(/-[^-]+$/,'');}
  function chemistry(u){
    const formation=Squad.formations[u.formation]||Squad.formations['4-3-3'],ps=u.xi.map(id=>u.owned.find(p=>p.id===id)),valid=ps.filter((p,i)=>p&&Squad.positionPenalty(p,formation[i][0])<=1),counts={club:new Map(),nation:new Map(),league:new Map()};
    for(const p of valid)for(const [kind,key] of [['club',p.catalogClub||p.club],['nation',p.nationality],['league',league(p)]])if(key)counts[kind].set(key,(counts[kind].get(key)||0)+1);
    const thresholds={club:[2,4,7],nation:[2,5,8],league:[3,5,8]};
    const players=ps.map((p,i)=>{if(!p||!valid.includes(p))return 0;return Math.min(3,[['club',p.catalogClub||p.club],['nation',p.nationality],['league',league(p)]].reduce((n,[kind,key])=>n+thresholds[kind].filter(t=>(counts[kind].get(key)||0)>=t).length,0));});
    return {players,total:players.reduce((a,b)=>a+b,0)};
  }
  function create(pool,preferredLeague="all",name="Mi AURA FC"){
    const eligible=pool.filter(p=>p.real&&p.overall>=62&&p.overall<=79),fav=eligible.filter(p=>preferredLeague!=="all"&&league(p)===preferredLeague),ranked=[...fav,...eligible.filter(p=>!fav.some(q=>q.id===p.id))];
    const unique=[...new Map(ranked.map(p=>[p.id,p])).values()],xi=Squad.choose(unique.map(p=>({...p,overall:p.overall+(league(p)===preferredLeague?12:0)})),'4-3-3');if(xi.some(id=>!id))throw Error("El catálogo todavía está cargando. Vuelve a intentarlo.");
    // Choose with a small starter preference; keep a full bench and SBC reserves.
    const first=xi.map(id=>({...unique.find(p=>p.id===id),tradeable:false})),others=unique.filter(p=>!xi.includes(p.id)).sort((a,b)=>Number(league(b)===preferredLeague)-Number(league(a)===preferredLeague)||b.overall-a.overall).slice(0,12).map(p=>({...p,tradeable:false}));
    return {version:2,name:String(name||"Mi AURA FC").trim().slice(0,24),coins:10000,owned:first.concat(others),duplicates:[],xi,formation:'4-3-3',tactic:'balanced',played:0,wins:0,draws:0,losses:0,claimed:[],lastPack:[],packsOpened:0,purchases:0,sbcs:0,objectives:[],battlePoints:0,battleCycle:0,battlesClaimed:[],division:10,divisionPoints:0,serial:0,murallaGiftClaimed:false,sigmaGiftClaimed:false,flashbackGiftClaimed:false,flashbackPlayed:0,flashbackWins:0,flashbackEarned:0};
  }
  function rating(u){return Math.round(u.xi.reduce((n,id)=>n+(u.owned.find(p=>p.id===id)?.overall||0),0)/11);}
  function addCards(u,cards){return cards.map(p=>{const copy={...p};if(u.owned.some(q=>q.id===p.id)){copy.duplicate=true;copy.uid="duplicate:"+(++u.serial);u.duplicates.push({...copy});}else u.owned.push(copy);return copy;});}
  function draw(u,pool,type,rng=Math.random,free=false){
    const def=packs[type];if(!def)return {error:"Este sobre no existe."};if(!free&&u.coins<def.cost)return {error:"No tienes monedas suficientes."};
    const candidates=pool.filter(p=>p.real&&p.overall>=def.min&&p.overall<=def.max),chosen=[],used=new Set();
    if(candidates.length<def.count)return {error:"No hay suficientes jugadores disponibles para este sobre."};
    for(let i=0;i<def.count;i++){
      const minimum=i===0&&def.guaranteed?def.guaranteed:def.min;
      // Weighted by rating: elite cards are rarer, no inflated advertised guarantee.
      const options=candidates.filter(p=>!used.has(p.id)&&p.overall>=minimum),weights=options.map(p=>Math.exp(-(p.overall-def.min)*.24)),sum=weights.reduce((a,b)=>a+b,0);if(!options.length)return {error:"No se puede cumplir la garantía del sobre."};
      let at=rng()*sum,index=0;while(index<options.length-1&&(at-=weights[index])>0)index++;const p=options[index];used.add(p.id);chosen.push({...p,tradeable:!free});
    }
    if(!free)u.coins-=def.cost;u.packsOpened++;u.lastPack=addCards(u,chosen).sort((a,b)=>b.overall-a.overall);return {ok:true,cards:u.lastPack};
  }
  function setPlayer(u,slot,id){
    if(!Number.isInteger(slot)||slot<0||slot>10||!u.owned.some(p=>p.id===id))return false;
    const candidate=u.owned.find(p=>p.id===id),identity=p=>p.originalId||p.id;
    if(u.xi.some((current,i)=>{const p=u.owned.find(p=>p.id===current);return i!==slot&&current!==id&&p&&identity(p)===identity(candidate);}))return false;
    const other=u.xi.indexOf(id),old=u.xi[slot];u.xi[slot]=id;if(other>=0)u.xi[other]=old;return true;
  }
  function setFormation(u,formation){if(!Squad.formations[formation])return false;const current=u.xi.map(id=>u.owned.find(p=>p.id===id));u.formation=formation;u.xi=Squad.choose(current,formation);return true;}
  function auto(u){const people=new Map();for(const p of u.owned){const key=p.originalId||p.id;if(!people.has(key)||people.get(key).overall<p.overall)people.set(key,p);}u.xi=Squad.choose([...people.values()],u.formation);return u.xi;}
  function bench(u){
    const calledUp=new Set(u.xi.map(id=>u.owned.find(p=>p.id===id)?.originalId||id));
    const reserves=u.owned.slice().sort((a,b)=>b.overall-a.overall).filter(p=>{const identity=p.originalId||p.id;if(calledUp.has(identity))return false;calledUp.add(identity);return true;});
    const selected=reserves.slice(0,9),keeper=reserves.find(p=>p.pos==='POR');
    // Keep a legal keeper substitution available even with nine stronger outfield reserves.
    if(keeper&&!selected.some(p=>p.pos==='POR'))selected[selected.length-1]=keeper;
    return selected;
  }
  function price(p){
    const wall=p?.event===muralla.id&&muralla.cards.find(x=>x.id===p.id&&x.overall===p.overall);
    if(wall)return wall.price;
    const fb=p?.event===flashback.id&&flashback.cards.find(x=>x.id===p.id&&x.overall===p.overall);
    if(fb)return fb.price;
    const special=p?.event===sigma.id&&sigma.cards.find(x=>x.id===p.id);if(special)return special.price;
    const arg=p?.event===argentina.id&&argentina.cards.find(x=>x.id===p.id&&x.overall===p.overall);
    if(arg)return arg.price;return Math.round((p.overall<65?300:p.overall<75?700+(p.overall-65)*80:p.overall<84?1200+Math.pow(p.overall-74,2)*160:18000*Math.pow(1.6,p.overall-84))/50)*50;}
  function marketPrice(u,p){
    const base=price(p);
    if(!u||p?.event===sigma.id||p?.event===argentina.id||p?.event===flashback.id||p?.event===muralla.id||!Number.isSafeInteger(u.played)||u.played<=0)return base;
    let hash=0;for(const ch of String(p.id))hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;
    // Offline market trend is predictable for a given matchday and card;
    // no networking or arbitrary real-money prices are involved.
    const cycle=(hash%7+u.played*3)%9-4;
    return Math.max(100,Math.round(base*(1+cycle*.025)/50)*50);
  }
  function evolutionCost(p){
    if(!p||!Number.isInteger(p.overall)||(p.event===sigma.id||p.event===argentina.id||p.event===flashback.id||p.event===muralla.id)||(p.evolutionLevel||0)>=2||p.overall>90)return null;
    return Math.max(1500,Math.round((p.overall-60)*400/50)*50);
  }
  function evolve(u,id){
    const p=u?.owned?.find(q=>q.id===id);
    if(!p)return {error:"Esta carta no pertenece a tu club."};
    const cost=evolutionCost(p);
    if(cost===null)return {error:"Esta carta no cumple los requisitos de evolución."};
    if(u.coins<cost)return {error:"No tienes monedas suficientes para evolucionar esta carta."};
    // Upgrade only the owned edition; preserve its identity, XI, collection and
    // original market catalogue. No new duplicate card is generated.
    p.overall=Math.min(92,p.overall+2);p.evolutionLevel=(p.evolutionLevel||0)+1;
    p.evolved=true;u.coins-=cost;u.evolutions=(u.evolutions||0)+1;
    return {ok:true,player:p,cost,overall:p.overall,level:p.evolutionLevel};
  }
  function buy(u,player){if(!player?.real||!player.id)return {error:"Jugador no disponible."};
    if((player.event===muralla.id||String(player.id).startsWith("muralla:"))&&
      (player.event!==muralla.id||!muralla.cards.some(p=>p.id===player.id&&p.name===player.name&&p.overall===player.overall&&p.pos===player.pos)))
      return {error:"Carta Muralla no disponible."};
    if(player.event===flashback.id&&!flashback.cards.some(p=>p.id===player.id&&p.name===player.name&&p.overall===player.overall&&p.pos===player.pos))
      return {error:"Carta Flashback no disponible."};if(player.event===sigma.id&&!sigma.cards.some(p=>p.id===player.id&&p.overall===player.overall))return {error:"Carta Ultimate Sigma no disponible."};
    if(player.event===argentina.id&&!argentina.cards.some(p=>p.id===player.id&&p.overall===player.overall&&p.price>=300000&&p.price<=500000))return {error:"Carta Liga Argentina no disponible."};if(u.owned.some(p=>p.id===player.id))return {error:"Este jugador ya está en tu club."};const cost=marketPrice(u,player);if(u.coins<cost)return {error:"No tienes monedas suficientes."};u.coins-=cost;u.owned.push({...player,tradeable:true});u.purchases++;return {ok:true,cost};}
  function quickSell(u,id,duplicate=false){
    const list=duplicate?u.duplicates:u.owned,index=list.findIndex(p=>(duplicate?p.uid:p.id)===id),p=list[index];if(!p)return {error:"Esta carta ya no está disponible."};if(!duplicate&&u.xi.includes(id))return {error:"Quita esta carta del once antes de venderla."};if(!p.tradeable)return {error:"Esta carta es intransferible; puedes usarla en DCP."};
    const coins=Math.max(100,Math.round(price(p)*.2));list.splice(index,1);u.coins+=coins;return {ok:true,coins};
  }
  function itemScore(p){return Math.max(1,p.overall-50)**2;}
  function sbcPool(u,type){const def=challenges[type];if(!def)return [];return u.owned.filter(p=>!u.xi.includes(p.id)).map(p=>({...p,uid:p.id})).concat(u.duplicates).filter(p=>p.overall>=def.min&&p.overall<=def.max);}
  function sbcPreview(u,type,ids){
    const def=challenges[type];if(!def)return {error:"DCP no disponible."};const available=sbcPool(u,type),cards=ids.map(id=>available.find(p=>p.uid===id));
    if(new Set(ids).size!==ids.length||cards.some(p=>!p))return {error:"Alguna carta no está disponible o es titular."};
    const score=cards.reduce((n,p)=>n+itemScore(p),0);return {ok:cards.length===def.count&&score>=def.score,cards,score,needed:def.score,count:def.count,reward:def.reward};
  }
  function submitSBC(u,type,ids,pool,rng=Math.random){
    const preview=sbcPreview(u,type,ids);if(!preview.ok)return {error:preview.error||"Completa los requisitos antes de entregar las cartas."};
    // Stage every change, including the reward, before committing a single item.
    const staged=JSON.parse(JSON.stringify(u)),keys=new Set(ids);staged.owned=staged.owned.filter(p=>!keys.has(p.id));staged.duplicates=staged.duplicates.filter(p=>!keys.has(p.uid));
    if(staged.owned.length<11||staged.xi.some(id=>!staged.owned.some(p=>p.id===id)))return {error:"No puedes entregar el once titular."};
    const reward=draw(staged,pool,preview.reward,rng,true);if(reward.error)return reward;staged.sbcs++;Object.assign(u,staged);return {ok:true,cards:reward.cards};
  }
  function objectives(u){return [{id:"first",name:"El viaje empieza",current:u.played,target:1,coins:1500},{id:"store",name:"Tu primer sobre",current:u.packsOpened,target:1,coins:750},{id:"market",name:"Un nuevo fichaje",current:u.purchases,target:1,coins:1000},{id:"chem",name:"Conexiones",current:chemistry(u).total,target:18,coins:1500},{id:"wins",name:"Mentalidad ganadora",current:u.wins,target:3,coins:2500},{id:"sbc",name:"Ingeniero de plantilla",current:u.sbcs,target:1,coins:1500}].map(o=>({...o,complete:o.current>=o.target,claimed:u.objectives.includes(o.id)}));}
  function claim(u,id){const o=objectives(u).find(o=>o.id===id);if(!o||!o.complete||o.claimed)return {error:"Objetivo incompleto o ya cobrado."};u.objectives.push(id);u.coins+=o.coins;return {ok:true,coins:o.coins};}
  function reward(u,token,result,mode='battles',difficulty=1){
    if(mode===flashback.id&&!(typeof token==="string"&&/^ut:flashback:\d+$/.test(token)))return false;
    if(typeof token==="string"&&token.startsWith("ut:flashback:")&&mode!==flashback.id)return false;
    if(mode===argentina.id&&!(typeof token==="string"&&/^ut:argentina:\d+$/.test(token)))return false;
    if(u.claimed.includes(token)||!Number.isInteger(result?.home)||!Number.isInteger(result?.away)||result.home<0||result.away<0)return false;
    u.claimed.push(token);u.played++;const won=result.home>result.away,drew=result.home===result.away;u[won?'wins':drew?'draws':'losses']++;
    const flashbackMatch=mode===flashback.id&&typeof token==="string"&&/^ut:flashback:\d+$/.test(token);
    const argentinaMatch=mode===argentina.id&&typeof token==="string"&&/^ut:argentina:\d+$/.test(token);
    const coins=flashbackMatch?flashback.reward:argentinaMatch?argentina.reward:won?1200:drew?600:350;u.coins+=coins;
    if(flashbackMatch){
      u.flashbackPlayed=(u.flashbackPlayed||0)+1;
      u.flashbackWins=(u.flashbackWins||0)+(won?1:0);
      u.flashbackEarned=(u.flashbackEarned||0)+coins;
    }
    if(argentinaMatch){
      u.argentinaPlayed=(u.argentinaPlayed||0)+1;
      u.argentinaWins=(u.argentinaWins||0)+(won?1:0);
      u.argentinaEarned=(u.argentinaEarned||0)+coins;
    }
    if(mode==='battles')u.battlePoints+=Math.round((won?900:drew?450:250)*difficulty)+Math.min(5,result.home)*40;
    if(mode==='divisions'){u.divisionPoints+=won?3:drew?1:0;if(u.divisionPoints>=9&&u.division>1){u.division--;u.divisionPoints-=9;u.coins+=1500;}}
    return coins;
  }
  function claimBattles(u){if(u.battlesClaimed.includes(u.battleCycle)||u.battlePoints<1000)return {error:"Consigue al menos 1.000 puntos en esta serie."};const reward=u.battlePoints>=5000?4000:u.battlePoints>=2500?2500:1000;u.battlesClaimed.push(u.battleCycle);u.coins+=reward;u.battleCycle++;u.battlePoints=0;return {ok:true,coins:reward};}
  return {create,chemistry,rating,league,packs,challenges,sigma,eventCards,argentina,argentinaCards,flashback,flashbackCards,muralla,murallaCards,claimMurallaGift,claimFlashbackGift,claimSigmaGift,draw,setPlayer,setFormation,auto,bench,price,marketPrice,evolutionCost,evolve,buy,quickSell,itemScore,sbcPool,sbcPreview,submitSBC,objectives,claim,reward,claimBattles};
});

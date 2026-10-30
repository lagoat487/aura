/* AURA UT club economy and progression. All coins/items are session-only game data. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./squad"):root.AuraSquad);if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraUT=api;})(typeof globalThis!=="undefined"?globalThis:this,function(Squad){
  "use strict";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const packs={silver:{name:"Sobre de plata",cost:750,count:3,min:65,max:74},gold:{name:"Sobre de oro",cost:2500,count:3,min:75,max:92},premium:{name:"Oro premium 82+",cost:7500,count:3,min:75,max:92,guaranteed:82}};
  const challenges={silver:{name:"De plata a oro",count:3,min:65,max:74,score:900,reward:"gold"},gold:{name:"Mejora 82+",count:3,min:75,max:83,score:1900,reward:"premium"}};

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
  const normalizeName=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  function eventCards(pool){
    const available=Array.isArray(pool)?pool:[];
    return sigma.cards.map(def=>{
      const wanted=normalizeName(def.name);
      const base=available.find(p=>p.real&&(normalizeName(p.name)===wanted||normalizeName(p.name).startsWith(wanted+" ")||wanted.startsWith(normalizeName(p.name)+" ")));
      return {...(base||{}),id:def.id,originalId:base?.id||null,name:def.name,overall:def.overall,pos:def.pos,real:true,event:sigma.id,eventPrice:def.price,
        nationality:base?.nationality||def.nationality,sourceClub:def.sourceClub,tradeable:true,leagueId:base?.leagueId||"reference",leagueLabel:base?.leagueLabel||"Referencia mundial"};
    });
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
    return {version:2,name:String(name||"Mi AURA FC").trim().slice(0,24),coins:10000,owned:first.concat(others),duplicates:[],xi,formation:'4-3-3',tactic:'balanced',played:0,wins:0,draws:0,losses:0,claimed:[],lastPack:[],packsOpened:0,purchases:0,sbcs:0,objectives:[],battlePoints:0,battleCycle:0,battlesClaimed:[],division:10,divisionPoints:0,serial:0,sigmaGiftClaimed:false};
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
    const other=u.xi.indexOf(id),old=u.xi[slot];u.xi[slot]=id;if(other>=0)u.xi[other]=old;return true;
  }
  function setFormation(u,formation){if(!Squad.formations[formation])return false;const current=u.xi.map(id=>u.owned.find(p=>p.id===id));u.formation=formation;u.xi=Squad.choose(current,formation);return true;}
  function auto(u){u.xi=Squad.choose(u.owned,u.formation);return u.xi;}
  function price(p){const special=p?.event===sigma.id&&sigma.cards.find(x=>x.id===p.id);if(special)return special.price;return Math.round((p.overall<65?300:p.overall<75?700+(p.overall-65)*80:p.overall<84?1200+Math.pow(p.overall-74,2)*160:18000*Math.pow(1.6,p.overall-84))/50)*50;}
  function buy(u,player){if(!player?.real||!player.id)return {error:"Jugador no disponible."};if(player.event===sigma.id&&!sigma.cards.some(p=>p.id===player.id&&p.overall===player.overall))return {error:"Carta Ultimate Sigma no disponible."};if(u.owned.some(p=>p.id===player.id))return {error:"Este jugador ya está en tu club."};const cost=price(player);if(u.coins<cost)return {error:"No tienes monedas suficientes."};u.coins-=cost;u.owned.push({...player,tradeable:true});u.purchases++;return {ok:true,cost};}
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
    if(u.claimed.includes(token)||!Number.isInteger(result?.home)||!Number.isInteger(result?.away)||result.home<0||result.away<0)return false;
    u.claimed.push(token);u.played++;const won=result.home>result.away,drew=result.home===result.away;u[won?'wins':drew?'draws':'losses']++;const coins=won?1200:drew?600:350;u.coins+=coins;
    if(mode==='battles')u.battlePoints+=Math.round((won?900:drew?450:250)*difficulty)+Math.min(5,result.home)*40;
    if(mode==='divisions'){u.divisionPoints+=won?3:drew?1:0;if(u.divisionPoints>=9&&u.division>1){u.division--;u.divisionPoints-=9;u.coins+=1500;}}
    return coins;
  }
  function claimBattles(u){if(u.battlesClaimed.includes(u.battleCycle)||u.battlePoints<1000)return {error:"Consigue al menos 1.000 puntos en esta serie."};const reward=u.battlePoints>=5000?4000:u.battlePoints>=2500?2500:1000;u.battlesClaimed.push(u.battleCycle);u.coins+=reward;u.battleCycle++;u.battlePoints=0;return {ok:true,coins:reward};}
  return {create,chemistry,rating,league,packs,challenges,sigma,eventCards,claimSigmaGift,draw,setPlayer,setFormation,auto,price,buy,quickSell,itemScore,sbcPool,sbcPreview,submitSBC,objectives,claim,reward,claimBattles};
});

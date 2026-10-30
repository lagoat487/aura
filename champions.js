/* Career Champions: 36 clubs, eight league games and two-legged knockouts.
   Draws and entry allocation are AURA simulations, not UEFA's official draw. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./world-tour"):root.AuraTour);if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraChampions=api;})(typeof globalThis!=="undefined"?globalThis:this,function(Tour){
  "use strict";
  const due=[2,4,6,9,12,15,18,21],dates={playoff:[23,24],round16:[26,27],quarter:[29,30],semi:[33,34],final:[36]},labels={league:"Fase liga",playoff:"Play-off",round16:"Octavos",quarter:"Cuartos",semi:"Semifinal",final:"Final"};
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const european=/espa[nñ]a|inglaterra|alemania|italia|francia|portugal|paises bajos|premier league|bundesliga|serie a|ligue 1|eredivisie|belgium|scotland|turkey|austria|switzerland|1a pro league|scottish|brack super|trendyol|hellas|ceska|hrvatska|superliga|ekstraklasa|ukrayina|cyprus|allsvenskan|eliteserien/;
  function candidates(clubs,definitions,matching){
    const seen=new Set();return clubs.filter(c=>c.gender!=="women"&&european.test(norm(c.city+" "+definitions.filter(d=>d.id!=="exhibition"&&d.clubIds.includes(c.id)).map(d=>d.country+" "+d.name).join(" ")))).filter(c=>{const id=matching?.(c)?.id||norm(c.name);if(seen.has(id))return false;seen.add(id);return true;}).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id));
  }
  function create(entrants,user,season=2026){
    if(entrants.length!==36||new Set(entrants.map(c=>c.id)).size!==36||!entrants.some(c=>c.id===user))throw Error("La Champions necesita 36 clubes distintos e incluir a tu equipo.");
    const seeded=entrants.map(c=>({id:c.id,name:c.name,rating:c.rating})),rng=Tour.random(Tour.hash(user+season));
    // Bipartite rotations guarantee eight distinct opponents, four home/four away.
    const shuffled=seeded.slice();for(let i=35;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    const left=shuffled.slice(0,18),right=shuffled.slice(18),rounds=due.map((after,index)=>({stage:"league",leg:index+1,due:after,matches:left.map((c,i)=>{const rival=right[(i+index)%18],home=index%2===0?c.id:rival.id,away=index%2===0?rival.id:c.id;return {id:season+":ucl:league:"+index+":"+i,home,away,score:null};})}));
    return {version:1,season,user,entrants:seeded,rounds,cursor:0,stage:"league",champion:null,topEight:[],tieWinners:[],payouts:[]};
  }
  function table(c){
    const rows=new Map(c.entrants.map(t=>[t.id,{id:t.id,name:t.name,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]));
    for(const r of c.rounds.filter(r=>r.stage==="league"))for(const f of r.matches){if(!f.score)continue;const h=rows.get(f.home),a=rows.get(f.away);h.p++;a.p++;h.gf+=f.score.home;h.ga+=f.score.away;a.gf+=f.score.away;a.ga+=f.score.home;if(f.score.home>f.score.away){h.w++;a.l++;h.pts+=3;}else if(f.score.home<f.score.away){a.w++;h.l++;a.pts+=3;}else{h.d++;a.d++;h.pts++;a.pts++;}}
    return [...rows.values()].sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||b.w-a.w||a.id.localeCompare(b.id));
  }
  function next(c){return c&&!c.champion?c.rounds[c.cursor]||null:null;}
  function fixture(c){return next(c)?.matches.find(f=>f.home===c.user||f.away===c.user)||null;}
  function pendingUser(c){if(!c||c.champion)return false;const f=fixture(c);if(f)return true;if(next(c)?.stage==="playoff"&&c.topEight.includes(c.user))return true;return false;}
  function addStage(c,stage,pairs){
    const legs=stage==="final"?1:2;
    for(let leg=1;leg<=legs;leg++)c.rounds.push({stage,leg,due:dates[stage][leg-1],matches:pairs.map(([a,b],i)=>({id:c.season+":ucl:"+stage+":"+leg+":"+i,tie:stage+":"+i,home:leg===1?b:a,away:leg===1?a:b,score:null}))});
    c.stage=stage;
  }
  function closeStage(c,stage){
    if(stage==="league"){
      const standings=table(c);c.topEight=standings.slice(0,8).map(r=>r.id);const seeds=standings.slice(8,24).map(r=>r.id);addStage(c,"playoff",Array.from({length:8},(_,i)=>[seeds[i],seeds[15-i]]));return;
    }
    const rounds=c.rounds.filter(r=>r.stage===stage),last=rounds.at(-1),rng=Tour.random(Tour.hash(c.season+stage+c.user)),winners=[];
    for(const f of last.matches){const all=rounds.flatMap(r=>r.matches).filter(g=>g.tie===f.tie),sum=id=>all.reduce((n,g)=>n+(g.home===id?g.score.home:g.score.away),0),hg=sum(f.home),ag=sum(f.away);let winner;
      if(hg===ag){f.penalties=rng()<.5?{home:5,away:4}:{home:4,away:5};winner=f.penalties.home>f.penalties.away?f.home:f.away;}else winner=hg>ag?f.home:f.away;
      f.aggregate={home:hg,away:ag};f.winner=winner;winners.push(winner);
    }
    c.tieWinners=winners;
    if(stage==="final"){c.champion=winners[0];c.stage="complete";return;}
    if(stage==="playoff"){addStage(c,"round16",c.topEight.map((id,i)=>[id,winners[7-i]]));return;}
    const upcoming={round16:"quarter",quarter:"semi",semi:"final"}[stage];addStage(c,upcoming,Array.from({length:winners.length/2},(_,i)=>[winners[i*2],winners[i*2+1]]));
  }
  function advance(c,simulate,provided=null){
    const round=next(c);if(!round)return false;
    if(provided&&(!Number.isInteger(provided.home)||!Number.isInteger(provided.away)||provided.home<0||provided.away<0||!fixture(c)))throw Error("Resultado continental inválido.");
    const results=round.matches.map(f=>({...f,score:provided&&(f.home===c.user||f.away===c.user)?{...provided}:simulate(f.home,f.away)}));
    if(results.some(f=>!Number.isInteger(f.score?.home)||!Number.isInteger(f.score?.away)||f.score.home<0||f.score.away<0))throw Error("Resultado continental inválido.");
    round.matches=results;c.cursor++;
    const last=round.stage==="league"?round.leg===8:round.stage==="final"||round.leg===2;
    if(last)closeStage(c,round.stage);return round;
  }
  function dueNow(game){const r=next(game.champions);const leagueLength=game.competition?.fixtures.length||38;return !!r&&(game.round>=Math.floor(r.due*leagueLength/38)||game.round>=leagueLength);}
  function initCareer(game,clubs,definitions,matching,previousPosition=null){
    const all=candidates(clubs,definitions,matching),own=clubs.find(c=>c.id===game.club),identity=c=>matching?.(c)?.id||norm(c.name),ownKey=own&&identity(own);
    if(!own||!all.some(c=>identity(c)===ownKey)){game.champions=null;game.championsReason="Tu club no pertenece a una liga europea.";return null;}
    const domestic=game.competition.clubIds.map(id=>clubs.find(c=>c.id===id)).filter(Boolean).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id));
    const qualified=previousPosition===null?domestic.slice(0,4).some(c=>c.id===game.club):previousPosition<=4||game.previousContinentalChampion===game.club;
    if(!qualified){game.champions=null;game.championsReason="Termina entre los cuatro primeros de tu liga para clasificar a la próxima Champions de AURA.";return null;}
    const entrants=[own,...all.filter(c=>identity(c)!==ownKey).slice(0,35)];if(entrants.length<36){game.champions=null;game.championsReason="El catálogo europeo todavía está cargando.";return null;}
    game.champions=create(entrants,game.club,game.season);game.continentalHistory=[];game.championsReason="";return game.champions;
  }
  return {create,table,next,fixture,pendingUser,advance,dueNow,initCareer,candidates,labels};
});

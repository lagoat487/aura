export const VERSION = 3;
export const SAVE_KEY = 'aura_dream_career_v03';
export const DIVISIONS = ['División Élite', 'División Legendaria', 'División Diamante', 'División Platino', 'División Oro', 'División Plata', 'División Bronce', 'División Academia'];
export const FORMATIONS = {
  '4-3-3': ['GK','LB','CB','CB','RB','CM','CDM','CM','LW','ST','RW'],
  '4-4-2': ['GK','LB','CB','CB','RB','LM','CM','CM','RM','ST','ST'],
  '3-5-2': ['GK','CB','CB','CB','LM','CM','CDM','CM','RM','ST','ST'],
};
export const POSITION_ES = {GK:'POR',RB:'LD',RWB:'CAD',CB:'DFC',LB:'LI',LWB:'CAI',CDM:'MCD',CM:'MC',CAM:'MCO',RM:'MD',LM:'MI',RW:'ED',LW:'EI',ST:'DC',CF:'SD'};
export function seeded(seed) { let t=seed>>>0; return () => {t+=0x6D2B79F5;let x=t;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;}; }
export function shuffle(array, random=Math.random) { const a=[...array]; for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
export function price(p) { return Math.round((250+Math.pow(Math.max(0,p.overall-45),2)*2.65)/10)*10; }
export function sellPrice(p) { return Math.round(price(p)*0.55/10)*10; }
export function unpack(data) {return data.players.map(row => Object.fromEntries(data.meta.columns.map((c,i)=>[c,row[i]])));}
export const positions=p=>p.positions.split(',');
export function fits(p, role) {
  const a=positions(p); if(a.includes(role))return 3;
  const groups=[['LB','LWB','RB','RWB'],['CB'],['CDM','CM','CAM'],['LM','LW','RW','RM'],['ST','CF']];
  return groups.some(g=>g.includes(role)&&a.some(x=>g.includes(x)))?2:role==='GK'||a.includes('GK')?0:1;
}
export function lineupRating(s, byId) {return Math.round(s.lineup.reduce((n,id)=>n+(byId.get(id)?.overall||0),0)/11);}
const CLUBS = ['Atlético del Puerto','Unión Capital','Sporting del Sur','Real Costa','Norte FC','Deportivo Valle','Estrella Azul'];
export function makeSeason(division, season, clubName) {
  const rating=95-division*4;
  const teams=[{id:'dream',name:clubName,rating:0}, ...CLUBS.map((name,i)=>({id:'club'+i,name,rating:rating+(i%5)-2}))].map(t=>({...t,played:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
  let rotation=teams.map(t=>t.id), first=[];
  for(let r=0;r<7;r++){
    const games=[];
    for(let j=0;j<4;j++){let h=rotation[j],a=rotation[7-j];if(r%2)[h,a]=[a,h];games.push([h,a]);}
    first.push(games);rotation=[rotation[0],rotation[7],...rotation.slice(1,7)];
  }
  return {number:season,division,round:0,teams,fixtures:[...first,...first.map(g=>g.map(([h,a])=>[a,h]))],results:[],complete:false};
}
export function table(s) {return [...s.league.teams].sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));}
export function fixture(s) {
  if(s.league.complete)return null;
  const g=s.league.fixtures[s.league.round].find(g=>g.includes('dream'));
  const other=g.find(id=>id!=='dream');return {home:g[0]==='dream',opponent:s.league.teams.find(t=>t.id===other),pair:g};
}
function chooseStarter(players,random){
  const picked=[];
  for(const role of FORMATIONS['4-3-3']){
    const candidates=players.filter(p=>p.overall>=64&&p.overall<=72&&fits(p,role)===3&&!picked.includes(p.id));
    const p=candidates[Math.floor(random()*candidates.length)];if(p)picked.push(p.id);
  }
  for(const role of ['GK','CB','CM','ST']){const p=players.find(p=>p.overall===70&&fits(p,role)===3&&!picked.includes(p.id));if(p)picked.push(p.id);}
  return picked;
}
export function newCareer(players,seed=Date.now()) {
  const roster=chooseStarter(players,seeded(seed));
  const s={version:VERSION,clubName:'AURA DREAM FC',coins:7000,seed,marketRound:0,market:[],roster,lineup:roster.slice(0,11),formation:'4-3-3',division:8,season:1,played:0,stadium:1,captainPicked:false,history:[],pending:null,settings:{difficulty:'normal',duration:120,camera:'broadcast',quality:'high',stadium:'night',sound:false},createdAt:new Date().toISOString()};
  s.league=makeSeason(s.division,s.season,s.clubName);rotateMarket(s,players);return s;
}
export function rotateMarket(s,players) {
  const old=new Set(s.market),owned=new Set(s.roster), random=seeded(s.seed+s.marketRound*13991+773);
  const available=players.filter(p=>!owned.has(p.id)&&!old.has(p.id));
  const pick=(min,max)=>shuffle(available.filter(p=>p.overall>=min&&p.overall<=max&&!s.market.includes(p.id)),random)[0];
  s.market=[];
  for(const [min,max] of [[84,99],[80,87],[75,82],[70,78],[65,74],[60,70],[55,68],[70,85]]){const p=pick(min,max);if(p)s.market.push(p.id);}
  // A first look at the stars; all later windows are drawn from the full catalogue.
  if(s.marketRound===0)for(const [i,id] of ['277643','158023','256079'].entries())if(!owned.has(id)&&players.some(p=>p.id===id)&&!s.market.includes(id))s.market[i]=id;
  s.marketRound++;
}
export function buy(s,p) {
  if(!s.market.includes(p.id))throw Error('Este jugador no está en las ofertas actuales. Puedes contactar desde el catálogo.');
  if(s.roster.includes(p.id))throw Error('Este jugador ya está en tu club.');
  if(s.roster.length>=32)throw Error('Tu plantilla está llena (32 jugadores). Libera una plaza primero.');
  const cost=price(p);if(s.coins<cost)throw Error('No tienes suficientes monedas.');
  s.coins-=cost;s.roster.push(p.id);return cost;
}
export function scout(s,p) {
  if(s.roster.includes(p.id))throw Error('Este jugador ya está en tu club.');
  if(s.market.includes(p.id))throw Error('Ya está disponible en Fichajes.');
  if(s.coins<200)throw Error('Contactar cuesta 200 monedas.');
  s.coins-=200;s.market[s.market.length-1]=p.id;
}
export function release(s,p){
  if(!s.roster.includes(p.id))throw Error('Este jugador no pertenece a tu club.');
  if(s.lineup.includes(p.id))throw Error('Sustitúyelo en el once antes de venderlo.');
  if(s.roster.length<=11)throw Error('Necesitas al menos 11 jugadores.');
  s.roster=s.roster.filter(id=>id!==p.id);const value=sellPrice(p);s.coins+=value;return value;
}
export function setFormation(s,key,byId){
  if(!FORMATIONS[key])throw Error('Formación desconocida.');
  const used=[],available=s.roster.map(id=>byId.get(id)).filter(Boolean);
  for(const role of FORMATIONS[key]){const p=available.filter(p=>!used.includes(p.id)).sort((a,b)=>fits(b,role)-fits(a,role)||b.overall-a.overall)[0];used.push(p.id);}
  s.formation=key;s.lineup=used;
}
export function pickCaptain(s,p,byId){
  if(s.captainPicked)throw Error('Ya elegiste a tu capitán.');
  if(!['277643','158023','256079'].includes(p.id))throw Error('Capitán no disponible.');
  if(!s.roster.includes(p.id))s.roster.push(p.id);s.captainPicked=true;
  const roles=FORMATIONS[s.formation];const slot=roles.map((r,i)=>({i,score:fits(p,r)*100-(byId.get(s.lineup[i])?.overall||0)})).sort((a,b)=>b.score-a.score)[0].i;
  s.lineup[slot]=p.id;
}
function applyScore(teams,homeId,awayId,h,a){
  const home=teams.find(t=>t.id===homeId),away=teams.find(t=>t.id===awayId);
  home.played++;away.played++;home.gf+=h;home.ga+=a;away.gf+=a;away.ga+=h;
  if(h>a){home.w++;away.l++;home.pts+=3;}else if(h<a){away.w++;home.l++;away.pts+=3;}else{home.d++;away.d++;home.pts++;away.pts++;}
}
function poisson(lambda,rnd){let p=1,k=0,L=Math.exp(-lambda);do{k++;p*=rnd();}while(p>L&&k<9);return k-1;}
export function simulateScore(homeRating,awayRating,rnd=Math.random){return [Math.min(6,poisson(Math.max(.25,1.4+(homeRating-awayRating)*.045),rnd)),Math.min(6,poisson(Math.max(.2,1.1+(awayRating-homeRating)*.045),rnd))];}
export function beginMatch(s){
  if(s.league.complete)throw Error('Inicia la siguiente temporada para jugar.');
  if(s.pending)return s.pending;
  const f=fixture(s);s.pending={id:`${s.season}-${s.league.round}-${s.played}`,season:s.season,round:s.league.round,opponent:f.opponent.id,home:f.home};return s.pending;
}
export function finishMatch(s,result,players,byId){
  if(!s.pending||result.id!==s.pending.id)throw Error('Este resultado ya se guardó o no corresponde al partido.');
  const {homeGoals,awayGoals}=result;
  if(!Number.isInteger(homeGoals)||!Number.isInteger(awayGoals)||homeGoals<0||awayGoals<0||homeGoals>50||awayGoals>50)throw Error('Marcador no válido.');
  const p=s.pending,f=fixture(s),ourGoals=p.home?homeGoals:awayGoals,theirGoals=p.home?awayGoals:homeGoals;
  const random=seeded(s.seed+s.played*1009+321),roundResults=[];
  for(const [h,a] of s.league.fixtures[s.league.round]){
    const ht=s.league.teams.find(t=>t.id===h),at=s.league.teams.find(t=>t.id===a);
    const score=h==='dream'||a==='dream'?[homeGoals,awayGoals]:simulateScore(ht.rating,at.rating,random);
    applyScore(s.league.teams,h,a,...score);roundResults.push({h,a,score});
  }
  const win=ourGoals>theirGoals,draw=ourGoals===theirGoals;
  const reward=result.mode==='abandoned'?0:350+(win?500:draw?200:0)+Math.min(ourGoals,10)*45+s.stadium*50;
  s.coins+=reward;s.played++;
  const record={id:p.id,season:s.season,round:s.league.round+1,opponent:f.opponent.name,home:p.home,homeGoals,awayGoals,ourGoals,theirGoals,reward,mode:result.mode||'3d',shots:result.shots||[0,0]};
  s.history.unshift(record);s.history=s.history.slice(0,100);s.league.results.push(roundResults);s.league.round++;s.league.complete=s.league.round>=14;s.pending=null;
  rotateMarket(s,players);return record;
}
export function nextSeason(s){
  if(!s.league.complete)throw Error('La temporada todavía no ha terminado.');
  const rank=table(s).findIndex(t=>t.id==='dream')+1;let movement='Permanencia';
  if(rank<=2&&s.division>1){s.division--;movement='Ascenso';s.coins+=2000;}
  else if(rank>=7&&s.division<8){s.division++;movement='Descenso';}
  else if(rank===1&&s.division===1){movement='Campeón de Élite';s.coins+=5000;}
  s.season++;s.league=makeSeason(s.division,s.season,s.clubName);return movement;
}
export function validateSave(value,byId){
  const fail=()=>{throw Error('Esta copia no es una partida válida de AURA DREAM v0.3.');};
  if(!value||value.version!==VERSION||!Array.isArray(value.roster)||value.roster.length<11||value.roster.length>32)fail();
  if(value.roster.some(id=>!byId.has(id))||new Set(value.roster).size!==value.roster.length)fail();
  if(!Array.isArray(value.lineup)||value.lineup.length!==11||new Set(value.lineup).size!==11||value.lineup.some(id=>!value.roster.includes(id)))fail();
  if(!Number.isFinite(value.coins)||value.coins<0||value.coins>1e12||!Number.isInteger(value.division)||value.division<1||value.division>8||!FORMATIONS[value.formation])fail();
  if(!Number.isInteger(value.season)||value.season<1||!Number.isInteger(value.played)||value.played<0||!Number.isInteger(value.seed)||!Number.isInteger(value.marketRound))fail();
  if(!Array.isArray(value.market)||value.market.length!==8||new Set(value.market).size!==8||value.market.some(id=>!byId.has(id)))fail();
  if(typeof value.clubName!=='string'||value.clubName.length<1||value.clubName.length>28||!Number.isInteger(value.stadium)||value.stadium<1||value.stadium>10)fail();
  const l=value.league;if(!l||l.division!==value.division||l.number!==value.season||!Number.isInteger(l.round)||l.round<0||l.round>14||l.complete!==(l.round===14))fail();
  const template=makeSeason(value.division,value.season,value.clubName);
  if(JSON.stringify(l.fixtures)!==JSON.stringify(template.fixtures)||!Array.isArray(l.teams)||l.teams.length!==8||new Set(l.teams.map(t=>t.id)).size!==8)fail();
  for(const t of l.teams){if(!template.teams.some(x=>x.id===t.id)||typeof t.name!=='string'||t.name.length>40)fail();for(const k of ['played','w','d','l','gf','ga','pts'])if(!Number.isInteger(t[k])||t[k]<0||t[k]>1000)fail();if(t.played!==l.round||t.w+t.d+t.l!==t.played||t.pts!==t.w*3+t.d)fail();}
  if(!Array.isArray(l.results)||l.results.length!==l.round||!Array.isArray(value.history)||value.history.length>100)fail();
  if(value.history.some(h=>!h||typeof h.opponent!=='string'||typeof h.id!=='string'||['ourGoals','theirGoals','reward'].some(k=>!Number.isFinite(h[k]))))fail();
  if(!value.settings||!['easy','normal','hard'].includes(value.settings.difficulty)||![90,120,180].includes(value.settings.duration)||!['broadcast','wide','stadium','tele','immersive'].includes(value.settings.camera))fail();
  if(value.pending&&(value.pending.season!==value.season||value.pending.round!==l.round||typeof value.pending.id!=='string'||!l.teams.some(t=>t.id===value.pending.opponent)))fail();
  if(value.settings.quality!==undefined&&!['low','medium','high','ultra'].includes(value.settings.quality))fail();
  if(value.settings.stadium!==undefined&&!['night','sunset','day'].includes(value.settings.stadium))fail();
  const result=structuredClone(value);result.settings.quality??='high';result.settings.stadium??='night';return result;
}

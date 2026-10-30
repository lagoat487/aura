"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),U=require('../ultimate-team'),P=require('../portraits');
const positions=['POR','LI','DFC','DFC','LD','MCD','MC','MC','EI','DC','ED','POR','LI','DFC','LD','MC','DC','ED','EI','MC','MCD','MCO','DFC'];
function pool(){return ['a','b','c','d'].flatMap((cid,n)=>Array.from({length:23},(_,i)=>({id:cid+i,name:'Jugador '+cid+i,pos:positions[i],overall:65+(i+n*5)%28,potential:92,real:true,club:cid,catalogClub:'world-'+cid,leagueId:n%2===0?'liga-a':'liga-b',nationality:n%2===0?'Spain':'France'})));}
test('UT starts with 23 unique real footballers, a complete XI and a preferred starter league',()=>{
 const u=U.create(pool(),'liga-a');assert.equal(u.owned.length,23);assert.equal(new Set(u.owned.map(p=>p.id)).size,23);assert.equal(new Set(u.xi).size,11);assert.ok(u.xi.every(id=>u.owned.find(p=>p.id===id)));assert.equal(u.owned.find(p=>p.id===u.xi[0]).pos,'POR');assert.ok(u.xi.map(id=>u.owned.find(p=>p.id===id)).filter(p=>p.leagueId==='liga-a').length>=8);
});
test('chemistry is 0–33, rewards compatible links and never rewards an out-of-position card',()=>{
 const ps=positions.slice(0,11).map((pos,i)=>({id:'p'+i,name:'Player '+i,pos,overall:78,real:true,club:'same',leagueId:'same',nationality:'Spain'})),u={owned:ps,xi:ps.map(p=>p.id),formation:'4-3-3'};assert.equal(U.chemistry(u).total,33);[u.xi[0],u.xi[9]]=[u.xi[9],u.xi[0]];assert.equal(U.chemistry(u).players[0],0);assert.equal(U.chemistry(u).players[9],0);
});
test('pack guarantees are real, repeats go into storage and failed purchases cannot debit coins',()=>{
 const u=U.create(pool()),result=U.draw(u,pool(),'premium',()=>.2);assert.equal(result.ok,true);assert.ok(result.cards.some(p=>p.overall>=82));assert.equal(new Set(result.cards.map(p=>p.id)).size,3);assert.equal(u.coins,2500);const old=JSON.stringify(u);assert.ok(U.draw(u,pool(),'premium').error);assert.equal(JSON.stringify(u),old);
 const before=u.owned.length;U.draw(u,[...u.owned], 'silver',()=>.3,true);assert.equal(u.owned.length,before);assert.ok(u.duplicates.length>0);
});
test('squad changes swap existing starters, preserve a unique XI and support formations',()=>{
 const u=U.create(pool()),id=u.xi[9],old=u.xi[1];assert.equal(U.setPlayer(u,1,id),true);assert.equal(u.xi[9],old);assert.equal(new Set(u.xi).size,11);assert.equal(U.setFormation(u,'4-4-2'),true);assert.equal(new Set(u.xi).size,11);assert.equal(U.setPlayer(u,90,id),false);
});
test('market prevents double purchases, spending without funds, and selling starters or intransferibles',()=>{
 const u=U.create(pool()),p=pool().find(p=>!u.owned.some(q=>q.id===p.id)&&U.price(p)<u.coins);const before=u.coins;assert.equal(U.buy(u,p).ok,true);assert.equal(u.coins,before-U.price(p));const after=JSON.stringify(u);assert.ok(U.buy(u,p).error);assert.equal(JSON.stringify(u),after);assert.ok(U.quickSell(u,u.xi[0]).error);assert.ok(U.quickSell(u,u.owned.find(p=>!p.tradeable&&!u.xi.includes(p.id)).id).error);assert.equal(U.quickSell(u,p.id).ok,true);assert.ok(U.quickSell(u,p.id).error);
});
test('SBC delivery validates item score, consumes only reserves and stages its reward atomically',()=>{
 const u=U.create(pool()),extra=pool().filter(p=>!u.owned.some(q=>q.id===p.id)&&p.overall>=75&&p.overall<=83).slice(0,3);for(const p of extra)u.owned.push({...p});
 const chosen=U.sbcPool(u,'gold').sort((a,b)=>b.overall-a.overall).slice(0,3).map(p=>p.uid),xi=u.xi.slice(),old=JSON.stringify(u);assert.ok(U.submitSBC(u,'gold',[u.xi[0],...chosen.slice(0,2)],pool()).error);assert.equal(JSON.stringify(u),old);
 assert.ok(U.sbcPreview(u,'gold',chosen).ok);assert.equal(U.submitSBC(u,'gold',chosen,pool(),()=>.7).ok,true);assert.deepEqual(u.xi,xi);assert.ok(u.lastPack.some(p=>p.overall>=82));assert.equal(u.sbcs,1);assert.ok(U.submitSBC(u,'gold',chosen,pool()).error);
});
test('match, objective and Squad Battles rewards can be received only once per identifier',()=>{
 const u=U.create(pool());assert.equal(U.reward(u,'one',{home:2,away:0},'battles',1),1200);assert.equal(U.reward(u,'one',{home:2,away:0},'battles',1),false);assert.equal(U.claim(u,'first').ok,true);assert.ok(U.claim(u,'first').error);u.battlePoints=2600;const cycle=u.battleCycle;assert.equal(U.claimBattles(u).ok,true);assert.equal(u.battleCycle,cycle+1);assert.ok(U.claimBattles(u).error);
 for(let i=0;i<3;i++)U.reward(u,'div'+i,{home:1,away:0},'divisions');assert.equal(u.division,9);assert.equal(u.divisionPoints,0);
});
test('portraits use the correct numeric identity, reject injected URLs and never synthesize a real face',()=>{
 const p={id:'real:231747',name:'Kylian Mbappé',real:true};assert.match(P.sources(p)[0],/pulse.ea.com\/FC25\/full\/player-portraits\/p231747.png/);assert.ok(P.html(p).includes('Retrato de Kylian'));assert.deepEqual(P.sources({id:'new:123',real:false,photo:'javascript:alert(1)'}),[]);const missing=P.html({id:'verified:unknown',name:'Real Player',real:true});assert.match(missing,/Sin foto/);assert.doesNotMatch(missing,/<svg|javascript:/);
});

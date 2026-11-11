'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {OWNER_ID,selectTwoAccounts,emptyClub,wipeTwo,undoWipe}=require('../server/random-club-wipe-99');

const club=n=>({name:'Club',coins:n,owned:[{id:'one'},{id:'two'}],duplicates:[{id:'three'}],xi:['one'],lastPack:[{id:'four'}]});
const actor={accountId:OWNER_ID,ownerVerified:true};
const accounts=()=>[
  {id:OWNER_ID,active:true,verified:true,club:club(9999)},
  {id:'alice',active:true,verified:true,club:club(1000)},
  {id:'bob',active:true,verified:true,club:club(2000)},
  {id:'chris',active:true,verified:true,club:club(3000)},
  {id:'guest',active:true,verified:false,club:club(4000)},
  {id:'inactive',active:false,verified:true,club:club(5000)}
];
const ID='random_wipe_test_1';
function memoryDb() {
  let state={accounts:accounts(),actions:{},snapshots:{}};
  async function transaction(work) {
    const next=structuredClone(state);
    const tx={
      listAccounts:async()=>structuredClone(next.accounts),
      getAction:async id=>next.actions[id]&&structuredClone(next.actions[id]),
      saveAction:async record=>{next.actions[record.id]=structuredClone(record);},
      saveSnapshot:async(a,id,record)=>{next.snapshots[a+':'+id]=structuredClone(record);},
      getSnapshot:async(a,id)=>structuredClone(next.snapshots[a+':'+id]),
      getClub:async id=>structuredClone(next.accounts.find(a=>a.id===id)?.club),
      replaceClub:async(id,record)=>{
        const item=next.accounts.find(a=>a.id===id);
        if (!item) throw Error('No existe');
        item.club=structuredClone(record);
      }
    };
    const result=await work(tx);
    state=next; // Commit only on success; failed operations roll back.
    return result;
  }
  return {transaction,read:()=>structuredClone(state)};
}

test('sortea dos clubes distintos sin incluir al administrador ni invitados',()=>{
  assert.deepEqual(selectTwoAccounts(accounts(),OWNER_ID,n=>n-1).map(a=>a.id),['chris','bob']);
  assert.throws(()=>selectTwoAccounts(accounts().slice(0,2),OWNER_ID),/dos clubes/);
});
test('deja monedas a cero y vacía titulares, colección, repetidos y sobres',()=>{
  const original=club(777);
  const cleared=emptyClub(original,ID,'2026-11-11T16:00:00.000Z');
  assert.equal(cleared.coins,0);
  for (const field of ['owned','duplicates','xi','lastPack']) assert.deepEqual(cleared[field],[]);
  assert.equal(cleared.wipeState.locked,true);
  assert.equal(original.coins,777);
});
test('rechaza administradores sin autenticar y preserva el estado',async()=>{
  const db=memoryDb(),before=db.read();
  await assert.rejects(wipeTwo(db,{actor:{accountId:OWNER_ID,ownerVerified:false},actionId:ID}),/propietario/);
  assert.deepEqual(db.read(),before);
});
test('borra exactamente dos clubes sin tocar al dueño; reintentos no repiten sorteo',async()=>{
  const db=memoryDb();
  const result=await wipeTwo(db,{actor,actionId:ID,randomIndex:()=>0});
  assert.deepEqual(result.accountIds,['alice','bob']);
  assert.equal(result.count,2);
  assert.equal(db.read().accounts.find(a=>a.id==='alice').club.coins,0);
  assert.equal(db.read().accounts.find(a=>a.id==='chris').club.coins,3000);
  assert.equal(db.read().accounts.find(a=>a.id===OWNER_ID).club.coins,9999);
  assert.equal((await wipeTwo(db,{actor,actionId:ID,randomIndex:()=>{throw Error('Resorteo');}})).replayed,true);
});
test('respalda y restaura los dos clubes',async()=>{
  const db=memoryDb();
  await wipeTwo(db,{actor,actionId:ID,randomIndex:()=>0});
  assert.equal((await undoWipe(db,{actor,actionId:ID})).undone,true);
  assert.equal(db.read().accounts.find(a=>a.id==='alice').club.coins,1000);
  assert.equal(db.read().accounts.find(a=>a.id==='bob').club.owned.length,2);
  await assert.rejects(undoWipe(db,{actor,actionId:ID}),/No existe/);
});
test('una escritura fallida cancela toda la transacción',async()=>{
  const db=memoryDb(),before=db.read();
  const faulty={transaction:work=>db.transaction(async tx=>{
    let n=0;const original=tx.replaceClub;
    tx.replaceClub=async(...args)=>{await original(...args);if(++n===2)throw Error('Falló D1');};
    return work(tx);
  })};
  await assert.rejects(wipeTwo(faulty,{actor,actionId:ID,randomIndex:()=>0}),/Falló D1/);
  assert.deepEqual(db.read(),before);
});

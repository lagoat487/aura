'use strict';

/*
 * AURA 9.9 - server-side admin-abuse wipe.
 * Keep this on an authenticated server. This is NOT a browser script.
 * Requires verified, authoritative player accounts and an atomic database.
 */
const OWNER_ID = '300236178';
const MAX_UINT32 = 0x100000000;

function secureIndex(max) {
  if (!Number.isSafeInteger(max) || max < 1 || max > MAX_UINT32) throw Error('Rango aleatorio inválido.');
  const crypto = globalThis.crypto || require('node:crypto').webcrypto;
  const limit = Math.floor(MAX_UINT32 / max) * max;
  const data = new Uint32Array(1);
  do { crypto.getRandomValues(data); } while (data[0] >= limit);
  return data[0] % max;
}

function selectTwoAccounts(accounts, ownerAccountId, randomIndex = secureIndex) {
  if (!Array.isArray(accounts)) throw Error('No se pudo consultar la lista de usuarios.');
  const seen = new Set();
  const eligible = accounts.filter(account => {
    if (!account || typeof account.id !== 'string' || !account.id || seen.has(account.id)) return false;
    seen.add(account.id);
    return account.id !== ownerAccountId && account.active === true && account.verified === true &&
      account.club && Number.isSafeInteger(account.club.coins) && account.club.coins >= 0 &&
      Array.isArray(account.club.owned) && Array.isArray(account.club.duplicates);
  });
  if (eligible.length < 2) throw Error('Se necesitan dos clubes verificados para el sorteo.');
  const first = randomIndex(eligible.length);
  if (!Number.isSafeInteger(first) || first < 0 || first >= eligible.length) throw Error('Sorteo inválido.');
  const [one] = eligible.splice(first, 1);
  const second = randomIndex(eligible.length);
  if (!Number.isSafeInteger(second) || second < 0 || second >= eligible.length) throw Error('Sorteo inválido.');
  return [one, eligible[second]];
}

function emptyClub(original, actionId, timestamp) {
  const clone = structuredClone(original);
  // An empty squad cannot be loaded by AURA's current local save validator,
  // which requires 11 starters. The central client needs a locked/rebuild view.
  return {...clone, coins:0, owned:[], duplicates:[], xi:[],
    bench:[], substitutes:[], reserves:[], unassigned:[], lastPack:[],
    wipeState:{id:actionId, at:timestamp, locked:true}};
}

function checkOwner(actor) {
  // actor comes ONLY from a verified server session, never client JSON.
  if (!actor || String(actor.accountId) !== OWNER_ID || actor.ownerVerified !== true)
    throw Error('Solo el propietario autenticado puede ejecutar este comando.');
}

function checkActionId(actionId) {
  if (typeof actionId !== 'string' || !/^[a-zA-Z0-9_-]{12,100}$/.test(actionId))
    throw Error('Identificador de operación no válido.');
}

/*
 * repo.transaction(async tx => ...) must be atomic.
 * tx.listAccounts(), tx.getAction(id), tx.saveAction(result),
 * tx.saveSnapshot(actionId, accountId, originalClub),
 * tx.getSnapshot(actionId, accountId), tx.getClub(accountId),
 * tx.replaceClub(accountId, updatedClub).
 */
async function wipeTwo(repo, {actor, actionId, now = () => new Date().toISOString(), randomIndex = secureIndex}) {
  checkOwner(actor);
  checkActionId(actionId);
  if (!repo || typeof repo.transaction !== 'function') throw Error('Falta una base de datos transaccional.');
  return repo.transaction(async tx => {
    const existing = await tx.getAction(actionId);
    if (existing) return {...existing, replayed:true};
    const chosen = selectTwoAccounts(await tx.listAccounts(), String(actor.accountId), randomIndex);
    const at = now();
    const result = {id:actionId, at, accountIds:chosen.map(a => a.id), count:2};
    for (const user of chosen) {
      await tx.saveSnapshot(actionId, user.id, structuredClone(user.club));
      await tx.replaceClub(user.id, emptyClub(user.club, actionId, at));
    }
    await tx.saveAction(result);
    return result;
  });
}

async function undoWipe(repo, {actor, actionId}) {
  checkOwner(actor);
  checkActionId(actionId);
  return repo.transaction(async tx => {
    const action = await tx.getAction(actionId);
    if (!action || action.undone) throw Error('No existe un sorteo pendiente de restauración.');
    if (!Array.isArray(action.accountIds) || action.accountIds.length !== 2)
      throw Error('Registro de operación incompleto.');
    // Check BOTH current states before modifying either.
    const restore = [];
    for (const id of action.accountIds) {
      const current = await tx.getClub(id);
      const snapshot = await tx.getSnapshot(actionId, id);
      if (!snapshot || current?.wipeState?.id !== actionId)
        throw Error('No se puede restaurar: el club fue modificado después del sorteo.');
      restore.push([id, snapshot]);
    }
    for (const [id, club] of restore) await tx.replaceClub(id, structuredClone(club));
    const result = {...action, undone:true};
    await tx.saveAction(result);
    return result;
  });
}

module.exports = {OWNER_ID, secureIndex, selectTwoAccounts, emptyClub, wipeTwo, undoWipe};

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VisionFrame} from '../dream/vision-adapter.js';
import {FootballSimulation} from '../dream/football.js';
import * as C from '../dream/career.js';
const players=C.unpack(JSON.parse(readFileSync(new URL('../dream/data/players.json',import.meta.url))));
const byId=new Map(players.map(p=>[p.id,p]));
test('the 10.0 renderer uses real identities and never changes the football simulation',()=>{
 const s=C.newCareer(players,42),sim=new FootballSimulation({roster:s.lineup.map(id=>byId.get(id))}),view=new VisionFrame();
 sim.time=.2;sim.players[9].vx=5;const before=JSON.stringify(sim),frame=view.update(sim);
 assert.equal(frame.players.length,22);assert.equal(frame.players[0].pos,'POR');assert.match(frame.players[9].id,/^real:\d+$/);assert.equal(frame.players[11].real,false);
 assert.equal(JSON.stringify(sim),before);assert.equal(frame.controlled,sim.controlled);assert.equal(frame.ball,sim.ball);
 const run=frame.players[9].run;assert.equal(view.update(sim).players[9].run,run,'animation freezes at the same simulation time');
 view.event({type:'goal',team:0},sim);assert.equal(view.update(sim).phase,'goal');sim.time+=3;assert.equal(view.update(sim).phase,'playing');
});
test('10.0 preserves older DREAM saves and validates the new video settings',()=>{
 const s=C.newCareer(players,42);delete s.settings.quality;delete s.settings.stadium;
 const migrated=C.validateSave(s,byId);assert.equal(migrated.settings.quality,'high');assert.equal(migrated.settings.stadium,'night');assert.equal(migrated.coins,s.coins);assert.deepEqual(migrated.roster,s.roster);
 for(const camera of ['stadium','immersive','tele','broadcast','wide'])for(const quality of ['low','medium','high','ultra'])assert.equal(C.validateSave({...migrated,settings:{...migrated.settings,camera,quality}},byId).settings.camera,camera);
 assert.throws(()=>C.validateSave({...migrated,settings:{...migrated.settings,quality:'invalid'}},byId));
 assert.equal(C.SAVE_KEY,'aura_dream_career_v03');
});

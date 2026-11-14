"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const FPS=require('../match-fps-99');
test('render frame meter reports 60 fps for actual completed frames',()=>{
  const meter=FPS.createMeter();let sample=null;
  for(let n=0;n<=90;n++)sample=meter.push(n*1000/60)||sample;
  assert.ok(sample);assert.equal(sample.fps,60);
  assert.ok(Math.abs(sample.ms-16.7)<.15);
});
test('render frame meter reports 30 fps and ignores duplicate/non-finite callbacks',()=>{
  const meter=FPS.createMeter();let result=null;
  for(let n=0;n<=45;n++)result=meter.push(n*1000/30)||result;
  assert.equal(result.fps,30);assert.equal(meter.push(1500),null);
  assert.equal(meter.push(NaN),null);
  meter.reset();assert.equal(meter.push(5000),null);
});
test('render frame meter handles frame pacing changes rather than returning a fixed estimate',()=>{
  const meter=FPS.createMeter();let result;
  for(let n=0;n<80;n++)result=meter.push(n*1000/40)||result;
  assert.equal(result.fps,40);
  for(let n=0;n<80;n++)result=meter.push(2000+n*1000/20)||result;
  assert.equal(result.fps,20);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('both fixed-link entries use new VISION runtime paths containing the tested source',()=>{
 const aliases={
  'match-presentation.js':'match-presentation-941.js','human-sprites.js':'human-sprites-94.js',
  'software-graphics.js':'software-graphics-941.js','match-graphics.js':'match-graphics-941.js',
  'match-preferences.js':'match-preferences-94.js','match-ui.js':'match-ui-94.js',
  'evolution-ui-61.js':'evolution-ui-95.js','game-6.js':'game-94.js'
 };
 for(const [source,production] of Object.entries(aliases)){
  assert.equal(read(production),read(source),production+' must contain the tested implementation');
  for(const entry of ['index.html','mobile.html']){
   const html=read(entry);assert.ok(html.includes('./'+production+'?v='+(production.endsWith('-941.js')?'9.4.1-camera':'9.4-motion')));
   assert.ok(!html.includes('./'+source+'?'),'stale CDN paths must not be mixed into this release');
  }
 }
});

test('the stadium presentation stylesheet has a fresh CDN path in both entries',()=>{
 assert.equal(read('match-vision-94.css'),read('match-vision.css'));
 for(const entry of ['index.html','mobile.html'])assert.ok(read(entry).includes('./match-vision-94.css?v=9.4-motion'));
});

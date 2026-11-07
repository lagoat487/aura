'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('both fixed-link entries use new VISION runtime paths containing the tested source',()=>{
 const aliases={
  'match-look.js':'match-look-96.js','match-materials.js':'match-materials-96.js','match-presentation.js':'match-presentation-96.js','human-sprites.js':'human-sprites-96.js',
  'software-graphics.js':'software-graphics-96.js','match-graphics.js':'match-graphics-96.js',
  'match-preferences.js':'match-preferences-96.js','match-ui.js':'match-ui-96.js',
  'evolution-ui-61.js':'evolution-ui-97.js','game-6.js':'game-96.js'
 };
 for(const entry of ['index.html','mobile.html']){const html=read(entry);for(const dependency of ['assets/models/jersey-landmarks-95.js','match-materials-96.js']){assert.ok(html.includes('./'+dependency+'?v=9.6-cinema'));assert.ok(html.indexOf(dependency)<html.indexOf('human-sprites-96.js'));}}
 for(const [source,production] of Object.entries(aliases)){
  assert.equal(read(production),read(source),production+' must contain the tested implementation');
  for(const entry of ['index.html','mobile.html']){
   const html=read(entry);assert.ok(html.includes('./'+production+'?v=9.6-cinema'));
   assert.ok(!html.includes('./'+source+'?'),'stale CDN paths must not be mixed into this release');
  }
 }
});

test('the stadium presentation stylesheet has a fresh CDN path in both entries',()=>{
 assert.equal(read('match-vision-96.css'),read('match-vision.css'));
 for(const entry of ['index.html','mobile.html'])assert.ok(read(entry).includes('./match-vision-96.css?v=9.6-cinema'));
});

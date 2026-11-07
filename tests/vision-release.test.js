'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('both fixed-link entries use new VISION runtime paths containing the tested source',()=>{
 const aliases={
  'match-materials.js':'match-materials-95.js','match-presentation.js':'match-presentation-95.js','human-sprites.js':'human-sprites-95.js',
  'software-graphics.js':'software-graphics-95.js','match-graphics.js':'match-graphics-95.js',
  'match-preferences.js':'match-preferences-95.js','match-ui.js':'match-ui-95.js',
  'evolution-ui-61.js':'evolution-ui-96.js','game-6.js':'game-95.js'
 };
 for(const entry of ['index.html','mobile.html']){const html=read(entry);for(const dependency of ['assets/models/jersey-landmarks-95.js','match-materials-95.js']){assert.ok(html.includes('./'+dependency+'?v=9.5-materials'));assert.ok(html.indexOf(dependency)<html.indexOf('human-sprites-95.js'));}}
 for(const [source,production] of Object.entries(aliases)){
  assert.equal(read(production),read(source),production+' must contain the tested implementation');
  for(const entry of ['index.html','mobile.html']){
   const html=read(entry);assert.ok(html.includes('./'+production+'?v=9.5-materials'));
   assert.ok(!html.includes('./'+source+'?'),'stale CDN paths must not be mixed into this release');
  }
 }
});

test('the stadium presentation stylesheet has a fresh CDN path in both entries',()=>{
 assert.equal(read('match-vision-95.css'),read('match-vision.css'));
 for(const entry of ['index.html','mobile.html'])assert.ok(read(entry).includes('./match-vision-95.css?v=9.5-materials'));
});

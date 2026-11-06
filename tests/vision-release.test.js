'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('both fixed-link entries use new VISION runtime paths containing the tested source',()=>{
 const aliases={
  'match-presentation.js':'match-presentation-92.js','human-sprites.js':'human-sprites-92.js',
  'software-graphics.js':'software-graphics-92.js','match-graphics.js':'match-graphics-92.js',
  'match-preferences.js':'match-preferences-92.js','match-ui.js':'match-ui-92.js',
  'evolution-ui-61.js':'evolution-ui-93.js','game-6.js':'game-92.js'
 };
 for(const [source,production] of Object.entries(aliases)){
  assert.equal(read(production),read(source),production+' must contain the tested implementation');
  for(const entry of ['index.html','mobile.html']){
   const html=read(entry);assert.ok(html.includes('./'+production+'?v='+(source==='evolution-ui-61.js'?'9.2-retired-argentina':'9.2-field')));
   assert.ok(!html.includes('./'+source+'?'),'stale CDN paths must not be mixed into this release');
  }
 }
});

"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
test("mobile.html is a separate production entry to seven independent mode screens",()=>{
 const mobile=read("mobile.html"),desktop=read("index.html");
 assert.match(mobile,/<meta name="viewport" content="width=device-width, initial-scale=1">/);
 assert.match(mobile,/<body class="aura-mobile-entry">/);
 assert.match(mobile,/AURA VISION 9\.9 · VERSIÓN MÓVIL/);
 assert.match(mobile,/7 modos separados/);
 assert.match(mobile,/href="\.\/mode-hub\.css(?:\?[^"\s]*)?"/);
 assert.match(mobile,/src="\.\/evolution-ui-99-pvf1\.js(?:\?[^"\s]*)?"/);
 assert.match(mobile,/src="\.\/game-99\.js\?v=9\.9-masks"/);
 const assets=html=>Array.from(html.matchAll(/(?:src|href)="\.\/([^"?#]+)/g),m=>m[1]);
 assert.deepEqual(assets(mobile),assets(desktop),"mobile must load the same game code and assets");
 assert.match(read("evolution-ui.js"),/function modeHub\(\)/);
 assert.match(read("evolution-ui.js"),/aura-mode-cards/);
 assert.match(mobile,/src="\.\/skill-games\.js\?v=7\.5"/);
 assert.match(mobile,/href="\.\/skill-games\.css\?v=7\.7"/);
 assert.match(read("evolution-ui.js"),/function skillPanel\(\)/);
 assert.match(read("mobile-mode.css"),/grid-template-columns:minmax\(0,1fr\)/,"mobile cards stack");
});
test("production builder explicitly copies mobile.html",()=>{
 assert.match(read("scripts/build.cjs"),/const files=\["index\.html","mobile\.html"/);
});


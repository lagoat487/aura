
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Canonical index uses the same seven single-column mobile layout as mobile.html",()=>{
  const index=read("index.html"),mobile=read("mobile.html"),css=read("mobile-mode.css");
  for(const html of [index,mobile]){
    assert.match(html,/<body class="aura-mobile-entry">/);
    assert.match(html,/href="\.\/mobile-mode\.css\?v=5\.7"/);
    assert.match(html,/href="\.\/mode-hub\.css/);
    assert.ok(html.indexOf("mode-hub.css")<html.indexOf("mobile-mode.css"));
  }
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/body\.aura-mobile-entry \.aura-mode-launch/);
  assert.match(css,/@media\(max-width:650px\)/);
  const modes=read("evolution-ui.js");
  for(const mode of ["career","quick","draft","pro","cup","ultimate","street"])
    assert.match(modes,new RegExp('\\["'+mode+'","0[1-7]"'));
});

test("All seven mode cards expose saved progress on desktop and mobile",()=>{
  const modes=read("evolution-ui.js"),css=read("mode-progress.css");
  assert.match(modes,/AuraModeProgress\.progressLabel\(id,progress\)/);
  assert.match(modes,/class="aura-mode-progress"/);
  assert.match(css,/\.aura-mode-progress\{/);
  for(const html of [read("index.html"),read("mobile.html")]){
    assert.match(html,/mode-progress\.js\?v=5\.9/);
    assert.match(html,/mode-progress\.css\?v=5\.9/);
    assert.match(html,/evolution-ui\.js\?v=7\.7-goal/);
  }
});

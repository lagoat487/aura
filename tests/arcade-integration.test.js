"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("Mobile and canonical entries load practice and match preferences before dependent code",()=>{
 for(const html of [read("index.html"),read("mobile.html")]){
  assert.match(html,/skill-games\.js\?v=7\.5/);
  assert.match(html,/skill-games\.css\?v=7\.7/);
  assert.match(html,/match-preferences-92\.js\?v=9\.2-field/);
  assert.match(html,/matchday\.css\?v=7\.1/);
  assert.match(html,/match-engine\.js\?v=7\.8-continuous/);
  assert.match(html,/match-ui-92\.js\?v=9\.2-field/);
  assert.match(html,/quick-formations\.js\?v=7\.6/);
  assert.match(html,/quick-formations\.css\?v=7\.4/);
  assert.ok(html.indexOf("skill-games.js")<html.indexOf("evolution-ui-92.js"));
  assert.ok(html.indexOf("match-preferences-92.js")<html.indexOf("match-ui-92.js"));
  assert.ok(html.indexOf("quick-formations.js")<html.indexOf("evolution-ui-92.js"));
 }
});
test("Match setup exposes four real presets and saves only after confirmed kickoff",()=>{
 const ui=read("match-ui-92.js"),evolution=read("evolution-ui.js");
 for(const key of ["fast","classic","epic","vision"]){
  assert.match(ui,new RegExp('data-match-preset="'+key+'"'));
 }
 assert.match(ui,/persistPreferences\(\);/);
 assert.match(ui,/AuraMatchPreferences\.load/);
 assert.match(evolution,/function skillPanel\(\)/);
 assert.match(evolution,/skillFeedback/);
 assert.match(evolution,/skillBest=AuraSkillGames\.finish/);
});

test("Keeper drill hides the shot side until a save attempt and retains focus between attempts",()=>{
 const ui=read("evolution-ui.js");
 assert.match(ui,/g\.kind==="keeping"/);
 assert.match(ui,/Adivina el lado al que irá el balón/);
 assert.match(ui,/result\.target\.lane/);
 assert.match(ui,/skillFocus/);
 assert.match(ui,/focus\(\{preventScroll:true\}\)/);
});

test("Practice uses visual goal lanes with a truthful previous shot marker",()=>{
 const ui=read("evolution-ui.js"),css=read("skill-games.css");
 assert.match(ui,/skill-goal-visual/);
 assert.match(ui,/skill-goal-cell/);
 assert.match(ui,/skill-last-ball/);
 assert.match(ui,/K\.target\(\{\.\.\.g,turn:g\.turn-1\}\)/);
 assert.match(css,/\.skill-goal-net\{/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});


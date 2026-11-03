"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("Mobile and canonical entries load practice and match preferences before dependent code",()=>{
 for(const html of [read("index.html"),read("mobile.html")]){
  assert.match(html,/skill-games\.js\?v=7\.0/);
  assert.match(html,/skill-games\.css\?v=7\.0/);
  assert.match(html,/match-preferences\.js\?v=7\.1/);
  assert.match(html,/matchday\.css\?v=7\.1/);
  assert.match(html,/match-ui\.js\?v=7\.2-formations/);
  assert.match(html,/quick-formations\.js\?v=7\.2/);
  assert.match(html,/quick-formations\.css\?v=7\.4/);
  assert.ok(html.indexOf("skill-games.js")<html.indexOf("evolution-ui.js"));
  assert.ok(html.indexOf("match-preferences.js")<html.indexOf("match-ui.js"));
  assert.ok(html.indexOf("quick-formations.js")<html.indexOf("evolution-ui.js"));
 }
});
test("Match setup exposes three real presets and saves only after confirmed kickoff",()=>{
 const ui=read("match-ui.js"),evolution=read("evolution-ui.js");
 for(const key of ["fast","classic","epic"]){
  assert.match(ui,new RegExp('data-match-preset="'+key+'"'));
 }
 assert.match(ui,/persistPreferences\(\);/);
 assert.match(ui,/AuraMatchPreferences\.load/);
 assert.match(evolution,/function skillPanel\(\)/);
 assert.match(evolution,/skillFeedback/);
 assert.match(evolution,/skillBest=AuraSkillGames\.finish/);
});

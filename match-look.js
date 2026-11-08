/* Shared physical lighting, avatar styling and perspective LED board artwork. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./match-faces-98'):root.AuraFaces,typeof module==='object'&&module.exports?require('./match-face-masks-99'):root.AuraFaceMasks);if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraLook=api;})(typeof globalThis!=='undefined'?globalThis:this,function(F,FM){
 'use strict';
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const hash=s=>{let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
 // Distinctive *approximate* art direction, not face scans or actual 3D likenesses.
 const heroProfiles=[
  [/lamine|yamal/,{skin:'#ad7958',hair:'#211a16',hairStyle:4,faceShape:1,beard:false}],
  [/lionel.*messi|\bmessi\b/,{skin:'#c59876',hair:'#352a24',hairStyle:1,faceShape:4,beard:true}],
  [/luis (alberto )?suarez|luis suarez diaz/,{skin:'#c79979',hair:'#241d1a',hairStyle:1,faceShape:3,beard:true}],
  [/vinicius|vini jr/,{skin:'#815336',hair:'#171616',hairStyle:2,faceShape:2,beard:false}],
  [/mbappe/,{skin:'#a47754',hair:'#211c19',hairStyle:2,faceShape:3,beard:false}],
  [/bellingham/,{skin:'#a07554',hair:'#24201a',hairStyle:4,faceShape:1,beard:false}],
  [/haaland/,{skin:'#e1b998',hair:'#bca77a',hairStyle:1,faceShape:5,beard:false}],
  [/pedri/,{skin:'#c69775',hair:'#2b221c',hairStyle:1,faceShape:4,beard:true}],
  [/raphinha/,{skin:'#b38562',hair:'#27211d',hairStyle:2,faceShape:2,beard:true}],
  [/lewandowski/,{skin:'#d4a584',hair:'#332921',hairStyle:1,faceShape:3,beard:false}],
  [/de jong/,{skin:'#d7b293',hair:'#755d42',hairStyle:1,faceShape:5,beard:false}],
  [/mohamed.*salah|mo salah/,{skin:'#b98461',hair:'#181617',hairStyle:4,faceShape:3,beard:true}],
  [/saka/,{skin:'#846044',hair:'#201a19',hairStyle:2,faceShape:2,beard:false}],
  [/cole.*palmer/,{skin:'#d4ad8e',hair:'#46362a',hairStyle:1,faceShape:5,beard:false}],
  [/florian.*wirtz/,{skin:'#d2a887',hair:'#4b3627',hairStyle:1,faceShape:4,beard:false}],
  [/harry.*kane/,{skin:'#d5ab87',hair:'#4c382a',hairStyle:1,faceShape:3,beard:true}],
  [/lautaro.*martinez/,{skin:'#bf8c6c',hair:'#281f1b',hairStyle:2,faceShape:3,beard:true}],
  [/kvaratskhelia/,{skin:'#c99d7e',hair:'#2d251f',hairStyle:1,faceShape:4,beard:true}],
  [/dembele/,{skin:'#8e6348',hair:'#1b1818',hairStyle:2,faceShape:2,beard:false}],
  [/nico paz|nicolas.*paz/,{skin:'#cb9d78',hair:'#342720',hairStyle:1,faceShape:4,beard:false}],
  [/kevin.*de bruyne/,{skin:'#dab49a',hair:'#9c8062',hairStyle:1,faceShape:5,beard:true}],
  [/valverde/,{skin:'#c69b7d',hair:'#342720',hairStyle:2,faceShape:3,beard:false}],
  [/julian.*alvarez/,{skin:'#c59471',hair:'#392922',hairStyle:1,faceShape:4,beard:false}],
  [/thiago.*almada/,{skin:'#bf8e69',hair:'#30221c',hairStyle:2,faceShape:4,beard:false}]
 ];
 function avatar(player,fallback){
  const name=normalize(player?.name),identity=String(player?.id||name);
  // Entire player catalogue, including the five major European leagues and Inter Miami,
  // receives a stable geometry variant when the player appears on the pitch.
  const shapeSeed=hash(identity+'|facial-structure'),hairSeed=hash(identity+'|hair');
  const look={...fallback,faceShape:shapeSeed%7,
   hairStyle:hairSeed%5,beard:(hash(identity+'|beard')%5)===0};
  const preset=heroProfiles.find(([pattern])=>pattern.test(name));
  if(preset)Object.assign(look,preset[1]);
  if(F)Object.assign(look,F.appearance(player));
  look.headScale=FM?.headScale||1.4;
  const mask=FM?.resolve(player);look.faceMaskKey=mask?.key||null;
  if(mask?.id==='277643')Object.assign(look,{hair:'#1c1b18',hairTop:null,hairStyle:4});
  return look;
 }
 function light(stadium,weather){
  const day=stadium==='day',sunset=stadium==='sunset',rain=weather==='rain';
  return {exposure:day?1.04:sunset?1.08:1.06,ambient:day?.92:.50,key:day?2.45:2.2,fill:day?.43:.35,rim:day?.38:.92,
   sky:rain?(day?0x687b86:0x182431):day?0x9ebac8:sunset?0x514855:0x080f1b,keyColor:sunset?0xffdac0:0xf2f4f5,rimColor:0xaecbff};
 }
 function board(canvas){
  const c=canvas(1024,128),ctx=c.getContext('2d');ctx.fillStyle='#080c16';ctx.fillRect(0,0,1024,128);
  for(const [x,color] of [[30,'#225db7'],[90,'#6c348e'],[805,'#7446ab'],[885,'#218e9c']]){
   const glow=ctx.createLinearGradient(x,0,x+110,128);glow.addColorStop(0,color+'00');glow.addColorStop(.5,color);glow.addColorStop(1,color+'00');ctx.fillStyle=glow;
   ctx.beginPath();ctx.moveTo(x,106);ctx.lineTo(x+110,14);ctx.lineTo(x+153,14);ctx.lineTo(x+43,106);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='#eeedf5';ctx.font='italic bold 77px Arial';ctx.textAlign='center';ctx.fillText('AURA',516,91);
  ctx.fillStyle='#334551';ctx.fillRect(0,122,1024,6);return c;
 }
 return {avatar,light,board};
});

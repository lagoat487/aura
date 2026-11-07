/* Shared physical lighting, avatar styling and perspective LED board artwork. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraLook=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function avatar(player,fallback){
  const name=normalize(player?.name),look={...fallback};
  // Art direction for recognisable silhouettes; these are not scanned likenesses.
  const profiles=[[/lamine|yamal/,{skin:'#ad7958',hair:'#211a16',height:1.79,build:.94,hairStyle:4,beard:false}],
   [/vinicius|vini jr/,{skin:'#815336',hair:'#171616',height:1.77,build:.97,hairStyle:2,beard:false}],
   [/mbappe/,{skin:'#a47754',hair:'#211c19',height:1.80,build:1.03,hairStyle:2,beard:false}],
   [/bellingham/,{skin:'#a07554',hair:'#24201a',height:1.86,build:.99,hairStyle:4,beard:false}],
   [/pedri/,{skin:'#c69775',hair:'#2b221c',height:1.76,build:.92,hairStyle:1,beard:true}],
   [/raphinha/,{skin:'#b38562',hair:'#27211d',height:1.76,build:.97,hairStyle:2,beard:true}],
   [/lewandowski/,{skin:'#d4a584',hair:'#332921',height:1.85,build:1.02,hairStyle:1,beard:false}],
   [/de jong/,{skin:'#d7b293',hair:'#755d42',height:1.82,build:.96,hairStyle:1,beard:false}]];
  const profile=profiles.find(([pattern])=>pattern.test(name));if(profile)Object.assign(look,profile[1]);
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

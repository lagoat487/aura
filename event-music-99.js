/* Timed playback controls for the official YouTube embed. No downloaded audio. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraEventMusic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const CONFIG={title:'TIKI TIKI',artist:'QMIIR',videoId:'xVS4zgb9AuU',startsAt:'2026-11-11T15:45:00.000Z',expiresAt:'2026-11-11T16:00:00.000Z',url:'https://www.youtube.com/watch?v=xVS4zgb9AuU'};
  function create(player,{now=Date.now,config=CONFIG,onChange=()=>{}}={}){
    const start=Date.parse(config.startsAt),end=Date.parse(config.expiresAt);
    const state={armed:false,ready:false,attempted:false,phase:'off'};
    const emit=()=>onChange({...state});
    function play(){if(now()>=end){state.phase='expired';emit();return;}state.attempted=true;state.phase='starting';player.seekTo(0,true);player.unMute();player.setVolume(55);player.playVideo();emit();}
    function arm(){state.armed=true;state.attempted=false;if(!state.ready){state.phase='loading';emit();return;}if(now()<start){state.phase='preparing';player.mute();player.playVideo();emit();}else play();}
    function ready(){state.ready=true;if(state.armed)arm();else emit();}
    function tick(){if(!state.armed||!state.ready||state.attempted)return;if(now()>=end){state.phase='expired';emit();return;}if(now()>=start)play();}
    function changed(code){if(code===1){if(now()<start){player.pauseVideo();player.seekTo(0,true);state.phase=state.armed?'armed':'off';}else if(state.armed)state.phase='playing';else player.pauseVideo();}else if(code===0){state.phase='ended';state.attempted=true;}emit();}
    function blocked(){state.phase='blocked';emit();}
    function failed(){state.phase='error';state.attempted=true;emit();}
    function stop(){state.armed=false;state.phase='off';player.pauseVideo();emit();}
    return {arm,ready,tick,changed,blocked,failed,stop,state:()=>({...state})};
  }
  return {CONFIG,create};
});

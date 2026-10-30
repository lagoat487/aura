/* Real portraits by the footballer's numeric identity. No invented faces for real people.
   Official EA image URL pattern verified on its ratings/player-ratings pages. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraPortraits=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function identity(p){const n=/^real:(\d{3,9})$/.exec(String(p?.id||""))?.[1]||/^real:(\d{3,9})$/.exec(String(p?.originalId||""))?.[1]||/^https:\/\/cdn\.sofifa\.net\/players\/(\d+)\/(\d+)\//.exec(p?.photo||"")?.slice(1).join("");return n?String(Number(n)):null;}
  function sources(p){
    if(!p?.real)return [];const id=identity(p),urls=[];
    if(id){urls.push('https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p'+id+'.png?padding=0.7');const padded=id.padStart(6,'0');for(const year of [26,25,24])urls.push('https://cdn.sofifa.net/players/'+padded.slice(0,-3)+'/'+padded.slice(-3)+'/'+year+'_120.png');}
    if(/^https:\/\/(www\.)?barcelonasc\.com\.ec\/wp-content\/uploads\/[a-zA-Z0-9/_.-]+\.(webp|png|jpe?g)$/.test(p.photo||''))urls.unshift(p.photo);
    return [...new Set(urls)];
  }
  function html(p,large=false){
    const urls=sources(p),initials=String(p.name||'AURA').split(/\s+/).slice(0,2).map(n=>n[0]).join(''),type=urls.length?'real':p.real?'missing':'created';
    return '<span class="tour-face portrait-'+type+' '+(large?'large':'')+'" title="'+(urls.length?'Retrato real; requiere conexión':p.real?'Foto no disponible para esta identidad':'Jugador creado')+'"><span class="portrait-initials">'+escape(initials)+'</span>'+(urls.length?'<img src="'+escape(urls[0])+'" data-portrait-sources="'+escape(JSON.stringify(urls))+'" data-portrait-index="0" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="Retrato de '+escape(p.name)+'" onerror="AuraPortraits.fallback(this)">':'')+'<small class="portrait-missing-label">'+(p.real?'Sin foto':'Creado')+'</small></span>';
  }
  function fallback(image){
    let urls=[];try{urls=JSON.parse(image.dataset.portraitSources||'[]');}catch{}
    const index=Number(image.dataset.portraitIndex||0)+1;
    if(index<urls.length){image.dataset.portraitIndex=String(index);image.src=urls[index];}
    else {image.hidden=true;image.parentElement?.classList.add('portrait-missing');}
  }
  return {identity,sources,html,fallback};
});

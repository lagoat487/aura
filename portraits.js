/* FC 27 portraits, shared by normal, event, SBC and previously saved cards.
   See docs/portraits.md for verified image sources and legacy identity rules. */
(function(root,factory){const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraPortraits=api;})(typeof globalThis!=="undefined"?globalThis:this,function(root){
  "use strict";
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[‘’]/g,"'").replace(/\s+/g," ").trim();
  // Missing/shortened names in the bundled catalogue. These are player IDs,
  // never item IDs or another footballer's photograph.
  const aliases=new Map([
    ["Kitu Díaz","189454"],["Damián Díaz","189454"],["Damián ‘Kitu’ Díaz","189454"],
    ["Jamie Vardy","208830"],["Neymar","190871"],["Neymar Jr","190871"],
    ["Neymar Júnior","190871"],["Neymar Junior","190871"],
    ["Vinícius Júnior","238794"],["Vinicius Junior","238794"]
  ].map(([name,id])=>[normalize(name),id]));
  let catalog=null,names=new Map();
  function catalogueIdentity(name){
    const bundled=root.AuraBundledWorld;
    if(bundled&&bundled!==catalog){
      catalog=bundled;names=new Map();
      const columns=bundled.columns||[],at=key=>columns.indexOf(key);
      const idAt=at("player_id"),commonAt=at("common_name"),firstAt=at("first_name"),lastAt=at("last_name");
      for(const row of bundled.rows||[]){
        const id=String(row[idAt]||"");if(!/^\d{3,9}$/.test(id))continue;
        for(const candidate of [row[commonAt],[row[firstAt],row[lastAt]].filter(Boolean).join(" ")]){
          const key=normalize(candidate);if(!key)continue;
          if(!names.has(key))names.set(key,id);else if(names.get(key)!==id)names.set(key,null);
        }
      }
    }
    return aliases.get(normalize(name))||names.get(normalize(name))||null;
  }
  const numeric=id=>/^real:(\d{3,9})$/.exec(String(id||""))?.[1];
  function identity(p){
    const n=numeric(p?.id)||numeric(p?.originalId)||/^https:\/\/cdn\.sofifa\.net\/players\/(\d{3})\/(\d{3})\/\d{2}_\d+\.png$/.exec(p?.photo||"")?.slice(1).join("");
    if(n)return String(Number(n));
    // Old event saves used World Cup IDs, or had no originalId at all.
    // Only those recognized formats may resolve by a unique exact full name.
    const id=String(p?.id||""),original=String(p?.originalId||"");
    const legacy=s=>/^wc26:\d+$/.test(s)||s==="verified:kitu-diaz";
    if(original&&!legacy(original))return null;
    if(!legacy(original||id)&&!/^(sigma|argentina|flashback|muralla|barcelona|magia|sbc):[a-z0-9-]+$/.test(id))return null;
    const linked=legacy(original||id)?root.AuraRosterSync?.getPlayer(original||id):null;
    return numeric(linked?.id)||catalogueIdentity(p?.name);
  }
  const customPhoto='https://aura-admin-emilio-99.emilio-hilman.chatgpt.site/assets/cards/jose-jose-99.jpeg';
  function sources(p){
    if(p?.real&&(p.originalId==='special:jose-jose-99'||p.id==='special:jose-jose-99'))return [customPhoto];
    if(!p?.real)return [];const id=identity(p),urls=[];
    if(id){
      const padded=id.padStart(6,'0'),sofifa=year=>'https://cdn.sofifa.net/players/'+padded.slice(0,-3)+'/'+padded.slice(-3)+'/'+year+'_120.png';
      urls.push('https://cdn.fifacm.com/content/media/imgs/fc27/players/p'+id+'.png?v=32',sofifa(27),
        'https://cdn.fifacm.com/content/media/imgs/fc26/players/p'+id+'.png?v=32',sofifa(26),
        'https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p'+id+'.png?padding=0.7',sofifa(25),sofifa(24));
    }
    if(/^https:\/\/(www\.)?barcelonasc\.com\.ec\/wp-content\/uploads\/[a-zA-Z0-9/_.-]+\.(webp|png|jpe?g)$/.test(p.photo||''))urls.unshift(p.photo);
    // Exact official Brian Fariñas portrait, verified with the 2026/27 roster.
    if(p.photo==="https://www.fcbarcelona.com/photo-resources/2026/09/03/b05e6b1b-fe32-4420-b981-36507d7dfeb0/04-Brian_Farinas.png?height=790&width=670")urls.unshift(p.photo);
    return [...new Set(urls)];
  }
  function html(p,large=false){
    const urls=sources(p),initials=String(p.name||'AURA').split(/\s+/).slice(0,2).map(n=>n[0]).join(''),type=urls.length?'real':p.real?'missing':'created';
    return '<span class="tour-face portrait-'+type+' '+(large?'large':'')+(urls[0]===customPhoto?' portrait-jose':'')+'" title="'+(urls.length?'Retrato real; requiere conexión':p.real?'Foto no disponible para esta identidad':'Jugador creado')+'"><span class="portrait-initials">'+escape(initials)+'</span>'+(urls.length?'<img src="'+escape(urls[0])+'" data-portrait-sources="'+escape(JSON.stringify(urls))+'" data-portrait-index="0" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="Retrato de '+escape(p.name)+'" onerror="AuraPortraits.fallback(this)">':'')+'<small class="portrait-missing-label">'+(p.real?'Sin foto':'Creado')+'</small></span>';
  }
  function fallback(image){
    let urls=[];try{urls=JSON.parse(image.dataset.portraitSources||'[]');}catch{}
    const index=Number(image.dataset.portraitIndex||0)+1;
    if(index<urls.length){image.dataset.portraitIndex=String(index);image.src=urls[index];}
    else {image.hidden=true;image.parentElement?.classList.add('portrait-missing');}
  }
  return {identity,sources,html,fallback};
});


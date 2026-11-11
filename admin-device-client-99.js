(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./live-events-99'):root.AuraLiveEvents);if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraAdminDevice=api;})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  function takeActivation(browser){const value=new URLSearchParams(browser.location.hash.slice(1)).get('activate')||'';if(browser.location.hash)browser.history.replaceState(null,'',browser.location.pathname);return value;}
  function create(fetcher,options={}){
    let connected=false,activation=options.activation||'';
    async function request(path,data){
      const response=await fetcher('/api/admin/'+path,{method:data?'POST':'GET',credentials:'same-origin',redirect:'error',cache:'no-store',...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
      let result;try{result=await response.json();}catch{throw Error('El servicio del evento no respondió. Vuelve a actualizar.');}
      if(!response.ok)throw Error(result.error||'No se pudo completar la operación.');return result;
    }
    async function connect(pin){connected=false;const result=await request('login',{pin:String(pin||'').trim(),activation});if(!result.ok)throw Error('No se confirmó el acceso.');connected=true;activation='';return {login:'creador'};}
    async function read(){if(!connected)throw Error('Introduce 42 para abrir el panel.');const result=await request('event'),feed=E.validate(result.feed);if(!feed||result.sha!==String(feed.revision))throw Error('El tablón contiene datos no válidos.');return {feed,sha:result.sha};}
    async function publish(expectedSha,mutate){const current=await read();if(current.sha!==expectedSha)throw Error('Otra publicación cambió el evento. Actualiza el panel.');const candidate=JSON.parse(JSON.stringify(current.feed));mutate(candidate);candidate.revision++;const feed=E.validate(candidate);if(!feed)throw Error('Revisa los datos y horarios del evento.');const result=await request('event',{baseRevision:current.feed.revision,feed}),saved=E.validate(result.feed);if(!saved||result.sha!==String(saved.revision))throw Error('No se confirmó la publicación. Actualiza antes de volver a intentar.');return {feed:saved,sha:result.sha};}
    function disconnect(){const wasConnected=connected;connected=false;if(wasConnected)request('logout',{}).catch(()=>{});}
    return {connect,read,publish,disconnect,isConnected:()=>connected};
  }
  return {create,takeActivation};
});

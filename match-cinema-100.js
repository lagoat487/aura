/* AURA 10.0. Local HDR image pipeline; no textures, services or saved data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraCinema=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function profile(quality,preview=false){
  const ultra=quality==='ultra',enabled=!preview&&(ultra||quality==='high');
  return Object.freeze({enabled,bloomScale:ultra?.5:.33,bloom:ultra?.14:.10,occlusion:ultra?.17:.12,vignette:.075});
 }
 const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
 const glow=`precision highp float;
 uniform sampler2D source;uniform vec2 texel;varying vec2 vUv;
 vec3 bright(vec2 p){vec3 c=texture2D(source,p).rgb;float l=max(c.r,max(c.g,c.b));return c*smoothstep(.8,1.8,l);}
 void main(){vec3 c=bright(vUv)*.20;
 c+=(bright(vUv+texel*vec2(3.,0.))+bright(vUv-texel*vec2(3.,0.))+bright(vUv+texel*vec2(0.,3.))+bright(vUv-texel*vec2(0.,3.)))*.12;
 c+=(bright(vUv+texel*vec2(3.,3.))+bright(vUv+texel*vec2(-3.,3.))+bright(vUv+texel*vec2(3.,-3.))+bright(vUv-texel*vec2(3.,3.)))*.08;
 gl_FragColor=vec4(c,1.);}`;
 const composite=`precision highp float;
 uniform sampler2D source;uniform sampler2D glowMap;uniform sampler2D depthMap;
 uniform vec2 texel;uniform vec2 glowTexel;uniform vec2 clip;uniform float bloomStrength;uniform float aoStrength;uniform float vignette;
 varying vec2 vUv;
 float luminance(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
 float depthAt(vec2 p){float d=texture2D(depthMap,p).x;return (clip.x*clip.y)/(clip.y-d*(clip.y-clip.x));}
 void main(){
 vec3 center=texture2D(source,vUv).rgb;
 vec3 n=texture2D(source,vUv+vec2(0.,texel.y)).rgb,s=texture2D(source,vUv-vec2(0.,texel.y)).rgb;
 vec3 e=texture2D(source,vUv+vec2(texel.x,0.)).rgb,w=texture2D(source,vUv-vec2(texel.x,0.)).rgb;
 float edge=max(max(luminance(n),luminance(s)),max(luminance(e),luminance(w)))-min(min(luminance(n),luminance(s)),min(luminance(e),luminance(w)));
 vec3 color=mix(center,(n+s+e+w+center*4.)/8.,smoothstep(.12,.65,edge)*.45);
 if(aoStrength>0.){float depth=depthAt(vUv),ao=0.;
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 offset=vec2(cos(a),sin(a))*texel*5.;float delta=depth-depthAt(vUv+offset);ao+=smoothstep(.025,.28,delta)*(1.-smoothstep(.5,1.8,abs(delta)));}
 color*=1.-ao*.125*aoStrength;}
 vec3 light=texture2D(glowMap,vUv).rgb*.24;
 light+=(texture2D(glowMap,vUv+glowTexel*vec2(2.,0.)).rgb+texture2D(glowMap,vUv-glowTexel*vec2(2.,0.)).rgb+texture2D(glowMap,vUv+glowTexel*vec2(0.,2.)).rgb+texture2D(glowMap,vUv-glowTexel*vec2(0.,2.)).rgb)*.19;
 color+=light*bloomStrength;
 color=mix(vec3(luminance(color)),color,1.045);
 vec2 p=vUv*2.-1.;color*=1.-vignette*dot(p,p)*.5;
 gl_FragColor=vec4(max(color,vec3(0.)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
 function create(T,renderer,scene,camera,options={}){
  const settings=profile(options.quality,options.preview);
  if(!settings.enabled||!renderer.getDrawingBufferSize||!renderer.setRenderTarget||!T.WebGLRenderTarget)return null;
  // Half floats retain floodlight highlights before the final ACES exposure.
  const hdr=renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float');
  const target=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true});
  const hasDepth=renderer.capabilities.isWebGL2||renderer.extensions.has('WEBGL_depth_texture');
  if(hasDepth)target.depthTexture=new T.DepthTexture(1,1,T.UnsignedShortType);
  const bloomTarget=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:false});
  const geometry=new T.PlaneGeometry(2,2),postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const glowMaterial=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:glow,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source:{value:target.texture},texel:{value:new T.Vector2(1,1)}}});
  const finalMaterial=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:composite,depthTest:false,depthWrite:false,toneMapped:true,uniforms:{source:{value:target.texture},glowMap:{value:bloomTarget.texture},depthMap:{value:target.depthTexture||target.texture},texel:{value:new T.Vector2(1,1)},glowTexel:{value:new T.Vector2(1,1)},clip:{value:new T.Vector2(camera.near,camera.far)},bloomStrength:{value:hdr?settings.bloom:settings.bloom*.3},aoStrength:{value:hasDepth?settings.occlusion:0},vignette:{value:settings.vignette}}});
  const quad=new T.Mesh(geometry,glowMaterial);quad.frustumCulled=false;postScene.add(quad);
  const buffer=new T.Vector2();let width=0,height=0,disposed=false;
  function resize(){
   renderer.getDrawingBufferSize(buffer);const w=Math.max(1,Math.round(buffer.x)),h=Math.max(1,Math.round(buffer.y));
   if(w===width&&h===height)return;width=w;height=h;
   const bw=Math.max(1,Math.round(w*settings.bloomScale)),bh=Math.max(1,Math.round(h*settings.bloomScale));target.setSize(w,h);bloomTarget.setSize(bw,bh);
   glowMaterial.uniforms.texel.value.set(1/w,1/h);finalMaterial.uniforms.texel.value.set(1/w,1/h);finalMaterial.uniforms.glowTexel.value.set(1/bw,1/bh);
  }
  function render(){
   if(disposed)return;resize();const previous=renderer.getRenderTarget(),tone=renderer.toneMapping;
   try{
    renderer.toneMapping=T.NoToneMapping;renderer.setRenderTarget(target);renderer.render(scene,camera);
    quad.material=glowMaterial;renderer.setRenderTarget(bloomTarget);renderer.render(postScene,postCamera);
    renderer.toneMapping=tone;quad.material=finalMaterial;renderer.setRenderTarget(previous);renderer.render(postScene,postCamera);
   }finally{renderer.toneMapping=tone;renderer.setRenderTarget(previous);}
  }
  function dispose(){if(disposed)return;disposed=true;target.dispose();target.depthTexture?.dispose();bloomTarget.dispose();geometry.dispose();glowMaterial.dispose();finalMaterial.dispose();}
  return {render,resize,dispose,settings};
 }
 return {profile,create};
});

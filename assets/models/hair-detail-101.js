/* Original fine curl geometry, generated locally; head-bone coordinates. */
(function(root){'use strict';const p=[],n=[],f=[];
 const count=126,steps=17,sides=5;
 for(let i=0;i<count;i++){
  const h=(i+.5)/count,a=i*2.39996323,r=Math.sqrt(1-h*h),c=[Math.cos(a)*r*.110,1.795+h*.078,-.012+Math.sin(a)*r*.108],up=[Math.cos(a)*r,h,Math.sin(a)*r],u=[-Math.sin(a),0,Math.cos(a)],v=[-h*Math.cos(a),r,-h*Math.sin(a)],radius=.0075+(i%5)*.0007,start=p.length/3;
  for(let j=0;j<steps;j++){
   const t=j/(steps-1),phi=t*Math.PI*3.7+i*.7,co=Math.cos(phi),si=Math.sin(phi),centre=c.map((q,k)=>q+up[k]*t*.018+(u[k]*co+v[k]*si)*radius);
   for(let k=0;k<sides;k++){const theta=k/sides*Math.PI*2,norm=up.map((q,d)=>Math.cos(theta)*(u[d]*co+v[d]*si)+Math.sin(theta)*q);p.push(...centre.map((q,d)=>q+norm[d]*.00165));n.push(...norm);}
  }
  for(let j=0;j<steps-1;j++)for(let k=0;k<sides;k++){const a=start+j*sides+k,b=start+j*sides+(k+1)%sides,c=b+sides,d=a+sides;f.push(a,b,c,a,c,d);}
 }
 const data={positions:new Float32Array(p),normals:new Float32Array(n),indices:new Uint16Array(f),head:[0,1.71357,.04949]};
 if(typeof module==='object'&&module.exports)module.exports=data;else root.AuraHairDetail=data;
})(typeof globalThis!=='undefined'?globalThis:this);

/* Procedural head-bound curls for the clothed AURA avatar. */
(function(root){const p=[],n=[],f=[];
for(let i=0;i<58;i++){const h=(i+.5)/58,a=i*2.39996323,t=Math.sqrt(1-h*h),c=[Math.cos(a)*t*.113,1.795+h*.077,-.012+Math.sin(a)*t*.109],r=.018+(i%7)*.0012,start=p.length/3;
 for(let row=0;row<7;row++)for(let col=0;col<10;col++){const theta=row/6*Math.PI,phi=col/10*Math.PI*2,x=Math.sin(theta)*Math.cos(phi),y=Math.cos(theta),z=Math.sin(theta)*Math.sin(phi);p.push(c[0]+x*r,c[1]+y*r*.85,c[2]+z*r);n.push(x,y,z);}
 for(let row=0;row<6;row++)for(let col=0;col<10;col++){const a=start+row*10+col,b=start+row*10+(col+1)%10,c=b+10,d=a+10;f.push(a,b,c,a,c,d);}}
const data={positions:new Float32Array(p),normals:new Float32Array(n),indices:new Uint16Array(f),head:[0.0,1.7135699999999998,0.049490000000000006]};if(typeof module==='object'&&module.exports)module.exports=data;else root.AuraCurlMesh=data;})(typeof globalThis!=='undefined'?globalThis:this);

// Bake the full head's coverage, depth-tested against the full rig.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <vector>
static float clamp(float x,float lo,float hi){return std::max(lo,std::min(hi,x));}
extern "C" void raster(const float* screen,const float* normals,const float* rest,const int* faces,const int* slots,int triangles,int width,int height,const float* axes,uint8_t* result){
 std::vector<float> depth(width*height,-1e20f);std::memset(result,0,width*height*4);
 for(int face=0;face<triangles;face++){
  int a=faces[face*3],b=faces[face*3+1],c=faces[face*3+2],mat=slots[face];
  const float *p=screen+a*3,*q=screen+b*3,*r=screen+c*3;
  float den=(q[1]-r[1])*(p[0]-r[0])+(r[0]-q[0])*(p[1]-r[1]);if(std::abs(den)<1e-7f)continue;
  bool faceSkin=(mat==2||mat==5||mat==7)&&std::min({rest[a*3+1],rest[b*3+1],rest[c*3+1]})>1.615f;
  int x0=std::max(0,(int)std::floor(std::min({p[0],q[0],r[0]}))),x1=std::min(width-1,(int)std::ceil(std::max({p[0],q[0],r[0]})));
  int y0=std::max(0,(int)std::floor(std::min({p[1],q[1],r[1]}))),y1=std::min(height-1,(int)std::ceil(std::max({p[1],q[1],r[1]})));
  for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){
   float u=((q[1]-r[1])*(x+.5f-r[0])+(r[0]-q[0])*(y+.5f-r[1]))/den;
   float v=((r[1]-p[1])*(x+.5f-r[0])+(p[0]-r[0])*(y+.5f-r[1]))/den,w=1-u-v;
   if(u<-.00001f||v<-.00001f||w<-.00001f)continue;
   int at=y*width+x;float z=u*p[2]+v*q[2]+w*r[2];if(z<depth[at])continue;depth[at]=z;
   uint8_t* out=result+at*4;if(!faceSkin){out[0]=out[1]=out[2]=out[3]=0;continue;}
   float n[3],position[3];for(int k=0;k<3;k++){n[k]=u*normals[a*3+k]+v*normals[b*3+k]+w*normals[c*3+k];position[k]=u*rest[a*3+k]+v*rest[b*3+k]+w*rest[c*3+k];}
   float length=std::sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2])+1e-9f;for(float& k:n)k/=length;
   float nx=n[0]*axes[0]+n[1]*axes[1]+n[2]*axes[2],ny=n[0]*axes[3]+n[1]*axes[4]+n[2]*axes[5],nz=n[0]*axes[6]+n[1]*axes[7]+n[2]*axes[8];
   float light=.42f+std::max(0.f,-nx*.45f+ny*.70f+nz*.55f)*.53f+std::max(0.f,nx*.83f+ny*.40f-nz*.18f)*.15f;
   out[0]=(uint8_t)(clamp((position[0]+.13f)/.26f,0,1)*255);
   out[1]=(uint8_t)(clamp((1.84f-position[1])/.24f,0,1)*255);
   out[2]=(uint8_t)(clamp(light/1.25f,0,1)*255);out[3]=255;
  }
 }
}

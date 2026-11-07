// Offline smooth-normal rasterizer for the live compatible player's material atlas.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <vector>
static float clamp(float x,float lo,float hi){return std::max(lo,std::min(hi,x));}
extern "C" void raster(const float* screen,const float* normals,const float* rest,const int* faces,const int* slots,int triangles,int baseTriangles,int width,int height,const float* axes,uint8_t* base,uint8_t* result){
 std::vector<float> depth(width*height,-1e20f);std::memset(result,0,width*height*4);
 for(int face=0;face<triangles;face++){
  if(face==baseTriangles)std::memcpy(base,result,width*height*4);
  int a=faces[face*3],b=faces[face*3+1],c=faces[face*3+2],mat=slots[face];
  const float *p=screen+a*3,*q=screen+b*3,*r=screen+c*3;
  float den=(q[1]-r[1])*(p[0]-r[0])+(r[0]-q[0])*(p[1]-r[1]);if(std::abs(den)<1e-7f)continue;
  int x0=std::max(0,(int)std::floor(std::min({p[0],q[0],r[0]}))),x1=std::min(width-1,(int)std::ceil(std::max({p[0],q[0],r[0]})));
  int y0=std::max(0,(int)std::floor(std::min({p[1],q[1],r[1]}))),y1=std::min(height-1,(int)std::ceil(std::max({p[1],q[1],r[1]})));
  for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){
   float u=((q[1]-r[1])*(x+.5f-r[0])+(r[0]-q[0])*(y+.5f-r[1]))/den;
   float v=((r[1]-p[1])*(x+.5f-r[0])+(p[0]-r[0])*(y+.5f-r[1]))/den,w=1-u-v;
   if(u<-.00001f||v<-.00001f||w<-.00001f)continue;
   int at=y*width+x;float z=u*p[2]+v*q[2]+w*r[2];if(z<depth[at])continue;depth[at]=z;
   float n[3],position[3];for(int k=0;k<3;k++){n[k]=u*normals[a*3+k]+v*normals[b*3+k]+w*normals[c*3+k];position[k]=u*rest[a*3+k]+v*rest[b*3+k]+w*rest[c*3+k];}
   float length=std::sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2])+1e-9f;for(float& k:n)k/=length;
   float nx=n[0]*axes[0]+n[1]*axes[1]+n[2]*axes[2],ny=n[0]*axes[3]+n[1]*axes[4]+n[2]*axes[5],nz=n[0]*axes[6]+n[1]*axes[7]+n[2]*axes[8];
   float key=std::max(0.f,-nx*.45f+ny*.70f+nz*.55f),fill=std::max(0.f,nx*.83f+ny*.40f-nz*.18f);
   float rim=std::pow(1-std::abs(nz),3)*.11f,spec=std::pow(std::max(0.f,-nx*.24f+ny*.38f+nz*.892f),mat==2?36:24)*(mat==2?.17f:mat==5||mat==9?.12f:.025f);
   float shade=.19f+key*.79f+fill*.17f+rim+spec;int flag=0;
   float px=position[0],py=position[1],pz=position[2];
   if(mat==0||mat==1||mat==3){float fold=std::sin(py*113+px*29)*std::sin(pz*97-py*31);shade*=.96f+fold*.045f;}
   if(mat==0&&((int)((px+.32f)/.085f))%2==0)flag=1;
   if(mat==2){
    if(py>1.673f&&py<1.692f&&pz>.125f&&std::abs(px)<.041f)flag=3;
    else if(py>1.60f&&py<1.70f&&pz>.075f)flag=4;
    if(py>1.733f&&py<1.745f&&pz>.109f&&std::abs(px)>.022f&&std::abs(px)<.073f)flag=5;
    if(py>1.69f&&py<1.716f&&pz>.155f&&std::abs(px)>.014f&&std::abs(px)<.027f)flag=7;
    if(py>1.74f&&py<1.80f&&pz<.025f)flag=9;
    shade*=.985f+.015f*std::sin(px*899+py*577+pz*711);
   }
   if(mat==4){if(py<.033f)flag=10;else if(py>.082f&&pz>.01f&&pz<.16f&&std::abs(std::abs(px)-.11556f)<.025f&&std::sin(pz*193)>0.2f)flag=11;}
   if(mat==5||mat==9)shade*=.91f+.09f*std::sin(px*611+py*781+pz*439)*std::sin(py*417-pz*593);
   result[at*4]=mat==9?10:mat+1;result[at*4+1]=(uint8_t)(clamp(shade/1.25f,0,1)*255);result[at*4+2]=flag;result[at*4+3]=255;
  }
 }
 if(baseTriangles>=triangles)std::memcpy(base,result,width*height*4);
}

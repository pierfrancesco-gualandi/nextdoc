//ivsys.js
var iv={
INV_MTLS:2,
INV_VERSION:4,
INV_STRUCTURE:8,
VIEW_TRANSITION:1,
VIEW_UNDO:2,
VIEW_INVALIDATE:4,
VIEW_ANIM_SET:8,
VIEW_ANIM_PLAY:16,
VIEW_VISIBLE:32,
VIEW_RESET_RCENTER:64,
R_SELECTION:4,
R_Z_NOWRITE:16,
R_Z_OFFSET:0x30000,
R_CLIP:0x1c0000,
FILTER_LINEAR:1,
FILTER_MIPMAP:2,
FILTER_BOX:3,
HIT_LAST:1,
HIT_FULL:2,
HIT_ALL:0x0ff00,
HIT_ROOT:0x0100,
HIT_CLIP:0x0200,
HIT_GIZMO:0x0400,
NS_VIS_THIS:1,
NS_VIS_CHILDREN:2,
NS_SELECTED:4,
NS_CLOSED:8,
NS_NOZWRITE:16,
NS_NOCLIP:32,
NS_NOHIT:64,
NS_NOTREE:0x80,
NS_CASTSHADOWS:0x100,
NS_RCVSHADOWS:0x200,
NS_SYSTEM:0x400,
NS_NOXRAY:	0x40000,
NS_MASK:16|32|0x70000|0x300,
TS_DBL:64,
TS_SELECTED:4,
TS_RMODE:0xff00000,
createRequest:function(f,p,cb){
	if(!f)return null;
	if(p)f=p+f;
	var r=new XMLHttpRequest(),u=f.toLowerCase(),c,l=u.indexOf("://");
	if(l>3 && l<8)
	{
		p=location.origin.toLowerCase();l=p.length;
		c=(u.substring(0,l)!=p)&&("withCredentials" in r);
	}
	if (c)r.open("GET",f,true);else r.open("GET",f);
	r.onreadystatechange=function(){
		if ((this.readyState==4)&&(this.status==200))cb(this);else
		if(((this.status==404)||(this.status==0))&&this.onError)this.onError();
	};
	return r;
},
anim:{},
indexOf:function (a,b){var c=a.length,i;for(i=0;i<c;i++){if(a[i]==b)return i;}return -1;},
any:function(a,b){return (a==undefined)?b:a;},
mtlChannels:["diffuse","specular","emissive","reflection","bump","opacity","lightmap"],
isPOW2:function(v){return (v&(v-1))==0;},
convertMatrix:function(a){var tm=mat4.identity(mat4.create()),k=0,i,j;for(i=0;i<4;i++)for(j=0;j<3;j++)tm[i*4+j]=a[k++];return tm;},
getV:function (a,i,v){i*=3;v[0]=a[i];v[1]=a[i+1];v[2]=a[i+2];},
sp:function(e){if(e)e.stopPropagation();},
pd:function(e){if(e && e.preventDefault)e.preventDefault();},
pdsp:function(e){iv.pd(e);iv.sp(e);},
stdViews:{left:{f:[-1,0,0],u:[-1,0,1]},right:{f:[1,0,0],u:[1,0,1]},front:{f:[0,-1,0],u:[0,-1,1]},back:{f:[0,1,0],u:[0,1,1]},top:{f:[0,0,1],u:[0,1,1]},bottom:{f:[0,0,-1],u:[0,-1,-1]}},
stdViewsY:{left:{f:[1,0,0],u:[1,1,0]},right:{f:[-1,0,0],u:[-1,1,0]},front:{f:[0,0,1],u:[0,1,1]},back:{f:[0,0,-1],u:[0,1,-1]},top:{f:[0,1,0],u:[0,1,-1]},bottom:{f:[0,-1,0],u:[0,-1,1]}},
abstract:function(){this.ref=0;},
refSource:function(rc){;},
ftoI:function(a){return Math.max(Math.min(Math.round(255*a),255),0);},
f00:function(a){return[((a>>16)&0xff)/255,((a>>8)&0xff)/255,(a&0xff)/255];},
parseColor:function(a,alpha)
{
	var c;
	if(a!==null)
	switch(typeof a)
	{
		case 'number':c=iv.f00(a);if(alpha)c[3]=((a>>24)&0xff)/255;break;
		case 'object':c=a.slice();break;
		case 'string':{
			var i=a.indexOf("rgba");
			if(i>=0)
			{
				a=a.substr(i+4).trim();i=a.indexOf("("),j=a.lastIndexOf(")");
				if(i==0 && j>0)
				{
					c=JSON.parse('['+a.substring(i+1,j)+']');
					if(c.length>=3 && c.length<=4){c[0]/=255;c[1]/=255;c[2]/=255;break;}
				}
			}
			i=a.indexOf("#");
			if(i>=0)c=iv.f00(parseInt(a.substr(i+1).trim(),16));
		}break;
	}
	if(!c)c=[1,1,1];
	if(alpha){if(c.length==3)c[3]=1.0;}else{if(c.length>3)c.splice(3);}
	return c;
},
isColor:function(a){
    if(a===null)return false;
	return typeof a ==='object';
},
getExtension:function(f)
{
	var e=f.substr(f.lastIndexOf('.') + 1).toUpperCase();
	var i=e.indexOf('?');if(i>0)e=e.substring(0,index);
	return e;
},
matrixType:typeof Float32Array!="undefined"?Float32Array:typeof WebGLFloatArray!="undefined"?WebGLFloatArray:Array
};
iv.refSource.prototype.refSourceName="source";
iv.refSource.prototype.notify=function(a,b,def){
	var _i=this.refTargets,f,i;
	if(_i) {
		b=b||{};
		b.code=a;
		b[this.refSourceName]=this;
		if(def) b.doDef=true;
		for(i=0;i<_i.length;i++){f=_i[i];if(f.onNotify)f.onNotify(b);else f(b);}
		return !def||b.doDef;
	}
	return true;
}
iv.refSource.prototype.removeRefTarget=function(f) {
	if(this.refTargets) {
		var i=iv.indexOf(this.refTargets,f);
		if(i>=0){if(this.refTargets.length==1) this.refTargets=null;else this.refTargets.splice(i,1);return true;}
	}return false;
}
iv.refSource.prototype.addRefTarget=function(f) {
	if(!f)return false;
	if(this.refTargets){if(iv.indexOf(this.refTargets,f)>=0)return false;this.refTargets.push(f);}else this.refTargets=[f];
	return true;
}
iv.makeRefSource=function(a)
{
	var b=iv.refSource.prototype;
	a.refSourceName=b.refSourceName;a.notify=b.notify;a.removeRefTarget=b.removeRefTarget;a.addRefTarget=b.addRefTarget;
};
iv.abstract.prototype=new iv.refSource();
iv.abstract.prototype.destroy=function(){}
iv.abstract.prototype.addRef = function(){this.ref++;}
iv.abstract.prototype.release = function(){this.ref--;if(this.ref<1)this.destroy();}
//ivmath.js
var vec3={},box3={},mat3={},mat4={},quat={};
vec3.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];return b};vec3.add=function(a,b,c){if(!c||a==c){a[0]+=b[0];a[1]+=b[1];a[2]+=b[2];return a}c[0]=a[0]+b[0];c[1]=a[1]+b[1];c[2]=a[2]+b[2];return c};
vec3.subtract=function(a,b,c){if(!c||a==c){a[0]-=b[0];a[1]-=b[1];a[2]-=b[2];return a}c[0]=a[0]-b[0];c[1]=a[1]-b[1];c[2]=a[2]-b[2];return c};
vec3.scale=function(a,b,c){if(!c||a==c){a[0]*=b;a[1]*=b;a[2]*=b;return a}c[0]=a[0]*b;c[1]=a[1]*b;c[2]=a[2]*b;return c};
vec3.normalize=function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=Math.sqrt(c*c+d*d+e*e);if(g){if(g==1){b[0]=c;b[1]=d;b[2]=e;return b}}else{b[0]=0;b[1]=0;b[2]=0;return b}g=1/g;b[0]=c*g;b[1]=d*g;b[2]=e*g;return b};
vec3.cross=function(a,b,c){c||(c=a);var d=a[0],e=a[1];a=a[2];var g=b[0],f=b[1];b=b[2];c[0]=e*b-a*f;c[1]=a*g-d*b;c[2]=d*f-e*g;return c};vec3.length=function(a){var b=a[0],c=a[1];a=a[2];return Math.sqrt(b*b+c*c+a*a)};vec3.dot=function(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]};
vec3.distance=function(a,b){var c=b[0]-a[0],e=b[1]-a[1],d=b[2]-a[2];return Math.sqrt(c*c+e*e+d*d);}
vec3.cpy=function(dst,src){dst[0]=src[0];dst[1]=src[1]; dst[2]=src[2];}
vec3.lerp = function (a,b,c,d) {d=d||[];d[0]=a[0]+ c*(b[0]-a[0]);d[1]=a[1]+c*(b[1]-a[1]);d[2]=a[2]+c*(b[2]-a[2]);return d;};
vec3.compare=function(a,b,e){return (Math.abs(a[0]-b[0])<e) && (Math.abs(a[1]-b[1])<e) && (Math.abs(a[2]-b[2])<e);};
vec3.crossN=function(a,b,c){return vec3.normalize(vec3.cross(a,b,c));};
vec3.subtractN=function(a,b,c){return vec3.normalize(vec3.subtract(a,b,c));}
mat3.create=function(a){var b=new iv.matrixType(9);if(a){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9]}return b};
mat3.identity=function(a){a[0]=1;a[1]=0;a[2]=0;a[3]=0;a[4]=1;a[5]=0;a[6]=0;a[7]=0;a[8]=1;return a};
mat4.create=function(a){var b=new iv.matrixType(16);if(a){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=a[12];b[13]=a[13];b[14]=a[14];b[15]=a[15]}return b};
mat4.identity=function(a){a[0]=1;a[1]=0;a[2]=0;a[3]=0;a[4]=0;a[5]=1;a[6]=0;a[7]=0;a[8]=0;a[9]=0;a[10]=1;a[11]=0;a[12]=0;a[13]=0;a[14]=0;a[15]=1;return a};
mat4.m=function(b,a,c){c||(c=b);var d=a[0],e=a[1],g=a[2],f=a[3],h=a[4],i=a[5],j=a[6],k=a[7],l=a[8],o=a[9],m=a[10],n=a[11],p=a[12],r=a[13],s=a[14];a=a[15];var A=b[0],B=b[1],t=b[2],u=b[3],v=b[4],w=b[5],x=b[6],y=b[7],z=b[8],C=b[9],D=b[10],E=b[11],q=b[12],F=b[13],G=b[14];b=b[15];c[0]=A*d+B*h+t*l+u*p;c[1]=A*e+B*i+t*o+u*r;c[2]=A*g+B*j+t*m+u*s;c[3]=A*f+B*k+t*n+u*a;c[4]=v*d+w*h+x*l+y*p;c[5]=v*e+w*i+x*o+y*r;c[6]=v*g+w*j+x*m+y*s;c[7]=v*f+w*k+x*n+y*a;c[8]=z*d+C*h+D*l+E*p;c[9]=z*e+C*i+D*o+E*r;c[10]=z*
g+C*j+D*m+E*s;c[11]=z*f+C*k+D*n+E*a;c[12]=q*d+F*h+G*l+b*p;c[13]=q*e+F*i+G*o+b*r;c[14]=q*g+F*j+G*m+b*s;c[15]=q*f+F*k+G*n+b*a;return c};
mat4.mulPointZ=function(a,b){var d=b[0],e=b[1];b=b[2];return a[2]*d+a[6]*e+a[10]*b+a[14];};
mat4.mulPoint=function(a,b,c){c||(c=b);var d=b[0],e=b[1];b=b[2];c[0]=a[0]*d+a[4]*e+a[8]*b+a[12];c[1]=a[1]*d+a[5]*e+a[9]*b+a[13];c[2]=a[2]*d+a[6]*e+a[10]*b+a[14];return c};
mat4.mulVector=function(a,b,c){c||(c=b);var d=b[0],e=b[1];b=b[2];c[0]=a[0]*d+a[4]*e+a[8]*b;c[1]=a[1]*d+a[5]*e+a[9]*b;c[2]=a[2]*d+a[6]*e+a[10]*b;return c};
mat4.rotate=function(a,b,c,d){var e=c[0],g=c[1];c=c[2];var f=Math.sqrt(e*e+g*g+c*c);if(!f)return null;if(f!=1){f=1/f;e*=f;g*=f;c*=f}var h=Math.sin(b),i=Math.cos(b),j=1-i;b=a[0];f=a[1];var k=a[2],l=a[3],o=a[4],m=a[5],n=a[6],p=a[7],r=a[8],s=a[9],A=a[10],B=a[11],t=e*e*j+i,u=g*e*j+c*h,v=c*e*j-g*h,w=e*g*j-c*h,x=g*g*j+i,y=c*g*j+e*h,z=e*c*j+g*h;e=g*c*j-e*h;g=c*c*j+i;if(d){if(a!=d){d[12]=a[12];d[13]=a[13];d[14]=a[14];d[15]=a[15]}}else d=a;d[0]=b*t+o*u+r*v;d[1]=f*t+m*u+s*v;d[2]=k*t+n*u+A*v;d[3]=l*t+p*u+B*
v;d[4]=b*w+o*x+r*y;d[5]=f*w+m*x+s*y;d[6]=k*w+n*x+A*y;d[7]=l*w+p*x+B*y;d[8]=b*z+o*e+r*g;d[9]=f*z+m*e+s*g;d[10]=k*z+n*e+A*g;d[11]=l*z+p*e+B*g;return d};
mat4.frustum=function(a,b,c,d,e,g,f){f||(f=mat4.create());var h=b-a,i=d-c,j=g-e;f[0]=e*2/h;f[1]=0;f[2]=0;f[3]=0;f[4]=0;f[5]=e*2/i;f[6]=0;f[7]=0;f[8]=(b+a)/h;f[9]=(d+c)/i;f[10]=-(g+e)/j;f[11]=-1;f[12]=0;f[13]=0;f[14]=-(g*e*2)/j;f[15]=0;return f};
mat4.perspective=function(a,b,c,d,e){a=c*Math.tan(a);b=a*b;return mat4.frustum(-b,b,-a,a,c,d,e)};
mat4.perspectiveEx=function(fov,k,near,far,tm)
{
	var d=(far-near)||0.1;
	d/=100;far+=d;near-=d;
	d=far/1000;
	if(near<d)near=d;
	return mat4.perspective(fov,k,near,far,tm);
}
mat4.ortho=function(a,b,c,d,e,g,f){f||(f=mat4.create());var h=b-a,i=d-c,j=g-e;f[0]=2/h;f[1]=0;f[2]=0;f[3]=0;f[4]=0;f[5]=2/i;f[6]=0;f[7]=0;f[8]=0;f[9]=0;f[10]=-2/j;f[11]=0;f[12]=-(a+b)/h;f[13]=-(d+c)/i;f[14]=-(g+e)/j;f[15]=1;return f};
mat4.lookAt=function(a,b,c,d){d||(d=mat4.create());var e=a[0],g=a[1];a=a[2];var f=c[0],h=c[1],i=c[2];c=b[1];var j=b[2];if(e==b[0]&&g==c&&a==j)return mat4.identity(d);var k,l,o,m;c=e-b[0];j=g-b[1];b=a-b[2];m=1/Math.sqrt(c*c+j*j+b*b);c*=m;j*=m;b*=m;k=h*b-i*j;i=i*c-f*b;f=f*j-h*c;if(m=Math.sqrt(k*k+i*i+f*f)){m=1/m;k*=m;i*=m;f*=m}else f=i=k=0;h=j*f-b*i;l=b*k-c*f;o=c*i-j*k;if(m=Math.sqrt(h*h+l*l+o*o)){m=1/m;h*=m;l*=m;o*=m}else o=l=h=0;d[0]=k;d[1]=h;d[2]=c;d[3]=0;d[4]=i;d[5]=l;d[6]=j;d[7]=0;d[8]=f;d[9]=o;d[10]=b;d[11]=0;d[12]=-(k*e+i*g+f*a);d[13]=-(h*e+l*g+o*a);d[14]=-(c*e+j*g+b*a);d[15]=1;return d};
mat4.setScale=function(tm,s){tm[10]=tm[5]=tm[0]=s;}
mat4.offset=function(tm,a){tm[12]+=a[0];tm[13]+=a[1];tm[14]+=a[2];}
mat4.copy=function(src,dst){for(var i=0;i<16;i++)dst[i]=src[i];}
mat4.m_z=function(b,a,c)
{
	var g=a[2],j=a[6],m=a[10],s=a[14],A=b[0],B=b[1],t=b[2],u=b[3],v=b[4],w=b[5],x=b[6],y=b[7],z=b[8],C=b[9],D=b[10],E=b[11],q=b[12];
	c[2]=A*g+B*j+t*m+u*s;
	c[6]=v*g+w*j+x*m+y*s;
	c[10]=z*g+C*j+D*m+E*s;
	c[14]=q*g+b[13]*j+b[14]*m+b[15]*s;
	return c;
};
mat4.rotateAxisOrg=function(tm,org,axis,angle)
{
	mat4.offset(tm,[-org[0],-org[1],-org[2]]);
	var tmR=mat4.identity([]);
	mat4.rotate(tmR,angle,axis);
	mat4.m(tm,tmR,tm);
	mat4.offset(tm,org);
	return tm;
}
mat4.invert=function(n,r){var t=r[0],u=r[1],a=r[2],e=r[4],i=r[5],l=r[6],v=r[8],c=r[9],f=r[10],m=r[12],o=r[13],b=r[14],d=t*i-u*e,g=t*l-a*e,h=u*l-a*i,j=v*o-c*m,k=v*b-f*m,p=v,q=c*b-f*o,s=c,w=f,x=d*w-g*s+h*p;return x?(x=1/x,n[0]=(i*w-l*s)*x,n[1]=(a*s-u*w)*x,n[2]=h*x,n[3]=0,n[4]=(l*p-e*w)*x,n[5]=(t*w-a*p)*x,n[6]=-g*x,n[7]=0,n[8]=(e*s-i*p)*x,n[9]=(u*p-t*s)*x,n[10]=d*x,n[11]=0,n[12]=(i*k-e*q-l*j)*x,n[13]=(t*q-u*k+a*j)*x,n[14]=(o*g-m*h-b*d)*x,n[15]=(v*h-c*g+f*d)*x,n):null};
mat4.M3_M1xM2_1=function(m3,m1,m2)
{
	mat4.invert(m1,m2);
	mat4.m(m3,m1,m1);
};
mat4.setRow=function(tm,i,p)
{
	i*=4;
	tm[i]=p[0];
	tm[i+1]=p[1];
	tm[i+2]=p[2];
};
mat4.fromQuat = function (out, q) {
	var x=q[0],y=q[1],z=q[2],w=q[3],
	x2=x+x,y2=y+y,z2=z+z,
	xx=x*x2,yx=y*x2,yy=y*y2,
	zx=z*x2,zy=z*y2,zz=z*z2,
	wx=w*x2,wy=w*y2,wz=w*z2;
	out[0]=1-yy-zz;
	out[1]=yx+wz;
	out[2]=zx-wy;
	out[4]=yx-wz;
	out[5]=1-xx-zz;
	out[6]=zy+wx;
	out[8]=zx+wy;
	out[9]=zy-wx;
	out[10]=1-xx-yy;
	out[3]=out[7]=out[11]=out[12]=out[13]=out[14]=0;
	out[15]=1;
	return out;
};
mat4.getTranslate=function(tm,a)
{
	a||(a=[]);
	a[0]=tm[12];
	a[1]=tm[13];
	a[2]=tm[14];
	return a;
};
mat4.setRotateX=function(a,rad){
	var s=Math.sin(rad),c=Math.cos(rad);
	mat4.identity(a);
	a[5]=c; a[6]=s; a[9]=- s; a[10]=c;
	return a;
};
mat4.setRotateY=function(a,rad){
	var s=Math.sin(rad),c=Math.cos(rad);
	mat4.identity(a);
	a[0]=c; a[2]=-s; a[8]=s; a[10]=c;
};
mat4.setRotateZ = function (a, rad) {
	var s = Math.sin(rad),c = Math.cos(rad);
	mat4.identity(a);
	a[0] = c ;a[1] = s;a[4] = - s;a[5] = c ;return a;
};
mat4.rotateX = function (a, rad) {
var tm=[];
mat4.setRotateX(tm,rad);
mat4.m(a,tm);
};
mat4.rotateY = function (a, rad) {
var tm=[];
mat4.setRotateY(tm,rad);
mat4.m(a,tm);
};
mat4.rotateZ = function (a, rad) {
var tm=[];
mat4.setRotateZ(tm,rad);
mat4.m(a,tm);
}
quat.slerp = function (out, a, b, t) {
	var ax = a[0], ay = a[1], az = a[2], aw = a[3],bx = b[0], by = b[1], bz = b[2], bw = b[3],omega, cosom, sinom, scale0, scale1;
	cosom = ax * bx + ay * by + az * bz + aw * bw;
	if ( cosom < 0.0 ) {
		cosom = -cosom;
		bx = - bx;
		by = - by;
		bz = - bz;
		bw = - bw;
	}
	if ( (1.0 - cosom) > 0.000001 ) {
		omega  = Math.acos(cosom);
		sinom  = Math.sin(omega);
		scale0 = Math.sin((1.0 - t) * omega) / sinom;
		scale1 = Math.sin(t * omega) / sinom;
	}else{
		scale0 = 1.0 - t;
		scale1 = t;
	}
	out[0] = scale0 * ax + scale1 * bx;
	out[1] = scale0 * ay + scale1 * by;
	out[2] = scale0 * az + scale1 * bz;
	out[3] = scale0 * aw + scale1 * bw;
	return out;
};
quat.fromMat4 = function(out, m) {
	var fTrace = m[0] + m[5] + m[10],fRoot;
	if ( fTrace > 0.0 ) {
		fRoot = Math.sqrt(fTrace + 1.0);
		out[3] = 0.5 * fRoot;
		fRoot = 0.5/fRoot;
		out[0] = (m[6]-m[9])*fRoot;
		out[1] = (m[8]-m[2])*fRoot;
		out[2] = (m[1]-m[4])*fRoot;
	} else {
		var i = ( m[5] > m[0] )?1:0;
		if ( m[10] > m[i*4+i] )
			i = 2;
		var j = (i+1)%3,k = (i+2)%3;
		fRoot = Math.sqrt(m[i*4+i]-m[j*4+j]-m[k*4+k] + 1.0);
		out[i] = 0.5 * fRoot;
		fRoot = 0.5 / fRoot;
		out[3] = (m[j*4+k] - m[k*4+j]) * fRoot;
		out[j] = (m[j*4+i] + m[i*4+j]) * fRoot;
		out[k] = (m[k*4+i] + m[i*4+k]) * fRoot;
	}
	return out;
};
box3.size=function(b,v){
	if(!v)v=[];
	v[0]=b[3]-b[0];v[1]=b[4]-b[1];v[2]=b[5]-b[2];
	return v;
};
box3.middle=function(b,v){
	if(!v) v=[];
	v[0]=(b[3]+b[0])/2;
	v[1]=(b[4]+b[1])/2;
	v[2]=(b[5]+b[2])/2;
	return v;
};
//ivwindow3d.js
iv.size=function (x,y){this.x=x||0;this.y=y||0};
iv.size.prototype.set=function (x,y)
{
	if(this.x!=x || this.y!=y)
	{this.x=x;this.y=y;return true;}
	return false;
};
iv.wnd=function(div)
{
	if(div===undefined)return;
	this.imp={lastTouchDistance:-1,LY:0,LX:0,mouseMoved:false,cancelPopup:false,captured:false,xdiv:div||null};
	if(div)div.style['touch-action']='none';
	this.getTickCount=(window.performance && window.performance.now)?function(){return window.performance.now();}:this.getTickCount=function(){var d=new Date();var time=d.getTime();return time;};
}
iv.wnd.prototype.initHandlers=function(pointers)
{
	var w=this,i={move:function(event){return w._onMouseMove(event)},down:function(event){return w.onMouseDown(event,false)},up:function(event){iv.pd(event);return w.onMouseUp(event,false)},
	dbl:function(event){return w._onDblClick(event)},
	touchstart:function(event){return w.onTouchStart(event)},
	touchcancel:function(event){return w.onTouchCancel(event)},
	touchend:function(event){return w.onTouchEnd(event,true)},
	touchmove:function(event){return w.onTouchMove(event)},
	menu:function(event){return w._onContextMenu(event)},
	wheel:function(event){w._onMouseWheel(event)},
	a:function(){w.animate();}},W=(/Firefox/i.test(navigator.userAgent))?"DOMMouseScroll":"mousewheel",c=w.imp.xdiv;
	if(pointers){
	i.pointerdown=function(event){return w.onPointerDown(event)};
	i.pointerup=function(event){return w.onPointerUp(event)};
	i.pointermove=function(event){return w.onPointerMove(event)};
	i.lostcapture=function(event){return w.onLostCapture(event)};
	};
	w.input=i;
	w.setEvent(c,W,i.wheel,true);
	w.setEvent(c,"contextmenu",i.menu);
	w.setEvent(c,"selectstart",function(){return false;});
	if (pointers&&window.PointerEvent && navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && c.setPointerCapture)
	{
		w.pointers=[];
		w.setEvent(c,"pointerdown",i.pointerdown);
		w.setEvent(c,"pointermove",i.pointermove);
		w.setEvent(c,"pointerup",i.pointerup);
		w.setEvent(c,"lostpointercapture",i.lostcapture)
	}else
	{
		w.setEvent(c,"mousedown",i.down);
		w.setEvent(c,"mousemove",i.move);
		w.setEvent(c,"dblclick",i.dbl);
		w.setEvent(c,"touchstart",i.touchstart,true);
	}
}
iv.wnd.prototype._onContextMenu=function(event)
{
	iv.pd(event);
	var I=this.imp;
	if(I.cancelPopup&&I.mouseMoved)
	{
		iv.sp(event);
		I.cancelPopup=false;return false;
	}
	if(this.onContextMenu)this.onContextMenu(event);
	return true;
}
iv.wnd.prototype._onMouseWheel=function(event)
{
	var d;
	if(event.wheelDelta!=undefined)d=event.wheelDelta/-10;
	else
	if(event.detail!=undefined){
		d=event.detail;
		if(d>10)d=10;else if(d<-10)d=-10;
		d*=4;
	}
	if(this.onMouseWheel)this.onMouseWheel(event,d);
	iv.pd(event);
}
iv.wnd.prototype.onMouseHover=function(event,p){}
iv.wnd.prototype.onTouchMove=function(event)
{
	var p=this.getLocalPnt(event,true),t=event.touches;
	this.onMouseMove(event,p,t&&t.length>1?t:null,1);
	iv.pd(event);
	return false;
}
iv.wnd.prototype.onTouchCancel=function (event)
{
	this.onMouseUp(event,true);
	if(event.cancelable)iv.pd(event);
}
iv.wnd.prototype.checkDblTap=function(event)
{
	var t=this.getTickCount(),i=this.imp,r=true;
	if(i.lastTouchTime!==undefined)
	{
		var dt=(t-i.lastTouchTime);
		if(dt<500){
		this.onDblClick2(event,true);
		t=undefined;
		r=false;}
	}
	i.lastTouchTime=t;
	return r;
}
iv.wnd.prototype.decodeButtons=function(e,bt)
{
	if(bt && e.touches!=undefined)
	{
		if(e.touches.length>=3)return 4;
		return 1;
	}
	if(e.buttons===undefined)
	{
		switch(e.which)
		{
		case 2:return 4;
		case 3:return 2;
		}
		return 1;
	}
	return e.buttons;
}
iv.wnd.prototype.releaseCapture=function(event)
{
	var I=this.imp,i=this.input,e=I.xdiv;
	if(I.captured)
	{
		if(e.releaseCapture)e.releaseCapture();
		else
		{
			e=document;
			this.delEvent(e,"mousemove",i.move);
			this.delEvent(e,"contextmenu",i.menu);
		}
		this.delEvent(e,"mouseup",i.up);
		this.delEvent(e,"touchmove", i.touchmove);
		this.delEvent(e,"touchend", i.touchend);
		this.delEvent(e,"touchcancel",i.touchcancel);
		I.captured=false;
	}
}
iv.wnd.prototype.onDblClick2=function(event)
{
	var p=this.getLocalPnt(event),i=this.notify("dblclick",{x:p.x,y:p.y},true);
	if(i&&this.onDblClick)this.onDblClick(event);
}
iv.wnd.prototype._onDblClick=function(event){
	this.onDblClick2(event,false);
	iv.pdsp(event);
	return true;
}
iv.wnd.prototype.setCapture=function(event)
{
	var I=this.imp,e=I.xdiv,i=this.input;
	if(!I.captured)
	{
		if(e.setCapture)e.setCapture();else
		{
			e=document;
			this.setEvent(e,"mousemove",i.move);
			this.setEvent(e,"contextmenu",i.menu);
		}
		this.setEvent(e,"mouseup",i.up);
		this.setEvent(e,"touchmove", i.touchmove);
		this.setEvent(e,"touchend", i.touchend);
		this.setEvent(e,"touchcancel", i.touchcancel);
		I.captured=true;
	}
}
iv.wnd.prototype.getLocalPnt=function(e,touch)
{
	var r=this.imp.xdiv.getBoundingClientRect(),x=0,y=0,j,_e,l;
	if(e){
		x=e.clientX;y=e.clientY;
		if(touch && e.touches)
		{
			l=e.touches.length;
			if(l){
				x=0;y=0;
				for(j=0;j<l;j++){_e=e.touches[j];x+=_e.clientX;y+=_e.clientY;}
					x/=l;y/=l;
			}
		}
		x-=r.left;y-=r.top;
	}else {x=this.imp.LX;y=this.imp.LY;}
	return {x:x,y:y,r:r}
}
iv.wnd.prototype._onMouseMove=function(event){
	var p=this.getLocalPnt(event,false);
	if (this.imp.captured){
		var b=this.decodeButtons(event,false);
		if(b)
			this.onMouseMove(event,p,null,b);
		else this.onMouseUp(event,false);
		iv.pdsp(event);
		return true;
	}else {
		p.b=0;
		this.onMouseHover(event,p);
	}
	return false;
}
iv.wnd.prototype.commonTouch=function(event)
{
	var p=this.getLocalPnt(event,true),I=this.imp;
	I.LX=p.x;I.LY=p.y;
	I.lastTouchDistance=-1;
	I.mouseMoved=false;
}
iv.wnd.prototype.onTouchEnd=function (event)
{
	if(!event.touches || !event.touches.length)this.onMouseUp(event,true);
	else this.commonTouch(event);
	if(event.cancelable)iv.pd(event);
}
iv.wnd.prototype.onTouchStart=function(event)
{
	var t=event.touches;
	if(t){
		if((t.length==1) || (t.length>1 && !this.imp.captured)){
			if(this.checkDblTap(event))this.onMouseDown(event,true);
		}else if(t.length>1 && this.imp.captured)this.commonTouch(event);
	}
}
iv.wnd.prototype.div=function(){return this.imp.xdiv;}
iv.wnd.prototype.delEvent=function(d,e,f)
{
	if (d.detachEvent)
		d.detachEvent("on"+e,f);
	else if (d.removeEventListener)
		d.removeEventListener(e,f);
}
iv.wnd.prototype.setEvent=function(d,e,f,a)
{
	if (d.attachEvent)
		d.attachEvent("on"+e,f);
	else if(d.addEventListener)
	{
		if(a)d.addEventListener(e,f,{ passive:false});
		else
		d.addEventListener(e,f);
	}
}
iv.window=function (info)
{
	var w=this;
	iv.wnd.call(w,info.canvas);
	iv.makeRefSource(w);
	w.refSourceName="wnd";
	w.viewport=new iv.size();
	w.buffer=new iv.size();
	if(w.imp.xdiv)w.updateViewSize();
	if(info.callback)w.addRefTarget(info.callback);
	w.spaceId=0;
	w.view=new iv.viewInfo({from:[0,0,6],to:[0,0,0],up:[0,1,0],fov:90});
	w.cfgAutoSpin=1;
	w.cfgMouseDelta=2;
	w.cfgSpinSpeed=1.0;
	w.cfgOrbitMode=1;
	w.cfgButtons=[1,2,4];
	w.cfgMinDistance=1e-6;w.cfgMaxDistance=1e8;
	w.cfgZoomFactor=1.0;
	w.cfgMouseWheel=2;
	w.cfgBkColor=(info.color!==undefined)?info.color:0x7f7f7f;
	w.cfgResources="res/";
	w.clrSelection=[1,0,0,0.5,1,1];
	w.cfgXRayAlways=false;
	w.initHardware();
	w.vpVersion=0;
	w.structVersion=0;
	w.textures=[];
	w.imp.numFrames=0;
	w.cfgClipLineColor=[1,1,1];
	w.cfgClipCapsColor=null;
	w.cfgClipCapsByObj=true;
	w.cfgClipPlaneColor=[0,0,0.25,0.2];
	w.cfgClipBorderColor=0xffffffff;
	w.handler=null;
	w.m_undo=null;
	w.m_undovp=null;
	w.cfgEditorCrd="local";
	w.cfgEditorMode="";
	w.cfgEditorAxis=1;
	w.cfgEditorAllowedAxis=7;
	w.cfgSelMode=2;
	w.cfgRotateMouseHit=false;
	w.cfgAllowSelection=true;
	w.timer=false;
	w.postRepaint=false;
	if(w.gl)
	{
		if(info.file)w.load(info.file,info);else w.space=null;
		w.gl.enable(w.gl.DEPTH_TEST);
		w.initHandlers(true);
		w.invalidate();
	}
	w.rcontext=new iv.rcontext(w);
	w.layer=null;
}
iv.window.prototype=new iv.wnd();
iv.window.prototype.getRoot=function()
{
	return this.space?this.space.root:null;
}
iv.window.prototype._uvs=function(a,b,c,d)
{
	var u=this.viewport.set(a,b);
	u|=this.buffer.set(c,d);
	if(u && this.gl)this.invalidate(iv.INV_VERSION);
	this.notify("viewsize");
}
iv.window.prototype.updateViewSize=function()
{
	var c=this.imp.xdiv,r=c.getBoundingClientRect();
	this._uvs(r.width,r.height,c.width,c.height);
}
iv.window.prototype.setViewSize=function(w,h,bw,bh){
	var c=this.imp.xdiv;
	if(w&&h&&c){
		if(!bh)bh=h;
		if(!bw)bw=w;
		c.height=bh;c.width=bw;
		c.style.width=''+w+'px';
		c.style.height=''+h+'px';
		this._uvs(w,h,bw,bh);
	}
}
iv.window.prototype.checkRCenter=function(p)
{
	var I=this.imp,h=p.hitInfo;
	if(this.cfgRotateMouseHit)
	{
	  if(h===undefined)
		h=this.hitTest(p);
	  if(h && h.pnt)I.rCenter=h.pnt.slice();
	}else I.rCenter=null;
	I.x0=p.x;
	I.y0=p.y;
}
iv.window.prototype.initHardware=function()
{
	var r=null,n = ["webgl","experimental-webgl","webkit-3d","moz-webgl"],cfg={alpha:false},gl,v=1;
	if(window.requestAnimationFrame)r=window.requestAnimationFrame;else
	if(window.webkitRequestAnimationFrame)r=window.webkitRequestAnimationFrame;else
	if(window.mozRequestAnimationFrame)r=window.mozRequestAnimationFrame;else
	r=function(callback){window.setTimeout(callback,1000/60)};
	this.requestAnimFrame=r;
	if(this.cfgBkColor===null){cfg.alpha=true;cfg.premultipliedAlpha=true};
	for (var i=0;i<n.length;i++)
	{
		try {
			gl=this.imp.xdiv.getContext(n[i],cfg);
		}catch (e){  }
		if(gl)break;
	}
	if (!gl)this.notify("error",{type:"hardware",info:"Could not initialise WebGL"});
	this.gl=gl;
	this.webgl=v;
	return gl!=null;
}
iv.window.prototype.undoVp=function(name)
{
	if(this.m_undovp)
	{
		var u=this.m_undovp;
		if(u.open()){
			u.add(new iv.undo.vp(this));
			u.accept(name);
		}
	}
}
iv.viewInfo=function(v)
{
	this.from=[];
	this.to=[];
	this.up=[];
	this.ortho=false;
	this.scale=1;
	this.update(v);
}
iv.viewInfo.prototype.update=function(f,t,u){
	if(f){
		this.ortho=false;
		if(t){
			vec3.cpy(this.from,f);
			vec3.cpy(this.to,t);
			vec3.cpy(this.up,u);
		} else {
			vec3.cpy(this.from,f.from);
			vec3.cpy(this.to,f.to);
			vec3.cpy(this.up,f.up);
			if(f.ortho){this.scale=f.scale;this.ortho=true;}
			else
				if(f.fov)this.fov=f.fov;
			if(f.bind)this.bind=f.bind;else this.bind='v';
			if(f.useNeighbours)this.useNeighbours=f.useNeighbours;
			this.camera=f.camera||null;
		}}
}
iv.viewInfo.prototype.getUpVector=function (v){return vec3.subtract(this.up,this.from,v||[]);}
iv.viewInfo.prototype.getViewVector=function (v){return vec3.subtract(this.to,this.from,v||[]);}
iv.viewInfo.prototype.getViewVectorN=function (v){return vec3.subtractN(this.to,this.from,v||[]);}
iv.viewInfo.prototype.compare=function (v){return (vec3.compare(this.from,v.from,1e-6)&&vec3.compare(this.to,v.to,1e-6)&&vec3.compare(this.up,v.up,1e-6));}
iv.viewInfo.prototype.transform=function(tm){if(tm.length<12){vec3.add(this.to,tm);vec3.add(this.from,tm);vec3.add(this.up,tm);}else{mat4.mulPoint(tm,this.to);mat4.mulPoint(tm,this.from);mat4.mulPoint(tm,this.up);}}
iv.viewInfo.prototype.rotate=function(c,x,b){this.transform(mat4.rotateAxisOrg(mat4.identity([]),c,x,b));}
iv.window.prototype.getView =function(i)
{
	if(i)i.update(this.view);
	else i=new iv.viewInfo(this.view);
	if(i.camera)i.camera=null;
	return i;
}
iv.transitionView=function(wnd,v,flags)
{
	this.transition=iv.easeInOut;
	this.type="view";
	this.wnd=wnd;
	this.old=wnd.getView();
	this.target=v;
	var c=this.current=new iv.viewInfo(null);
	c.bind=v.bind;
	c.fov=v.fov;
	c.scale=v.fov;
	c.ortho=v.ortho;
	if(flags)this.flags=flags;
	this.duration=600;
	this.tm=[];
	this.prepare(v);
	this.prepare(this.old);
	this._dir=[0,0,-1];
	this._up=[0,1,0];
}
iv.transitionView.prototype.detach=function(wnd,f)
{
	if(f && this.flags && this.target.anim){
		f=wnd._playFavAnimation(this.target,(this.flags&(iv.VIEW_ANIM_SET|iv.VIEW_ANIM_PLAY)) );
		if(f&iv.VIEW_INVALIDATE)wnd.invalidate();
	}
}
iv.transitionView.prototype.prepare=function(v)
{
	v._dir=vec3.subtract(v.to,v.from,[]);
	v._dirLen=vec3.length(v._dir);
	v._up=vec3.subtract(v.up,v.from,[]);
	v._upLen=vec3.length(v._up);
	if(v._dirLen)vec3.scale(v._dir,1/v._dirLen);
	if(v._upLen)vec3.scale(v._up,1/v._upLen);
	var _from=[0,0,0],tm=mat4.lookAt(_from,v._dir,v._up,[]);
	mat4.invert(tm,tm);
	v._Q=quat.fromMat4([],tm);
}
iv.transitionView.prototype.animate=function(k)
{
	var c=this.current,t=this.target,o=this.old,_k=1-k;
	if(k>0.999)
	{
		vec3.cpy(c.from,t.from);
		vec3.cpy(c.to,t.to);
		vec3.cpy(c.up,t.up);
		c.fov=t.fov;
		if(t.scale)c.scale=t.scale;
	}else{
		vec3.lerp(o.to,t.to,k,c.to);
		var q=[],upL=t._upLen*k+o._upLen*_k,dirL=t._dirLen*k+o._dirLen*_k;
		quat.slerp(q,o._Q,t._Q,k);
		mat4.fromQuat(this.tm,q);
		mat4.mulVector(this.tm,this._dir,c.from);
		mat4.mulVector(this.tm,this._up,c.up);
		vec3.scale(c.from,-dirL);
		vec3.scale(c.up,upL);
		vec3.add(c.from,c.to);
		vec3.add(c.up,c.from);
		if(c.ortho)c.scale=t.scale*k+o.scale*_k;else c.fov=t.fov*k+o.fov*_k;
	}
	this.wnd.setView(c);
	return 7;
}
iv.window.prototype.isOrtho=function()
{
	if(this.view && this.view.ortho)return true;
	return false;
}
iv.window.prototype.setOrtho=function(b)
{
	var v=this.view;
	if(v.ortho==b)return false;
	var l=vec3.distance(v.from,v.to);
	if(b)v.scale=1.0/(l*Math.tan(Math.PI*v.fov/(360)));
	else
	{
		l*=v.scale;
		if(l>1e-6)
			v.fov=Math.atan(1/l)*360/Math.PI;
	}
	v.ortho=b;
	this.invalidate(iv.INV_VERSION);
	return true;
}
iv.window.prototype.getFOV=function(v)
{
	if(!v)v=this.view;
	var fov=v.fov*Math.PI/360,
	sx=this.viewport.x/2,sy=this.viewport.y/2,bind=v.bind;
	if(bind=='max')
		bind=sx>sy?'h':'v';
	else
		if(bind=='min')bind=sx<sy?'h':'v';
	if(bind=='h')
		fov=Math.atan(sy/(sx/Math.tan(fov)));
	else
	if(bind=='d')
		fov=Math.atan(sy/(Math.sqrt(sx*sx+sy*sy)/Math.tan(fov)));
	return fov;
}
iv.window.prototype._activateFavourite=function(f,toend)
{
	if(f.anim)
	{
		var _a=f.anim,s=this.space,a=s.getAnimation(_a.id);
		if(a)
		{
			var start=iv.any(_a.start,a.start),end=iv.any(_a.end,a.end),t=toend?end:start;
			s.activateAnimation(a,true);
			s.setTime(t);
		}
	}
}
iv.window.prototype._playFavAnimation =function(v,flags)
{
	this.removeAnimationType("anim",true);
	if(flags&iv.VIEW_ANIM_SET)
	{
	var _i=this.space.views;
	if(v.useNeighbours && _i)
	{
		var i=_i.length-1,wasFound=false;
		while(i>=0)
		{
			var F=_i[i];
			if((F==v)||(F==v.src))wasFound=true;
			else
			this._activateFavourite(F,wasFound);
			i--;
		}
	}
	}
	if(v.anim && this.space && (flags&(iv.VIEW_ANIM_SET|iv.VIEW_ANIM_PLAY)))
	{
		var _a=v.anim,s=this.space,a=s.getAnimation(_a.id);
		if(a)
		{
			if(v.camera)this.view.camera=v.camera;
			s.activateAnimation(a,true);
			if(flags&iv.VIEW_ANIM_PLAY){
				var d={from:iv.any(_a.start,a.start),to:iv.any(_a.end,a.end)};
				if(_a.delayStart)d.delayStart=_a.delayStart;
				if(_a.delayEnd)d.delayEnd=_a.delayEnd;
				if(d.from!=d.to){
					this.addAnimation(new iv.anim.node(this,s,d));
					return 0;
				}else s.setTime(d.from);
			}else s.setTime(a.start);
			return iv.VIEW_INVALIDATE;
		}
	}
	return 0;
}
iv.window.prototype._cmpViews =function(V,v)
{
	if(v.from && v.to && v.up)
	{
		if(V.compare(v))
		{
			if(v.fov){
				if((V.fov!=v.fov)&& !V.ortho)return false;
				if(V.bind!=v.bind)return false;
			}else
			if(v.scale)
			{
				if(V.scale!=v.scale && V.ortho)return false;
			}else return false;
			return true;
		}
	}
	return false;
}
iv.window.prototype.validateView=function(v,flags)
{
	var _dir=[],_up=v.getUpVector();
	vec3.normalize(_up);
	vec3.subtractN(v.to,v.from,_dir);
	var _dot=vec3.dot(_dir,_up);
	if(Math.abs(_dot)>1e-5)
	{
		var a2=[],a1=[];
		vec3.crossN(_dir,_up,a2);
		vec3.crossN(_dir,a2,a1);
		_dot=vec3.dot(_up,a1);
		if(_dot<0)vec3.scale(a1,-1);
		vec3.add(v.from,a1,v.up);
	}
}
iv.window.prototype.setView=function(V,flags)
{
	if(!V)return;
	if(V.from){
	var v=new iv.viewInfo(V);
	v.src=V;
	if(V.anim)v.anim=V.anim;
	this.validateView(v,flags);
	if(flags===undefined)flags=0;
	V=this.view;
	if(V.camera && (V.camera!=v.camera))V.camera=null;
	if(!this._cmpViews(V,v))
	{
	var _o=this.isOrtho()!=v.ortho;
	if(_o)
	{
		if(flags&iv.VIEW_TRANSITION){flags&=~iv.VIEW_TRANSITION;flags|=iv.VIEW_INVALIDATE;}
		if(v.scale)_o=false;else v.ortho=false;
	}
	if(flags&iv.VIEW_UNDO)this.undoVp("View");
	if(flags&iv.VIEW_RESET_RCENTER){
		if(v.src.rcenter){this.imp.rCenter=v.src.rcenter.slice();}else this.imp.rCenter=null;
	}
	if(flags&iv.VIEW_TRANSITION)
	{
		this.stopAR();
		this.removeAnimationType("view",true);
		this.addAnimation(new iv.transitionView(this,v,flags));
		return;
	}
	V.update(v);
	if(_o)this.setOrtho(!v.perspective);
	}}
	if(flags&iv.VIEW_ANIM_SET)flags|=this._playFavAnimation(V,flags);
	if(flags&iv.VIEW_INVALIDATE)
		this.invalidate(iv.INV_VERSION);
}
iv.window.prototype.setDefView =function(flags)
{
	this.stopAR();
	if(flags===undefined)flags=iv.VIEW_INVALIDATE|iv.VIEW_RESET_RCENTER;
	this.setView(this.space.view,flags);
}
iv.window.prototype.setCamera=function(cam,flags)
{
	if(!flags)flags=iv.VIEW_TRANSITION;
	var c=cam.object,wtm=cam.getWTM(),d={from:c.from.slice(),to: c.to.slice(),up: c.up.slice() };
	if(wtm) {
		mat4.mulPoint(wtm,d.from);
		mat4.mulPoint(wtm,d.to);
		mat4.mulPoint(wtm,d.up);
	}
	if(c.fov) d.fov=c.fov; else d.fov=v.view.fov;
	d.ortho=(c.perspective===false);
	if(d.ortho)
	{
		d.scale=c.scale;
		if(d.scale<0)
		{
			var r=this.getRoot();
			if(r){
			var b=r.getBoundingBox(null,null,!!(flags&iv.VIEW_VISIBLE));
			v=this.getViewToBox(d,b);
			}
		}
	}
	this.setView(d,flags);
}
iv.window.prototype.unload=function()
{
	var _i=this.transitions;
	while(_i&&_i.length)this._removeAnimation(0);
	if(this.m_undo)this.m_undo=null;
	if(this.space)
	{
		var s=this.space,i;
		if(s.materials){
			for(i=0;i<s.materials.length;i++){var m=s.materials[i];m.invalidate();m.clear();}
			s.materials=null;
		}
		if(s.root){s.root.release();s.root=null;}
		_i=this.textures;
		for(i=0;i<_i.length;i++)_i[i].release();
		this.textures=[];
		s.gl=null;
		this.space=null;
	}
}
iv.cloneNode=function(parent,node,params)
{
	var n=parent.newNode();
	if(node.object)
		n.setObject(node.object);
	if(node.material)n.material=node.material;
	if(node.opacity!=undefined)n.opacity=node.opacity;
	n.name=node.name;
	if(node.meta)n.meta=node.meta;
	if(node.bbaxis)
	{
	n.bbtm = mat4.create();
	n.bbaxis=node.bbaxis.slice();
	n.traverse=node.traverse;
	if(node.bbaxisDir)
	n.bbaxisDir=node.bbaxisDir.slice();
	}
	if(node.anim)
		n.anim=node.anim;
	if(node.tm)
		mat4.copy(node.tm,n.enableTM(true));
	n.state=node.state;
	var _n=node.firstChild;
	while(_n)
	{
		iv.cloneNode(n,_n,params);
		_n=_n.next;
	}
	return n;
}
iv.window.prototype._loadCallback=function(info,r)
{
	this.imp.numFrames=0;
	var s=info.space;
	if(!info.merge){
		if(this.space) this.unload();
		this.space=s;
	}
	if(info.ext=='IV3D') s.loadBin(r);
	else s.load(JSON.parse(r.responseText));
	var notify={space:s,file: info.file};
	if(info.iid)
		notify.iid=info.iid;
	var code,g=null;
	if(info.merge){
		if(info.nolights)info.space.removeLights();
		g=this.space.merge(info);
		if(g)
			code="merged";
	}else
{
		this.checkLightsAndView();
		if(info.zoom)this.setDefView();
		code="dataReady";
	}
	if(info.nonotify)code=null;
	if(info.callback)info.callback(g);
	if(code)
	{
		if(g){
			g.file=info.file;
			notify.group=g;
		}
		this.notify(code,notify);
	}
	this.invalidate(iv.INV_STRUCTURE);
}
iv.window.prototype.getDefView=function(v,b)
{
	v.to=box3.middle(b);
	var tm=[];
	mat4.setRotateY(tm,-Math.PI/6);mat4.rotateZ(tm,-Math.PI/6);
	v.from=[1,0,0];
	v.up=[0,0,1];
	mat4.mulPoint(tm,v.up);
	mat4.mulPoint(tm,v.from);
	vec3.add(v.up,v.to);
	vec3.add(v.from,v.to);
	v.fov=25;
	this.zoomToFitBox(v,b,0);
}
iv.window.prototype.checkLightsAndView=function(b){
	var searchLight=function (n)
		{
		if(n.object && n.object instanceof iv.light)return true;
		n=n.firstChild;
		while(n)
		{
			if(searchLight(n))return true;
			n=n.next;
		}
		return false;
	}
	var s=this.space;
	if(!s.view){
		var b=s.root.getBoundingBox();
		if(b){
			var v=new iv.viewInfo();
			this.getDefView(v,b);
			this.setView(v);
			this.space.view=this.getView();
		}
	}
	if(!searchLight(s.root)){
		var l=[
			{color:[0.5,0.5,0.5],dir:[-0.57735,-0.57735,-0.57735],type:1},
			{color:[0.6,0.6,0.7],dir:[0.57735,0.57735,-0.57735],type:1},
			{color:[0.6,0.6,0.6],dir:[-0.242536,0,0.970143],type:1},
			{light:{type:1,color:[0.8,0.8,0.8],dir:'camera'} }];
		this.setLights(l);
	}
};
iv.window.prototype.load=function (file,d)
{
	var s=new iv.space(this,this.gl),w=this,ext=(d && d.type)?d.type:iv.getExtension(file),p={loaded:0,total:1},i=file.lastIndexOf('/'),f;
	if(d && d.path)s.path=d.path;
	if(i>0)
	{
		f=file.substring(0,i+1);
		file=file.substring(i+1);
		if(s.path)s.path+=f;else s.path=f;
	}
	var _info={file:file,space:s,ext:ext};
	if(d){
		_info.merge=!!d.merge;
		if(d.nonotify){_info.nonotify=d.nonotify;p=null;}
		if(d.iid)_info.iid=d.iid;
		if(d.callback)_info.callback=d.callback;
		if(d.parent)_info.parent=d.parent;
		if(d.nolights)_info.nolights=true;
		if(d.nogroup)_info.nogroup=true;
		if(d.zoom!=undefined){_info.zoom=d.zoom;}else _info.zoom=!_info.merge;
	}else{_info.merge=false;_info.zoom=true;}
	_info.file=file;
	var f=function(R){w._loadCallback(_info,R);};
	var r=iv.createRequest(file,s.path,f);
	r.onError=function(){w.notify("loadError",{url:this.responseURL,status:this.status})};
	if(ext=='IV3D'){r.responseType="arraybuffer";
	if(p){r.onprogress=function(e){if(e.lengthComputable){p.loaded=e.loaded;p.total=e.total;w.notify("progress",p);};};w.notify("progress",p)}};
	r.send();
}
iv.window.prototype.getDoubleSided = function(){return this.space?this.space.cfgDbl:false;}
iv.window.prototype.setDoubleSided = function(b){if(this.space.cfgDbl!=b){var s=this.space;s.cfgDbl=b;s.invalidate();}}
iv.window.prototype.getMaterials= function(){return this.space?(this.space.cfgDefMtl==null):false;}
iv.window.prototype.setMaterials= function(b)
{
	var s=this.space;
	if(b)
	{
		if(s.cfgDefMtl){
			s.cfgDefMtl.clear();
			s.cfgDefMtl=null;this.invalidate();
		}
	}else{
		if(!s.cfgDefMtl)
		{
			var m=new iv.material(s);
			m.load({"diffuse":0xcccccc,"specular":0x808080,"ambient":0x050505,"phong":25.6});
			s.cfgDefMtl=m;
			this.invalidate();
		};
	}
}
iv.window.prototype.getTextures = function(){return this.space?this.space.cfgTextures:false;}
iv.window.prototype.setTextures = function(b){if(this.space && this.space.cfgTextures!=b){this.space.cfgTextures=b;this.invalidate();}}
iv.window.prototype.setLights=function(l)
{
	var s=this.space;
	if(!s)return false;
	if(l){
		s.lights=l;
		s.stdLights=true;
	}else
	{
		s.lights=[];
		s.stdLights=false;
	}
	this.invalidate(iv.INV_MTLS);
}
iv.window.prototype.selectObjectsImp=function(down)
{
	if(!this.cfgAllowSelection)return;
	var s=this.space;
	if(!s)return;
	var I=this.mouseUpInfo,n=I.node,old=s.selNode,doDef=true;
	if(n && this.isGizmo && this.isGizmo(n))return;
	if(old==n && !I.shift && !I.ctrl)
		{
			var sel=s.getSelection();
			if(n){if(sel && sel.length==1)return;}
			else
			if(!sel)return;
		}
	if(I.shift)doDef=!s.selectRange(old,n);
	if(doDef){
		if(I.ctrl||n){
			var bSelect=true;
			if(I.ctrl&&n&&n.state&4) bSelect=false;
			s.select(n,bSelect,I.ctrl);
		}else {
			if(old){
				if(down)
					I.deselect=true;
				else
				{
					if(I.deselect)s.select(null,false,false);
				}
			}
		}
	}
}
iv.window.prototype.handleObjSelect_down=function(x,y,event)
{
	this.mouseUpInfo=null;
	this.imp.mouseMoved=false;
	var m=this.cfgSelMode,h=m&&this.hitTest(x,y),n=h?h.node:null,bCtrl=(event.ctrlKey==1),i={node:n,hitInfo:h,x:x,y:y};
	if(this.notify("mousedown",i,true))
	{
		this.mouseUpInfo={h:h,node:i.node,ctrl:bCtrl,shift:event.shiftKey};
		if(m==1)
		{
			this.selectObjectsImp(true);
			this.mouseUpInfo.node=null;
		}else this.mouseUpInfo.deselect=true;
	}
	if(i.handler)h.handler=i.handler;
	return h;
}
iv.window.prototype.handleObjSelect_up=function(x,y)
{
	var i=this.notify("mouseup",{x:x,y:y},true);
	if(this.mouseUpInfo && i)this.selectObjectsImp(false);
	this.mouseUpInfo=null;
}
iv.window.prototype.handleObjSelect=function(x,y,event,bDown){
	if(bDown)return this.handleObjSelect_down(x,y,event);
	else this.handleObjSelect_up(x,y);
	return null;
}
iv.window.prototype.onMouseUp=function(event,touch)
{
	var ar=this.commonMouseUp1(),e=event;
	if(touch){
		if(event.touches.length)
			e=event.touches[0];
		else e=null;
	}
	var p=this.getLocalPnt(e,touch);
	p.b=1;
	if(!touch && (event.button!==undefined))p.b=1<<event.button;
	this.commonMouseUp2(p,event,ar);
	this.releaseCapture(event);
}
iv.window.prototype.commonMouseUp1=function(){
	var a=this.last,ar=this.cfgAutoSpin;
	if(a){
		if(ar&1){
			var dt=this.getTickCount()-a.t;
			if(dt<200){ this.removeAnimationType("view");this.addAnimation(new iv.anim.spin(this,dt));ar=0;}
	}
	this.last=null;
}
return ar;
}
iv.window.prototype.commonMouseUp2=function(p,event,ar)
{
	var flags=3,I=this.imp;
	if(this.handler)flags=this.handler.onMouseUp(p,event);
	if((!I.mouseMoved) && (flags&1) && p.b==1)this.handleObjSelect(I.LX,I.LY,event,false);else this.notify("mouseup",{x:p.x,y:p.y});
	this.onHandler(flags);
}
iv.window.prototype.getTouchDistance=function(t)
{
	if(t &&(t.length>1)){
		var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;
		return Math.sqrt(dx*dx+dy*dy);}
	return 0;
}
iv.window.prototype.onMouseHover=function(event,p)
{
	if(!this.handler && this.getHandler)this.handler=this.getHandler(p,event);
	if(this.handler && this.handler.onMouseHover){
		if(!this.onHandler(this.handler.onMouseHover(p,event)))
			return false;
	}
	if(!this.notify("mousehover",p,true))return 0;
	if(!this.notifyNode("mousehover",p))return 0;if(this.nodeNotifyMask&1)this.imp.xdiv.style.cursor=(p.url)?"pointer":"default";
}
iv.window.prototype.notifyNode=function(name,p)
{
	if(!(this.space&&this.space.root))return;
	var u=function (n){var a=n.url?0:1;if(n.refTargets)a|=2;n=n.firstChild;while(n){a|=u(n);n=n.next;};return a;};
	if(this.nodeNotifyMask===undefined)this.nodeNotifyMask=u(this.space.root);
	if(this.nodeNotifyMask)
	{
		var h=this.hitTest(p);
		if(h)
		{
			var n=h.node;
			while(n)
			{
				if(!n.notify(name,p,true))return false;
				if(n.url && !p.url)p.url=n.url;
				n=n.parent;
			}
		}
	}
	return true;
}
iv.window.prototype.setHandler=function(h)
{
	var flags=0,a=this.handler;
	if(a!=h)
	{
	if(a && a.detach)flags|=a.detach(this);
	this.handler=h?h:null;
	}
	return flags;
}
iv.window.prototype.getPointer=function(id,create)
{
	var _i=this.pointers,e,i;
	for(i=0;i<_i.length;i++)
	{
		e=_i[i];
		if(e.id==id)return e;
	}
	if(create){_i.push(e={id:id});return e;}
	return null;
}
iv.window.prototype.deletePointer=function(id)
{
	var _i=this.pointers,e,i;
	for(i=0;i<_i.length;i++)
	{
		e=_i[i];
		if(e.id==id){_i.splice(i,1);return true;}
	}
	return false;
}
iv.window.prototype.decodeButtonsPointer=function(event)
{
	if(event.pointerType=='mouse')return this.decodeButtons(event,false);
	return 1;
}
iv.window.prototype.onPointerDown=function(event)
{
	if(!this.pointers || !this.pointers.length)
	{
		if(!this.checkDblTap(event))return;
	}
	var p=this.getLocalPnt(event),id=event.pointerId,I=this.imp;
	p.b=this.decodeButtonsPointer(event);
	var ptr=this.getPointer(id,true);
	ptr.clientX=p.x;ptr.clientY=p.y;
	if(this.pointers.length==1)
	{
		this.last={x:0,y:0,t:0};
		I.lastTouchDistance=-1;
		if(this.commonMouseDown1(p,event))
		{
			I.xdiv.setPointerCapture(id);
			this.commonMouseDown2(p,event);
		}
	}
}
iv.window.prototype.onPointerUp=function(event)
{
	iv.pdsp(event);
	if(event.pointerId){
		this.deletePointer(event.pointerId);
		this.imp.xdiv.releasePointerCapture(event.pointerId);
	}else this.pointers=[];
	if(!this.pointers.length)
	{
		this.commonMouseUp1();
		var p=this.getLocalPnt(event);
		p.b=this.decodeButtonsPointer(event);
		this.commonMouseUp2(p,event);
	}
}
iv.window.prototype.onLostCapture=function(event)
{
	var _i=this.pointers,e,i,I=this.imp;
	if(event.pointerId){
		this.deletePointer(event.pointerId);
		if(_i.length){
			I.lastTouchDistance=-1;
			I.mouseMoved=false;
			e=_i[0];
			I.LX=e.clientX;
			I.LY=e.clientY;
			return;
		}
	}
	for(i=0;i<_i.length;i++)
		I.xdiv.releasePointerCapture(_i[i].id);
	this.pointers=[];
	this.commonMouseUp1();
	this.commonMouseUp2({x:10,y:10,b:1},event);
}
iv.window.prototype.onPointerMove=function(event)
{
	iv.pdsp(event);
	var p=this.getLocalPnt(event),ptr=this.getPointer(event.pointerId,false);
	if(ptr)
	{
		ptr.clientX=p.x;
		ptr.clientY=p.y;
	}
	if(this.pointers.length){
		var ptr=this.pointers[0];
		this.onMouseMove(event,{x:ptr.clientX,y:ptr.clientY},this.pointers.length>1?this.pointers:null,this.decodeButtonsPointer(event));
	}
	else {
		p.b=0;
		this.onMouseHover(event,p);
	}
}
iv.window.prototype.onMouseDown=function(event,touch)
{
	var I=this.imp;
	this.last={x:0,y:0,t:0};
	I.lastTouchDistance=-1;
	if(touch)
	{
		if(event.touches.length>1){
			this.setHandler(null);
			I.lastTouchDistance=this.getTouchDistance(event.touches);
		}
	}
	var p=this.getLocalPnt(event,touch);
	p.b= this.decodeButtons(event,touch);
	if(this.commonMouseDown1(p,event))
	{
		this.setCapture();
		this.commonMouseDown2(p,event);
	}
}
iv.window.prototype.commonMouseDown1=function(p,event)
{
	iv.pdsp(event);
	if(this.handler){
		if(!this.onHandler(this.handler.onMouseDown(p,event)))
			return false;
	}
	return true;
}
iv.window.prototype.commonMouseDown2=function(p,event)
{
	var I=this.imp;
	this.stopAR();
	I.LX=p.x;
	I.LY=p.y;
	I.mouseMoved=false;
	var handler=null;
	if(p.b&1){p.hitInfo=this.handleObjSelect(p.x,p.y,event,true);if(p.hitInfo && p.hitInfo.handler)handler=p.hitInfo.handler;}
	if(!this.notifyNode("mousedown",p))return 0;
	if(p.url){if(p.url.url)window.open(p.url.url,p.url.target);else window.open(p.url,"_self");}
	if(!handler && this.getHandler)handler=this.getHandler(p,event);
	this.setHandler(handler);
	if(this.handler)this.onHandler(this.handler.onMouseDown(p,event));
	this.checkRCenter(p);
}
iv.window.prototype.onMouseMove=function (event,p,touches,b)
{
	if(!this.notify("mousemove",{x:p.x,y:p.y,b:b},true))return;
	var d=this.cfgMouseDelta,I=this.imp,dX=p.x-I.LX,dY=p.y-I.LY,mv=(Math.abs(dX)>d)||(Math.abs(dY)>d),flags=3;
	if(mv)this.removeAnimationType("view",true);
	if(touches)
	{
			var d=this.getTouchDistance(touches);
			if(!I.mouseMoved)this.undoVp("Zoom or Pan");
			if(I.lastTouchDistance!=d)
			{
				if(I.lastTouchDistance>0)
				{
					var _d=(I.lastTouchDistance-d)/2.0;
					this.doDolly(_d,_d);
					flags|=8;
				}
				I.lastTouchDistance=d;
			}
			if(mv){this.doPan(dX,dY);flags|=8;}
	}else{
	if(I.mouseMoved||mv)
	{
		p.b=b;
		if(this.handler)flags=this.handler.onMouseMove(p,event);
		if(flags&1)
		{
		flags|=this.doDefVPNavigation(dX,dY,b,event);
		}
	}}
	this.onHandler(flags);
	I.mouseMoved|=mv;
	if(I.mouseMoved){I.LX=p.x;I.LY=p.y;}
}
iv.window.prototype.doDefVPNavigation=function(dX,dY,b,event)
{
	b=this.mapButtonToNavigation(b,event);
	if(!this.imp.mouseMoved)
	{
		var t=["Orbit","Zoom via Dolly","Zoom via FOV","Pan"];t=t[b-1];
		if(t)this.undoVp(t);
	}
	switch(b)
	{
		case 1:this.addIR(dX,dY,1);this.doOrbit(dX,dY);return 8;
		case 2:if(!this.doDolly(dX,dY))break;return 8;
		case 3:if(!this.doFOV(dX,dY))break;return 8;
		case 4:this.doPan(dX,dY);return 8;
	}
	return 0;
}
iv.window.prototype.mapButtonToNavigation=function(b,event){
	var c=this.cfgButtons;
	switch(b){
		case 1:b=c[0];break;
		case 2:b=c[1];this.imp.cancelPopup=true;break;
		case 4:b=c[2];break;
		default:b=0;
	}
	return b;
}
iv.window.prototype.addIR=function(dX,dY,m)
{
	var a=this.last;if(a){a.x=dX+a.x/2;a.y=dY+a.y/2;var t=this.getTickCount();a.dt=t-a.t;a.t=t;a.mode=m;}
}
iv.window.prototype.onHandler=function(flags)
{
	var invF=0;
	if(flags&4)flags|=this.setHandler(null);
	if(flags&8){flags|=2;invF=iv.INV_VERSION;}
	if(flags&16)invF|=iv.INV_STRUCTURE;
	if(flags&2)this.invalidate(invF);
	return (flags&1)?true:false;
}
iv.window.prototype.onMouseWheel=function(event,d)
{
	if(this.m_undovp)
	{
		var u=this.m_undovp,name="Mouse Wheel";
		if(u.canRedo() || u.getLastUndoDescription()!=name && u.open())
		{
			u.add(new iv.undo.vp(this));
			u.accept(name);
		}
	}
	this.checkRCenter(this.getLocalPnt(event));
	switch(this.cfgMouseWheel)
	{
		case 2:this.doDolly(0,d);break;
		case 3:this.doFOV(0,d);break;
	}
	this.invalidate(iv.INV_VERSION);
}
iv.window.prototype.commonVPNotify=function(t,v,x,y){return {type:t,dX:x,dY:y,center:(this.imp.rCenter||v.to).slice()}};
iv.window.prototype.isCustomCenter=function(i,v){return i.center && !vec3.compare(i.center,v.to,1e-8);}
iv.window.prototype.doPan=function(dX,dY)
{
	var v=this.getView(),i=this.commonVPNotify("pan",v,dX,dY),d;
	if(this.notify("camera",i,true)){
		if(this.isCustomCenter(i,v))
		{
			var c=this.hcontext||new iv.rcontext(this);
			c.update();
			var V=c.worldToView(i.center,[]);
			V[0]+=dX;V[1]+=dY;
			d=vec3.subtract(i.center,c.viewToWorld(V,[]),[]);
		}else{
			var x0=this.viewport.x/2,y0=this.viewport.y/2,r0=this.getRay(x0,y0),r1=this.getRay(x0-i.dX,y0-i.dY);d=[r1[3]-r0[3],r1[4]-r0[4],r1[5]-r0[5]];
		}
		v.transform(d);
		this.setView(v);
	}
}
iv.window.prototype.doOrbit=function(dX,dY)
{
	var v=this.getView(),i=this.commonVPNotify("orbit",v,dX,dY);
	if(this.notify("camera",i)){
		dX=-i.dX/200;dY=i.dY;
		var _u=v.getUpVector();
		if(dX && this.cfgOrbitMode){v.rotate(i.center,_u,dX);dX=0;}
		if(dY)
		{
			vec3.normalize(_u);
			var _d=v.getViewVectorN(),
			_axis=vec3.cross(_d,_u,[]);
			var angle=dY/200.0;
			if(this.cfgMaxVAngle!=undefined){
				var viewAngle=Math.acos(Math.max(Math.min(vec3.dot(_d,[0,0,-1]),1),-1));
				var max=(90-this.cfgMinVAngle)*Math.PI/180,min=(90-this.cfgMaxVAngle)*Math.PI/180;
				dY=viewAngle-angle;
				if(dY>max)angle=viewAngle-max;
				else
					if(dY<min)angle=viewAngle-min;
			}
			v.rotate(i.center,_axis,-angle);
		}
		if(dX)v.rotate(i.center,[0,0,1],dX);
		this.setView(v);
	}
}
iv.window.prototype.doDolly=function(dX,dY)
{
	var v=this.getView(),i=this.commonVPNotify("dolly",v,dX,dY),I=this.imp;
	if(v.ortho)
	{
		var k=Math.max(1.0+(dY/100),1e-30);
		i.scale=v.scale/k;
		if(!this.notify("camera",i,true))return false;
		v.scale=i.scale;
		if(this.isCustomCenter(i,v)&&(I.x0!==undefined))
		{
			var r0=this.getRay(I.x0,I.y0);
			this.setView(v);
			v.transform(vec3.subtract(r0,this.getRay(I.x0,I.y0)));
		}
	}else{
		var dir=vec3.subtract(v.from,i.center,[]),l=vec3.length(dir);
		i.len=Math.min(Math.max(l+l*dY/100,this.cfgMinDistance),this.cfgMaxDistance);
		if(!this.notify("camera",i,true))return false;
		var _dir=vec3.add(vec3.scale(dir,i.len/l,[]),i.center),delta=vec3.subtract(_dir,v.from,[]);
		vec3.cpy(v.from,_dir);
		vec3.add(v.up,delta);
		if(this.isCustomCenter(i,v))
			vec3.add(v.to,delta);
	}
	this.setView(v);
	return true;
}
iv.window.prototype.doFOV=function(dX,dY)
{
	var V=this.view,
	i={type:"fov",dX:dX,dY:dY,fov:Math.min(Math.max(V.fov+dY/8,1),175)};
	if((i.fov!=V.fov)&&this.notify("camera",i,true))
	{
		V.fov=i.fov;
		return true;
	}
	return false;
}
iv.window.prototype.getRay=function(x,y,r)
{
	var w=this.viewport.x,h=this.viewport.y,v=this.view,p1=v.from,p2=v.to,dir=v.getViewVector(),up=vec3.normalize(v.getUpVector()),
	vx=vec3.crossN(dir,up,[]),h2=h/2,w2=w/2,i;
	if(!r)r=[];
	if(v.ortho)
	{
		var dy=(h2-y)/h2,dx=(x-w2)/h2,k=1/v.scale;
		vec3.scale(vx,dx*k);
		vec3.scale(up,dy*k);
		for(i=0;i<3;i++)r[i]=p1[i]+up[i]+vx[i];
	}else{
		var k=vec3.length(dir)*Math.tan(this.getFOV(v)),ky=(h2-y)/h2,kx=(x-w2)/w2;
		vec3.scale(up,k*ky);
		vec3.scale(vx,k*kx*w/h);
		vec3.cpy(r,p1);
	}
	for(i=0;i<3;i++)r[i+3]=p2[i]+up[i]+vx[i];
	return r;
}
iv.context=function(wnd)
{
	if(wnd){
		this.window=wnd;
		this.space=wnd?wnd.space:null;
		this.bbScaleFactor=0.0;
		this.screenScale=0.0;
		this.view=new iv.viewInfo();
		this.version=-1;
		this.mvMatrix=mat4.create();
		this.itmw=1;
	}
}
iv.context.prototype.addClip=function(node,a){}
iv.context.prototype.action=function(node,tm,state,opacity){return true;}
iv.context.prototype.getScaleFactor=function(unit){
	var k=this.bbScaleFactor;
	switch(unit){
		case 'pt':k*=1.512;break;
		case 'screen':k*=this.viewport.y/1000;break
		case 'px':break;
	}
	return k;
}
iv.context.prototype.update=function(utm){
	var w=this.window;
	if(this.version!=w.vpVersion)
	{
		this.space=w.space;
		this.version=w.vpVersion;
		this.W2=this.viewport.x/2;
		this.H2=this.viewport.y/2;
		var v=w.view,up=v.getUpVector(),V=this.view;
		this.ortho=!!v.ortho;
		if(v.camera&&(v.camera.object instanceof iv.camera))
		{
			var cam=v.camera,wtm=cam.getWTM();
			cam=cam.object;
			if(wtm)
			{
				mat4.mulPoint(wtm,cam.from,v.from);
				mat4.mulPoint(wtm,cam.to,v.to);
				mat4.mulPoint(wtm,cam.up,v.up);
			}else
			{
				vec3.cpy(v.from,cam.from);
				vec3.cpy(v.to,cam.to);
				vec3.cpy(v.up,cam.up);
			}
		if(this.ortho){
		if(cam.scale>0 && v.scale!=cam.scale)
			v.scale=cam.scale;
		}else
        {
            if(cam.fov!=v.fov)v.fov=cam.fov;
        }
		}
		if(v.ortho)
			this.screenScale=this.bbScaleFactor=1/(this.H2*v.scale);
		else {
			var fov=w.getFOV(v);
			this.bbScaleFactor=Math.tan(fov)/this.H2;
			this.screenScale=1.0/Math.tan(fov);
			if(utm){
				this.bbScaleFactor/=utm[0];
			}
		}
		this.utm=utm;
		if(utm){
			mat4.lookAt(mat4.mulPoint(utm,v.from,V.from),mat4.mulPoint(utm,v.to,V.to),up,this.mvMatrix);
			mat4.mulPoint(utm,v.up,V.up);
		}
		else mat4.lookAt(v.from,v.to,up,this.mvMatrix);
		if(!utm){
			vec3.cpy(V.from,v.from);
			vec3.cpy(V.to,v.to);
			vec3.cpy(V.up,v.up);
		}
	}
	return true;
}
iv.context.prototype.viewToWorld=function(v,w)
{
	var W=this.W2,H=this.H2,k=this.screenScale,z=v[2];
	if(!w)w=[];
	if(this.ortho)
	{
		w[0]=(v[0]-W)*k;
		w[1]=-(v[1]-H)*k;
	}else{
	w[1]=(z*(v[1]-H)/H)/k;
	w[0]=(-z*(v[0]-W)/H)/k;
	}
	w[2]=z;
	if(!this.tmi)this.tmi=[];
	mat4.invert(this.tmi,this.mvMatrix);
	return mat4.mulPoint(this.tmi,w,w);
}
iv.context.prototype.worldToView=function(w,v,ignore)
{
	if(this.utm && !ignore)
		w=mat4.mulPoint(this.utm,w,[]);
	v=mat4.mulPoint(this.mvMatrix,w,v);
	var z=v[2],W=this.W2,H=this.H2,k=this.screenScale;
	if(this.ortho)
	{
		v[0]=v[0]/k+W;
		v[1]=-v[1]/k+H;
		return v;
	}
	if(z)
	{
		v[0]=-(k*v[0]/z)*H+W;
		v[1]=(k*v[1]/z)*H+H;
		return v;
	}
	return null;
}
iv.rcontext=function(wnd)
{
	iv.context.call(this,wnd);
	if(wnd){
		this.viewport=wnd.buffer;
		this.q=[];
		for(var i=1;i<12;i++)this.q[i]=({L:0,I:[]});
		this.tmTmp=mat4.create();
		this.itmw=0;
	}
}
iv.rcontext.prototype=new iv.context(null);
iv.rcontext.prototype.action=function(n,a,b,c)
{
	if(n.object)return n.object.preRender(this,n,a,b,c);
	return true;
}
iv.rcontext.prototype.getScaleFactor=function(unit)
{
	var k=iv.context.prototype.getScaleFactor.call(this,unit);
	k*=this.viewport.x/this.window.viewport.x;
	return k;
};
iv.queueItem=function()
{
	this.tm=null;
	this.object=null;
	this.mtl=null;
	this.far=this.near=1.0;
	this.state=0;
	this.opacity=1.0;
}
iv.rcontext.prototype.toRenderQueue=function(atm,node,state,opacity){
	var tm,i;
	if(atm) tm=mat4.m_z(atm,this.mvMatrix,this.tmTmp);
	else tm=this.mvMatrix;
	var obj=node.object,_min=obj.boxMin,_max=obj.boxMax,near= -(tm[2]*_min[0]+tm[6]*_min[1]+tm[10]*_min[2]),far=near,S=this.space;
	for(i=1;i<8;i++){
		var x=(i&1)?_max[0]:_min[0],y=(i&2)?_max[1]:_min[1],z=(i&4)?_max[2]:_min[2];
		z= -(tm[2]*x+tm[6]*y+tm[10]*z);
		if(z<near) near=z; else if(z>far) far=z;
	}
	z=tm[14];
	far-=z;near-=z;
	if(far<1e-6)return;
	var rmode=S.rmodes[(state&0xff00)>>8],mtl=rmode.mtl||S.cfgDefMtl||node.material,
	s=node.stage||((mtl.opacity!=undefined || opacity<1.0)?4:2),_q=this.q[s],a=_q.I[_q.L];
	if(!a) a=_q.I[_q.L]=new iv.queueItem();
	a.tm=atm;
	a.object=obj;
	a.mtl=mtl;
	a.near=near;
	a.far=far;
	a.state=state|(node.state&iv.NS_MASK);
	a.opacity=opacity;
	_q.L++;
}
iv.window.prototype.drawBk=function (s)
{
	var gl=this.gl,bk=this.cfgBkColor;
	gl.viewport(0,0,this.buffer.x,this.buffer.y);
	if(bk===null)
	{
		gl.clearColor(0,0,0,0);
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
	}else
	if(!s || !s.bk || (!s.drawBk()))
	{
		if(!iv.isColor(bk))this.cfgBkColor=bk=iv.parseColor(bk);
		gl.clearColor(bk[0],bk[1],bk[2],1);
		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
	}
}
iv.window.prototype.drawScene=function (){
	var s=this.space,l=this.layer,rc=this.rcontext;
	if(s){
		rc.update(s.unitMatrix);
		s.render(rc);
	}else this.drawBk(s);
	while(l){l.draw();l=l.nextLayer;}
	this.timer=false;
	if(this.postRepaint){this.invalidate();this.postRepaint=false;}
	if(s && !this.imp.numFrames++)this.notify('firstFrame');
}
iv.window.prototype.invalidate=function(f){
	if(f!==undefined)
	{
		if(f&iv.INV_VERSION)this.vpVersion++;
		if(f&iv.INV_STRUCTURE)this.structVersion++;
		if(f&iv.INV_MTLS && this.space)this.space.invalidateMaterials();
	}
	if(this.timer)return;
	this.timer=true;
	this.requestAnimFrame.call(window,this.drawScene.bind(this));
}
iv.easeInOut=function(a){return 0.5+Math.sin((a-0.5)*Math.PI)/2;}
iv.window.prototype.animate=function()
{
	var j=0,rez=0,uFlags=0,inv=false,time = this.getTickCount(),_i=this.transitions;
	while(j<_i.length)
	{
		var i=_i[j],del=false;
		if(i.lastTime!=time)
		{
			if(i.duration)
			{
				var a=(time-i.startTime)/i.duration;
				if((a>=1.0)||(a<0)){a=1.0;del=true;}
				if(i.transition)a=i.transition(a);
				rez=i.animate(a);
			}else
			{
				rez=i.animate(Math.max(time-i.lastTime,0));
				if(!(rez&1))del=true;
			}
			i.lastTime=time;
		}
		if(rez&2)inv=true;
		if(rez&4)uFlags|=iv.INV_VERSION;
		if(rez&16)uFlags|=iv.INV_STRUCTURE;
		if(del)this._removeAnimation(j,true);else j++;
	}
	if(inv)this.invalidate(uFlags);
	if(!_i.length)
	{
		clearInterval(this.transTimer);
		this.transTimer=null;
	}
}
iv.window.prototype.getAnimation=function(type)
{
	var _i=this.transitions,i,t;
	if(_i)
	{
		for(i=0;i<_i.length;i++)
		{
			t=_i[i];
			if(t.type && t.type==type)return i;
		}
	}
	return -1;
};
iv.window.prototype._removeAnimation=function(i,f)
{
	var _i=this.transitions,t=_i[i];
	if(t.detach)t.detach(this,f);
	if(t.type)this.notify("animend",{type:t.type,anim:t});
	_i.splice(i,1);
}
iv.window.prototype.removeAnimationType=function(type,e)
{
	var _i=this.transitions,i,t;
	if(_i)
	{
		for(i=0;i<_i.length;i++)
		{
			t=_i[i];
			if(t.type && t.type==type)
			{
				if(e && t.duration)t.animate(1.0);
				this._removeAnimation(i);
				return true;
			}
		}
	}
	return false;
};
iv.window.prototype.removeAnimation=function(a)
{
	var _i=this.transitions,i;
	if(_i){
		i=iv.indexOf(_i,a);
		if(i>-1)
		{
			this._removeAnimation(i);
			return true;
		}}
	return false;
}
iv.window.prototype.addAnimation=function(i)
{
	i.lastTime = this.getTickCount();
	if(i.duration)i.startTime=i.lastTime;
	if(!this.transitions)this.transitions=[];
	this.transitions.push(i);
	if(i.type)this.notify("animstart",{type:i.type,anim:i});
	if(!this.transTimer)this.transTimer=setInterval(this.input.a,10);
	return true;
};
iv.window.prototype.playAnimation=function(p)
{
	var r=null,s=this.space;
	if(s){
		var info={from:s.anim?s.anim.start:0,to:s.anim?s.anim.end:1};
		if(p)for(var v in p)info[v]=p[v];
		r=new iv.anim.node(this,s,info);
		this.addAnimation(r);
	}
	return r;
}
iv.anim.spin=function(wnd,t,m)
{
	this.type="spin";this.wnd=wnd;
	var a=wnd.last,k=this.kf(a.dt)*wnd.cfgSpinSpeed;
	this.x=a.x*k;
	this.y=a.y*k;
	this.mode=m;
}
iv.anim.spin.prototype.kf=function (a){return Math.pow(0.82,a/100);}
iv.anim.spin.prototype.animate=function(a)
{
	this.wnd.doOrbit(this.x,this.y);
	var k=this.kf(a);
	this.x*=k;this.y*=k;
	k=1e-1;
	if((Math.abs(this.x)<k) && (Math.abs(this.y)<k)){return 6;}
	return 7;
}
iv.window.prototype.stopAR=function(){
this.removeAnimationType("spin");
}
iv.window.prototype.searchNode = function(id)
{
	var r=this.getRoot();
	if(r)return r.search(id);
	return null;
}
iv.window.prototype.loadObject=function(name,props){
	var s=this.space;
	if(s){
		if(!props)props={};
		var parent=props.parent||s.root,cb=props.callback,r=s.resources;
		if(r){
			for(var i=0;i<r.items.length;i++){
				var res=r.items[i];
				if(res.name==name)
				{
					if(res.node)
					{
					var n=iv.cloneNode(parent,res.node);
					if(cb)cb(n);
					return n;
					}else {res.items.push({parent:parent,cb:cb});return null;}
				}
			}
		}else {
			var n=s.root.newNode();n.state=iv.NS_SYSTEM|iv.NS_NOTREE;
			r=s.resources={group:n,items:[]};
		}
		var res={name:name,node:null,items:[{parent:parent,cb:cb}]};
		r.items.push(res);
		var info={path:(props.path!==undefined?props.path:this.cfgResources),callback:function(n)
			{
				res.node=n;
				for(var i=0;i<res.items.length;i++)
					{var a=res.items[i],_n=iv.cloneNode(a.parent,n);if(a.cb)a.cb(_n);};
			},parent:r.group,merge:true,nonotify:true,nolights:true,nogroup:true};
		if('nogroup' in props)info.nogroup=props.nogroup;
		this.load(name,info);
	}
	return null;
}
iv.window.prototype.setRMode=function(mode)
{
	var s=this.space;
	if(!s)return;
	var m=s.getRMode(mode);
	if(m && m.index!=s.cfgRMode)
	{
		s.cfgRMode=m.index;
		this.invalidate();
		return true;
	}
	return false;
}
iv.window.prototype.setModelView =function(v,flags)
{
	if(!flags)flags=iv.VIEW_ANIM_SET|iv.VIEW_ANIM_PLAY|iv.VIEW_TRANSITION|iv.VIEW_RESET_RCENTER;
	this.stopAR();
	if(typeof v =='object')this.setView(v,flags);else{
		var s=this.space;
		if(s && s.views && v>=0 && v<s.views.length)
		{
			v=s.views[v];
			if(v)this.setView(v,flags);
		}}
}
iv.window.prototype.getStdView=function (m)
{
	var v=this.getView(),d=vec3.distance(v.from,v.to),t=v.to,i,s=this.space;
	if(s&&s.cfgUpAxis&&s.cfgUpAxis=='y+')m=iv.stdViewsY[m];else m=iv.stdViews[m];
	if(m){for(i=0;i<3;i++){v.from[i]=t[i]+d*m.f[i];v.up[i]=t[i]+d*m.u[i];}}
	return v;
}
iv.window.prototype.setStdView=function(mode,flags){
	var v=this.getStdView(mode);
	if (v){
		this.stopAR();
		if(flags==undefined)flags=iv.VIEW_RESET_RCENTER|iv.VIEW_TRANSITION;
		if(flags&iv.VIEW_UNDO){this.undoVp("Set "+mode);flags&=~iv.VIEW_UNDO;}
		this.setView(v,flags);
	}
}
iv.window.prototype.getViewToBox=function(v,b)
{
	if(!v)v=this.getView();
	var sz=box3.size(b),to=box3.middle(b),l=vec3.length(sz)/2,k=this.cfgZoomFactor;
	if(v.ortho)
	{
		v.scale=k/l;
		l=vec3.subtract(to,v.to,[]);
		vec3.add(v.from,l);
		vec3.add(v.up,l);
	}else{
		var dir=v.getViewVectorN(),up=v.getUpVector();
		vec3.scale(dir,-l/(Math.sin(this.getFOV(v))*k));
		vec3.add(to,dir,v.from);
		vec3.add(v.from,up,v.up);
	}
	vec3.cpy(v.to,to);
	return v;
}
iv.window.prototype.zoomToFitBox=function(v,b,flags)
{
	v=this.getViewToBox(v,b);
	this.stopAR();
	if(flags==undefined)flags=iv.VIEW_RESET_RCENTER|iv.VIEW_TRANSITION;
	this.setView(v,flags|iv.VIEW_INVALIDATE);
}
iv.window.prototype.zoomToFit=function(v,flags){
	var r=this.getRoot();
	if(r)
	{
		var b=r.getBoundingBox(null,null,!!(flags&iv.VIEW_VISIBLE));
		if(b)return this.zoomToFitBox(v,b,flags);
	}
}
//ivspace3d.js
iv.space=function (view,gl){
	this.gl=gl;
	this.webgl=view.webgl;
	this.window=view;
	this.spaceId=view.spaceId;
	view.spaceId++;
	this.activeShader=this.view=this.root=null;
	this.materials=[];
	this.shaders={v:[],p:[]};
	this.cfgDbl=this.cfgTextures=true;
	this.cfgKeepMeshData=3;
	this.cfgDefMtl=null;
	this.cfgSelZOffset=false;
	this.cfgRMode=0;
	this.clrSelection=view.clrSelection;
	this.stdLights=this.anySelection=false;
	this.extensions={};
	var w=0xffffffff,b=0xff000000;
	this.rmodes=[
	{f:{n:true},name:"solid"},
	{f:null,e:{n:false,color:b},name:"wire"},
	{f:null,e:{n:true},name:"wireshaded"}
];
this.lights=[];
this.projectionTM = mat4.create();
this.modelviewTM = mat4.create();
this.meshesInQueue=0;
if(gl){
	this.e_ans=(this.getExtension('EXT_texture_filter_anisotropic') ||this.getExtension('MOZ_EXT_texture_filter_anisotropic') ||this.getExtension('WEBKIT_EXT_texture_filter_anisotropic'));
	var e=this.getExtension("EXT_blend_minmax");
	this.e_alpha_blend=e?e.MAX_EXT:gl.FUNC_ADD;
	if(this.e_ans)this.e_ansMax = gl.getParameter(this.e_ans.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
}
}
iv.space.prototype.getExtension=function(a)
{
	var e=this.gl.getExtension(a);
	if(!e && this.composeExtension){
		e=this.extensions[a];
		if(!e){e=this.composeExtension(a);
			if(e)this.extensions[a]=e;
		}
	}
	return e;
}
iv.space.prototype.releaseShader=function(sh)
{
	sh.ref--;
	if(!sh.ref)
	{
		var gl=this.gl,_i=(sh.type==gl.VERTEX_SHADER)?this.shaders.v:this.shaders.p,s;
		gl.deleteShader(sh.handle);
		sh.handle=null;
		var i=iv.indexOf(_i,sh);
		if(i>=0)_i.splice(i,1);
	}
}
iv.space.prototype.getShader=function(str,type)
{
	var gl=this.gl,_i=(type==gl.VERTEX_SHADER)?this.shaders.v:this.shaders.p,s;
	for(var i=0;i<_i.length;i++)
	{
		s=_i[i];
		if(s.str==str){
			s.ref++;
			return s;
		}
	}
	var shader= gl.createShader(type),s={str:str,handle:shader,ref:1,type:type};
	_i.push(s);
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		var info=gl.getShaderInfoLog(shader);
		if(this.window)this.window.notify("error",{type:"compile",info:info,code:str});
		return null;
	}
	return s;
}
iv.space.prototype.getSolidMaterial=function(c)
{
	c=iv.parseColor(c,true);
	var C=iv.ftoI(c[2])|(iv.ftoI(c[1])<<8)|(iv.ftoI(c[0])<<16),a=(c.length>3)?c[3]:1.0;
	C|=iv.ftoI(a)<<24;
	if(!this.solidMaterials)this.solidMaterials=[];
	var mtl=this.solidMaterials[C];
	if(!mtl)
	{
		var data={emissive:{color:c} };
		if(a<1.0)data.opacity={amount:a};
		mtl=this.newMaterial(data);
		this.solidMaterials[C]=mtl;
	}
	return mtl;
}
iv.space.prototype._checkRMMtl=function(m){if(m && (m.color!==undefined) && (!m.mtl))m.mtl=this.getSolidMaterial(m.color);}
iv.space.prototype.getRMode=function(mode)
{
	var L=this.rmodes,i,m;
	for(i=0;i<L.length;i++)
	{
		m=L[i];
		if(m.name==mode)
		{
			if(!m.l)m.l={mtl:null};
			this._checkRMMtl(m.f);this._checkRMMtl(m.l);this._checkRMMtl(m.e);
			if(m.index===undefined)m.index=i;
			return m;
		}
	}
	return null;
}
iv.space.prototype.onMeshLoaded=function(m)
{
	this.meshesInQueue--;
	if(!this.meshesInQueue)
	{
	var w=this.window;
	if(w && w.onMeshesReady)
		w.onMeshesReady(w,this);
	}
	this.invalidate(iv.INV_STRUCTURE);
};
iv.space.prototype.updateShadeArgs=function(a){
	var gl=this.gl,i,p=this.activeShader,ca=(p)?p.attrs.length:0,na=a?a.attrs.length:0;
	if(na>ca)
	{
		for(i=ca;i<na;i++) gl.enableVertexAttribArray(i);
	}
	else if(na<ca)
	{
		for(i=na;i<ca;i++) gl.disableVertexAttribArray(i);
	}
	ca=p?p.textures.length:0;
	for(i=0;i<ca;i++)p.textures[i].txt.unbind(i);
}
iv.space.prototype.activateShader = function(s,info,flags)
{
	if(s!=this.activeShader)
		this.updateShadeArgs(s);
	if(s)s.activate(this,info,flags,s==this.activeShader);
	else this.gl.useProgram(null);
	this.activeShader=s;
}
iv.space.prototype.activateMaterial = function(m,info,flags)
{
	var s=m?m.getShader(flags):0;
	if(s && !s.valid)
	{
		if(this.activeShader)this.activateShader(null,null);
		s.update();
	}
	this.activateShader(s,info,flags);
	return s;
}
iv.space.prototype.invalidate = function(f){this.window.invalidate(f);}
iv._handle_txt=function(i,t){t.notify("status");delete i.ivtexture;if(t.inline)URL.revokeObjectURL(i.src);}
iv.handleLoadedTexture=function(){
	var t=this.ivtexture,s=t.space;
	if(t.gl){
	if(this.naturalWidth>0 && this.naturalHeight>0)
	{
		t.bind().setImage(this);
		if(t.filter==iv.FILTER_MIPMAP)t.mipMap();
		t.unbind();
	}else t.error=true;
	iv._handle_txt(this,t);
	s.checkTextures();
	s.invalidate();}
}
iv.handleLoadedCubeTexture=function()
{
	var t=this.ivtexture,s=t.space;
	t.bind().setImage(this,this.ivface).linear().unbind().numfaces++;
	if(t.numfaces==6)
	{
		t.ready=true;
		s.checkTextures();
		s.invalidate();
		t.space=null;
	}
	iv._handle_txt(this,t);
};
iv.space.prototype.checkTextures = function()
{
	var _i=this.window.textures,l=0,f=0,i;
	for(i=0;i<_i.length;i++)
	{
		var t=_i[i];
		if(t.ready||t.error)l++;
		if(t.error)f++;
	}
	this.window.notify('textures',{loaded:l,total:_i.length,failed:f,queue:_i.length-l});
}
iv.space.prototype.getCubeInfo=function()
{
	if(!this.cubeTexture){
		var gl=this.gl;
		this.cubeTexture=[{name:"posx",id:gl.TEXTURE_CUBE_MAP_POSITIVE_X,dir:[1,0,0],up:[0,-1,0]},{name:"negx",id:gl.TEXTURE_CUBE_MAP_NEGATIVE_X,dir:[-1,0,0],up:[0,-1,0]},{name:"posy",id:gl.TEXTURE_CUBE_MAP_POSITIVE_Y,dir:[0,1,0],up:[0,0,1]},{name:"negy",id:gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,dir:[0,-1,0],up:[0,0,-1]},{name:"posz",id:gl.TEXTURE_CUBE_MAP_POSITIVE_Z,dir:[0,0,1],up:[0,-1,0]},{name:"negz",id:gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,dir:[0,0,-1],up:[0,-1,0]}];}
	return this.cubeTexture;
}
iv.space.prototype.getTexture = function(str,target,mtl,extra){
	var t,_i=this.window.textures,gl=this.gl,i;
	for(i=0;i<_i.length;i++)
	{
		t=_i[i];
		if((t.file==str) && (t.target==target)){t.addRef();return t;}
	}
	t=new iv.texture(gl,{target:target});
	t.space=this;
	t.file=str;
	var path=(mtl && mtl.path)?mtl.path:this.path;
	if(target==gl.TEXTURE_CUBE_MAP)
	{
		var faces = this.getCubeInfo();
		t.numfaces=0;
		var _str=str.split(".");
		if(path)_str[0]=path+_str[0];
		for(i=0;i<6;i++)
		{
			var f=faces[i],filename=_str[0]+f.name+"."+_str[1];
			this.loadTextureCube(t,f.id,filename);
		}
	}else{
	var _str=path?path+str:str;
	var e=iv.getExtension(str);
	if(str=='$(camera)'){if(iv.HandleCameraTexture)iv.HandleCameraTexture(t);}else
	this.loadTexture2d(t,_str);
}
	_i.push(t);
	return t;
}
iv.space.prototype.newMaterial=function(n){
	var mtl=new iv.material(this),t=typeof n;
	this.materials.push(mtl);
	if(t=='string')mtl.name=name;
	else
		if(t=='object')mtl.load(n);
	return mtl;
}
iv.space.prototype.removeLights=function()
{
	function t(n)
	{
		if(n.object && n.object instanceof iv.light){if(n.firstChild|| !n.parent)n.setObject(null);else n.parent.remove(n);}
		n=n.firstChild;
		while(n){var _n=n.next;t(n);n=_n;}
	}
	if(this.root)t(this.root);
}
iv.space.prototype.merge=function(info){
	var s=info.space;
	if(s.root){
		var _b=s.anims,i,_i,j;
		if(_b)
		{
			if(this.anims && this.anims.length)
			{
				var _a=this.anims,_al=_a.length,maxId=0,a;
				for(i=0;i<_al;i++)
				{
					a=_a[i];
					if(a.id>maxId)maxId=a.id;
				}
				for(i=0;i<_b.length;i++)
				{
					var b=_b[i];
					if(b.name)
					{
						for(j=0;j<_al;j++)
						{
							a=_a[j];
							if(a.name==b.name)break;
							a=null;
						}
					}
					if(a)
						s.replaceAnimId(b.id,a.id);
					else {
						_a.push(b);
						maxId++;
						s.replaceAnimId(b.id,maxId);
					}
				}
			}else this.anims=_b;
			s.anims=null;
			_i=s.views;
			if(_i)
				for(i=0;i<_i.length;i++)
				{
					if(!this.views)this.views=[];
					this.views.push(_i[i]);
				}
		}
		var n=s.root;
		var group=this.root;
		if(info.parent)group=info.parent;
		if(info.nogroup&& (!n.object && n.firstChild))
		{
			n=n.firstChild;
			var _n=n;
			while(_n){group.insert(_n);_n=_n.next;}
		}else group.insert(n);
		s.root=null;
		_i=s.materials;
		if(_i) {
			for(i=0;i<_i.length;i++) {
				var m=_i[i];
				m.space=this;
				this.materials.push(m);
			}
		}
		this.invalidate();
		return n;
	}
	return null;
};
iv.space.prototype.getBinData=function(b,i){return new Uint8Array(b,i.pos,i.szCmp);}
iv.space.prototype.loadBin=function(r)
{
	var buffer=r.response;
	var data= new DataView(buffer),ms=[],is=[],l=data.byteLength,i=0,root=null,d;
	while(i<l)
	{
		var id=data.getUint32(i,true),a=(id>>24)&0xff;
		d={pos:i+12,id:id,sz:data.getUint32(i+4,true),szCmp:data.getUint32(i+8,true)};
		if(a==2){
			d.format=data.getUint16(i+12,true);
			is[id&0xffffff]=d;
		}
		else
			if(a==1)ms[id&0xffffff]=d;
			else
			if(id==0x746f6f72)root=d;
		i+=d.szCmp+12;
	}
	if(root)
	{
		var _data=this.getBinData(buffer,root),text=ZIP.inflateStr(_data,root.sz),js=JSON.parse(text);
		if(js && js.space)
		{
			for(i=1;i<is.length;i++)this.loadInlineTexture(data,is[i],i);
			d={objects:[],textures:is,r:r};l=ms.length;
			for(i=0;i<l;i++)if(ms[i])d.objects[i]=new iv.mesh(this.gl);
			this.loadImp(js,d);
			for(i=0;i<l;i++)
			{
				var info=ms[i];
				if(info)d.objects[i].load(this,ZIP.inflateBin(this.getBinData(buffer,info),info.sz));
			}
		}
	}
}
iv.space.prototype.loadTexture2d=function(t,url)
{
	var I=t.image=new Image;
	I.onload = iv.handleLoadedTexture;
	I.ivtexture=t;
	I.src=url;
}
iv.space.prototype.loadTextureCube=function(t,id,url)
{
	var I = new Image;
	I.ivtexture=t;
	I.ivface=id;
	I.onload=iv.handleLoadedCubeTexture;
	I.src=url;
}
iv.space.prototype.loadInlineTexture=function(data,info,index)
{
	var buffer=data.buffer,pos=info.pos+2,gl=this.gl,t=new iv.texture(gl);
	t.inline=true;
	t.file="?s"+this.spaceId+"i"+index;
	t.space=this;
	this.window.textures.push(t);
	var utype={type: info.format&1?'image\/jpeg':'image\/png'};
	if(info.format&0x100)
	{
		t.numfaces=0;
		t.target=gl.TEXTURE_CUBE_MAP;
		var faces=this.getCubeInfo(),i;
		for(i=0;i<6;i++)
		{
			var size=data.getUint32(pos,true);pos+=4;
			var view = new Uint8Array(buffer,pos,size);
			pos+=size;
			this.loadTextureCube(t,faces[i].id,URL.createObjectURL(new Blob([view],utype)));
		}
	}else this.loadTexture2d(t,URL.createObjectURL(new Blob([new Uint8Array(buffer,pos,info.szCmp-2)]),utype));
}
iv.space.prototype.postProcessNode=function(n,d)
{
	n=n.firstChild;
	while(n)
	{
		this.postProcessNode(n);
		n=n.next;
	}
};
iv.space.prototype.postProcess=function(d)
{
	if(this.root)this.postProcessNode(this.root)
}
iv.space.prototype.loadImp=function(data,d){
	var s=data.space,i,a,c,v;
	d.materials=[];d.space=this;
	if(s.materials)
		for(i=0;i<s.materials.length;i++){
			var mtl=this.newMaterial(s.materials[i]);
			d.materials.push(mtl);
		}
	if(s.root) {
		if(!this.root) this.root=new iv.node();
		this.root.load(s.root,d);
	}
	if(s.views) {this.views=s.views;
		for(i=0;i<s.views.length;i++)
		{
			v=s.views[i];
			if(v.camera)v.camera=this.root.searchId(v.camera);
		}
	}
	if(s.anims){
		this.anims=s.anims;
		for(i=0;i<s.anims.length;i++)
		{
			a=s.anims[i];
			if(a.active)
			{
				this.activateAnimation(a);
				break;
			}
		}
	}
	var tm=this.unitMatrix=mat4.identity(mat4.create());
	a=s.bbox;
	if(a)
	{
		mat4.setScale(tm,a[0]);
		tm[12]=a[1];tm[13]=a[2];tm[14]=a[3];
	}
	a=s.view;
	if(a){
		c=this.view={from:a.from||a.org,to:a.to||a.target,up:a.up};
		for(v in a)
		{
			switch(v){
			case 'viewScale':c.scale=a[v];c.ortho=true;break;
			case 'camera':c[v]=this.root.searchId(a[v]);break;
			case 'rcenter':
			case 'bind':
			case 'fov':c[v]=a[v];break;
			}
		}
	}
	c=s.config;
	if(c)
	{
		for(v in c)
		{
			switch(v)
			{
				case "upAxis":this.cfgUpAxis=c[v];break;
				case "unit":this.cfgUnit=c[v];break;
				case "bkfaces":this.cfgDbl=c[v];break;
				case "rmode":var m=this.getRMode(c[v]);if(m)this.cfgRMode=m.index;break;
			}
		}
	}
	if(s.meta)this.meta=s.meta;
	this.postProcess(d);
}
iv.space.prototype.load=function(data){
	if(data && data.space) {
			var m=data.space.meshes,d={objects:[]},i,obj;
			if(m)
				for(i=0;i<m.length;i++) {
					obj=new iv.mesh(this.gl);
					if(this.path)
						obj.url=this.path+m[i].ref;
					else obj.url=m[i].ref;
					d.objects.push(obj);
				}
			this.loadImp(data,d);
		}
};
iv.space.prototype.renderQueue=function(q,sort)
{
	var _i=q.I;
	if(_i.length>q.L)_i.splice(q.L,_i.length-q.L);
	if(sort)_i.sort(this.zCompareFunc);
	var c=_i.length,a,gl=this.gl,i,b,d;
	for(i=0;i<c;i++){
		b=_i[i],d=(b.state&iv.TS_DBL)!=0;
		if(d!=a) {
			if(d) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
			a=d;
		}
		b.object.render(this,b);
	}
}
iv.space.prototype.updatePrjTM=function(ctx){
	var wnd=this.window,V=wnd.view,gl=this.gl,ok=false,far=0,near=0,tm=this.projectionTM,kx;
	for(var iPass=1;iPass<ctx.q.length;iPass++){
		var q=ctx.q[iPass],c=q.L;
		if(!c)continue;
		var items=q.I,iO,d;
		for(iO=0;iO<c;iO++){
			d=items[iO];
			if(ok)
			{
				if(d.near<near)near=d.near;
				if(d.far>far)far=d.far;
			}else {far=d.far;near=d.near;ok=true};
		}
	}
	kx=ctx.viewport.x/ctx.viewport.y;
	if(V.ortho)
	{
		var ky=1,scale=V.scale;
		if(this.unitMatrix)scale/=this.unitMatrix[0];
		kx/=scale;
		ky/=scale;
		mat4.ortho(-kx,kx,-ky,ky,near,far,tm);
	}else{
		var fov=wnd.getFOV(V);
		if(ok)mat4.perspectiveEx(fov,kx,near,far,tm);
		else mat4.perspective(fov,kx,0.1,100,tm);
	}
	ctx.farClip=far;
	ctx.nearClip=near;
}
iv.space.prototype.zCompareFunc=function(a, b){
	var _a=a?a.near:-1e38,_b=b?b.near:-1e38;
	if(_a>_b)return -1;if(_a<_b)return 1;return 0;
}
iv.space.prototype.prepareLights=function() {
	var _i=this.lights,d=_i.length-this.currentLight,org=[0,0,0],i;
	if(!this.stdLights && (d>0)){
		_i.splice(this.currentLight,d);
	}
	for(i=0;i<_i.length;i++) {
		var l=_i[i],L=l.light;
		if(!L)continue;
		if(L.type!==l.type)l.type=L.type;
		l.color=L.color;
		if(L.type!=1){
			if(l.tm) l.org=mat4.mulPoint(l.tm,org,[]);else l.org=org;
		}
		if(L.target)
		{
			if(!l.dir)l.dir=[];
			if(!l.targetNode || (L.target!=l.tagert))l.targetNode=this.root.searchId(l.tagert=L.target);
			if(l.targetNode)
			{
				var wtm=l.targetNode.getWTM();
				if(wtm)
					mat4.getTranslate(wtm,l.dir);
				else vec3.cpy(l.dir,[0,0,0]);
				mat4.mulPoint(this.unitMatrix,l.dir,l.dir);
				vec3.subtractN(l.dir,l.org);
			}
		}else{
			var dir=L.dir;
			if(dir=="camera")l.dir=this.window.view.getViewVector(l.dir);
			else
				if(l.tm){
					if(dir) l.dir=mat4.mulVector(l.tm,dir,[]);
				} else {
					if(dir) l.dir=dir.slice();
				}
			if(l.dir)vec3.normalize(l.dir);
		}
		if(l.type==2)
		{
			if(!l.spot)l.spot=[0,0,0];
			var cin=Math.cos(L.inner/2),cout=Math.cos(L.outer/2);
			l.spot[0]=cin;
			l.spot[1]=cout;
		}
	}
}
iv.space.prototype.invalidateMaterials=function()
{
	var _i=this.materials,i;
	for(i=0;i<_i.length;i++)_i[i].invalidate();
}
iv.space.prototype.render=function(ctx) {
	if(this.root) {
		mat4.copy(ctx.mvMatrix,this.modelviewTM);
		var gl=this.gl,astate=this.cfgRMode<<20,i,blend=false,q;
		if(this.cfgDbl)astate|=iv.TS_DBL;
		if(!ctx.keepLights)this.currentLight=0;
		this.root.traverse(ctx,this.unitMatrix,astate,1.0);
		if(this.clipCheckPlanes)this.clipCheckPlanes(ctx,astate);
		this.prepareLights();
		this.updatePrjTM(ctx);
		gl.cullFace(gl.BACK);
		ctx.window.drawBk(this);
		for(i=1;i<ctx.q.length;i++){
			q=ctx.q[i];
			if(!q.L)continue;
			if(i>3)
			{
				if(!blend)
				{
					gl.enable(gl.BLEND);
					gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
					if(ctx.window.cfgBkColor===null)gl.blendEquationSeparate(gl.FUNC_ADD,this.e_alpha_blend);
					blend=true;
				}
				if(i>=7)gl.clear(gl.DEPTH_BUFFER_BIT);
			}
			this.renderQueue(q,i>3);
			q.L=0;
		}
		if(blend)gl.disable(gl.BLEND);
		this.activateMaterial(null);
	}
}
iv.space.prototype.getMaterial=function(name){
	var it=this.materials,i,m;
	for(i=0;i<it.length;i++){
		m=it[i];
		if((m.name!==undefined)&&m.name==name)return m;
	}
	return null;
}
iv.space.prototype.makeProgram=function(v,f) {
	var gl=this.gl,p=gl.createProgram();
	gl.attachShader(p,v.handle);
	gl.attachShader(p,f.handle);
	gl.linkProgram(p);
	if(!gl.getProgramParameter(p,gl.LINK_STATUS)) {
		console.error(gl.getProgramInfoLog(p));
	}
	return p;
}
iv.space.prototype.replaceAnimId=function(a,b)
{
	if(a==b)return;
	if(this.root)this.root.replaceAnimId(a,b);
	var _i=this.materials,i,v;
	for(i=0;i<_i.length;i++)
		_i[i].replaceAnimId(a,b);
	_i=this.views;
	if(_i)
	{
		for(i=0;i<_i.length;i++)
		{
			v=_i[i];
			if(v.anim && v.anim.id==a)v.anim.id=b;
		}
	}
}
iv.space.prototype.setTime=function(t)
{
	var A=this.anim,i,_i;
	if(!A)return;
	if(A.snap)t=Math.round(t*A.fps)/A.fps;
	A.time=t;
	if(this.root)this.root.setTime(t);
	_i=this.materials;
	for(i=0;i<_i.length;i++)
		_i[i].setTime(t);
}
iv.space.prototype.activateAnimation=function(a,reset)
{
	if(typeof a=='number')a=this.getAnimation(a);
	else if(iv.indexOf(this.anims,a)<0)a=this.getAnimation(a.id);
	this.anim=a;
	if(this.root)this.root.activateAnimation(a,reset);
	var _i=this.materials;
	for(var i=0;i<_i.length;i++)_i[i].activateAnimation(a,reset);
}
iv.space.prototype.getAnimation =function(id)
{
	var _i=this.anims,i,a;
	if(_i){
		for(i=0;i<_i.length;i++)
		{
			a=_i[i];
			if(a.id==id)return a;
		}}
	return null;
}
//ivmtl3d.js
iv.mtlchannel=function(){this.mode=0;this.color=this.amount=null;this.texture=null;}
iv.mtlvar=function(id,n,t){this.id=id;this.name=n;this.type=t;this.slot=null;this.vertex=false;}
iv.shader=function(m,f) {
	this.mtl=m;
	this.flags=f;
	this._reset();
};
iv.shader.prototype._reset=function()
{
	this.valid=false;
	this.attrs=[];
	this.vars=[];
	this.program=null;
	this.vShader=null;
	this.fShader=null;
	this.textures=[];
	this.loadedtextures=0;
	this.numLights=0;
}
iv.material=function(space){
this.space=space;
this.spaceId=space.spaceId;
this.gl=space.gl;
this.shaders=[];
this.phong=18;
}
iv.mtlchannel.prototype.setColor=function(clr) {
	this.color=iv.parseColor(clr);
}
iv.mtlchannel.prototype.setTime=function(t)
{
	if(this.anim)
	{
		var a=this.anim;
		if(a.amount)this.amount=iv.getFloatTrackInfo(a.amount,t,this.amount);
		if(a.color){var c=iv.getP3DTrackInfo(a.color,t);if(c)this.setColor(c);}
	}
}
iv.mtlchannel.prototype.activateAnimation=function(a,reset)
{
	if(this.anims)
		iv.anim.activate(this,a,reset);
}
iv.mtlchannel.prototype.replaceAnimId=function(a,b)
{
	if(this.anims)
		iv.anim.replace(this,a,b);
}
iv.material.prototype.setTime = function(t)
{
	for(var i=0;i<iv.mtlChannels.length;i++)
	{
		var c=this[iv.mtlChannels[i]];
		if(c)
		{
			for(var j=0;j<c.length;j++)c[j].setTime(t);
		}
	}
}
iv.material.prototype.replaceAnimId=function(a,b)
{
	for(var i=0;i<iv.mtlChannels.length;i++)
	{
		var c=this[iv.mtlChannels[i]];
		if(c)
		{
			for(var j=0;j<c.length;j++)c[j].activateAnimation(a,reset);
		}
	}
}
iv.material.prototype.activateAnimation = function(a,reset)
{
	for(var i=0;i<iv.mtlChannels.length;i++)
	{
		var c=this[iv.mtlChannels[i]];
		if(c)
		{
			for(var j=0;j<c.length;j++)c[j].activateAnimation(a,reset);
		}
	}
}
iv.material.prototype.invalidate=function() {
	var s=this.shaders,i;
	if(s){
		for(i=0;i<s.length;i++)
			s[i].detach(this.gl);
		this.shaders=[];
	}
}
iv.material.prototype.clear=function()
{
	for(var i=0;i<iv.mtlChannels.length;i++)
	{
	var c=iv.mtlChannels[i],ch=this[c];
	if(ch)
	{
	for(var j=0;j<ch.length;j++)
	{
		var item=ch[j];
		if(item.texture)item.texture.release();
	}
		this[c]=null;
	}
	}
}
iv.material.prototype.isChannel=function(c)
{
	if( (c===undefined)||(c===null))return false;
	if(c.length===0)return false;
	for(var i=0;i<c.length;i++)
	{
		var item=c[i];
		if(item.texture!=null || item.color!=null || item.amount!==null)return true;
	}
	return false;
}
iv.material.prototype.newChannel=function(type,ch)
{
	if(!ch)ch=new iv.mtlchannel();
	if(!(type in this))this[type]=[];
	this[type].push(ch);
	this.valid=false;
	return ch;
}
iv.material.prototype.getChannel=function(type)
{
	if(!(type in this))return null;
	var items=this[type];
	return items[0];
}
iv.material.prototype.newTexture = function(c,name,type,extra)
{
	var gl=this.gl;
	if(type===undefined)type=gl.TEXTURE_2D;
	c.texture=this.space.getTexture(name,type,this,extra);
	if(type==gl.TEXTURE_CUBE_MAP)c.wrapT=c.wrapS=gl.CLAMP_TO_EDGE;
}
iv.material.prototype.cnvTtxMatrix=function (a)
{
	var tm=mat3.create(),index=0,i,j;
	for(i=0;i<3;i++)
	{
		for(j=0;j<2;j++){tm[i*3+j]=a[index];index++;}
	}
	tm[2]=0;tm[5]=0;tm[8]=1;
	return tm;
}
iv.material.prototype.convertWrap=function(v)
{
	var g=this.gl;
	switch(v)
	{
		case "MIRRORED_REPEAT":return g.MIRRORED_REPEAT;
		case "CLAMP_TO_EDGE":return g.CLAMP_TO_EDGE;
		default:return g.REPEAT;
	}
}
iv.material.prototype.loadChannelImp=function(v,name) {
	var c=this.newChannel(name),t=v.texture;
	if(v.color!==undefined) c.setColor(v.color);
	if(v.amount!==undefined) c.amount=v.amount;
	if(v.blend)c.blend=v.blend;
	if(!t && v.inline)t="?s"+this.spaceId+"i"+v.inline;
	if(t!==undefined){
		var type;
		if(v.type&&v.type=="cube") {
			if(this.gl) type=this.gl.TEXTURE_CUBE_MAP;
			else type=0x8513;
		}
		if(v.tm)
			c.tm=this.cnvTtxMatrix(v.tm);
		if(v.cmp) c.cmp=v.cmp;
		if(v.filter) c.filter=v.filter;
		if(v.uvset)c.uv=v.uvset;else c.uv=0;
		c.wrapT=this.convertWrap(v.wrapT);
		c.wrapS=this.convertWrap(v.wrapS);
		if(v.format) c.internalFormat=v.format;
		this.newTexture(c,t,type,v);
	}
	if(v.anims)c.anims=v.anims;
}
iv.material.prototype.loadChannel=function(v,name) {
	var c,type=typeof v;
	if(type==="number") {
		c=this.newChannel(name);
		if(name=='opacity')c.amount=v;else c.setColor(v);
	}else
	if(type==="object"){
		if(v instanceof Array){
			var len=v.length;
			if((len==3)&&(typeof v[0]=='number')&&(typeof v[1]=='number')&&(typeof v[2]=='number')){
				c=this.newChannel(name);
				c.setColor(v);
			} else {
				for(var i=0;i<len;i++)this.loadChannelImp(v[i],name);
			}
		}else this.loadChannelImp(v,name);
	}
};
iv.material.prototype.load=function(d)
{
	for(var v in d)
	{
	var a=d[v];
	switch(v)
	{
	case "bump":
	case "lightmap":
	case "diffuse":
	case "specular":
	case "emissive":
	case "reflection":
	case "opacity":this.loadChannel(a,v);break;
	case "ambient":this.loadChannel(a,"emissive");break;
	case "meta":
	case "name":
	case "phong":
	case "backSide":
	case "path":this[v]=a;break;
	}}
	return true;
}
iv.material.prototype.getShader = function(flags)
{
	if(!this.staticColors)flags&=~256;
	if(!this.space.cfgTextures)flags&=~(2|32);
	for(var i=0;i<this.shaders.length;i++)
	{
		var s=this.shaders[i];
		if(s.flags==flags)
		{
			if((s.loadedtextures!=s.textures.length) && s.valid)
			{
				var c=s.getNumTextures();
				if(c!=s.loadedtextures)s.valid=false;
			}
			if(s.numLights!=this.space.lights.length)s.valid=false;
			return s;
		}
	}
	var s=new iv.shader(this,flags);
	this.shaders.push(s);
	return s;
}
iv.shader.prototype.addVarying=function(name,type)
{
	this.t.varyings.push({name:name,type:type});
}
iv.GLSLtype=function(a){switch(a){case 1:a="float";break;case 9:a="mat3";break;case 16:a="mat4";break;default:a="vec"+a;}return a;}
iv.shader.prototype.declareSome=function(_i,type)
{
	var s="",i,v;
	for(i=0;i<_i.length;i++)
	{
		v=_i[i];
		s+=type+' '+iv.GLSLtype(v.type)+' '+v.name+';';
	}
	return s;
}
iv.shader.prototype.insertVars=function(vt,ft)
{
	var _i=this.vars,c=_i.length,i,v,_v="",_f="",a;
	for(i=0;i<c;i++)
	{
		v=_i[i];
		a="uniform "+iv.GLSLtype(v.type)+" "+v.name+";";
		if(v.vt)_v+=a;else _f+=a;
	}
	a=this.declareSome(this.t.varyings,"varying");
	if(a.length){_v+=a;_f+=a;}
	_v+=this.declareSome(this.attrs,"attribute");
	_i=this.textures;
	for(i=0;i<_i.length;i++)
	{
		var t=_i[i];
		if(t.txt.ready){
			_f+="uniform "+(t.txt.isCube()?"samplerCube":"sampler2D")+" txtUnit"+ t.slot+";";
		}
	}
	if(_v.length)vt.splice(0,0,_v);
	if(_f.length)ft.splice(0,0,_f);
}
iv.shader.prototype.addU = function(id,name,t,vertex)
{
	var v=new iv.mtlvar(id,name,t);
	v.vt=!!(vertex);
	this.vars.push(v);
	return v;
}
iv.shader.prototype.addAttr = function(id,name,t)
{
	this.attrs.push({id:id,name:name,type:t});
}
iv.shader.prototype.addLightVar = function(id,name,light,t)
{
	var v=this.addU(id,name,t);
	v.light=light;
	return v;
}
iv.shader.prototype.addChU = function(id,name,t,ch)
{
	var v=this.addU(id,name,t);
	v.channel=ch;
	return v;
}
iv.shader.prototype.compareTM3=function (a,b)
{
	if(!a&& !b)return true;
	if(!a || !b)return false;
	for(var i=0;i<9;i++)
		if(Math.abs(a[i]-b[i])>1e-4)return false;
	return true;
}
iv.shader.prototype.getTexture=function(c)
{
	var items=this.textures,j,t;
	for(j=0;j<items.length;j++)
	{
		t=items[j];
		if(t.txt===c.texture && (t.wrapS==c.wrapS) && (t.wrapT==c.wrapT) && this.compareTM3(t.tm,c.tm) && c.uv==t.uv)
			return t;
	}
	return null;
}
iv.shader.prototype.num = function(a)
{
	var t=a.toString();
	if(t.indexOf('.')<0)t+='.0';
	return t;
}
iv.shader.prototype.num3 = function(a)
{
return "vec3("+this.num(a[0])+","+this.num(a[1])+","+this.num(a[2])+")";
}
iv.shader.prototype.addAmount=function(c)
{
	if(this.mtl.staticColors)
		return this.num(c.amount);
	else return this.addChU(4104,"ch"+c._id+"amount",1,c).name;
}
iv.shader.prototype.txtCube=function(){return "textureCube";}
iv.shader.prototype.handleChannel_=function(gl,ch,ft)
{
	var text="",text2="",i,c;
	for(i=0;i<ch.length;i++)
	{
		var c=ch[i],cname=null,tname=null,aname=null;
		c._id=this.channelId++;
		if(c.color!==null)
		{
			if(this.mtl.staticColors)
			{
				var clr=c.color;
				if(this.flags&256)
				{
					var _s=this.mtl.space.clrSelection;
					clr=vec3.lerp(c.color,_s,_s[3]);
				}
				cname=this.num3(clr);
			}else{
				cname="ch"+c._id+"clr";
				this.addChU(4102,cname,3,c);
			}
		}
		if(c.texture && c.texture.ready)
		{
			var t=this.getTexture(c);
			if(t){
				if(c.texture.isCube())
				{
					text+="vec3 lup=reflect(eyeDirection,normal);lup.y*=-1.0;vec4 refColor="+this.txtCube()+"(txtUnit"+t.slot+",lup);";
					tname="refColor";
				}else tname="txtColor"+t.slot;
			}
		}
		if(tname && c.amount!==null)aname=this.addAmount(c);
		if(cname || tname)
		{
			var local=null;
			if(aname && tname){local="vec3("+aname+")*vec3("+tname +")";
				if(cname)local+="*"+cname;
			}else
				if(cname && tname)local=cname+"*vec3("+tname+")";
				else
					if(cname)local=cname;
					else local="vec3("+tname+")";
			if(i && c.texture)
			{
				if(c.format=='rgba'){
					if(aname)aname=aname+'*'+tname+'.a';
					else aname=tname+'.a';
				}}
			if(text2.length)
			{
				if(c.blend=='blend' && aname)text2="mix("+text2+","+local+','+aname+')';
				else text2="("+text2+")"+this.getBlend(c)+local;
			}else text2=local;
		}
	}
	if(text.length)ft.push(text);
	return text2;
}
iv.shader.prototype.handleChannel=function(gl,ch,cmp,ft)
{
	var text2=this.handleChannel_(gl,ch,ft);
	if(text2){
		if(cmp)text2=cmp+"*="+text2;
		else text2="color+="+text2;
		ft.push(text2+";");
	}
	if(cmp)ft.push("color+="+cmp+";");
};
iv.shader.prototype.getBlend=function(c) {
	switch(c.blend) {
		case "sub":return "-";
		case "mul":return "*";
		default:return "+";
	}
}
iv.shader.prototype.handleAlphaChannel=function(gl,ch,ft)
{
	if(ch && ch.length)
	{
		var txt=null,tAlpha=false,i;
		for(i=0;i<ch.length;i++)
		{
			var c=ch[i],tname=null,aname=null,t;
			c._id=this.channelId++;
			if(c.texture && c.texture.ready)
			{
				t=this.getTexture(c);
				if(t)
					tname="txtColor"+t.slot;
			}
			if(c.amount!==null)aname=this.addAmount(c);
			if(tname)
			{
				if(aname)t=aname+"*";else t="";
				if(c.cmp && c.cmp=='a')
					t+=tname+".a";
				else
					t+="("+tname+".x+"+tname+".y+"+tname+".z)/3.0";
			}else
				if(aname)t= aname;
			if(t)
			{
				if(txt)
				{
					if(!tAlpha)
					{
						txt="float alpha="+txt+";";
						tAlpha=true;
					}
					txt+="alpha"+ this.getBlend(c)+'='+t+";";
				}else txt=t;
			}
		}
		if(txt)
		{
			if(tAlpha)
			{
				ft.push(txt);
				return "alpha";
			}else return txt;
		}
	}
	return "1.0";
}
iv.shader.prototype.handleBumpChannel=function(gl,ch)
{
	if(ch && ch.length)
	{
		var c=ch[0];
		if(c.texture && c.texture.ready)
		{
			c._id=this.channelId++;
			var t=this.getTexture(c);
			if(t){
					var tname="txtColor"+t.slot,text="vec3 _n=vec3("+tname+");";
					text+="_n-=vec3(0.5,0.5,0);_n*=vec3(2.0,2.0,1.0);";
					if(c.amount!==null)
					{
						var aname=this.addAmount(c);
						text+="_n*=vec3("+aname+","+aname+",1.0);";
					}
					text+="_n=normalize(_n);";
					return text;
			}
		}
	}
	return null;
}
iv.shader.prototype.addTexture=function(t)
{
	this.textures.push(t);
	if(t.txt.ready){t.slot=this.loadedtextures;this.loadedtextures++;}
	return t;
}
iv.shader.prototype.collectTextures=function(ch,f)
{
	var rez=0,i,c,t;
	if(ch)
		for(i=0;i<ch.length;i++)
		{
			c=ch[i];
			if(c.texture&&((f<0)||(f&(1<<c.uv)))){
				if(!this.getTexture(c))
				{
					t={txt:c.texture,wrapS:c.wrapS,wrapT:c.wrapT,uv:c.uv?c.uv:0};
					if(c.tm){t.tm=c.tm;t.ch=c;}
					this.addTexture(t);
				}
				if(c.texture.ready)rez|=1<<c.uv;
			}
		}
	return rez;
}
iv.shader.prototype.getNumTextures = function()
{
	var c=0,i,t;
	for(i=0;i<this.textures.length;i++)
	{
		t=this.textures[i];
		if(t.txt.ready)
			c++;
	}
	return c;
}
iv.shader.prototype.fetchTextures=function(gl,ft)
{
	var _i=this.textures,a=0,i,t,s;
	for(i=0;i<_i.length;i++)
	{
		t=_i[i];
		if(t.txt.ready  && t.txt.is2d()){
			if(t.tm){
				var v=this.addU(4103,"ch"+t.ch._id+"tm",9);
				v.channel=t.ch;
				s="_uv=vec2("+v.name+"*vec3(vUV"+t.uv+",1.0));";
				ft.push((a?"":"vec2 ")+s);
				a++;
			}
			ft.push("vec4 txtColor"+t.slot+"=texture2D(txtUnit"+t.slot+","+ ((t.tm)?"_uv":"vUV"+t.uv)+");");
		}
	}
}
iv.shader.prototype.compile=function(i,type){return this.mtl.space.getShader(i.join('\r\n'),type);}
iv.shader.prototype.addUVV = function(a,c,s)
{
	var S=s?3:2;
	this.addVarying("vUV"+(s?"Q":"")+a,S);
	this.addAttr(c,"inUV"+a,S);
}
iv.shader.prototype.update = function()
{
	var mtl=this.mtl,gl=mtl.gl,i,vt=[],ft=[],F=this.flags,space=mtl.space,lights=space.lights;
	var bNormals=(F&1)!=0,bSpecular=false,bDiffuse=false,bLights=false,bReflection=false,bBump=false,bLightMap=false;
	var bEmissive=mtl.isChannel(mtl.emissive),bOpacity=mtl.isChannel(mtl.opacity) || (F&1024);
	if(this.program)this.detach(mtl.gl);
	this.numLights=lights.length;
	this.channelId=0;
	this.loadedtextures=0;
	this.t={varyings:[],ft:ft,vt:vt};
	this.addAttr(4300,"inV",3);
	if(F&8)this.addVarying("wPosition",4);
	if(F&4){
		this.addAttr(4305,"inC",3);
		this.addVarying("vC",3);
	}
	if(F&64){
		this.addAttr(4307,"inCE",3);
		this.addVarying("vCE",3);
	}
	if(bNormals){
		this.addVarying("wNormal",3);
		this.addAttr(4301,"inN",3);
		if(lights.length)
		{
			bDiffuse=mtl.isChannel(mtl.diffuse);
			bSpecular=mtl.isChannel(mtl.specular);
			bLights=bDiffuse||bSpecular;
		}
	if(space.cfgTextures)
		bReflection=this.collectTextures(mtl.reflection,-1);
	}
	var UVF=0,bUV=0,UVQ0,UVQ1;
	if(F&2)UVF|=1;
	if(F&32)UVF|=2;
	if(UVF){
		if(bDiffuse)bUV|=this.collectTextures(mtl.diffuse,UVF);
		if(bSpecular)bUV|=this.collectTextures(mtl.specular,UVF);
		if(bEmissive)bUV|=this.collectTextures(mtl.emissive,UVF);
		if(bOpacity)bUV|=this.collectTextures(mtl.opacity,UVF);
		if(bNormals && bLights)bUV|=(bBump=this.collectTextures(mtl.bump,UVF));
		bUV|=(bLightMap=this.collectTextures(mtl.lightmap,UVF));
	}
	if(bUV&1)this.addUVV(0,4302,UVQ0=F&0x1000);
	if(bUV&2)this.addUVV(1,4306,UVQ1=F&0x2000);
	if(bBump)
	{
		this.addVarying("vBN",3);
		this.addVarying("vBT",3);
		this.addAttr(4303,"inBN",3);
		this.addAttr(4304,"inBT",3);
	}
	vt.push("void main(void){");
	if(F&8){
		vt.push("wPosition=tmWorld*vec4(inV,1.0);vec4 vPosition=tmModelView*");
		if(F&iv.R_Z_OFFSET)
		{
			this.addU(4113,"veye",3,true);
			vt.push("(wPosition-vec4((wPosition.xyz-veye)/700.0,0.0));");
		}else vt.push("wPosition;");
		vt.push("gl_Position=tmPrj*vPosition;");
		this.addU(4101,"tmWorld",16,true);
		this.addU(4114,"tmModelView",16,true);
		this.addU(4115,"tmPrj",16,true);
	}
	else vt.push("gl_Position=vec4(inV,1.0);");
	if(bNormals){
		vt.push("wNormal=");
		if(mtl.backSide)vt.push("-");
		vt.push("normalize(vec3(tmWorld*vec4(inN,0.0)));");
	}
	if(bBump)vt.push("vBN=normalize(vec3(tmWorld*vec4(inBN,0.0)));vBT=normalize(vec3(tmWorld*vec4(inBT,0.0)));");
	if(bUV&1)vt.push((UVQ0?"vUVQ0":"vUV0")+"=inUV0;");
	if(bUV&2)vt.push((UVQ1?"vUVQ1":"vUV1")+"=inUV1;");
	if(F&4)vt.push("vC=inC;");
	if(F&64)vt.push("vCE=inCE;");
	if(F&128)vt.push("gl_PointSize=1.0;");
	vt.push("}");
	if(F&iv.R_CLIP)
	{
		var numClips=(F&iv.R_CLIP)>>18;
		if(numClips){
		for(i=0;i<numClips;i++)
			this.addU(4120+i,"clip"+i,4);
		}
	}
	if(bNormals){
		if(bSpecular)
			this.addU(4116,"mtlPhong",1);
		ft.push("float k;");}
	ft.push("void main(void){");
	if(UVQ0)ft.push("vec2 vUV0=vec2(vUVQ0.x/vUVQ0.z,vUVQ0.y/vUVQ0.z);");
	if(UVQ1)ft.push("vec2 vUV1=vec2(vUVQ1.x/vUVQ1.z,vUVQ1.y/vUVQ1.z);");
	this.fetchTextures(gl,ft);
	if((F&iv.R_CLIP) && numClips)
	{
		for(i=0;i<numClips;i++)ft.push("float a"+i+"= dot(wPosition.xyz,clip"+i+".xyz)+clip"+i+".w;");
		var s="if(";
		for(i=0;i<numClips;i++){
			if(i){
				s+=(space && space.cfgClipMode)?'||':'&&';
			}
			s+="(a"+i+"<0.0)";
		}
		s+="){discard;}";
		ft.push(s);
	}
	if(bNormals)
	{
		ft.push("vec3 normal=normalize(wNormal);");
		this.t.snormal="normal";
		var normalSign="";
		if(F&512){ft.push("vec3 normalSign=vec3(gl_FrontFacing?1.0:-1.0);");normalSign="normalSign*";}
		if(bBump)
		{
			var txt=this.handleBumpChannel(gl,mtl.bump);
			if(txt){
				ft.push(txt);
				ft.push("mat3 tsM=mat3(normalize("+normalSign+"vBN),normalize("+normalSign+"vBT),normal);");
				ft.push("normal=normalize(tsM*_n);");
			}
		}
		if(F&512)ft.push("normal="+normalSign+"normal;");
		var veye=this.addU(4113,"eye",3);
		ft.push("vec3 eyeDirection=normalize(wPosition.xyz-eye),reflDir,posInLight;float specA,lightDistance,angle;");
		if(bLights)
		{
		ft.push("vec3 diffuse,specular,lightDir;");
		for(i=0;i<lights.length;i++)
		{
			var l=lights[i],aUsed=false;
			var vclr=this.addLightVar(4110,"light"+i+"Clr",l,3);
			var ls={light:l,vdir:null,vorg:null};
			var kstr="k*";
			if(l.dir)
				ls.vdir=this.addLightVar(4112,"light"+i+"Dir",l,3);
			if(l.org)
			{
				if(l.org==='camera')
				{
					ls.vorg=eye;
					l.type =0;
				}else	ls.vorg=this.addLightVar(4111,"light"+i+"Org",l,3);
				ls.dirName="lightDir";
				ft.push("posInLight=wPosition.xyz-"+ls.vorg.name+";lightDistance=length(posInLight);");
				ft.push("lightDir=posInLight/lightDistance;");
			}
			switch(l.type)
			{
			case 0:
			break;
			case 1:ls.dirName=ls.vdir.name;
break;
			case 2:
				var	vspot=this.addLightVar(4117,"light"+i+"Spot",l,3);
				ft.push("angle=smoothstep("+vspot.name+"[1],"+vspot.name+"[0],dot(lightDir,"+ls.vdir.name+"));");aUsed=true;
break;
			}
			if(l.attenuation)
			{
				var vatt=this.addLightVar(4118,"light"+i+"A",l,2),att;
				switch(l.light.light.attenuation)
				{
					case "step":att="step(lightDistance,"+vatt.name+".x)";break;
					case "linear":att="(1.0-smoothstep("+vatt.name+".x,"+vatt.name+".y,lightDistance))";break;
					case "isquare":ft.push("lightDistance/="+vatt.name+".x;");att="1.0/(lightDistance*lightDistance)";break;
				}
				ft.push((aUsed?"angle*=":"angle=")+att+";");
				aUsed=true;
			}
			if(aUsed)kstr="k*angle*";
			if(bSpecular)
			{
			ft.push("reflDir=reflect(-"+ls.dirName+",normal);specA=dot(reflDir,eyeDirection);k=pow(max(specA,0.0),mtlPhong);");
			if(i)ft.push("specular+=");else ft.push("specular=");
			ft.push(kstr+vclr.name+";");
			}
			if(bDiffuse)
			{
			ft.push("k=max(dot(normal,-"+ls.dirName+"), 0.0);");
			if(i)ft.push("diffuse+=");else ft.push("diffuse=");
			ft.push(kstr+vclr.name+";");
			}
		}}
	}
	ft.push("vec3 color= vec3(0.0);");
	if(F&4)
	{
		if(bDiffuse && (!(F&64)))ft.push("diffuse=diffuse*vC;");
		else
		{
			ft.push("color+=vC;");
			bEmissive=false;
		}
	}
	if(F&64)ft.push("color+=vCE;");
	if(bDiffuse)
		this.handleChannel(gl,mtl.diffuse,"diffuse",ft);
	if(bSpecular)
		this.handleChannel(gl,mtl.specular,"specular",ft);
	if(bLightMap)
	{
		var aoText=this.handleChannel_(gl,mtl.lightmap,ft);
		if(aoText)ft.push("color*="+aoText+";");
	}
	if(bEmissive)
	this.handleChannel(gl,mtl.emissive,null,ft);
	var alpha="1.0", n="1.0";
	if(bOpacity)
	{
		if(F&1024)this.addU(4106,"opacity",1);
		if(mtl.opacity){
			n=this.handleAlphaChannel(gl,mtl.opacity,ft);
			if(F&1024){ft.push("float _opacity=opacity*"+n+";");n="_opacity";}
		}else n="opacity";
		if(bReflection)
		{
		var text2=this.handleChannel_(gl,mtl.reflection,ft);
		ft.push("vec3 _refColor="+text2+";");
		ft.push("float _refA=(_refColor.x+_refColor.y+_refColor.z)/3.0;");
		ft.push("_refA=1.0-(1.0-_refA)*(1.0-"+n+");");
		n="_refA";
		ft.push("color+=_refColor;");
		}else ft.push("if("+n+"<0.004)discard;");
	}else {
	if(bReflection)this.handleChannel(gl,mtl.reflection,null,ft);
	}
		ft.push("gl_FragColor=vec4(color,"+n+");");
	ft.push("}");
	this.insertVars(vt,ft);
	ft.splice(0,0,"precision mediump float;");
	this.vShader = this.compile(vt,gl.VERTEX_SHADER);
	this.fShader = this.compile(ft,gl.FRAGMENT_SHADER);
	var shPrg=this.program=space.makeProgram(this.vShader,this.fShader);
	gl.useProgram(shPrg);
	for(i=0;i<this.attrs.length;i++)
	{
		var t=this.attrs[i];
		t.slot= gl.getAttribLocation(this.program,t.name);
	}
	for(i=0;i<this.textures.length;i++)
	{
		var t=this.textures[i];
		if(t.txt.ready)
			t.uniform=gl.getUniformLocation(shPrg,"txtUnit"+t.slot);
	}
	i=0;
	while(i<this.vars.length)
	{
		var v=this.vars[i];
		v.slot=gl.getUniformLocation(shPrg,v.name);
		if(!v.slot)
			this.vars.splice(i,1);
		else i++;
	}
	this.t=null;
	this.valid=true;
	return true;
}
iv.shader.prototype.detach = function(gl)
{
	var p=this.program,v=this.vShader,f=this.fShader;
	if(p)
	{
		gl.detachShader(p,v.handle);
		gl.detachShader(p,f.handle);
		gl.deleteProgram(p);
		this.mtl.space.releaseShader(v);
		this.mtl.space.releaseShader(f);
	}
	this._reset();
}
iv.shader.prototype.activate = function(space,info,flags,newObj)
{
	var mtl=this.mtl,gl=mtl.gl,i;
	if(!newObj){
	gl.useProgram(this.program);
	for(i=0;i<this.textures.length;i++)
		{
			var t=this.textures[i];
			if(t.txt.ready)
			{
				t.txt.bind(t.slot);
				var type=t.txt.target;
				if(type==gl.TEXTURE_2D && space.e_ans && (t.txt.filter==iv.FILTER_MIPMAP) )
					gl.texParameterf(type, space.e_ans.TEXTURE_MAX_ANISOTROPY_EXT, space.e_ansMax);
				t.txt.wrap(t.wrapS,t.wrapT);
				gl.uniform1i(t.uniform,t.slot);
			}
		}
	}
	var _i=this.vars;
	for(i=0;i<_i.length;i++)
	{
		var a=_i[i],s=a.slot;
		if((a.id>=4120)&&(a.id<4127)){var clip=space.clips[a.id-4120];gl.uniform4fv(s, (info.object.excludeClip==clip)?clip.ue:clip.u);}else
		switch(a.id)
		{
			case 4101:gl.uniformMatrix4fv(s, false, info.tm);break;
			case 4102: {
				var c=a.channel.color;
				if(flags&256) c=vec3.lerp(c,space.clrSelection,space.clrSelection[3]);
				gl.uniform3fv(s,c);
			} break;
			case 4103:gl.uniformMatrix3fv(s,false,a.channel.tm);break;
			case 4104:gl.uniform1f(s,a.channel.amount);break;
			case 4106:gl.uniform1f(s,info.opacity);break;
			default:
			if(!newObj)
			{
				switch(a.id)
				{
				case 4110:gl.uniform3fv(s,a.light.color);break;
				case 4111:gl.uniform3fv(s,a.light.org);break;
				case 4112:gl.uniform3fv(s,a.light.dir);break;
				case 4113:gl.uniform3fv(s,space.window.rcontext.view.from);break;
				case 4114:gl.uniformMatrix4fv(s,false,space.modelviewTM);break;
				case 4115:gl.uniformMatrix4fv(s,false,space.projectionTM);break;
				case 4116:gl.uniform1f(s,mtl.phong);break;
				case 4117:gl.uniform3fv(s,a.light.spot);break;
				case 4118:var k=(space && space.unitMatrix)?space.unitMatrix[0]:1.0; gl.uniform2f(s,k*a.light.light.innerRadius,k*a.light.light.outerRadius);break;
				}
			}
		}
	}
}
//ivmesh3d.js
iv.object=function(){iv.abstract.call(this);}
iv.object.prototype=new iv.abstract();
iv.object.prototype.preRender=function(node,tm,space,state,opacity){return true;}
iv.object.prototype.hitTest=function(ctx,tm,node){return false;}
iv.object.prototype.preHitTest=function(ctx,tm){return false;}
iv.object.prototype.setTime=function(a,t){};
iv.light=function(d)
{
	this.ref=0;
	this.type=0;
	this.dir=null;
	this.org=null;
	if(d)this.load(d);
}
iv.light.prototype=new iv.object();
iv.light.prototype.load=function(d)
{
	for(var v in d)
	{
		var a=d[v];
		switch(v)
		{
			case 'dir':
			case 'org':this[v]=a.slice();break;
			default:this[v]=a;
		}
	}
	if(this.attenuation && !this.outerRadius)this.outerRadius=this.innerRadius;
}
iv.light.prototype.preRender=function(ctx,node,tm,state,opacity)
{
	var space=ctx.space;
	if(!space.stdLights)
	{
		var l=space.lights[space.currentLight];
		if(!l)space.lights.push(l={structVersion:-1});
		l.tm=tm;
		l.light=this;
		l.node=node;
		space.currentLight++;
	}
	return true;
}
iv.camera=function (d)
{
	this.ref=0;
    this.perspective=true;
	if(d)this.load(d);
}
iv.camera.prototype=new iv.object();
iv.camera.prototype.load=function(d)
{
	for(var v in d)
	{
		var a=d[v];
		switch(v)
		{
			case 'from':
			case 'up':
			case 'to':this[v]=a.slice();break;
			default:this[v]=a;
		}
	}
}
iv.camera.prototype.setTime=function(a,t)
{
  if(a.viewScale)this.scale=iv.getFloatTrackInfo(a.viewScale,t,this.viewScale);
  if(a.fov)this.fov=iv.getFloatTrackInfo(a.fov,t,this.fov);
};
iv.camera.prototype.preRender=function(node,tm,space,state,opacity)
{
	return true;
}
iv.speaker=function (d)
{   this.ref=0;
	this.media=null;
	if(d)this.load(d);
}
iv.speaker.prototype=new iv.object();
iv.speaker.prototype.load=function(d)
{
	for(var v in d)
	{
		var a=d[v];
		switch(v)
		{
			default:this[v]=a;
		}
	}
	this.checkHW();
	this.on=false;
}
iv.speaker.prototype.checkHW=function()
{
	if(!this.player && this.media)
	{
		var p=this.player=document.createElement("audio");
		if(p)
		{
			p.autoplay=false;
			p.preload="auto";
			p.src=this.media;
			if("volume" in this)p.volume=this.volume;
			var _this=this;
			p.addEventListener('ended', function(e) {
				_this.on=false;
			 });
		}
	}
}
iv.speaker.prototype.setVolume=function(v)
{
	this.volume=v;
	if(this.player)this.player.volume=v;
}
iv.speaker.prototype.play=function(b)
{
	if(this.on!=b)
	{
		this.checkHW();
		this.on=b;
		if(this.player)
		{
			if(b)
			{
				this.player.currentTime=0;
				this.player.play();
			}
			else
				this.player.pause();
		}
	}
}
iv.speaker.prototype.setTime=function(a,t)
{
	if(a.playback)
	{
		if(iv.getBoolTrackInfo(a.playback,t))
			this.play(true);
		else
			this.play(false);
	}
};
iv.mesh=function (gl)
{
	if(gl){
		iv.object.call(this);
		this.gl=gl;
	}
}
iv.mesh.prototype=new iv.object();
iv.mesh.prototype.meshMode=3;
iv.mesh.prototype.setPoints= function(a,keep)
{
	this.setBuffer('v',iv.bufferF(this.gl,a,3));
	if(keep)this.points=a;
}
iv.mesh.prototype.setUV= function(a,keep,cmp)
{
	this.setBuffer('uv',iv.bufferF(this.gl,a,cmp||2));
	if(keep)this.uvpoints=a;
}
iv.mesh.prototype.setUV2= function(a,keep,cmp)
{
	this.setBuffer('uv2',iv.bufferF(this.gl,a,cmp||2));
	if(keep)this.uv2points=a;
}
iv.mesh.prototype.setNormals= function(a,keep)
{
	this.setBuffer('n',iv.bufferF(this.gl,a,3));
	if(keep)this.normals=a;
}
iv.mesh.prototype.setFaces= function(f,keep)
{
	this.setBuffer('f',iv.bufferI(this.gl,f));
	if(keep)this.faces=f;
}
iv.mesh.prototype.setBuffer = function(n,b)
{
	n+='Buffer';
	var _b=this[n];
	if(_b)
	{
		_b.ref--;
		if(_b.ref<1)this.gl.deleteBuffer(_b);
	}
	this[n]=b;
	if(b)
	{
		if(b.ref)b.ref++;else b.ref=1;
	}
}
iv.mesh.prototype.addEdge=function (e,v1,v2)
{
	if(v2>v1){var _v=v2;v2=v1;v1=_v;}
	if(e[v1]==undefined)e[v1]=v2;
	else
		if(typeof e[v1] === 'number')e[v1]=[e[v1],v2];
		else e[v1].push(v2);
};
iv.mesh.prototype.updateEdges = function()
{
	if(!this.eBuffer)
	{
		var f=this.faces;
		if(f){
		var nf=f.length/3,j=0,i,e=[];
		for(i=0;i<nf;i++)
		{
			this.addEdge(e,f[j],f[j+1]);
			this.addEdge(e,f[j+1],f[j+2]);
			this.addEdge(e,f[j+2],f[j]);
			j+=3;
		}
		var ne=e.length,num=0;
		for(i=0;i<ne;i++)
		{
			var v=e[i];
			if(v!=undefined){if(typeof v ==='number')num++;else num+=v.length;}
		}
		var edges=new Uint16Array(num*2),v,i1;
		j=0;
		for(i=0;i<ne;i++)
		{
			v=e[i];
			if(v!=undefined)
			{
				if(typeof v==='number'){edges[j]=i;edges[j+1]=v;j+=2;}else
				{
					for(i1=0;i1<v.length;i1++)
					{
						edges[j]=i;edges[j+1]=v[i1];j+=2;
					}
				}
			}
		}
		this.setBuffer('e',iv.bufferI(this.gl,edges));
	}}
	return this.eBuffer;
}
iv.normalizeArray=function (v)
{
	var c=v.length/3;
	for(i=0;i<c;i++)
	{
		var j=i*3;
		var a=v[j],b=v[j+1],c=v[j+2];
		var l=Math.sqrt(a*a+b*b+c*c);
		if(l)
		{
			v[j]=a/l;v[j+1]=b/l;v[j+2]=c/l;
		}
	}
}
iv.bSetV=function (a,ref,i,v)
{
	var j=i*3;
	var X=v[0],Y=v[1],Z=v[2];
	if(ref[i])
	{
		var x=a[j],y=a[j+1],z=a[j+2];
		if((x*X+y*Y+z*Z)<0)return;
		X+=x;Y+=y;Z+=z;
	}else ref[i]=1;
	a[j]=X;a[j+1]=Y;a[j+2]=Z;
};
iv.mesh.prototype.updateBumpInfo = function()
{
var f=this.faces,v=this.points,n=this.normals,uv=this.uvpoints;
	if(f&&v&&n&&uv)
	{
		if(!iv.bGetT)iv.bGetT=function (a,i,t){t[0]=a[i*2];t[1]=a[i*2+1];};
		var sV=iv.bSetV,gV=iv.getV,gT=iv.bGetT;
		var wtm=[],ttm=[],ittm=[];
		mat4.identity(wtm);mat4.identity(ttm);
		var sz=v.length,tc=f.length,i,j;
		var a=new Float32Array(sz),b=new Float32Array(sz),ra=new Uint8Array(sz/3),rb=new Uint8Array(sz/3);
		var v0=[0,0,0],v1=[0,0,0],v2=[0,0,0],t0=[0,0],t1=[0,0],t2=[0,0];
		var r=[0,0,0],Z=[0,0,1],vzero=[0,0,0],_v=[v1,v2];
		for(i=0;i<tc;i++)
		{
			var i0=f[i*3],i1=f[i*3+1],i2=f[i*3+2];
			gV(v,i0,v0);gV(v,i1,v1);gV(v,i2,v2);
			gT(uv,i0,t0);gT(uv,i1,t1);gT(uv,i2,t2);
			for (j = 0; j < 2; j++)
			{
				var tj=j?t2:t1;
				var x=tj[0]-t0[0],y=tj[1]-t0[1];
				var d=Math.sqrt(x*x+y*y);
				if(d){r[0]=x/d;r[1]=y/d;}
				mat4.setRow(ttm,j,r);
				mat4.setRow(wtm,j,vec3.subtractN(_v[j],v0));
			}
			mat4.setRow(wtm,2,vec3.crossN(v1,v2));
			mat4.setRow(ttm,2,Z);mat4.setRow(ttm,3,vzero);
			mat4.invert(ittm,ttm);
			mat4.m(ittm,wtm,ttm);
			vec3.normalize(ttm,v1);
			v2[0]=ttm[4];v2[1]=ttm[5];v2[2]=ttm[6];vec3.normalize(v2);
			sV(a,ra,i0,v1);
			sV(a,ra,i1,v1);
			sV(a,ra,i2,v1);
			sV(b,rb,i0,v2);
			sV(b,rb,i1,v2);
			sV(b,rb,i2,v2);
		}
		iv.normalizeArray(a);iv.normalizeArray(b);
		this.setBuffer('bn',iv.bufferF(this.gl,a,3));
		this.setBuffer('bt',iv.bufferF(this.gl,b,3));
	}
}
iv.mesh.prototype.preRender=function(ctx,node,tm,state,opacity)
{
	var space=ctx.space;
	if(this.url)iv.loadMesh(this,space);
	else{
		if(state&4){if(space.cfgSelZOffset)state|=0x20000;opacity*=space.clrSelection[4];}
		state|=node.state&iv.NS_NOCLIP;
		if(this.boxMin)ctx.toRenderQueue(tm,node,state,opacity);
	}
	return true;
}
iv.mesh.prototype.activateShader=function(space,mtl,info,shFlags) {
	if(!mtl)mtl=info.mtl;
	var s=space.activateMaterial(mtl,info,shFlags),gl=space.gl,_i=s.attrs,c=_i.length,i;
	for(i=0;i<c;i++){
		var v=_i[i],b=null,f=gl.FLOAT,n=false;
		switch(v.id) {
			case 4300:b=this.vBuffer;break;
			case 4301:b=this.nBuffer;break;
			case 4302:b=this.uvBuffer;break;
			case 4306:b=this.uv2Buffer;break;
			case 4303:if(!this.bnBuffer)this.updateBumpInfo();b=this.bnBuffer;break;
			case 4304:if(!this.btBuffer)this.updateBumpInfo();b=this.btBuffer;break;
			case 4305:b=this.cBuffer;f=gl.UNSIGNED_BYTE;n=true;break;
			case 4307:b=this.ceBuffer;f=gl.UNSIGNED_BYTE;n=true;break;
		}
		if(b){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.vertexAttribPointer(v.slot,b.itemSize,f,n,0,0);}
	}
}
iv.mesh.prototype.render=function(space,info){
	if(this.vBuffer) {
		var state=info.state,gl=space.gl,f,F=8,fb=null,lm=this.meshMode,rm=space.rmodes[(state>>20)&0xff],M,m;
		if(state&iv.R_Z_NOWRITE)gl.depthMask(false);
if(space.clips&&space.clips.length&& !(state&iv.NS_NOCLIP))F|=(space.clips.length<<18);
		if(lm==1)
			M=rm.f;
		else{
		m=rm.e;M=(lm==2)?(rm.l||rm.f):rm.f;
		if (m&& lm==3){
			f=F;
			fb=this.updateEdges(gl);
			if (fb) {
				if(M)f|=iv.R_Z_OFFSET;
				if(this.nBuffer && m.n)f|=1;
				this.activateShader(space,m.mtl,info,f);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,fb);
				gl.drawElements(gl.LINES,fb.numItems,gl.UNSIGNED_SHORT,0);
			}
		}}
		if(M)
		{
			{
				f=F;
				if(this.nBuffer && M.n)f|=1;
				if(this.uvBuffer){f|=2;if(this.uvBuffer.itemSize==3)f|=0x1000;}
				if(this.uv2Buffer){f|=32;if(this.uv2Buffer.itemSize==3)f|=0x2000;}
				if(this.cBuffer)f|=4;
				if(this.ceBuffer)f|=64;
				if(state&iv.R_SELECTION)f|=256;
				if(state&64)f|=512;
				if(lm==1)f|=128;
				if(info.opacity<1.0)f|=1024;
				f|=(state&(iv.R_Z_OFFSET));
				this.activateShader(space,M.mtl,info,f);
				if(lm==1)gl.drawArrays(gl.POINTS,0,this.vBuffer.numItems);
				else{
					fb=this.fBuffer;
					if(fb){
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,fb);
					gl.drawElements((lm==2)?gl.LINES:gl.TRIANGLES,fb.numItems,gl.UNSIGNED_SHORT,fb.offset||0);
					}
				}
			}
		}
		if(state&iv.R_Z_NOWRITE) gl.depthMask(true);
	}
}
iv.bufferImp=function (gl,type,v,cmp,n)
{
	var b=gl.createBuffer();
	gl.bindBuffer(type,b);
	gl.bufferData(type,v,gl.STATIC_DRAW);
	b.itemSize = cmp;
	b.numItems = n;
	return b;
}
iv.bufferF=function(gl,v,cmp){
	if((!(v instanceof Float32Array)) && (!(v instanceof Uint8Array)))v=new Float32Array(v);
	return iv.bufferImp(gl,gl.ARRAY_BUFFER,v,cmp,v.length/cmp);
};
iv.bufferI=function(gl,v)
{
	if(!(v instanceof Uint16Array))v=new Uint16Array(v);
	return iv.bufferImp(gl,gl.ELEMENT_ARRAY_BUFFER,v,1,v.length);
}
iv.mesh.prototype.destroy=function()
{
	this.setBuffer('uv',null);
	this.setBuffer('uv2',null);
	this.setBuffer('f',null);
	this.setBuffer('v',null);
	this.setBuffer('n',null);
	this.setBuffer('e',null);
	this.setBuffer('c',null);
	this.setBuffer('ce',null);
	this.setBuffer('bn',null);
	this.setBuffer('bt',null);
}
iv.mesh.prototype.calcBBox=function(va){
    if(!va)va=this.points;
    if(!va)return;
	var count=va.length;
	if(count){
		var vminx=va[0],vminy=va[1],vminz=va[2];
		var vmaxx=vminx,vmaxy=vminy,vmaxz=vminz,p,i=3;
		while(i<count) {
			p=va[i++];
			if(p<vminx) vminx=p; else if(p>vmaxx) vmaxx=p;
			p=va[i++];
			if(p<vminy) vminy=p; else if(p>vmaxy) vmaxy=p;
			p=va[i++];
			if(p<vminz) vminz=p; else if(p>vmaxz) vmaxz=p;
		}
		if(this.boxMin) {
			this.boxMin[0]=vminx;
			this.boxMin[1]=vminy;
			this.boxMin[2]=vminz;
		} else this.boxMin=[vminx,vminy,vminz];
		if(this.boxMax) {
			this.boxMax[0]=vmaxx;
			this.boxMax[1]=vmaxy;
			this.boxMax[2]=vmaxz;
		} else this.boxMax=[vmaxx,vmaxy,vmaxz];
	}
}
;iv.loadMesh=function (m,s)
{
	var r = iv.createRequest(m.url,null,function(R){m.load(s,R.response);s.onMeshLoaded(m);});
	if(r){s.meshesInQueue++;r.responseType = "arraybuffer";r.send();}
	delete m.url;
}
;iv.bitStream=function(dv,dvpos)
{
	this.st=dv;
	this.stpos=dvpos;
	this.m_b=0;
	this.m_pos=0;
};
iv.bitStream.prototype.read = function(b)
{
	var r=0;
	while(b)
	{
		if(!this.m_pos){this.m_b=this.st.getUint8(this.stpos++);this.m_pos=8;}
		var t=b;
		if(t>this.m_pos)t=this.m_pos;
		r<<=t;
		r|=(this.m_b&0x0ff)>>(8-t);
		this.m_b<<=t;
		b-=t;
		this.m_pos-=t;
	}
	return r;
}
iv.bitStream.prototype.readSigned=function(b)
{
	var r=this.read(b);
	if(r&&this.read(1))r=-r;
	return r;
}
iv.bitStream.prototype.readU32=function()
{
	var sz=this.read(6),b=0;
	if(sz)
	{
		sz--;
		b=this.read(sz);
		b|=1<<sz;
	}
	return b;
}
iv.bitStream.prototype.readU16=function()
{
	var sz=this.read(5),b=0;
	if(sz)
	{
		sz--;
		b=this.read(sz);
		b|=1<<sz;
	}
	return b;
}
iv.mesh.prototype.numBits=function(index)
{
	var i=0;
	while(index){index>>=1;i++;}
	return i;
}
iv.mesh.prototype.ivdcmpf=function(cmp,v,c)
{
	var index=0,k=0,code=0;
	while(k<c)
	{
		code=cmp.read(2);
		if(code==0){v[k]=index;index++;}else
		{
			code<<=1;
			code|=cmp.read(1);
			if(code==4)v[k]=v[k-1]+1;else
			if(code==5)v[k]=v[k-cmp.read(4)-2];else
			if(code==6)v[k]=cmp.read(this.numBits(index));else
			if(code==7)
			{
				var sign=cmp.read(1);
				var delta=cmp.read(5);
				if(sign)delta*=-1;
				v[k]=v[k-1]+delta;
			}else
			{
				var j=k-(cmp.read(code==2?4:13)+1);
				var _v1,_v2;
				if(j%3 || (j>=(k-2))){_v1=j;_v2=j-1;}else{_v2=j+2;_v1=j;}
				v[k]=v[_v1];
				v[k+1]=v[_v2];
				k++;
			}
		}
		k++;
	}
};
iv.mesh.prototype.dcdnrml=function(d,i,n,j)
{
	var nx,ny,nz,k,l;
	var a=9.5875262183254544e-005*d.getUint16(i,true);
	var b=4.7937631091627272e-005*d.getUint16(i+2,true);
	k=Math.sin(b);
	nx=Math.cos(a)*k;
	ny=Math.sin(a)*k;
	nz=Math.cos(b);
	l=Math.sqrt(nx*nx+ny*ny+nz*nz);
	nx/=l;ny/=l;nz/=l;
	n[j]=nx;j++;n[j]=ny;j++;n[j]=nz;
}
iv.mesh.prototype.copyn=function (v,_n,i,j)
{
	i*=3;j*=3;
	v[i]=_n[j];
	v[i+1]=_n[j+1];
	v[i+2]=_n[j+2];
};
iv.mesh.prototype.copyn_i=function (v,_n,i,j)
{
	i*=3;j*=3;
	v[i]=-_n[j];
	v[i+1]=-_n[j+1];
	v[i+2]=-_n[j+2];
};
iv.mesh.prototype.readCmp = function(a,b,count,c,s,pos,box)
{
	var min=a.getFloat32(pos+c*4,true);
	var dx=a.getFloat32(pos+c*4+s*4,true);
	if(box){this.boxMin[c]=min;this.boxMax[c]=min+dx*65535;}
	pos+=s*8+c*2;
	for(var i=0;i<count;i++)
	{
		b[c]=dx*a.getUint16(pos,true)+min;pos+=s*2;
		c+=s;
	}
}
iv.mesh.prototype.autoNormals=function(n,v,f)
{
	var c=f.length,e1=[],e2=[],N=[],i,j,e,g,d;
	for(i=0;i<c;i+=3)
	{
		var i0=f[i]*3,i1=f[i+1]*3,i2=f[i+2]*3;
		for(j=0;j<3;j++)
		{
			var a=v[i0+j];
			e1[j]=v[i1+j]-a;
			e2[j]=v[i2+j]-a;
		}
		vec3.crossN(e1,e2,N);
		for(j=0;j<3;j++)
		{
			a=N[j];
			if(a){
				n[i0+j]+=a;
				n[i1+j]+=a;
				n[i2+j]+=a;
			}}
	}
	j=v.length;
	for(i=0;i<j;i+=3)
	{
		c=n[i],d=n[i+1],e=n[i+2],g=Math.sqrt(c*c+d*d+e*e);
		n[i] =c/g;
		n[i+1]=d/g;
		n[i+2]=e/g;
	}
};
iv.mesh.prototype.load = function(space,buffer)
{
	this.boxMin=[];this.boxMax=[];
	var data= new DataView(buffer);
	var numPoints=data.getUint16(0,true),nF=data.getUint16(2,true),flags=data.getUint16(4,true);
	var offset=6;
	if(flags&0x1000)
	{
		flags|=data.getUint16(offset,true)<<16;
		offset+=2;
	}
	if(flags&0x400)nF+=65536;
	if(flags&0x80000)
	{
		var l=new iv.mloader(this,numPoints,nF,flags);
		l.load(data);
		return;
	}
	if(flags&0x40000)
		this.meshMode=1;
	if(flags&8){this.meshMode=2;nF*=2;}else nF*=3;
	var n3=numPoints*3,v=new Float32Array(n3);
	this.readCmp(data,v,numPoints,0,3,offset,true);
	this.readCmp(data,v,numPoints,1,3,offset,true);
	this.readCmp(data,v,numPoints,2,3,offset,true);
	this.setPoints(v,space.cfgKeepMeshData&2||this.keepPoints);
	offset+=24+numPoints*6;
	var index=0,i;
	if(nF){
	var f=new Uint16Array(nF);
	if(flags&256)
	{
		var bs=new iv.bitStream(data,offset);
		this.ivdcmpf(bs,f,nF);
		offset=bs.stpos;
	}else{
		if(flags&4)
		{
			for(i=0;i<nF;i++)f[i]=data.getUint8(offset++);
		}else
		{
			for(i=0;i<nF;i++)
			{
				f[i]=data.getUint16(offset,true);offset+=2;
			}}
	}
	this.setFaces(f,(space.cfgKeepMeshData&1));
	}
	if(flags&16)
	{
		var n=new Float32Array(n3);
		var cs=data.getUint16(offset,true);offset+=2;
		if(flags&0x800)
		{
			this.autoNormals(n,v,f);
			if(cs){
				var bb=data.getUint8(offset);offset++;
				var offsetn=offset+cs;
				if(!bb)offsetn+=cs;
				for(i=0;i<cs;i++)
				{
					if(bb)
						index+=data.getUint8(offset+i,true);
					else
						index+=data.getUint16(offset+i*2,true);
					this.dcdnrml(data,offsetn+4*i,n,index*3);
				}
				offset=offsetn+cs*4;
			}
		}else{
			if(cs)
			{
				var _n=new Float32Array(cs*3);
				for(i=0;i<cs;i++)
				{
					this.dcdnrml(data,offset,_n,i*3);
					offset+=4;
				}
				var bs=new iv.bitStream(data,offset);
				i=0;var j=0,ibits=0;
				while(i<numPoints)
				{
					var cd=bs.read(1);
					if(cd)
					{
						cd=bs.read(1);
						if(ibits)index=bs.read(ibits);else index=0;
						if(cd)this.copyn(n,_n,i,index);else this.copyn_i(n,_n,i,index);
					}else
					{
						ibits=this.numBits(j);
						this.copyn(n,_n,i,j);j++;
					}
					i++;
				}
				offset=bs.stpos;
			}else{
				for(i=0;i<numPoints;i++)
				{
					this.dcdnrml(data,offset,n,i*3);
					offset+=4;
				}}
		}
		this.setNormals(n,this.keepNormals||this.bump);
	}
	if(flags&32)
		offset=this.loadUV(data,numPoints,(flags&0x10000)?3:2,offset,0);
	if(flags&0x200)
		offset=this.loadUV(data,numPoints,(flags&0x20000)?3:2,offset,1);
	if(flags&64)
	{
		var colors = new Uint8Array(n3);
		for(i=0;i<n3;i++)colors[i]=data.getUint8(offset++);
		this.setBuffer('c',iv.bufferF(this.gl,colors,3));
	}
	if(flags&128)
	{
		var colors = new Uint8Array(n3);
		for(i=0;i<n3;i++)colors[i]=data.getUint8(offset++);
		this.setBuffer('ce',iv.bufferF(this.gl,colors,3));
	}
}
iv.mesh.prototype.loadUV = function(data,numPoints,cmp,offset,ch)
{
	var uv=new Float32Array(numPoints*cmp),b=this.bump;
	this.readCmp(data,uv,numPoints,0,cmp,offset);
	this.readCmp(data,uv,numPoints,1,cmp,offset);
	if(cmp==3)this.readCmp(data,uv,numPoints,2,cmp,offset);
	if(ch)this.setUV2(uv,b,cmp);
	else this.setUV(uv,b,cmp);
	return offset+numPoints*(cmp*2)+8*cmp;
}
//ivbinmeshload3.js
vec3.middle=function(a,b,c){return vec3.scale(vec3.add(a,b,c),0.5);}
iv.mloader=function(mesh,numP,nF,flags){
	this.mesh=mesh;
	this.numP=numP;
	this.numF=nF;
	this.flags=flags;
	this.bMin=mesh.boxMin;
	this.bMax=mesh.boxMax;
	this.refF=[];
	this.refI=[];
	this.points=[];
	this.refIndex=0;
	this.refIndex2=0;
	this.pdIndex=0;
	this.pdIndex16=0;
	this.pdIndexA=0;
	this.triIndex=0;
	this.ntI=0;
	this.triangles=new Uint16Array(nF*3);
	this.queue=null;
	this.queueLast=null;
	this.p0=[];
	this.p1=[];
	this.p2=[];
	this.a0=[1,0,0];
	this.a1=[0,1,0];
}
iv.mloader.prototype.readA=function(bs,c,s){
	var a=[];
	while(c) {a.push(bs.read(s)); c--;}
	return a;
}
iv.mloader.prototype.readA2=function(bs,a,c){
	var b=0,f;
	while(c) {
		f=bs.read(1);if(f)b++;
		a.push(f);c--;
	}
	return b;
}
iv.mloader.prototype.getPoint=function(v){
	var i;
	if(this.refF[this.refIndex++]){
		i=this.refI[this.refIndex2++];
		iv.getV(this.points,i,v);
	}else{
		if(this.pDataF[this.pdIndex++])
		{
			iv.getV(this.pData16,this.pdIndex16++,v);
			vec3.scale(v,this.scale);
			vec3.add(v,this.bMin);
			i=this.pushPoint(v);
		}else{
		iv.getV(this.pData,this.pdIndexA++,v);
		vec3.scale(v,this.scale);
		i=-1;
		}
	}
	return i;
}
iv.mloader.prototype.loadV=function(bs){
	this.pDataF=[];
	var nX=bs.read(5),nY=bs.read(5),nZ=bs.read(5),c=this.numP,i,vd,num16=this.readA2(bs,this.pDataF,c),num14=c-num16;
	if(num16)
	{
		this.pData16=vd=[];
		for(i=0;i<num16;i++)vd.push(bs.read(nX),bs.read(nY),bs.read(nZ));
	}
	if(num14)
	{
	this.pData=vd=[];
	var sizes=this.readA(bs,num14,4);
	for(i=0;i<num14;i++){
		var sz=sizes[i],d0=0,d1=0,d2=0,s0,s1;
		if(sz) {
			d0=bs.read(sz);
			s0=d0&&bs.read(1);
			d1=bs.read(sz);
			s1=d1&&bs.read(1);
			var mask=1<<(sz-1);
			if(!(d0&mask)&&!(d1&mask))d2=bs.read(sz-1)|mask;
			else d2=bs.read(sz);
			if(s0)d0=-d0;
			if(s1)d1=-d1;
			if(d2&&bs.read(1))d2=-d2;
		}
		vd.push(d0,d1,d2);
	}
	}
}
iv.mloader.prototype.pushPoint=function(v){
	var p=this.points,i=p.length/3;
	p.push(v[0],v[1],v[2]);
	return i;
}
iv.mloader.prototype.newTriangle=function(a,b,c){
	var d=this.triIndex,t=this.triangles;
	t[d]=a;
	t[d+1]=b;
	t[d+2]=c;
	this.triIndex+=3;
	var e=this.nt[this.ntI++];
	if(e&1)this.toQueue(c,b,a);
	if(e&2)this.toQueue(a,c,b);
}
iv.mloader.prototype.toQueue=function(a,b,c){
	var q={a:a,b:b,c:c,next:null};
	if(this.queueLast)this.queueLast.next=q;
	else this.queue=q;
	this.queueLast=q;
}
iv.mloader.prototype.fromQueue=function(){
	var q=null;
	if(this.queue){
		q=this.queue;
		this.queue=q.next;
		q.next=null;
		if(!this.queue)this.queueLast=null;
	}
	return q;
}
iv.mloader.prototype.processFT=function(){
	if(this.refIndex>=this.refF.length)return false;
	var v0=this.p0,v1=this.p1,v2=this.p2,i0=this.getPoint(v0);
	if(i0<0)i0=this.pushPoint(vec3.add(v0,this.bMin));
	var i1=this.getPoint(v1);
	if(i1<0)i1=this.pushPoint(vec3.add(v1,v0));
	var i2=this.getPoint(v2);
	if(i2<0)i2=this.pushPoint(vec3.add(v2,vec3.middle(v0,v1)));
	this.newTriangle(i0,i1,i2);
	return true;
}
iv.mloader.prototype.processNT=function(i0,i1,ip){
	var v2=this.p0,i2=this.getPoint(v2);
	if(i2<0){
		var a=this.p1,b=this.p2;
		iv.getV(this.points,i0,a);
		iv.getV(this.points,i1,b);
		vec3.middle(a,b);
		iv.getV(this.points,ip,b);
		vec3.subtract(a,b,b);
		vec3.add(a,b);
		vec3.add(v2,a);
		i2=this.pushPoint(v2);
	}
	this.newTriangle(i0,i1,i2);
}
iv.mloader.prototype.loadRef=function(bs,N)
{
	var r=this.refI,p=bs.readU16();
	r.push(p);
	var s=this.readA(bs,--N,1),ones=[],nb=Math.ceil((N-this.readA2(bs,ones,N))/32),sizes=this.readA(bs,nb,4),j=32,sz,k=0,i,d;
	for(i=0;i<N;i++)
	{
		if(ones[i])d=1;
		else
		{
			if(j==32){sz=sizes[k++]+1;j=0;}
			d=bs.read(sz);
			if(d>=1)d++;
			j++;
		}
		if(s[i])p-=d;else p+=d;
		r.push(p);
	}
}
iv.mloader.prototype.load=function(data){
	var i,a=this.bMin,b=this.bMax,c,m=this.mesh,q,f=this.flags;
	for(i=0;i<3;i++){a[i]=data.getFloat32(8+i*4,true);b[i]=data.getFloat32(20+i*4,true);}
	this.scale=Math.max(b[0]-a[0],b[1]-a[1],b[2]-a[2])/65535.0;
	var bs=new iv.bitStream(data,32),r=this.refF,numRef=bs.readU32()+this.numF+2;
	r.push(0,0,0);
	var numI=this.readA2(bs,r,numRef-3);
	r=this.nt=this.readA(bs,this.numF-1,2);
	r.push(0);
	this.loadV(bs);
	if(numI)this.loadRef(bs,numI);
	while(this.processFT()){
		while(q=this.fromQueue())this.processNT(q.a,q.b,q.c);
	}
	m.setPoints(this.points,true);
	m.setFaces(this.triangles,true);
	if(f&16)this.readNormals(bs,m);
	if(f&32)this.readUV(bs,f&0x10000,0,m);
	if(f&0x200)this.readUV(bs,f&0x20000,1,m);
	if(f&64)this.readColors(bs,0,m);
	if(f&128)this.readColors(bs,1,m);
};
iv.mloader.prototype.readColors=function(bs,ch,m){
	var n3=this.numP*3,a=new Uint8Array(n3),i;
	for(i=0;i<n3;i++)a[i]=bs.read(8);
	m.setBuffer(ch?'ce':'c',iv.bufferF(m.gl,a,3));
}
iv.mloader.prototype.readFloats=function(bs,cmp)
{
	var count=this.numP,i,j,uv=new Float32Array(count*cmp),abuf=new ArrayBuffer(8),data=new DataView(abuf);
	for(j=0;j<cmp;j++) {
		data.setUint32(0,bs.read(32),true);
		data.setUint32(4,bs.read(32),true);
		var _min=data.getFloat32(0,true),_max=data.getFloat32(4,true),delta=_max-_min;
		if(delta){
		var num=bs.read(4)+6,scale=delta/((1<<num)-1),I=j;
		for(i=0;i<count;i++){uv[I]=bs.read(num)*scale+_min;I+=cmp;}
		}else
		{
		for(i=0;i<count;i++){uv[I]=_min;I+=cmp;}
		}
	}
	return uv;
}
iv.mloader.prototype.readUV=function(bs,cmp,iUV,m){
	cmp=cmp?3:2;
	var a=this.readFloats(bs,cmp);
	if(iUV)m.setUV2(a,true,cmp);else m.setUV(a,true,cmp);
};
iv.mloader.prototype.readNormals=function(bs,m){
	var count=this.numP,i,n=new Float32Array(count*3);
	if(this.flags&0x800){
		var same=bs.read(1),small=bs.read(1),big=bs.read(1),k=0.000341787;
		if(same||small)m.autoNormals(n,this.points,this.triangles);
		var flags=null,flags2=null,c=0;
		if(same){
			flags=[];
			c=this.readA2(bs,flags,count);
		}else c=count;
		if(big&&small)flags2=this.readA(bs,c,1);
		var j=0,alwaysBig=big&&!small,tm=[];
		mat4.identity(tm);
		for(i=0;i<count;i++){
			if(!flags||flags[i]) {
				if(alwaysBig||(flags2&&flags2[j]))this.dcdnrml(n,i,bs.read(16),bs.read(16));
					else this.correctNormal(n,i,k*bs.readSigned(8),k*bs.readSigned(8),tm);
				j++;
			}
		}
	}else m.autoNormals(n,this.points,this.triangles);
	m.setNormals(n,true);
}
iv.setV=function(v,i,a,b,c){i*=3;v[i]=a;v[i+1]=b;v[i+2]=c;}
iv.mloader.prototype.dcdnrml=function(n,i,a,b){
	var nx,ny,nz,k;
	a=9.5875262183254544e-005*a;
	b=4.7937631091627272e-005*b;
	k=Math.sin(b);
	nx=Math.cos(a)*k;
	ny=Math.sin(a)*k;
	nz=Math.cos(b);
	k=Math.sqrt(nx*nx+ny*ny+nz*nz);
	iv.setV(n,i,nx/k,ny/k,nz/k);
}
iv.mloader.prototype.correctNormal=function(n,i,a,b,tm){
	var az=this.p0; iv.getV(n,i,az);
	var x=Math.abs(az[0]),y=Math.abs(az[1]),z=Math.abs(az[2]);
	x=(x>y?(x>z?0:2):1)?this.a0:this.a1;
	y=vec3.crossN(az,x,this.p1);
	x=vec3.crossN(az,y,this.p2);
	mat4.setRow(tm,0,x);
	mat4.setRow(tm,1,y);
	mat4.setRow(tm,2,az);
	x[0]=a;
	x[1]=b;
	x[2]=Math.sqrt(1.0-(a*a+b*b));
	mat4.mulVector(tm,x);
	iv.setV(n,i,x[0],x[1],x[2]);
};//ivnode3d.js
iv.node=function()
{
iv.abstract.call(this);
	this.object=null;
	this.tm=null;
	this.name="";
	this.material=null;
	this.state=0x303;
	this.wtm=[];
}
iv.node.prototype=new iv.abstract();
iv.node.prototype.newNode=function(){return this.insert(new iv.node());}
iv.node.prototype.insert=function(n)
{	n.ref++;
	if(this.lastChild)this.lastChild.next=n;
	else this.firstChild=n;
	this.lastChild=n;
	n.parent=this;
	if(this.refTargets)this.notify("childadded",{child:n});
	return n;
}
iv.node.prototype.removeAll=function(){while(this.firstChild)this.remove(this.firstChild);}
iv.node.prototype.destroy=function()
{
	this.removeAll();
	this.setObject(null);
	if(this.refTargets)this.refTargets=null;
}
iv.node.prototype.remove=function(n)
{
	if(n.parent!=this)return false;
	var _n=null;
	if(this.firstChild==n)
		this.firstChild=n.next;
	else
	{
		_n=this.firstChild;
		while(_n)
		{
			if(_n.next==n)
			{
				_n.next=n.next;
				break;
			}
			_n=_n.next;
		}
	}
	if(this.lastChild==n)this.lastChild=_n;
	n.parent=null;
	n.next=null;
	if(this.refTargets)this.notify("childremoved",{child:n});
	n.release();
	return true;
}
iv.node.prototype.setState=function(s,mask)
{
	var _state=this.state&(~mask)| mask&s;
	if(_state!=this.state)
	{
		s=this.state;
		this.state=_state;
		if(this.refTargets)this.notify("state",{old:s});
		return true;
	}
	return false;
}
iv.node.prototype.traverse = function(ctx,ptm,flags,opacity){
	if(!(this.state&3))return;
	if(this.tm)
	{
		if(ptm){
			var w=this.wtm,i=ctx.itmw;
			if(!w[i])w[i]=mat4.create();
			ptm=mat4.m(this.tm,ptm,w[i]);
		}else ptm=this.tm;
	};
	this.commonTraverse(ctx,ptm,flags,opacity);
};
iv.node.prototype.commonTraverse=function(ctx,ptm,flags,opacity)
{
	var m=this.rmode;
	if(m!==undefined)
	{
		flags&=~iv.TS_RMODE;
		if(typeof m =='string')
		{
			var M=ctx.space.getRMode(m);
			if(M)
			{
				m=this.rmode=M.index<<20;
			}else {delete this.rmode;m=0;}
		}
		flags|=m&iv.TS_RMODE;
	}
	if('cull' in this)
	{
		if(this.cull===1)flags|=iv.TS_DBL;
		else flags&=~iv.TS_DBL;
	}
	if(('opacity' in this) && opacity!==undefined)opacity*=this.opacity;
	flags|=(this.state&4);
	if(this.state&1){
		m=opacity;
		if(!(flags&4)&&ctx.space.anySelection&&!(this.state&0x40000))m*=ctx.space.clrSelection[5];
		if(!ctx.action(this,ptm,flags,m))return;
	}
	if(this.state&2)
	this.commonTraverse2(ctx,ptm,flags,opacity);
}
iv.node.prototype.commonTraverse2=function(ctx,ptm,flags,opacity){
	var a=this.firstChild;
	while(a) {
		a.traverse(ctx,ptm,flags,opacity);
		a=a.next;
	}
}
iv.node.prototype.setObject = function(obj)
{
	if(this.object!=obj)
	{
		if(this.object)this.object.release();
		this.object=obj;
		if(obj)obj.ref++;
	}
}
iv.node.prototype.getBoundingBoxEmpty=function(tm,b,f){return b;}
iv.node.prototype.load = function(d,info)
{
	var i,j,a,v;
	for(v in d)
	{
		a=d[v];
		switch(v)
		{
			case 'light':this.setObject(new iv.light(a));break;
			case 'camera':this.setObject(new iv.camera(a));break;
			case 'speaker':this.setObject(new iv.speaker(a));break;
			case 'object':this.setObject(info.objects[a]);break;
			case 'mtl':a=info.materials[a];if(a){this.material=a;if(a.bump && this.object)this.object.bump=true;}break;
			case 'bbaxis':
				this.bbtm = mat4.create();
				this.bbaxis=a;
				this.traverse=this.traverseBB;
				if(d.dir)this.bbaxisDir=d.dir;
				this.getBoundingBox=this.getBoundingBoxEmpty;
				break;
			case 's':this.state=a^0x300;break;
			case 'tm':this.tm=iv.convertMatrix(d.tm);break;
			case 'i':for(i=0;i<a.length;i++)this.newNode().load(a[i],info);break;
			case 'clipPlane':this.setObject(new iv.clipObject(info.space.gl,a));this.state|=iv.NS_NOCLIP;break;
			default:this[v]=a;
		}
	}
}
iv.node.prototype.enableTM = function()
{
if(!this.tm)this.tm=mat4.identity(mat4.create());
return this.tm;
}
iv.node.prototype.getWTM=function(){
	var tm=null,n=this;
	while(n)
	{
		if(n.tm)
		{
			if(tm)mat4.m(tm,n.tm);
			else tm=mat4.create(n.tm);
		}
		n=n.parent;
	}
	return tm;
};
iv.node.prototype.replaceAnimId=function(a,b)
{
	iv.anim.replace(this,a,b);
	var n=this.firstChild;
	while(n)
	{
		n.replaceAnimId(a,b);
		n=n.next;
	}
}
iv.node.prototype.activateAnimation=function(a,reset)
{
	var n=this.firstChild;
	while(n)
	{
		n.activateAnimation(a,reset);
		n=n.next;
	}
	iv.anim.activate(this,a,reset);
}
iv.getBoolTrackInfo=function(a,t)
{
	var c=a.length;
	if(!c)return false;
	if(t<=a[0].t)return a[0].v;
	if(t>=a[c-1].t)return a[c-1].v;
	var _key=null;
	for(var i=0;i<c;i++)
	{
		var key=a[i];
		if(key.t==t)key.v;
		else
			if(key.t>t)
			{
				if(_key)return _key.v;
				return false;
			}
		_key=key;
	}
}
iv.getFloatTrackInfo=function(a,t,old)
{
	var d={};
	if(a && iv.getTrackInfo(a,t,d))
		return d.i1?d.i1.v*(1.0-d.k)+ d.i0.v*d.k:d.i0.v;
	return old;
}
iv.getP3DTrackInfo=function(a,t,d)
{   if(!d)d={};
	if(a && iv.getTrackInfo(a,t,d))
		return d.i1?vec3.lerp(d.i1.v,d.i0.v,d.k):d.i0.v;
	return null;
}
iv.getTI0=function(d,k){d.i0=k;d.k=1;delete d.i1;return true;}
iv.getTrackInfo=function(a,t,d)
{
	var c=a.length,i;
	if(!c)return false;
	if(t<=a[0].t)return iv.getTI0(d,a[0]);
	if(t>=a[c-1].t)return iv.getTI0(d,a[c-1]);
	var _key=null;
	for(i=0;i<c;i++)
	{
		var key=a[i];
		if(Math.abs(key.t-t)<7e-4)return iv.getTI0(d,key);
		else
			if(key.t>t)
			{
				if(_key)
				{
					d.i0=_key;
					d.i1=key;
					d.k= (key.t-t)/(key.t-_key.t);
					return true;
				}else return iv.getTI0(d,key);
			}
		_key=key;
	}
	if(_key)return iv.getTI0(d,_key);
	return true;
}
iv.node.prototype.getTime=function(t)
{
	var a=this.anim;
	if(a && a.time!==undefined)return a.time;
	var n=this.firstChild;
	while(n)
	{
		var rez=n.getTime();
		if(rez!==undefined)return rez;
		n=n.next;
	}
	return undefined;
}
iv.node.prototype.setTime=function(t)
{
	var rez=false,n=this.firstChild;
	if(this.anim)
	{
		var a=this.anim,d={};
		if(a.pos||a.rot||a.scale)
		{
			var tm=this.enableTM(),p;
			mat4.identity(tm);
			if(a.scale)
			{
				p=iv.getP3DTrackInfo(a.scale,t,d);
				if(p){tm[0]=p[0];tm[5]=p[1];tm[10]=p[2];}
			}
			if(a.rot && iv.getTrackInfo(a.rot,t,d))
			{
				var r=[];
				if(d.i1)
				{
					var q=[];
					quat.slerp(q, d.i1.v,d.i0.v, d.k);
					mat4.fromQuat(r,q);
				}else mat4.fromQuat(r,d.i0.v);
				mat4.m(tm,r);
			}
			if(a.pos)
			{
				p=iv.getP3DTrackInfo(a.pos,t,d);
				if(p)mat4.offset(tm,p);
			}
		}
		if(a.vis0)
		{
			if(iv.getBoolTrackInfo(a.vis0,t))this.state|=1;else this.state&=~1;
		}
		if(a.vis1)
		{
			if(iv.getBoolTrackInfo(a.vis1,t))this.state|=2;else this.state&=~2;
		}
		if(a.opacity)this.opacity=iv.getFloatTrackInfo(a.opacity,t,this.opacity);
	}
	if(this.object && this.object.setTime)this.object.setTime(a,t);
	while(n)
	{
		rez|=n.setTime(t);
		n=n.next;
	}
	return rez;
}
iv.anim.replace=function(n,a,b)
{
	var _i=n.anims,id=a.id;
	if(_i)
		for(var i=0;i<_i.length;i++)
		{
			var A=_i[i];
			if(A.id==a)A.id=b;
		}
}
iv.anim.activate=function(n,a,reset)
{
	var _i=n.anims,id=a.id,i;
	if(_i)
		for(i=0;i<_i.length;i++)
			if(_i[i].id==id)
			{
				n.anim=_i[i];return true;
			}
	if(reset)n.anim=null;
	return false;
}
iv.anim.node=function (wnd,node,p)
{
	this.type="anim";
	this.node=node;
	this.count=1;
	this.mode=0;
	this.delayStart=0;
	this.delayEnd=0;
	for(var v in p)this[v]=p[v];
	this.d=Math.abs(this.to-this.from);
	this.t=-this.delayStart;
	if(wnd && wnd.view.camera)this.camera=true;
}
iv.anim.node.prototype.animate=function(k) {
	if(this.speed)k*=this.speed;
	this.t+=k/1000;
	var ret=0;
	if(this.stage)
	{
		if(this.t<this.delayEnd)ret=1;
	}else{
		if(this.d)
		{
			ret=3;var a=this.t-this.delayStart,_c=Math.floor(a/this.d);
			if(a<0)return 1;
			if((this.count>0) && (_c>=this.count)){
				if(this.delayEnd){this.stage=1;this.t=0;}else ret&=~1;
				_c=this.count-1;
			}
			a=a-this.d*_c;
			switch(this.mode)
			{
				case 1:if(_c&1)a=this.d-a;break;
				default:break;
			}
			a/=this.d;
			this.node.setTime(this.from*(1.0-a)+this.to*a);
		}else {this.node.setTime(this.from);ret=2;}
	}
	if(ret && this.camera)ret|=4;
	return ret|16;
}
iv.node.prototype.searchId = function(id)
{
	if(this.id==id)return this;
	var n=this.firstChild;
	while(n)
	{
		var _n=n.searchId(id);
		if(_n)return _n;
		n=n.next;
	}
	return null;
}
iv.node.prototype.search = function(name)
{
	if(this.name==name)return this;
	var n=this.firstChild;
	while(n)
	{
		var _n=n.search(name);
		if(_n)return _n;
		n=n.next;
	}
	return null;
}
iv.node.prototype.visible = function()
{
	return (this.state&3)!=0;
}
iv.node.prototype.show=function(b)
{
	return this.setState((b || b===undefined)?3:0,3);
}
iv.node.prototype.showAll=function()
{
	this.setState(3,3);
	var n=this.firstChild;
	while(n)
	{
		n.showAll();
		n=n.next;
	}
}
iv.node.prototype.isSelected=function() {
	var n=this;
	while(n) {
		if(n.state&4) return true;
		n=n.parent;
	}
	return false;
}
iv.node.prototype.addPointToBox=function(tm,b,p) {
	if(tm) mat4.mulPoint(tm,p);
	if(b.length) {
		for(var j=0;j<3;j++) {
			if(p[j]<b[j]) b[j]=p[j]; else
				if(p[j]>b[j+3]) b[j+3]=p[j];
		}
	} else { b[3]=b[0]=p[0]; b[4]=b[1]=p[1]; b[5]=b[2]=p[2]; }
}
iv.node.prototype.getBoundingBox=function(tm,b,vis)
{
	if(this.object && (this.state&1 || !vis))
	{
		var p=[],obj=this.object;
		if(obj.points)
		{
			var v=obj.points;
			if(!b)b=[];
			var c=v.length,i;
			for(i=0;i<c;i+=3)
			{
				p[0]=v[i];p[1]=v[i+1];p[2]=v[i+2];
				this.addPointToBox(tm,b,p);
			}
		}else
			if(obj.boxMin)
			{
				if(!b)b=[];
				var _min=obj.boxMin,_max=obj.boxMax;
				for(var i=0;i<8;i++)
				{
					p[0]=(i&1) ? _max[0] : _min[0];
					p[1]=(i&2) ? _max[1] : _min[1];
					p[2]=(i&4) ? _max[2] : _min[2];
					this.addPointToBox(tm,b,p);
				}
			}
	}
	if(this.state&2 || !vis){
	var child=this.firstChild,_newtm=null;
	while(child)
	{
		var newtm=null;
		if(child.tm)
		{
			if(tm){
				if(!_newtm)_newtm = mat4.create();
				newtm=_newtm;
				mat4.m(child.tm,tm,newtm);
			}else newtm=child.tm;
		}else newtm=tm;
		b=child.getBoundingBox(newtm,b,vis);
		child=child.next;
	}}
	return b;
}
;
iv.node.prototype.switchToBB = function(axis)
{
    this.bbtm = mat4.create();
	this.bbaxis=axis;
	this.traverse=this.traverseBB;
}
iv.node.prototype.traverseBB=function(ctx,ptm,astate,opacity) {
	if(!(this.state&3)) return;
	if(this.tm) {
		var newtm=mat4.create();
		mat4.m(this.tm,ptm,newtm);
		ptm=newtm;
	}
	var bbScaleFactor=1,tm=this.bbtm,w=ctx.window,norg=ptm?[ptm[12],ptm[13],ptm[14]]:[0.0,0.0,0.0];
	norg=mat4.mulPoint(ctx.mvMatrix,norg);
	if(norg[2]>=0) return false;
	if(this.bbunit&&this.bbscale) {
		if(this.bbunit=='3d') bbScaleFactor=this.bbscale; else {
			bbScaleFactor=ctx.getScaleFactor(this.bbunit);
			if(!ctx.ortho)
				bbScaleFactor=-bbScaleFactor*norg[2];
			bbScaleFactor*=this.bbscale;
		}
	}
	mat4.invert(tm,ptm);
	var cOrg=mat4.mulPoint(tm,ctx.view.from,[]),a=this.bbaxis,alen=vec3.dot(a,a),a0=[],a1,a2=[];
	if(alen>1e-4)
	{
		vec3.normalize(cOrg);
		alen=Math.sqrt(alen);
		if(this.bbaxisDir) {
			mat4.m(ptm,ctx.mvMatrix,tm);
			var p0=[0,0,0],p1=[],bF=false;
			mat4.mulPoint(tm,p0);
			mat4.mulPoint(tm,a,p1);
			if(this.bbaxisDir==1)bF=(p1[0]>p0[0]);else if(this.bbaxisDir==2)bF=(p1[0]<p0[0]);
			if(bF)alen*=-1;
		}
		a1=[a[0]/alen,a[1]/alen,a[2]/alen];
		vec3.crossN(a1,cOrg,a0);
		vec3.crossN(a0,a1,a2);
	} else {
		var cUp=mat4.mulPoint(tm,ctx.view.up,[]),cTarget=mat4.mulPoint(tm,ctx.view.to,[]);
		vec3.subtractN(cOrg,cTarget,a2);
		var aY=vec3.subtractN(cUp,cOrg,[]);
		vec3.crossN(aY,a2,a0);
		a1=[0,0,0];
		vec3.crossN(a2,a0,a1);
	}
	mat4.identity(tm);
	if(bbScaleFactor!=1.0) {
		vec3.scale(a0,bbScaleFactor);
		vec3.scale(a1,bbScaleFactor);
		vec3.scale(a2,bbScaleFactor);
	}
	mat4.setRow(tm,0,a0);
	mat4.setRow(tm,1,a1);
	mat4.setRow(tm,2,a2);
	mat4.m(tm,ptm);
	this.commonTraverse(ctx,tm,astate,opacity);
}
;function zip(a){this.WSIZE=32768,this.LBITS=9,this.DBITS=6,this.slide=new Uint8Array(2*this.WSIZE),this.wp=0,this.bitBuf=0,this.bitLen=0,this.method=-1,this.eof=!1,this.copyLen=this.zip_copy_dist=0,this.tl=null,this.pos=0,this.src=a,this.srcLength=a.byteLength,this.STORED_BLOCK=0,this.fixedTL=null,this.MASK_BITS=ZIP.MASK_BITS}var ZIP={MASK_BITS:[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],cplens:[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],cplext:[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,99,99],cpdist:[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],cpdext:[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],b:[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],inflateBin:function(a,b){var c=new zip(a);return c.inflateBin(b)},inflateStr:function(a,b){var c=new zip(a);return c.inflateStr(b)},HuftNode:function(){this.e=0,this.b=0,this.n=0,this.t=null},HuftList:function(){this.next=null,this.list=null},HuftBuild:function(a,b,c,d,e,f){this.N_MAX=288,this.status=0,this.root=null,this.m=0;var g,i,j,k,l,m,n,o,q,r,s,w,y,z,A,B,C,h=new Array(17),p=new Array(17),t=new ZIP.HuftNode,u=new Array(16),v=new Array(this.N_MAX),x=new Array(17);for(C=this.root=null,m=0;m<h.length;m++)h[m]=0;for(m=0;m<p.length;m++)p[m]=0;for(m=0;m<u.length;m++)u[m]=null;for(m=0;m<v.length;m++)v[m]=0;for(m=0;m<x.length;m++)x[m]=0;i=b>256?a[256]:16,q=a,r=0,m=b;do h[q[r]]++,r++;while(--m>0);if(h[0]==b)return this.root=null,this.m=0,void(this.status=0);for(n=1;n<=16&&0==h[n];n++);for(o=n,f<n&&(f=n),m=16;0!=m&&0==h[m];m--);for(k=m,f>m&&(f=m),z=1<<n;n<m;n++,z<<=1)if((z-=h[n])<0)return this.status=2,void(this.m=f);if((z-=h[m])<0)return this.status=2,void(this.m=f);for(h[m]+=z,x[1]=n=0,q=h,r=1,y=2;--m>0;)x[y++]=n+=q[r++];q=a,r=0,m=0;do 0!=(n=q[r++])&&(v[x[n]++]=m);while(++m<b);for(b=x[k],x[0]=m=0,q=v,r=0,l=-1,w=p[0]=0,s=null,A=0;o<=k;o++)for(g=h[o];g-- >0;){for(;o>w+p[1+l];){if(w+=p[1+l],l++,A=(A=k-w)>f?f:A,(j=1<<(n=o-w))>g+1)for(j-=g+1,y=o;++n<A&&!((j<<=1)<=h[++y]);)j-=h[y];for(w+n>i&&w<i&&(n=i-w),A=1<<n,p[1+l]=n,s=new Array(A),B=0;B<A;B++)s[B]=new ZIP.HuftNode;C=null==C?this.root=new ZIP.HuftList:C.next=new ZIP.HuftList,C.next=null,C.list=s,u[l]=s,l>0&&(x[l]=m,t.b=p[l],t.e=16+n,t.t=s,n=(m&(1<<w)-1)>>w-p[l],u[l-1][n].e=t.e,u[l-1][n].b=t.b,u[l-1][n].n=t.n,u[l-1][n].t=t.t)}for(t.b=o-w,r>=b?t.e=99:q[r]<c?(t.e=q[r]<256?16:15,t.n=q[r++]):(t.e=e[q[r]-c],t.n=d[q[r++]-c]),j=1<<o-w,n=m>>w;n<A;n+=j)s[n].e=t.e,s[n].b=t.b,s[n].n=t.n,s[n].t=t.t;for(n=1<<o-1;0!=(m&n);n>>=1)m^=n;for(m^=n;(m&(1<<w)-1)!=x[l];)w-=p[l],l--}this.m=p[1],this.status=0!=z&&1!=k?1:0}};zip.prototype.getByte=function(){return this.srcLength===this.pos?-1:this.src[this.pos++]},zip.prototype.needBits=function(a){for(;this.bitLen<a;)this.bitBuf|=this.getByte()<<this.bitLen,this.bitLen+=8},zip.prototype.getBits=function(a){return this.bitBuf&this.MASK_BITS[a]},zip.prototype.ngb=function(a){for(;this.bitLen<a;)this.bitBuf|=this.getByte()<<this.bitLen,this.bitLen+=8;return this.bitBuf&this.MASK_BITS[a]},zip.prototype.dumpBits=function(a){this.bitBuf>>=a,this.bitLen-=a},zip.prototype.inflateCodes=function(a,b,c){var d,e,f=0;if(0==c)return 0;for(;;){for(e=this.tl.list[this.ngb(this.zip_bl)],d=e.e;d>16;){if(99==d)return-1;this.dumpBits(e.b),e=e.t[this.ngb(d-16)],d=e.e}if(this.dumpBits(e.b),16!=d){if(15==d)break;for(this.copyLen=e.n+this.ngb(d),this.dumpBits(d),e=this.zip_td.list[this.ngb(this.zip_bd)],d=e.e;d>16;){if(99==d)return-1;this.dumpBits(e.b),e=e.t[this.ngb(d-16)],d=e.e}for(this.dumpBits(e.b),this.zip_copy_dist=this.wp-e.n-this.ngb(d),this.dumpBits(d);this.copyLen>0&&f<c;)this.copyLen--,this.zip_copy_dist&=32767,this.wp&=32767,a[b+f++]=this.slide[this.wp++]=this.slide[this.zip_copy_dist++];if(f==c)return c}else if(this.wp&=32767,a[b+f++]=this.slide[this.wp++]=e.n,f==c)return c}return this.method=-1,f},zip.prototype.inflateStored=function(a,b,c){var d;if(d=7&this.bitLen,this.dumpBits(d),d=this.ngb(16),this.dumpBits(16),this.needBits(16),d!=(65535&~this.bitBuf))return-1;for(this.dumpBits(16),this.copyLen=d,d=0;this.copyLen>0&&d<c;)this.copyLen--,this.wp&=32767,a[b+d++]=this.slide[this.wp++]=this.ngb(8),this.dumpBits(8);return 0==this.copyLen&&(this.method=-1),d},zip.prototype.inflateFixed=function(a,b,c){if(null==this.fixedTL){var d,f,e=new Array(288);for(d=0;d<144;d++)e[d]=8;for(;d<256;d++)e[d]=9;for(;d<280;d++)e[d]=7;for(;d<288;d++)e[d]=8;if(this.zip_fixed_bl=7,f=new ZIP.HuftBuild(e,288,257,ZIP.cplens,ZIP.cplext,this.zip_fixed_bl),0!=f.status)return alert("HufBuild error: "+f.status),-1;for(this.fixedTL=f.root,this.zip_fixed_bl=f.m,d=0;d<30;d++)e[d]=5;if(this.zip_fixed_bd=5,f=new ZIP.HuftBuild(e,30,0,ZIP.cpdist,ZIP.cpdext,this.zip_fixed_bd),f.status>1)return this.fixedTL=null,alert("HufBuild error: "+f.status),-1;this.zip_fixed_td=f.root,this.zip_fixed_bd=f.m}return this.tl=this.fixedTL,this.zip_td=this.zip_fixed_td,this.zip_bl=this.zip_fixed_bl,this.zip_bd=this.zip_fixed_bd,this.inflateCodes(a,b,c)},zip.prototype.inflateDynamic=function(a,b,c){var d,e,f,g,h,i,j,k,m,l=new Array(316);for(d=0;d<l.length;d++)l[d]=0;if(j=257+this.ngb(5),this.dumpBits(5),k=1+this.ngb(5),this.dumpBits(5),i=4+this.ngb(4),this.dumpBits(4),j>286||k>30)return-1;for(e=0;e<i;e++)l[ZIP.b[e]]=this.ngb(3),this.dumpBits(3);for(;e<19;e++)l[ZIP.b[e]]=0;if(this.zip_bl=7,m=new ZIP.HuftBuild(l,19,19,null,null,this.zip_bl),0!=m.status)return-1;for(this.tl=m.root,this.zip_bl=m.m,g=j+k,d=f=0;d<g;)if(h=this.tl.list[this.ngb(this.zip_bl)],e=h.b,this.dumpBits(e),e=h.n,e<16)l[d++]=f=e;else if(16==e){if(e=3+this.ngb(2),this.dumpBits(2),d+e>g)return-1;for(;e-- >0;)l[d++]=f}else if(17==e){if(e=3+this.ngb(3),this.dumpBits(3),d+e>g)return-1;for(;e-- >0;)l[d++]=0;f=0}else{if(e=11+this.ngb(7),this.dumpBits(7),d+e>g)return-1;for(;e-- >0;)l[d++]=0;f=0}if(this.zip_bl=this.LBITS,m=new ZIP.HuftBuild(l,j,257,ZIP.cplens,ZIP.cplext,this.zip_bl),0==this.zip_bl&&(m.status=1),0!=m.status)return 1==m.status,-1;for(this.tl=m.root,this.zip_bl=m.m,d=0;d<k;d++)l[d]=l[d+j];return this.zip_bd=this.DBITS,m=new ZIP.HuftBuild(l,k,0,ZIP.cpdist,ZIP.cpdext,this.zip_bd),this.zip_td=m.root,this.zip_bd=m.m,0==this.zip_bd&&j>257?-1:(1==m.status,0!=m.status?-1:this.inflateCodes(a,b,c))},zip.prototype.inflateInternal=function(a,b,c){var d,e;for(d=0;d<c;){if(this.eof&&this.method==-1)return d;if(this.copyLen>0){if(this.method!=this.STORED_BLOCK)for(;this.copyLen>0&&d<c;)this.copyLen--,this.zip_copy_dist&=32767,this.wp&=32767,a[b+d++]=this.slide[this.wp++]=this.slide[this.zip_copy_dist++];else{for(;this.copyLen>0&&d<c;)this.copyLen--,this.wp&=32767,a[b+d++]=this.slide[this.wp++]=this.ngb(8),this.dumpBits(8);0==this.copyLen&&(this.method=-1)}if(d==c)return d}if(this.method==-1){if(this.eof)break;0!=this.ngb(1)&&(this.eof=!0),this.dumpBits(1),this.method=this.ngb(2),this.dumpBits(2),this.tl=null,this.copyLen=0}switch(this.method){case 0:e=this.inflateStored(a,b+d,c-d);break;case 1:e=null!=this.tl?this.inflateCodes(a,b+d,c-d):this.inflateFixed(a,b+d,c-d);break;case 2:e=null!=this.tl?this.inflateCodes(a,b+d,c-d):this.inflateDynamic(a,b+d,c-d);break;default:e=-1}if(e==-1)return this.eof?0:-1;d+=e}return d},zip.prototype.inflateStr=function(a){for(var b,c,d=-1,e=new Array(1024),f="",g=0,h=0;(b=this.inflateInternal(e,0,e.length))>0&&d!=this.pos;)for(d=this.pos,c=0;c<b;c++){var i=e[c];g?(g--,h|=(63&i)<<6*g,g||(f+=String.fromCharCode(h))):i<128?f+=String.fromCharCode(i):i<224?(g=1,h=(65567&i)<<6):i<240?(g=2,h=(65567&i)<<12):i<248?(g=3,h=(65543&i)<<18):i<252?(g=4,h=(65543&i)<<18):i<254?(g=5,h=(65537&i)<<30):f+=String.fromCharCode(i)}return f},zip.prototype.inflateBin=function(a){for(var b,c=0,d=-1,e=new ArrayBuffer(a),f=new Uint8Array(e);(b=this.inflateInternal(f,c=0,f.length))>0&&d!=this.pos;)d=this.pos,c+=b;return e};//ivtextures.js
iv.texture=function(gl,a){
	if(gl) {
		iv.abstract.call(this);
		this.ref=1;
		this.gl=gl;
		this.target=gl.TEXTURE_2D;
		this.format=gl.RGBA;
		this.type=gl.UNSIGNED_BYTE;
		this.width=this.height=0;
		this.filter=iv.FILTER_MIPMAP;
		this.ready=false;
		if(a) {
			if(a.target) this.target=a.target;
			if(a.format) this.format=a.format;
			if(a.internalFormat) this.internalFormat=a.internalFormat;
			if(a.type) this.type=a.type;
		}
		if(!this.internalFormat)this.internalFormat=this.format;
		this.handle=gl.createTexture();
	}
}
iv.texture.prototype=new iv.abstract();
iv.texture.prototype.isCube=function() { return this.target==this.gl.TEXTURE_CUBE_MAP;}
iv.texture.prototype.is2d=function() { return this.target==this.gl.TEXTURE_2D;}
iv.texture.prototype.destroy=function() {
	if(this.handle){this.gl.deleteTexture(this.handle);this.handle=null;}
	this.gl=null;
	this.ready=false;
	return this;
};
iv.texture.prototype._bind=function(unit,v){
	if(!unit)unit=0;
	this.gl.activeTexture(this.gl.TEXTURE0+unit);
	this.gl.bindTexture(this.target,v);
	return this;
};
iv.texture.prototype.bind=function(unit){return this._bind(unit,this.handle);};
iv.texture.prototype.unbind=function(unit){return this._bind(unit,null);};
iv.texture.prototype.setImage=function(img,i){
	var gl=this.gl; if(i===undefined) i=this.target;
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,this.is2d());
	gl.texImage2D(i,0,this.internalFormat,this.format,this.type,img);
	this.width=img.naturalWidth;
	this.height=img.naturalHeight;
	if(this.is2d()) this.ready=true;
	return this;
}
iv.texture.prototype.setSize=function(w,h){
	this.width=w;
	this.height=h;
	this.gl.texImage2D(this.target,0,this.internalFormat,w,h,0,this.format,this.type,null);
	return this;
};
iv.texture.prototype.tp=function(p,v){this.gl.texParameteri(this.target,p,v);}
iv.texture.prototype.setFilter=function(min,mag){
	if(!mag)mag=min;
	this.tp(this.gl.TEXTURE_MAG_FILTER,mag);
	this.tp(this.gl.TEXTURE_MIN_FILTER,min);
	return this;
}
iv.texture.prototype.mipMap=function() {
	var pot=iv.isPOW2(this.width)&&iv.isPOW2(this.height),gl=this.gl,l=gl.LINEAR,min=pot?gl.LINEAR_MIPMAP_NEAREST:l;
	if(pot)gl.generateMipmap(this.target);
	this.setFilter(min,l);
	return this;
}
iv.texture.prototype.linear=function() { return this.setFilter(this.gl.LINEAR);};
iv.texture.prototype.nearest=function() { return this.setFilter(this.gl.NEAREST);};
iv.texture.prototype.wrap=function(s,t) {
	if(!t)t=s;
	this.tp(this.gl.TEXTURE_WRAP_S,s);
	this.tp(this.gl.TEXTURE_WRAP_T,t);
	return this;
}
iv.texture.prototype.clampToEdge=function() { this.wrap(this.gl.CLAMP_TO_EDGE); return this; };
iv.texture.prototype.repeat=function() { this.wrap(this.gl.REPEAT); return this; };//ivhittest.js
iv.boxTriTest=function (_min,_max,org,d,t,x)
{
	var _min_x=_min[x];
	org=org[x];
	d=d[x];
	if(d)
	{
		var t1=(_min_x-org)/d,t2=(_max[x]-org)/d;
		if(t1<t2)t.push(t1,t2);else t.push(t2,t1);
	}else { if((org<_min_x) || (org>_max[x]))return false;}
	return true;
};
iv.hitBBox=function (_min,_max,org,dir)
{
	var t=[],i;
	for(i=0;i<3;i++){if(!iv.boxTriTest(_min,_max,org,dir,t,i))return null;}
	if(!t.length)return null;
	var maxnear=t[0],minfar=t[1];
	for(i=2;i<t.length;i+=2)
	{
		var a=t[i];
		if(a>maxnear)maxnear=a;
		a=t[i+1];
		if(a<minfar)minfar=a;
	}
	if(maxnear>minfar)return null;
	return vec3.add(vec3.scale(dir,maxnear,[]),org);
}
iv.hcontext=function(wnd)
{
	iv.context.call(this,wnd);
	this.viewport=wnd.viewport;
	this.ray=null;
	this.nodes=[];
	this.itm=[];
}
iv.hcontext.prototype=new iv.context(null);
iv.hcontext.prototype.update=function(utm)
{
	iv.context.prototype.update.call(this,utm);
	this.nodes.length=[];
	this.ortho=this.window.view.ortho;
	this.d={wHit:[],lHit:[]};
}
iv.hcontext.prototype.action=function(n,a,b,c)
{
	if((n.state&iv.NS_NOHIT)||(c<=0.0))return 0;
	if(n.object)
		return n.hitTest(this,a,b);
	return true;
}
iv.getRayPoint=function(ray,i,p)
{
	if(i)i=3;
	if(!p)p=[];
	p[0]=ray[i];p[1]=ray[i+1];p[2]=ray[i+2];
	return p;
}
iv.hcontext.prototype.hitLine=function(A0,A1)
{
	var v = this.dir,u = vec3.subtract(A1,A0,[]),w = vec3.subtract(A0,this.org,[]);
	var	a = vec3.dot(u,u);
	var	b = vec3.dot(u,v);
	var	d = vec3.dot(u,w);
	var	e = vec3.dot(v,w);
	var	D = a - b*b;
	if (D < 1e-20)
		return false;
	var sc = (b*e - d) / D;
	if(sc<-0.001)return false;
	if(sc>1.001)return false;
	var tc = (a*e - b*d) / D;
	if(tc<0)return false;
	if(tc>this.d.lLength)return false;
	var p1=vec3.scale(u,sc,[]),l;
	vec3.add(p1,A0);
	if(this.ortho)
	{
		var p2=vec3.scale(v,tc,[]);
		vec3.add(p2,this.org);
		var l=vec3.distance(p1,p2);
		if(l>this.d.lineDelta)return false;
	}else{
		vec3.subtract(p1,this.org,u);
		vec3.normalize(u);
		l=vec3.dot(u,v);
		if(l<this.d.lineDelta)return false;
	}
	return this.setResult(p1,tc);
}
iv.hcontext.prototype.hitTriangle=function(loc,side1,side2,cull)
{
	var vd,t,u,v,org=this.org,dir=this.dir;
	var s1_0=side1[0]-loc[0],s1_1=side1[1]-loc[1],s1_2=side1[2]-loc[2];
	var s2_0=side2[0]-loc[0],s2_1=side2[1]-loc[1],s2_2=side2[2]-loc[2];
	var dirX=dir[0],dirY=dir[1],dirZ=dir[2];
	var orgX=org[0],orgY=org[1],orgZ=org[2];
	var nX=s1_1*s2_2-s1_2*s2_1,nY=s1_2*s2_0-s1_0*s2_2,nZ=s1_0*s2_1-s1_1*s2_0;
	var d=Math.sqrt(nX*nX+nY*nY+nZ*nZ);
	if(!d)return false;
	nX/=d;nY/=d;nZ/=d;
	vd=nX*dirX+nY*dirY+nZ*dirZ;
	if(cull)
	{
		if(vd==0.0)return false;
	}else{
		if(vd>=0.0)return false;
	}
	t=((loc[0]-orgX)*nX+(loc[1]-orgY)*nY+(loc[2]-orgZ)*nZ)/vd;
	if(t<1e-6)return false;
	var s11=s1_0*s1_0+s1_1*s1_1+s1_2*s1_2;
	var s12= s1_0*s2_0+s1_1*s2_1+s1_2*s2_2;
	var s22=s2_0*s2_0+s2_1*s2_1+s2_2*s2_2;
	d=s11*s22-s12*s12;
	if(d<=1e-34)
		return false;
	var kuX=(s1_0*s22-s2_0*s12)/d,kuY=(s1_1*s22-s2_1*s12)/d,kuZ=(s1_2*s22-s2_2*s12)/d;
	var u0=-(loc[0]*kuX+loc[1]*kuY+loc[2]*kuZ);
	var pX=dirX*t+orgX,pY=dirY*t+orgY,pZ=dirZ*t+orgZ;
	u=u0+ pX*kuX+pY*kuY+pZ*kuZ;
	if((u<=0.0)||(u>=1.0))return false;
	var kvX=(s2_0*s11-s1_0*s12)/d,kvY=(s2_1*s11-s1_1*s12)/d,kvZ=(s2_2*s11-s1_2*s12)/d;
	var v0=-(loc[0]*kvX+loc[1]*kvY+loc[2]*kvZ);
	v=v0+pX*kvX+pY*kvY+pZ*kvZ;
	if(!((v>0.0)&&(u+v<1.0)))
		return false;
	if(t<this.d.lLength)
		return this.setResult([pX,pY,pZ],t);
	return false;
}
iv.node.prototype.hitTest = function(ctx,tm,s)
{
	var obj=this.object;
	if(obj && obj.preHitTest(ctx,tm))
	{
		var item=obj.hitTest(ctx,tm,s,this);
		if(item){
			item.top=this.stage>=7?this.stage:0;
			item.node=this;
			ctx.nodes.push(item);
		}
	}
	return true;
}
iv.mesh.prototype.preHitTest=function(i,tm)
{
	if(this.boxMin && this.boxMax)
	{
		var itm=mat4.invert(i.itm,tm);
		if(itm){
		i.org=mat4.mulPoint(itm,iv.getRayPoint(i.ray,0,i.org)),i.dir=mat4.mulPoint(itm,iv.getRayPoint(i.ray,1,i.dir));
		vec3.subtractN(i.dir,i.org);
		if(this.meshMode==2)
		{
			var a=this.boxMin.slice(),b=this.boxMax.slice(),d=vec3.distance(a,b)/10;
			for(var j=0;j<3;j++){a[j]-=d;b[j]+=d;}
			return iv.hitBBox(a,b,i.org,i.dir);
		}else
			return iv.hitBBox(this.boxMin,this.boxMax,i.org,i.dir);
	}}
	return null;
}
iv.hcontext.prototype.setResult=function(p,l)
{
	var d=this.d;
	d.wHit=mat4.mulPoint(d.tm,p,d.wHit);
	if ( d.checkClip && this.space.isPointClipped(d.wHit))return false;
	if(d.lHit)	vec3.cpy(d.lHit,p);
	d.lLength=l;
	return true;
}
iv.mesh.prototype.hitTest=function(ctx,tm,state,node) {
	var f=this.faces,p=this.points,d=ctx.d;
	if(f&&p) {
		{
			d.tm=tm;
			d.checkClip=(node.state&iv.NS_NOCLIP)==0;
			var index=0,nt=f.length,i,v0=[0,0,0],v1=[0,0,0],v2=[0,0,0],ok=false,itri=0,vi,normal,line0,line1;
			d.lLength=1e34;
			if(this.meshMode==2) {
				nt/=2;
				for(i=0;i<nt;i++)
				{
					vi=f[index++]*3;
					v0[0]=p[vi]; v0[1]=p[vi+1]; v0[2]=p[vi+2];
					vi=f[index++]*3;
					v1[0]=p[vi]; v1[1]=p[vi+1]; v1[2]=p[vi+2];
					if(ctx.hitLine(v0,v1)){ok=true;itri=i;}
				}
			} else {
				nt/=3;
				var cull=state&iv.TS_DBL;
				for(i=0;i<nt;i++) {
					vi=f[index++]*3;
					v0[0]=p[vi]; v0[1]=p[vi+1];v0[2]=p[vi+2];
					vi=f[index++]*3;
					v1[0]=p[vi]; v1[1]=p[vi+1];v1[2]=p[vi+2];
					vi=f[index++]*3;
					v2[0]=p[vi]; v2[1]=p[vi+1];v2[2]=p[vi+2];
					if(ctx.hitTriangle(v0,v1,v2,cull))
					{ok=true;itri=i;
						if(!normal){normal=[],line0=[],line1=[];}
						vec3.subtractN(v0,v1,line0);
						vec3.subtractN(v1,v2,line1);
						vec3.crossN(line0,line1,normal);
					}
				}
			}
			if(ok){
					var wHit=mat4.mulPoint(tm,d.lHit,[]);
					var l=vec3.distance(wHit,ctx.ray);
					var item={length:l,pnt:wHit,lpnt:d.lHit.slice(),triangle:itri};
					if(normal){
						item.normal=mat4.mulVector(tm,normal);
						vec3.normalize(item.normal);
					}
					return item;
			}
		}
	}
	return null;
}
iv.window.prototype.hitTest=function(x,y,flags){
	if(x.x!==undefined)
	{
	if(!x.hitInfo)x.hitInfo=this.hitTest(x.x,x.y,flags);
	return x.hitInfo;
	}
	var root=this.getRoot();
	if(root){
		if(!flags)flags=iv.HIT_ALL|iv.HIT_FULL;
		else
		if(!(flags&iv.HIT_ALL))flags|=iv.HIT_ALL;
		var r=this.getRay(x,y),h=this.hcontext,selPrev,i;
		if(!h){h=this.hcontext=new iv.hcontext(this);}else selPrev=h.node;
		if(selPrev && (!(selPrev.state&4))||(Math.abs(h.x-x)>1)||(Math.abs(h.y-y)>1))selPrev=null;
		h.update();
		h.x=x;h.y=y;
		var r1=this.getRay(x+4,y+4);
		if(h.ortho)	h.d.lineDelta=vec3.distance(r,r1);
		else{
			var a=[r[3]-r[0],r[4]-r[1],r1[5]-r1[2]],b=[r1[3]-r1[0],r1[4]-r1[1],r1[5]-r1[2]];
			vec3.normalize(a);vec3.normalize(b);
			h.d.lineDelta=vec3.dot(a,b);
		}
		h.ray=r;
		if(!(flags&iv.HIT_ROOT)){
		if((flags&iv.HIT_GIZMO))
			root=this.space.gizmos;
		else root=null;}
		if(root)root.traverse(h,mat4.identity([]),0,1.0);
		if(h.nodes.length){
			h.nodes.sort(function(a,b) {
				if(a.top>b.top) return -1;
				else
				if(a.top<b.top) return 1;
				return (a.length<b.length)?-1:1;
			});
			for(i=0;i<h.nodes.length;i++) {
				var hi=h.nodes[i],n=hi.node0=hi.node;
				while (n && n.state & 0x80)hi.node = n = n.parent;
				while(n)
				{
					if(n.state&iv.NS_CLOSED)hi.node=n;
					n=n.parent;
				}
			}
			var index=0,hi;
			if(selPrev && h.nodes.length>1)
			{
				for(i=0;i<h.nodes.length;i++)
				{
					 hi=h.nodes[i];
					if(hi.node===selPrev)index=i+1;
				}
				index=index%h.nodes.length;
			}
			hi=h.nodes[index];
			h.node=hi.node;h.pnt=hi.pnt;h.length=hi.length;h.normal=hi.normal;
			return h;
		}
	}
	return null;
}
iv.node.prototype.select = function(n,s,k)
{
	var b=false,c=this.firstChild;
	if(n==this)
		b|=this.setState(s?4:0,4);
	else
	if(!k)b|=this.setState(0,4);
	while(c)
	{
		b|=c.select(n,s,k);c=c.next;
	}
	return b;
}
iv.node.prototype.getSelection = function(a)
{
	if(this.state&4){if(!a)a=[];a.push(this);}
	var c=this.firstChild;
	while(c)
	{
		a=c.getSelection(a);c=c.next;
	}
	return a;
}
iv.space.prototype.getSelection = function()
{
	if(this.root)return this.root.getSelection();
	return null;
}
iv.space.prototype.select = function(n,s,k,y)
{
	var r=this.root,old=r.getSelection(null);
	if(r.select(n,s,k))this.invalidate();
	this.postSelection(n,old,y);
	return false;
}
iv.space.prototype.updateXRay=function(n)
{
	if(this.clrSelection[5]<1.0)
		this.anySelection=(n&&(n.state&4))||this.window.cfgXRayAlways||this.isAnySelected();
	else this.anySelection=false;
}
iv.space.prototype.postSelection=function(n,old,y)
{
	var i={old:old,current:this.root?this.root.getSelection(null):null,node:n},w=this.window;
	if(n)this.selNode=n;
	else this.selNode=null;
	if((y===undefined)||y)w.notify("selection",i);
	if(w.updateTransformGizmo)w.updateTransformGizmo(i.current,i.node);
	this.updateXRay(n);
}
iv.space.prototype._enumObjects=function(i,n)
{
	i.push(n);
	if(n.state&8)return;
	n=n.firstChild;
	while(n){this._enumObjects(i,n);n=n.next;}
}
iv.space.prototype.selectRange=function(a,b)
{
	var ok=false;
	if(a && b && a!=b)
	{
		var items=[];
		this._enumObjects(items,this.root);
		var i0=iv.indexOf(items,a),i1=iv.indexOf(items,b);
		if((i0>=0)&&(i1>=0))
		{
			ok=true;
			var sign=(i0<i1)?1:-1;
			while(true){
				var n=items[i0];
				if(i0==i1){this.select(n,true,true);break;}
				else n.state|=4;
				i0+=sign;
			}
		}
	}
	if(ok)this.invalidate();
	return ok;
}
iv.node.prototype.isAnySelected=function()
{
	if(this.state&4)return true;
	var c=this.firstChild;
	while(c)
	{
		if(c.isAnySelected())return true;
		c=c.next;
	}
	return false;
}
iv.space.prototype.isAnySelected=function()
{
	if(this.root)
		return this.root.isAnySelected();
	return false;
}
iv.space.prototype.isPointClipped=function(p)
{
	if(this.clips && this.clips.length)
	{
		var _c=0;
		for(var i=0;i<this.clips.length;i++)
		{
			var c=this.clips[i].w,a=vec3.dot(c,p)+c[3];
			if(a<0)_c++
		}
		if(!this.cfgClipMode)
			return _c==this.clips.length;
		else return _c>0;
	}
	return false;
}
//ivhandler.js
iv.undo={};
iv.undo.manager=function (wnd)
{
	this.window=wnd;
	this.max_items = 256;
	this.min_items = 10;
	this.action_count = 0;
	this.level = 0;
	this.group = null;
	this.active = 0;
	this.inProgress=false;
	this.items=[];
}
iv.undo.group=function()
{
	this.items=[];
	this.undoReady=false;
	this.name="";
};
iv.undo.group.prototype.Insert=function (item)
{
	if(!item)return;
	this.items.push(item);
}
iv.undo.group.prototype.Do=function (bUndo)
{
	if(this.items)
	{
		var stage=0;
		var _bR= bUndo && (! this.undoReady );
		var stage_next=0,ifrom,istep,ito,i;
		if(bUndo)
		{
			ifrom=this.items.length-1;istep=-1;ito=-1;
		}else
		{
			ifrom=0;istep=1;ito=this.items.length;
		}
		while(stage_next!=0xffff)
		{
		stage=stage_next;
		stage_next=0xffff;
		if(_bR)
		{
		for(i=ifrom;i!=ito;i+=istep)
		{
			var item=this.items[i];
			var _stage=item.ui_stage==undefined?0:item.ui_stage;
			if(_stage==stage && item.prepareForRedo)
				item.prepareForRedo();
		}
		}
		for(i=ifrom;i!=ito;i+=istep)
		{
			var item=this.items[i];
			var _stage=item.ui_stage==undefined?0:item.ui_stage;
			if(_stage==stage)
			{
				if(bUndo)item.undo();else item.redo();
			}else
			{
				if((_stage>stage)&&(_stage<stage_next))
					stage_next=_stage;
			}
		}
		}
		if(_bR)this.undoReady=true;
		return true;
	}
	return false;
}
iv.undo.manager.prototype.updateButtons=function(){};
iv.undo.manager.prototype.updateDocument=function()
{
	if(this.window)
		this.window.invalidate(iv.INV_STRUCTURE);
};
iv.undo.manager.prototype.canUndo=function()
{
	return ( ( this.active > -1 ) && (this.items.length>0) );
};
iv.undo.manager.prototype.canRedo=function()
{
	return ( ( this.active < ( this.items.length - 1 ) ) && (this.items.length>0));
};
iv.undo.manager.prototype.undo=function()
{
	if(this.inProgress)
		return false;
	this.inProgress++;
	var rez=false;
	if ( this.canUndo() )
	{
		var g = this.items[this.active];
		this.active--;
		rez=g.Do(true);
		this.updateButtons();
		this.updateDocument();
	}
	this.inProgress--;
	return rez;
};
iv.undo.manager.prototype.redo=function()
{
	if(this.inProgress)
		return false;
	this.inProgress++;
	var rez=false;
	if ( this.canRedo() )
	{
		var g = this.items[this.active+1];
		this.active++;
		rez= g.Do(false);
		this.updateButtons();
		this.updateDocument();
	}
	this.inProgress--;
	return rez;
};
iv.undo.manager.prototype.getLastUndo=function()
{
	if( (!this.canRedo()) &&  ( this.active > -1 ) && items.length )
		return items[active];
	return null;
};
iv.undo.manager.prototype.getLastUndoDescription =function()
{
	if ( this.canUndo() )
		return this.items[this.active].name;
	return null;
};
iv.undo.manager.prototype.getLastRedoDescription=function()
{
	if ( this.canRedo() )
		return this.items[this.active + 1].name;
	return null;
};
iv.undo.manager.prototype.isModifyed=function(){return this.action_count > 0;};
iv.undo.manager.prototype.open=function()
{
	if(this.inProgress)
		return false;
	if ( !this.level )
		this.group = null;
	this.level++;
	return true;
};
iv.undo.manager.prototype.isOpen=function(){return (this.level)?true:false;};
iv.undo.manager.prototype.anyToAccept=function()
{
	if(this.level)
	{
		if ( this.group && this.group.items.length)
			return true;
	}
	return false;
};
iv.undo.manager.prototype.accept =function( name )
{
	if ( !this.level )
		return false;
	this.level--;
	if ( !this.level )
	{
		if ( this.group && this.group.items.length )
		{
			this.group.name = name;
			var tormove=this.items.length-this.active-1;
			if(tormove>=0)
			{
				this.items=this.items.slice(0,this.items.length-tormove);
				this.action_count-=tormove;
			}
			this.action_count++;
			this.active =this.items.push ( this.group )-1;
			this.group=0;
			this.updateButtons();
			return true;
		}
		else
			this.group=null;
	}
	return false;
};
iv.undo.manager.prototype.add =function( item )
{
	if(this.level)
	{
	if(!this.group)
		this.group=new iv.undo.group();
		this.group.Insert ( item );
		return true;
	};
	return false;
};
iv.undo.manager.prototype.discard=function()
{
	if ( !this.level ) return false;
	this.level--;
	if ( !this.level )
	{
		this.group = null;
		this.level = 0;
		return true;
	}
	return false;
};
iv.undo.manager.prototype.flush=function()
{
	this.items=[];
	this.active = 0;
	this.updateButtons();
	return true;
};
iv.undo.nodeTm=function(w,node)
{
        this.window=w;
	this.node=node;
	if(node.tm)
		this.uTM=mat4.create(node.tm);
	else this.uTM=null;
}
iv.undo.nodeTm.prototype.prepareForRedo=function()
{
	if(this.node.tm)
		this.rTM=mat4.create(this.node.tm);
	else this.rTM=null;
}
iv.undo.nodeTm.prototype.setNodeTm=function(tm)
{
	if(tm)
		this.node.tm=mat4.create(tm);
	else this.node.tm=null;
}
iv.undo.nodeTm.prototype.redo=function(){this.setNodeTm(this.rTM);}
iv.undo.nodeTm.prototype.undo=function(){this.setNodeTm(this.uTM);}
iv.undo.nodeState=function(wnd,node)
{
    this.node=node;
	this.udata=node.state;
	this.window=wnd;
    this.rdata=0;
}
iv.undo.nodeState.prototype.setData=function (d)
{
	if(this.node.state!=d)
	{
		this.node.setState(d,0xfffffff);
		this.window.invalidate(iv.INV_STRUCTURE);
	}
}
iv.undo.nodeState.prototype.prepareForRedo=function(){this.rdata=this.node.state;}
iv.undo.nodeState.prototype.redo=function(){this.setData(this.rdata);}
iv.undo.nodeState.prototype.undo=function(){this.setData(this.udata);}
iv.undo.vp=function(wnd)
{
	this.window=wnd;
	this.udata=this.getVpData();
}
iv.undo.vp.prototype.getVpData=function()
{
	return this.window.getView();
}
iv.undo.vp.prototype.setVpData=function (d)
{
    var w=this.window;
	w.setView(d);
    w.invalidate(iv.INV_VERSION);
}
iv.undo.vp.prototype.prepareForRedo=function()
{
	this.rdata=this.getVpData();
}
iv.undo.vp.prototype.redo=function(){this.setVpData(this.rdata);}
iv.undo.vp.prototype.undo=function(){this.setVpData(this.udata);}
iv.tmHandler=function(wnd,axis) {
	if(wnd) {
		this.window=wnd;
		if(!axis) axis=wnd.cfgEditorAxis;
		this.axis=axis;
		this.crd=wnd.cfgEditorCrd;
		this.tm=mat4.create();
	}
}
iv.tmHandler.prototype.onMouseDown=function(p,event) {
	if(p.b!=1) return 4;
	if(!(this.items&&this.hitPoint)) {
		var h=this.window.hitTest(p.x,p.y);
		if(!h)
			return 4;
		this.init(h.pnt);
		if(!this.items) return 4;
		for(var i=0;i<this.items.length;i++)
		{
			var item=this.items[i];
			if(item.n==h.node)
			{
				this.activeItem=item;
				break;
			}
		}
	}
	if(!this.activeItem && this.items)this.activeItem=this.items[0];
	return 0;
}
iv.tmHandler.prototype.onMouseUp =function(p,event){return 1|4;};
iv.tmHandler.prototype.addNode=function(n) {
	if(!this.items) this.items=[];
	else
	{
		for(var i=0;i<this.items.length;i++)
		{
			var item=this.items[i];
			if(item.n==n)return item;
		}
	}
	var item={ n: n,tm: n.getWTM() };
	if(!item.tm)item.tm=mat4.identity([]);
	this.items.push(item);
	if(item.tm) {
		item.tmi=mat4.invert([],item.tm);
	}
	item.ptm=n.parent?n.parent.getWTM():null;
	if(item.ptm) {
		item.ptmi=mat4.invert([],item.ptm);
	} else item.ptmi=null;
	return item;
}
iv.tmHandler.prototype._enum =function(n)
{
    if(n.state&4)
    {
        this.addNode(n);
        return n;
    }
    n=n.firstChild;
    while(n)
    {
    this._enum(n);
    n=n.next;
    }
}
iv.tmHandler.prototype.forEach =function(d,name)
{
	var _i=this.items,u=this.getUndo();
    for(var i=0;i<_i.length;i++)
    {
    var item=_i[i],tm=item.n.enableTM(true);
    if(u)u.add(new iv.undo.nodeTm(this.window,item.n));
    this.action(item,tm,d);
    }
    if(u)u.accept(name);
	return 2|16;
}
iv.tmHandler.prototype.init =function(hit)
{
    var s=this.window.space;
    if(s && s.root)this._enum(s.root);
    this.hitPoint=hit;
}
iv.tmHandler.prototype.updateGizmo=function()
{
	if(this.window.updateTransformGizmo && this.items)
	{
		var _i=[],active=null,w=this.window;
		for(var i=0;i<this.items.length;i++)
		{
			var item=this.items[i];
			_i.push(item.n);
			if(item==this.activeItem)active=item.n;
		}
		w._updateGizmoPosition(w.getActiveGizmo(),_i,active);
	}
}
iv.tmHandler.prototype.getUndo=function()
{
    var w=this.window,u=w.m_undo;
    if(!w.imp.mouseMoved && u && u.open())
        return u;
    return null;
}
iv.objMoveHandler=function(wnd,axis) {
	iv.tmHandler.call(this,wnd,axis);
	axis=this.axis;
	if(axis==7) axis=1;
        axis&=wnd.cfgEditorAllowedAxis;
	if(axis){
	this.lineMode=axis==1||axis==2||axis==4;
	if(this.lineMode)
		this.dragAxis=[(axis&1)!=0,(axis&2)!=0,(axis&4)!=0];
	else
		this.dragAxis=[(axis&1)==0,(axis&2)==0,(axis&4)==0];
	}else this.dragAxis=null;
}
iv.objMoveHandler.prototype=new iv.tmHandler(null,0);
iv.objMoveHandler.prototype.onMouseDown =function(p,event)
{
	var d=this.dragAxis;
	if(d){
	var r=iv.tmHandler.prototype.onMouseDown.call(this,p,event);
	if(!r)this.lastDragPoint=this.hitPoint.slice();
	switch(this.crd)
	{
		case "custom":mat4.mulVector(this.window.cfgCustomTm,d,d);break;
		case "local":if(this.activeItem)mat4.mulVector(this.activeItem.tm,d,d);break;
		case "parent":if(this.activeItem && this.activeItem.ptm)mat4.mulVector(this.activeItem.ptm,d,d);break;
	}}
	return r;
};
iv.objMoveHandler.prototype.action=function(item,tm,d) {
	var _d=d;
	if(item.ptmi)
			_d=mat4.mulVector(item.ptmi,d,[]);
	mat4.offset(tm,_d);
}
iv.objMoveHandler.prototype.onMouseMove=function(p,event) {
	var w=this.window,ray=w.getRay(p.x,p.y),i,d=this.dragAxis;
	if(d){
	var max=1e3;
	if(w.space.unitMatrix) max/=w.space.unitMatrix[0];
	if(this.lineMode)
		i=iv.lineToLineDistance(this.hitPoint,d,ray,max);
	else
		i=iv.lineToPlaneIntersection(this.hitPoint,d,ray);
	if(i) {
		var delta=vec3.subtract(i,this.lastDragPoint,[]);
		this.lastDragPoint=i;
		var result=this.forEach(delta,"Move Object");
		this.updateGizmo();
		return result;
	}}
	return 0;
};
iv.lineToLineDistance=function(l1_0,u,l2,max)
{
	var SMALL_NUM=1e-20;
	var   v = [l2[3]-l2[0],l2[4]-l2[1],l2[5]-l2[2]];
	var	w = vec3.subtract(l1_0,l2,[]);
	var	a = vec3.dot(u,u);
	var	b = vec3.dot(u,v);
	var	c = vec3.dot(v,v);
	var	d = vec3.dot(u,w);
	var	e = vec3.dot(v,w);
	var	D = a*c - b*b;
	var	sc, tc;
	if (D < SMALL_NUM)
		return false;
	else {
		sc = (b*e - c*d) / D;
		tc = (a*e - b*d) / D;
	}
	var p1=vec3.scale(u,sc,[]),p2=vec3.scale(v,tc,[]);
    vec3.subtract(p1,p2,p2);
	vec3.add(p2,w);
	var dst=vec3.length(p2);
	if(dst>max)return null;
    return vec3.add(p1,l1_0);
}
iv.lineToPlaneIntersection=function (Pv,Pn,ray)
{
	var  u = [ray[3]-ray[0],ray[4]-ray[1],ray[5]-ray[2]];
	var	w = vec3.subtract(ray,Pv,[]);
	var D = vec3.dot(Pn, u);
	var N = -vec3.dot(Pn, w);
	if (Math.abs(D) < 1e-10){
		if (N == 0)
			return null;
		else
			return null;
	}
	var sI = N / D;
	if (sI < 0 )
		return 0;
	vec3.scale(u,sI);
	vec3.add(u,ray);
	return u;
}
iv.objRotateHandler=function (wnd,axis)
{
	iv.tmHandler.call(this,wnd,axis);
	axis=this.axis;
    if(axis==7)axis=1;
	axis&=wnd.cfgEditorAllowedAxis;
	this.rAxis=axis?[(axis&1)?1:0,(axis&2)?1:0,(axis&4)?1:0]:null;
}
iv.objRotateHandler.prototype=new iv.tmHandler();
iv.objRotateHandler.prototype.onMouseDown =function(p,event)
{
	if(!this.rAxis)return 0;
	this.lastX=p.x;
	this.lastY=p.y;
	return iv.tmHandler.prototype.onMouseDown.call(this,p,event);
}
iv.objRotateHandler.prototype.action =function(item,tm,d)
{
    var  r=this.rAxis,x=tm[12],y=tm[13],z=tm[14],t=this.tm;
if(r){
	tm[12]=0;tm[13]=0;tm[14]=0;
	mat4.identity(t);
	mat4.rotate(t,d/100,r);
	mat4.m(t,tm,tm);
	tm[12]+=x;tm[13]+=y;tm[14]+=z;
}
}
iv.objRotateHandler.prototype.onMouseMove =function(p,event)
{
	var d=(p.x-this.lastX);
	if(!d)return 0;
	this.lastX=p.x;
    	var rez= this.forEach(d,"Rotate Object");
	this.updateGizmo();
	return rez;
}
iv.objScaleHandler=function(wnd,axis)
{
	iv.tmHandler.call(this,wnd,axis);
    if(!this.axis) this.axis=7;
	this.axis&=wnd.cfgEditorAllowedAxis;
}
iv.objScaleHandler.prototype=new iv.tmHandler(null,0);
iv.objScaleHandler.prototype.onMouseDown =function(p,event)
{
	if(!this.axis)return 0;
	var r=iv.tmHandler.prototype.onMouseDown.call(this,p,event);
	this.lastX=p.x;
	this.lastY=p.y;
	return r;
}
iv.objScaleHandler.prototype.action =function(item,tm,d)
{
	var t=this.tm,a=this.axis;
	mat4.identity(t);
	t[0]=a&1?d:1.0;t[5]=a&2?d:1.0;t[10]=a&4?d:1.0;
	mat4.m(t,tm,tm);
}
iv.objScaleHandler.prototype.onMouseMove=function(p,event) {
	if(!this.axis)return 0;
	var dx=(p.x-this.lastX),dy=(p.y-this.lastY),_tm=this.tm;
	if(dx==0&&dy==0) return 0;
	var d=Math.sqrt(dx*dx+dy*dy);
	if(dx<0) d=d*-1;
	d=1.0+d/100;
	this.lastX=p.x;
	this.lastY=p.y;
	return this.forEach(d,"Scale Object");
};
iv.window.prototype.setEditMode=function(id)
{
	this.cfgEditorMode=id;
	if(this.handler)this.setHandler(null);
	if(this.space&&this.updateTransformGizmo2)this.updateTransformGizmo2();
}
//ivprogress.js
iv.progressIndicator=function(view,p) {
	var v=this;
	v.view=view;
	v.enabled=-1;
	v.animation=!!p.animation;
	v.color='#'+(p.color||0).toString(16);
	v.timeOffset=0;
	var c=v.canvas=document.createElement("canvas");
	var s=v.size=p.size||100;
	c.width=c.height=s;
	c.style="width:"+s+"px;height:"+s+"px;position:absolute;";
	var ctx=v.context=c.getContext('2d');
	if(ctx){
		view.imp.xdiv.parentElement.appendChild(c);
		ctx.textAlign='center';
		ctx.textBaseline='middle';
		v.updatePos();
		v.update(0.0);
		view.addRefTarget(function(a) {
			switch(a.code) {
				case "viewsize": v.updatePos(); break;
				case "loadError":
				case "merged":
				case "dataReady": v.enable(false); break;
				case "progress": v.update(a.loaded/a.total); v.enable(true); break;
			}
		});
	}
};
iv.progressIndicator.prototype.updatePos=function() {
	var s=this.canvas.style,v=this.view.viewport;
	s.left=''+Math.floor((v.x-this.size)/2)+'px';
	s.top=''+Math.floor((v.y-this.size)/2)+'px';
};
iv.progressIndicator.prototype.enable=function(e) {
	if(this.enabled!==e) {
		this.enabled=e;
		this.canvas.style.display=e? "":"none";
		if(this.animation) {
			if(e) {
				var v=this;
				if(!this.timer) this.timer=setInterval(function() {
					v.timeOffset=(v.timeOffset+17)%360;
					v.update(v.value);
				},50);
			} else {
				if(this.timer){clearInterval(this.timer);this.timer=0;}
			}
		}
	}
}
iv.progressIndicator.prototype.update=function(value){
	this.value=value;
	var ctx=this.context,x=this.size;
	ctx.clearRect(0,0,x,x);
	x/=2;
	var r=x-4,lw=r/6,offset=Math.PI*(this.timeOffset-90)/180;
	ctx.lineWidth=lw;
	ctx.fillStyle=ctx.strokeStyle=this.color;
	ctx.beginPath();
	ctx.arc(x,x,r,offset,offset+Math.PI*2*value);
	ctx.stroke();
	ctx.font=""+Math.ceil(r/2)+"px Segoe UI,Tahoma, Arial, Helvetica";
	ctx.fillText(""+Math.floor(100*value)+"%",x,x);
}
//ivclipplane.js
iv.clip={
	calcClipFromTM: function(tm,c) {
		var n=[0,0,1];
		mat4.mulVector(tm,n);
		vec3.normalize(n);
		vec3.cpy(c,n);
		iv.clip._updateClipPlaneD(c,tm);
	},
_updateClipPlaneD: function(c,tm)
{
	var dir=[tm[12],tm[13],tm[14]];
	var len=vec3.length(dir);
	vec3.normalize(dir);
	var cos=vec3.dot(dir,c);
	c[3]=-cos*len;
},
calcIntersectionX: function(clip,segs,mode) {
	var l0=iv.clip.calcFlag(clip.w,segs[0]);
	var l1=iv.clip.calcFlag(clip.w,segs[1]);
	if(!mode) { l0=-l0; l1=-l1; }
	if((l0<0)&&(l1<0))
		return null;
	if((l0>0)&&(l1>0)) return segs;
	var p0,p1;
	if(l1<0) {
		var a=l1; l1=l0; l0=a;
		p0=segs[1]; p1=segs[0];
	} else { p0=segs[0]; p1=segs[1]; }
	var d=l1-l0;
	if(d<=0)
		return null;
	var K=-l0/d;
	for(var k=0;k<3;k++)
		p0[k]=p1[k]+(p0[k]-p1[k])*(1-K);
	if(vec3.compare(p0,p1,1e-6)) return null;
	return segs;
},
calcFlag:function(clip,p){return (p[0]*clip[0]+p[1]*clip[1]+p[2]*clip[2]+clip[3]);},
calcFace: function(mesh,p,l,i)
{
	var segs=null;
	for(var j=0;j<3;j++) {
		var i0=j,i1=(j+1)%3;
		i0=mesh.faces[i+i0];
		i1=mesh.faces[i+i1];
		var l0=l[i0],l1=l[i1];
		if(l0<0!=l1<0)
			segs=iv.clip.calcIntersection(p,i0*3,i1*3,l0,l1,segs);
	}
	return segs;
},
calcIntersection: function(p,i0,i1,l0,l1,segs)
{
	if(l1<0) {
		var a=l1; l1=l0; l0=a;
		a=i1; i1=i0; i0=a;
	}
	var d=l1-l0;
	if(d<=0) return;
	var K=-l0/d;
	var pnt=[];
	for(var k=0;k<3;k++) {
		pnt[k]=p[i0+k]+(p[i1+k]-p[i0+k])*K;
	}
	if(!segs) segs=[];
	segs.push(pnt);
	return segs;
},
isClip:function(n)
{
while(n)
{
 if(n.object && n.object instanceof iv.clipObject)return true;
 n=n.parent;
}
}
};
iv.clipObject=function(gl,d) {
	iv.mesh.call(this,gl);
	this.size=1;
	if(d) this.load(d);
}
iv.clipObject.prototype=new iv.mesh();
iv.clipObject.prototype.load=function(d)
{
	for(var v in d)
	{
		var a=d[v];
		switch(v)
		{
			default:this[v]=a;
		}
	}
}
iv.clipObject.prototype.preRender=function(ctx,node,tm,state,opacity)
{
	ctx.addClip(node,this);
	return iv.mesh.prototype.preRender.call(this,ctx,node,tm,state,opacity);
}
iv.space.prototype.clipUpdateMeshes=function(clip) {
	var c=clip.clip,mask=~(iv.NS_RCVSHADOWS|iv.NS_CASTSHADOWS),w=this.window;
	if(c.appearance) {
		var axis=c.axis,lines=!!(c.appearance&1),faces=c.appearance>1,a=c.size/2.0,v,n,z=1e-4/this.unitMatrix[0];
		switch(axis) {
			case 0:
			case 3: v=[z,-a,a,z,a,a,z,a,-a,z,-a,-a];
				n=[1,0,0,1,0,0,1,0,0,1,0,0]; break;
			case 1:
			case 4: v=[-a,z,a,a,z,a,a,z,-a,-a,z,-a];
				n=[0,1,0,0,1,0,0,1,0,0,1,0];
				break;
			default: v=[-a,a,z,a,a,z,a,-a,z,-a,-a,z];
				n=[0,0,1,0,0,1,0,0,1,0,0,1];
		}
		clip.node.state|=iv.NS_NOZWRITE|iv.NS_NOCLIP;
		clip.node.rmode="solid";
		clip.node.state&=mask;
		clip.node.cull=1;
		if(lines) {
			var m2=c;
			m2.setPoints(v,false);
			m2.meshMode=2;
			m2.calcBBox(v);
			m2.setFaces([0,1,1,2,2,3,3,0]);
			clip.node.material=this.getSolidMaterial(w.cfgClipBorderColor);
		}
		if(faces) {
			var m=new iv.mesh(this.gl);
			m.setPoints(v,true);
			m.setNormals(n,false);
			m.boxMin=m2.boxMin;
			m.boxMax=m2.boxMax;
			m.setFaces([0,2,1,0,3,2],true);
			var node2=clip.node.newNode();
			node2.rmode="solid";
			node2.material=this.getSolidMaterial(w.cfgClipPlaneColor);
			node2.setObject(m);
			node2.state|=iv.NS_NOZWRITE|iv.NS_NOTREE|iv.NS_NOCLIP;
			node2.state&=mask;
		}
	}
	clip.node.valid=true;
	return true;
};
iv.rcontext.prototype.addClip=function(node,a) {
	var s=this.space,_i=s.clips,c;
	if(!_i) _i=s.clips=[];
	for(var i=0;i<_i.length;i++) {
		c=_i[i];
		if(c.node===node) break;
		c=null;
	}
	if(!c) {
		if(_i.length>5) return;
		c={ w: [],u: [],clip: a,node: node,structVersion: -1 };
		_i.push(c);
	}
	c.tm=node.getWTM();
	if(!c.tm)c.tm=mat4.identity([]);
	c.used=true;
}
iv.space.prototype.clipCheckPlanes=function(ctx,astate) {
	var _i=this.clips;
	var update=false,inv=false;
	if(_i&&_i.length) {
		var i=0,w=this.window;
		while(i<_i.length) {
			var clip=_i[i];
			if(!clip.used) {
				var node=_i[i].node;
				if(node.section) {
					node.section.parent.remove(node.section);
					node.section=null;
					update=true;
				}
				_i.splice(i,1);
			} else {
				if(!clip.node.valid) inv|=this.clipUpdateMeshes(clip);
				if(clip.structVersion!=w.structVersion) {
					update=true;
					clip.structVersion=w.structVersion;
				}
				i++;
			}
		}
		if(update)
			this.clipUpdateSection();
		if(inv) w.postRepaint=true;
		if(this.clipRoot){
			this.clipRoot.state|=3;
			this.clipRoot.traverse(ctx,this.unitMatrix,astate,1.0);
			this.clipRoot.state&=~3;
		}
		for(i=0;i<_i.length;i++) _i[i].used=false;
	} else {
		if(this.clipRoot)
			this.clipRoot.removeAll();
	}
}
iv.space.prototype.updateClipUniformData=function(clip) {
	if(!clip.u) clip.u=[0,0,0,0];
	var u=clip.u,w=clip.w;
	u[0]=w[0]; u[1]=w[1]; u[2]=w[2];
	var d=w[3],p0=[],dir=[];
	var p=vec3.normalize(w,[]);
	vec3.scale(p,-d,dir);
	mat4.mulPoint(this.unitMatrix,dir,dir);
	var len=vec3.length(dir);
	vec3.normalize(dir);
	var cos=vec3.dot(dir,p);
	u[3]=-cos*len;
	if(!clip.ue)clip.ue=u.slice();
	else vec3.cpy(clip.ue,u);
	clip.ue[3]=u+1000;
};
iv.space.prototype.clipUpdateSection=function() {
	var clips=this.clips,w=this.window,anyComplex=false,anyCap=false;
	for(var i=0;i<clips.length;i++) {
		var clip=clips[i];
		anyCap|=clip.clip.cap;
		anyComplex|=(clip.clip.cap||clip.clip.outline);
		var axis=clip.clip.axis;
		if(axis!=2) {
			var tm=mat4.create(),pi=Math.PI;
			switch(axis) {
				case 0: mat4.setRotateY(tm,pi/2.0); break;
				case 1: mat4.setRotateX(tm,pi/2.0); break;
				case 3: mat4.setRotateY(tm,-pi/2.0); break;
				case 4: mat4.setRotateX(tm,-pi/2.0); break;
				case 5: mat4.setRotateY(tm,pi); break;
			}
			mat4.m(tm,clip.tm,clip.tm);
		}
		if(!clip.itm) clip.itm=mat4.create();
		mat4.invert(clip.itm,clip.tm);
		iv.clip.calcClipFromTM(clip.tm,clip.w);
		this.updateClipUniformData(clip);
		clip.contours=clip.contour=null;
	}
	{
		var clrS=w.cfgClipCapsColor,data=(anyComplex)?new iv.clipcontext(w,w.cfgClipCapsByObj):null;
		if(data)
			this.root.traverse(data,mat4.identity(mat4.create()),0,1.0);
			if(anyComplex) {
			if(!this.clipSolidMtl && clrS) {
					var mtlInfo={ "name": "clipX","emissive": { "color": clrS } };
					this.clipSolidMtl=this.newMaterial(mtlInfo);
				}
				if(!this.clipRoot) {
					this.clipRoot=this.root.newNode();
					this.clipRoot.state|=iv.NS_SYSTEM;
				}
			}
			for(var i=0;i<clips.length;i++) {
				var clip=clips[i],node=clip.node;
				if(!node.section) {
					if(anyComplex) node.section=this.clipRoot.newNode();
				}
				else node.section.removeAll();
				if(anyComplex) {
					if(data.separate) {
						if(clip.contours) {
							for(var iC=0;iC<clip.contours.length;iC++)
								this.clipUpdateSectionForObject(node.section,clip.contours[iC],clip);
						}
					} else
						if(clip.contour) {
							this.clipUpdateSectionForObject(node.section,{contour:clip.contour},clip);
						}
				}
				clip.contours=clip.contour=null;
			}
		}
	}
iv.space.prototype.clipUpdateSectionForObject=function(parent,_contour,clip) {
	var mtl=_contour.mtl,contour=_contour.contour;
	if(clip.clip.outline) {
		var cfgClipLineColor=this.window.cfgClipLineColor,_tm=[];
		mat4.m(clip.tm,this.unitMatrix,_tm);
		if(cfgClipLineColor) {
			var mesh=new iv.mesh(this.gl);
			mesh.meshMode=2;
			var c=contour.length, p=new Float32Array(c*3),j=0;
			for(var i=0;i<c;i++) {
				var a=contour[i]
				p[j]=a[0];
				p[j+1]=a[1];
				p[j+2]=0;
				j+=3;
			}
			mesh.setPoints(p);
			mesh.calcBBox(p);
			var c=contour.length;
			p=new Uint16Array(c);
			for(var i=0;i<c;i++) p[i]=i;
			mesh.setFaces(p);
			var node=parent.newNode();
			node.state&=~0x300;
			node.state|=iv.NS_NOCLIP;
			if(!this.clipXMtl) this.clipXMtl=this.newMaterial({ "name": "clipX","emissive": { "color": cfgClipLineColor } });
			node.material=this.clipXMtl;
			node.setObject(mesh);
			node.tm=clip.tm;
		}
	}
	if(_contour.xcontour) contour=_contour.xcontour;
	if(iv.triscan&&clip.clip.cap && _contour.cap) {
		var cdata={ contour: contour,itm: clip.itm,index: 0 },tri=new iv.triscan();
		tri.setData(cdata);
		tri.process();
		if(tri.triangles&&tri.triangles.length) {
			var node=parent.newNode(),mesh=new iv.mesh(this.gl);
			node.material=this.window.cfgClipCapsColor?this.clipSolidMtl:mtl;
			node.state&=~(iv.NS_NOCLIP|iv.NS_RCVSHADOWS|iv.NS_CASTSHADOWS);
			node.state|=iv.NS_NOHIT|iv.NS_NOTREE;
			node.tm=clip.tm;
			mesh.excludeClip=clip;
			node.setObject(mesh);
			var _v=tri.vertices,_t=tri.triangles,v=new Float32Array(_v.length*3),j=0,vi,z=0;
			for(vi=0;vi<_v.length;vi++) {
				V=_v[vi];
				v[j]=V[0];j++;
				v[j]=V[1];j++;
				v[j]=z;j++;
			}
			mesh.setPoints(v,false);
			if(mtl) {
				j=0;
				for(vi=0;vi<_v.length;vi++) {
					v[j]=0;
					v[j+1]=0;
					v[j+2]=1;j+=3;
				}
				mesh.setNormals(v,false);
			}
			v=new Uint16Array(_t.length*3);
			j=0;
			for(vi=0;vi<_t.length;vi++) {
				var T=_t[vi];
				v[j]=T[2];j++;
				v[j]=T[1];j++;
				v[j]=T[0];j++;
			}
			mesh.setFaces(v,false);
			var b=tri.bounds;
			mesh.boxMin=[b.left,b.top,0];
			mesh.boxMax=[b.right,b.bottom,0];
		}
	}
	return null;
}
iv.window.prototype._setClipMode=function(mode) {
	var s=this.space,f=0;
	if(mode!==undefined) {
		if(this.cfgClipMode!=mode) {
			this.cfgClipMode=mode;
			if(s&&s.clips&&s.clips.length>1)
				f=iv.INV_MTLS|iv.INV_STRUCTURE;
	}
	}
	return f;
}
iv.window.prototype.setClipMode=function(mode) {
	this.invalidate(this._setClipMode(mode));
}
iv.clipcontext=function(wnd,sep) {
	iv.context.call(this,wnd);
	this.iwtm=2;
	var s=this.space;
	this.clips=s.clips;
	this.cfgClipMode=wnd.cfgClipMode;
	this.separate=sep;
}
iv.clipcontext.prototype=new iv.context(null);
iv.clipcontext.prototype.action=function(node,tm,state,opacity) {
	var mesh=node.object;
	if(mesh&&mesh.points&&!(node.state&iv.NS_NOCLIP)&& (mesh.meshMode==3)) {
		var p=null;
		var c=mesh.points.length;
		var src=[];
		if(tm) {
			var a=mesh.points;
			p=new Float32Array(c);
			for(var i=0;i<c;i+=3) {
				src[0]=a[i]; src[1]=a[i+1]; src[2]=a[i+2];
				mat4.mulPoint(tm,src);
				p[i]=src[0];
				p[i+1]=src[1];
				p[i+2]=src[2];
			}
		}
		else p=mesh.points;
		var clips=this.clips,numClips=clips.length;
		var lengths=[],_flags=0;
		for(var iClip=0;iClip<numClips;iClip++) {
			var l=new Float32Array(c/3);
			var clip=clips[iClip].w,j=0;
			for(var i=0;i<c;i+=3) {
				var _l=p[i]*clip[0]+p[i+1]*clip[1]+p[i+2]*clip[2]+clip[3];
				l[j]=_l;
				var f=(_l<0)?1:2;
				_flags|=f;
				j++;
			}
			lengths.push(l);
		}
		if(_flags==3) {
			c=mesh.faces.length;
			var p0=[0,0,0];
			for(var i=0;i<c;i+=3) {
				for(var iClip=0;iClip<numClips;iClip++) {
					var segs=iv.clip.calcFace(mesh,p,lengths[iClip],i);
					if(segs&&(segs.length==2)&&(!vec3.compare(segs[0],segs[1],1e-6))) {
						var clip=clips[iClip];
						if(numClips>1) {
							if(!clip.xcontour) clip.xcontour=[];
							mat4.mulPoint(clip.itm,segs[0],p0);
							clip.xcontour.push([p0[0],p0[1]]);
							mat4.mulPoint(clip.itm,segs[1],p0);
							clip.xcontour.push([p0[0],p0[1]]);
							for(var j=1;j<numClips;j++) {
								var _iClip=(iClip+j)%numClips;
								segs=iv.clip.calcIntersectionX(clips[_iClip],segs,this.cfgClipMode);
								if(!segs) break;
							}
						}
						if(segs) {
							if(!clip.contour) clip.contour=[];
							mat4.mulPoint(clip.itm,segs[0],p0);
							clip.contour.push([p0[0],p0[1]]);
							mat4.mulPoint(clip.itm,segs[1],p0);
							clip.contour.push([p0[0],p0[1]]);
						}
					}
				}
			}
			if(this.separate) {
				for(var iClip=0;iClip<numClips;iClip++) {
					var clip=clips[iClip];
					if(clip.contour) {
						var part=null;
						if(node.state&iv.NS_NOTREE && node.parent)part=node.parent;
						var info=null;
						var _cnts=clip.contours;
						if(!_cnts) _cnts=clip.contours=[];
						else{
							info=_cnts[_cnts.length-1];
							if(!(part && (info.part===part)))info=null;
						}
						if(info)
						{
							var _c=info.contour;
							_c.push.apply(_c,clip.contour);
							if(clip.xcontour){
								if(info.xcontour)
									info.xcontour.push.apply(info.xcontour,clip.xcontour);
									else info.xcontour=clip.xcontour;
							}
						}else{
							info={ mtl: node.material,contour: clip.contour ,part:part,cap:!(node.closed===false)};
							if(clip.xcontour) info.xcontour=clip.xcontour;
						clip.contours.push(info);
						}
						clip.contour=null;
					}
					clip.xcontour=null;
				}
			}
		}
	}
	return true;
}
//ivtriscan.js
var iv=iv||{};
iv.triscan=function() {
	this.contour=[];
	this.segments=[];
};
iv.triscan.prototype.setData=function(data)
{
	if(data.contour)this.contour=data.contour;
}
iv.triscan.segment=function(v0,v1)
{
	if(v0){this.y=v0[1];this.a=v0;this.b=v1;}
}
iv.triscan.knot=function(y)
{
	this.y=y;
	this.up=null;
	this.down=null;
	this.index=0;
}
iv.triscan.knot.prototype.addSegment=function(s)
{
	if(this.segments)this.segments.push(s);
	else this.segments=[s];
}
iv.tessKnotsCompareFunc=function(a,b)
{
	if(a.a.x<b.a.x)return -1;
	if(a.a.x>b.a.x)return 1;
	return 0;
}
iv.tessSegCompareFunc=function(a,b)
{
	if(a.y<b.y)return -1;
	if(a.y>b.y)return 1;
	return 0;
}
iv.triscan.prototype.makeSegments=function()
{
	var _i=this.contour,i,_s=this.segments;
	for(i=0;i<_i.length;i+=2)
	{
		var v0=_i[i],v1=_i[i+1];
		if(v0[1]==v1[1])continue;
		var seg;
		if(v0[1]<v1[1])seg=new iv.triscan.segment(v0,v1);
		else seg=new iv.triscan.segment(v1,v0);
		_s.push(seg);
	}
	if(_s.length<2)return false;
	_s.sort(iv.tessSegCompareFunc);
	var _top=_s[0].a[1],_bottom=_s[this.segments.length-1].b[1];
	if(this.bounds){
	if(_top==this.bounds.top && _bottom==this.bounds.bottom)
	{
	}else
	{
	}
	}else
	{
		this.bounds={top:_top,bottom:_bottom};
		this.epsilon=(_bottom-_top)*1e-5;
	}
	return true;
}
iv.triscan.prototype.updateBounds=function() {
	var p=this.contour[0],left=p[0],right=p[0],top=p[1],bottom=p[1];
	for(var iC=1;iC<this.contour.length;iC++) {
		var p=this.contour[iC],x=p[0],y=p[1];
		if(x<left)left=x;
		else
		if(x>right)right=x;
		if(y<top)top=y;
		else
		if(y>bottom)bottom=y;
	}
	if(top<bottom){
	this.bounds={top:top,bottom:bottom,left:left,right:right};
	this.epsilon=(bottom-top)*1e-6;
	return true;
}
return false;
}
iv.triscan.prototype.getKnot=function(y)
{
	var k=this.knots,_k=null,t;
	while(k)
	{
		_k=k;
		if(Math.abs(k.y-y)<this.epsilon)return k;
		if(y<k.y){k=k.top;t=true;}
		else {k=k.bottom;t=false;}
	}
	k=new iv.triscan.knot(y);
	if(_k)
	{
		if(t)_k.top=k;
		else _k.bottom=k;
	}else this.knots=k;
	return k;
}
iv.triscan.prototype.knotifySegment=function(s)
{
	var k0=this.getKnot(s.a[1]),xa=s.a[0],k1=this.getKnot(s.b[1]),xb=s.b[0];
	s.a={knot:k0,x:xa};
	s.b={knot:k1,x:xb};
}
iv.triscan.prototype.makeKnotsList=function(k,_i)
{
	if(k.top)this.makeKnotsList(k.top,_i);
	_i.push(k);
	if(k.bottom)this.makeKnotsList(k.bottom,_i);
}
iv.triscan.prototype.splitSegment=function(s)
{
	var top=s.a,bottom=s.b;
	if(top.knot===bottom.knot)return false;
	var y0=top.knot.y, height=bottom.knot.y-y0,x0=top.x,
	from=top.knot.index,to=bottom.knot.index,split=(to-1)-from;
	if(split<1 )
	{
		this.segments.push(s);
		top.knot.addSegment(s);
	}else{
		for(var i=from+1;i<to;i++)
		{
			var k=this.knots[i],K=(k.y-y0)/height,b={x:x0*(1.0-K)+bottom.x*K,knot:k},
			s=new iv.triscan.segment(null);
			s.a=top;
			top.knot.addSegment(s);
			s.b=b;
			top=b;
			this.segments.push(s);
		}
		s=new iv.triscan.segment(null);
		s.a=top;
		s.b=bottom;
		top.knot.addSegment(s);
		this.segments.push(s);
	}
}
iv.triscan.prototype.splitSegments=function()
{
	var _i=this.segments;
	this.segments=[];
	for(var i=0;i<_i.length;i++)
		this.splitSegment(_i[i]);
};
iv.triscan.prototype.makeKnots=function()
{
	this.knots=null;
	var _i=this.segments,i0=Math.ceil(_i.length/2),i1=i0+1,any=true;
	while(any)
	{
		any=false;
		if(i0>=0)
		{
			this.knotifySegment(_i[i0]);
			i0--;
			any=true;
		}
		if(i1<_i.length)
		{
			this.knotifySegment(_i[i1]);
			i1++;
			any=true;
		}
	}
	var _i=[];
	this.makeKnotsList(this.knots,_i);
	this.knots=_i;
	for(var i=0;i<_i.length;i++)
	{
		var k=_i[i];
		k.index=i;
		k.top=k.bottom=null;
		if(i && (_i[i-1].y>=_i[i].y))
		{
				console.error("error in knots array");
		}
	}
};
iv.triscan.prototype.processVertex=function(a,start)
{
	if(a.V===undefined)
	{
	var x=a.x,y=a.knot.y,v=this.vertices;
	for(var iv=start;iv<v.length;iv++)
	{
		var V=v[iv];
		if(V[1]==y && V[0]==x)
		{
			a.V=iv;
			return;
		}
	}
		a.V=v.length;
		v.push([x,y]);
	}
}
iv.triscan.prototype.makeVertices=function()
{
	var _i=this.knots,i,_t=this.trianges=[],v=this.vertices=[],start=0;
	for(i=0;i<_i.length;i++)
	{
		var k=_i[i];
		if(k.segments)
		{
			k.segments.sort(iv.tessKnotsCompareFunc);
			for(var j=0;j<k.segments.length;j++)
				this.processVertex(k.segments[j].a,start);
			start=v.length;
			for(var j=0;j<k.segments.length;j++)
				this.processVertex(k.segments[j].b,start);
		}
	}
}
iv.triscan.prototype.finalize=function()
{
	var _i=this.knots,i,t=this.triangles=[],v=[];
	for(i=0;i<_i.length;i++)
	{
		var k=_i[i];
		if(k.segments)
		{
		for(var j=0;j<k.segments.length;j+=2)
		{
			var s0=k.segments[j],s1=k.segments[j+1];
			if(s0 && s1){
			 v[0]=s0.a;
			 v[1]=s1.a;
			 v[2]=s1.b;
			 v[3]=s0.b;
			 if(v[0].V==v[1].V)
			 {
				t.push([v[1].V,v[2].V,v[3].V]);
			 }else
			 if(v[2].V==v[3].V)
			 {
				t.push([v[0].V,v[1].V,v[2].V]);
			 }else
			 {
				t.push([v[0].V,v[1].V,v[2].V]);
				t.push([v[2].V,v[3].V,v[0].V]);
			 }}
		}
	}
	}
};
iv.triscan.prototype.process=function()
{
	if(this.updateBounds()&&this.makeSegments())
	{
	this.makeKnots();
	this.splitSegments();
	this.makeVertices();
	this.finalize();
	}
};//ivtreeview.js
iv.treeView=function(div,wnd,size) {
	if(!size)size=16;
	this.div=div;
	this.view3d=wnd;
	this.size=size;
	this.lockNotify=0;
	var tree=this;
	this._doSelect=function(event){tree.doSelect(this,event);};
	this._doDblClickItem=function(event){tree.doDblClickItem(this,event);};
	this._doToggleVisibility=function(event){iv.pdsp(event);tree.doToggleVisibility(this);};
	this._doToggleExpand=function(event){iv.pdsp(event);tree.doToggleExpand(this);};
	div.onclick=function(event){if(wnd.space)wnd.space.select(null);}
	wnd.addRefTarget(tree);
	if(wnd.space)this.init(wnd.space);
}
iv.treeView.prototype.getNodeFromItem=function(obj) {
	if(obj.ivnode) return obj.ivnode;
	var item=obj.parentNode;
	if(item.className.indexOf("gitem")>=0) item=item.parentNode;
	return item.ivnode;
}
iv.treeView.prototype.isGroup=function(item) {
	return (item.className.indexOf('group')>=0);
}
iv.treeView.prototype.groupGetGitem=function(item) {
	_item=item.firstChild;
	while(_item&&(_item.className.indexOf('gitem')<0)) _item=_item.nextSibling;
	return _item;
}
iv.treeView.prototype.searchItem=function(node,bExpand) {
	var item;
	if(node.parent&&node.parent.parent) item=this.searchItem(node.parent,bExpand); else item=this.div;
	if(item) {
		if(item.className=='group-c') this.doToggleExpandImp(item);
		if(item.className=='group') item=this.getGroupItems(item);
		if(!item) return null;
		var _item=item.firstChild;
		while(_item) {
			if(_item.ivnode&&_item.ivnode==node)
				return _item;
			_item=_item.nextSibling;
		}
	}
	return null;
}
iv.treeView.prototype.ensureVisible=function(item) {
	var y=item.offsetTop,se=this.div;
	y-=se.offsetTop;
	se=se.parentNode;
	if(y<se.scrollTop) { se.scrollTop=y; return; }
	var height=se.clientHeight;
	y+=this.size;
	if(y>(se.scrollTop+height))
		se.scrollTop=y-height;
};
iv.treeView.prototype.removeSelection=function(item) {
	var item=item.firstChild;
	while(item) {
		var _item=item;
		if(this.isGroup(item)) {
			var items=this.getGroupItems(item);
			if(items)
				this.removeSelection(items);
			_item=this.groupGetGitem(item);
		}
		if(_item&&!(item.ivnode.state&4)) {
			var index=_item.className.indexOf(" selected");
			if(index>=0) {
				_item.className=_item.className.replace(" selected","").trim();
			}
		}
		item=item.nextSibling;
	}
}
iv.treeView.prototype.doToggleVisibility=function(obj) {
	var node=this.getNodeFromItem(obj);
	if(node) {
		var s,w=this.view3d;
		if(obj.className=='vis') {obj.className='hdn'; s=0;} else {obj.className='vis'; s=3;}
		if(iv.undo&&iv.undo.nodeState) {
			var u=w.m_undo;
			if(u&&u.open()) {
				u.add(new iv.undo.nodeState(w,node));
				u.accept("Node Visibility");
			}
		}
		node.setState(s,3);
		w.invalidate(iv.INV_STRUCTURE);
	}
};
iv.treeView.prototype.doDblClickItem=function(obj,event) {
	var node=this.getNodeFromItem(obj),v=this.view3d;
	if(node) {
		if(node.object instanceof iv.camera)v.setCamera(node);
	}
	iv.pdsp(event);
}
iv.treeView.prototype.doSelect=function(obj,event) {
	var node=this.getNodeFromItem(obj);
	if(node) {
		var s=this.view3d.space;
		if(!(event.shiftKey&&s.selectRange(node,s.selNode)))
			s.select(node,!(node.state&iv.NS_SELECTED),event&&event.ctrlKey!=0);
	}
	iv.pdsp(event);
}
iv.treeView.prototype.getGroupItems=function(g){
	var i=g.firstChild;
	while(i)
	{
		if(i.className=="items")return i;
		i=i.nextSibling;
	}
	return null;
}
iv.treeView.prototype.expandItem=function(g,expand)
{
	if(expand){
		g.className='group';
		var items=this.getGroupItems(g);
		if(items&&!items.firstChild)this.expandNode(items,g.ivnode);
	}else g.className='group-c';
}
iv.treeView.prototype.isExpanded=function(group){return (group.className=='group');}
iv.treeView.prototype.doToggleExpandImp=function(group) {
	this.expandItem(group,!this.isExpanded(group));
}
iv.treeView.prototype.doToggleExpand=function (obj){this.doToggleExpandImp(obj.parentNode.parentNode);}
iv.treeView.prototype.isGroup3d=function(node) {
	var f=node.firstChild;
	while(f&&f.state&0x80) f=f.next;
	return !!f;
}
iv.treeView.prototype.createElement=function(t,c){var i=document.createElement(t);if(c)i.className=c;return i;}
iv.treeView.prototype.getFirstObject=function(node)
{
	var obj=node.object;
	if(obj)return obj;
	var n=node.firstChild;
	while(n)
	{
		if(n.object)return n.object;
		n=n.next;
	}
	n=node.firstChild;
	while(n)
	{
		obj=this.getFirstObject(n);
		if(obj)return obj;
		if(n.object)return n.object;
		n=n.next;
	}
	return null;
}
iv.treeView.prototype.newIcon=function(parent,item,node) {
	var _icon=this.createElement('span','node');
	var id=8,g=this.isGroup3d(node);
	if(g)
	{
	}else{
		var obj=this.getFirstObject(node);
		if(obj){
			if(obj instanceof iv.light)id=11;else
				if(obj instanceof iv.camera)id=12;else id=10;
		}else id=15;
	}
	_icon.style.backgroundPosition="-"+id*this.size+"px 0px";
	var label=this.createElement('span','label');
	var name=node.name;
	if(name)label.title=name;else name=g?"Group":"Object";
	label.innerHTML=name;
	var div=this.createElement('div',node.state&4?'selected':'normal');
	div.appendChild(_icon);
	div.appendChild(label);
	item.ivlabel=label;
	parent.ondblclick=this._doDblClickItem;
	parent.onclick=this._doSelect;
	var t=this;
	node.addRefTarget(function(event)
	{
	 switch(event.code)
	{
	 case "state":if((event.source.state&3)!=(event.old&3))t._updateVisibility(item);break;
	}
	});
	parent.appendChild(div);
	return div;
}
iv.treeView.prototype.newTreeItem=function(parent,node,bGroup) {
	var item=this.createElement('div');
	item.ivnode=node;
	var chk=this.createElement('span',(node.state&&node.state&3)?"vis":"hdn");
	chk.onclick=this._doToggleVisibility;
	var _icon=this.createElement('span'),s;
	_icon.onclick=this._doSelect;
	_icon.ondblclick=this._doDblClickItem;
	if(bGroup) {
		item.className='group-c';
		var div=this.createElement('div','gitem');
		var _open=this.createElement('span','open');
		_open.onclick=this._doToggleExpand;
		div.appendChild(_open);
		div.appendChild(chk);
		s=this.newIcon(div,item,node);
		var _items=this.createElement('div','items');
		item.appendChild(div);
		item.appendChild(_items);
	} else {
		item.className='item';
		item.appendChild(chk);
		s=this.newIcon(item,item,node);
	}
	item.ivselitem=s;
	item.ivcheckbox=chk;
	parent.appendChild(item);
}
iv.treeView.prototype.expandNode=function(treeParent,parent) {
	for(var node=parent.firstChild;node;node=node.next) {
		if(node.state&iv.NS_NOTREE) continue;
		var g=this.isGroup3d(node);
		if(g&&node.state&iv.NS_CLOSED) g=false;
		this.newTreeItem(treeParent,node,g);
	}
}
iv.treeView.prototype._updateSelection=function(item) {
	var _item=item.ivselitem;
	if(_item) {
		var oldSel=_item.className=="selected",sel=((item.ivnode.state&4)!=0);
		if(sel!=oldSel) _item.className=sel?"selected":"normal";
	}
}
iv.treeView.prototype._updateVisibility=function(item) {
	var chk=item.ivcheckbox,n=item.ivnode;
	if(n.state&&n.state&3) chk.className="vis"; else chk.className="hdn";
}
iv.treeView.prototype.udpateNode=function(item,f) {
	var item=item.firstChild;
	while(item) {
		if(this.isGroup(item)) {
			var items=this.getGroupItems(item);
			if(items)
				this.udpateNode(items,f);
		}
		if(f&1)this._updateSelection(item);
		if(f&2)this._updateVisibility(item);
		item=item.nextSibling;
	}
};
iv.treeView.prototype.onNodeSelected=function(node) {
	this.udpateNode(this.div,1);
	if(node) {
		var item=this.searchItem(node,true);
		if(item)
			this.ensureVisible(item);
	}
}
iv.clearDIV=function(div) {
	while(div.firstChild) {
		var f=div.firstChild;
		if(f.remove) f.remove();
		else
			if(div.removeChild) div.removeChild(f);
			else break;
	}
}
iv.treeView.prototype.clear=function(){iv.clearDIV(this.div);}
iv.treeView.prototype.init=function(space) {
	var r=space.root;
	if(r) { if(r.firstChild) this.expandNode(this.div,r); else this.newTreeItem(this.div,r,false); }
}
iv.treeView.prototype.onNotify=function(event) {
	if(!this.lockNotify)
		switch(event.code) {
			case "merged":this.clear();this.init(event.wnd.space);break;
			case "dataReady":this.clear();this.init(event.space);break;
			case "visibility":{
				var item=this.searchItem(event.node,false);
				if(item)
					this._updateVisibility(item);
			}break;
			case "selection": this.onNodeSelected(event.node); break;
			case "updated": this.udpateNode(this.div,3);break;
		}
}
iv.treeView.prototype.searchImp=function(div,info)
{
	var item=div.firstChild;
	while(item)
	{
		var node=this.getNodeFromItem(item),f=node._filtered;
		if(f)
		{
			item.style.display="";
			if(f&1){
			item.ivlabel.className="labelSerch";
			if(!info.first)info.first=item;
			}else item.ivlabel.className="label";
			var expanded=this.isExpanded(item), e=(f&2)!=0 && this.isGroup3d(node) && !(node.state&iv.NS_CLOSED);
			if(e!=expanded)
			{
				this.expandItem(item,e);
				if(item.expandedBySearch===undefined)item.expandedBySearch=expanded;
			}
			if(e)
			{
				var _item=this.getGroupItems(item);
				if(_item)this.searchImp(_item,info);
			}
		}else item.style.display = "none";
		item=item.nextSibling;
	}
}
iv.treeView.prototype.searchDone=function(div)
{
	var item=div.firstChild;
	while(item)
	{
		if(item.ivlabel)item.ivlabel.className="label";
		item.style.display="";
		var expanded=this.isExpanded(item);
		if(item.expandedBySearch!==undefined)
		{
			if(item.expandedBySearch!=expanded)
				{
				expanded=item.expandedBySearch;
				this.expandItem(item,expanded);
			}
			delete item.expandedBySearch;
		}
		var _item=this.getGroupItems(item);
		if(_item)this.searchDone(_item);
		item=item.nextSibling;
	}
}
iv.treeView.prototype.searchNodes=function(n,func)
{
	var f=0;
	if(func && func(n))f=1;
	var _n=n.firstChild,any=false;
	while(_n)
	{
		any|=this.searchNodes(_n,func);
		_n=_n.next;
	}
	if(any)f|=2;
	if(f)n._filtered=f;
	else
	if(n._filtered)delete n._filtered;
	return f!=0;
}
iv.treeView.prototype.search=function(func)
{
	var node=this.view3d.space.root;
	if(node.firstChild)
	{
		node=node.firstChild;
		while(node)
		{
			this.searchNodes(node,func);
			node=node.next;
		}
	}else this.searchNodes(node,func);
	var div=this.div;
	if(func){
		var info={first:null};
		this.searchImp(div,info);
		if(info.first)
			this.ensureVisible(info.first);
	}else this.searchDone(div);
}
//ivaxis.js
iv.axis3d=function(w,info)
{
 this.view=new iv.viewInfo({from:[0,0,6],to:[0,0,0],up:[0,1,0],fov:45});
 this.wnd=w;
 this.gl=w.gl;
 this.vpVersion=w.vpVersion-1;
 this.pos=1;
 this.camDistance=2.2;
 var file="axis.iv3d",path="";
 var size=120;
 if(info)
 {
     for(var v in info)
     {
         var d=info[v];
        switch(v)
        {
            case 'file':file=d;break;
            case 'path':path=d;break;
            case 'size':size=d;break;
            case 'pos':this.pos=d;break;
        }
     }
 }
 this.viewport=new iv.size(size,size);
 this.buffer=new iv.size(size,size);
 this.load(file,path);
 this.rcontext=new iv.rcontext(this);
 this.rcontext.view.fov=45;
 this.rcontext.view.to[0]=0;
 this.rcontext.view.to[1]=0;
 this.rcontext.view.to[2]=0;
 this.nextLayer=w.layer;
 w.layer=this;
}
iv.axis3d.prototype.drawBk=function(){return 0;}
iv.axis3d.prototype.getFOV=function(v)
{
  if(!v)v=this.view;
  return v.fov*Math.PI/360;
}
iv.axis3d.prototype.setView  =function(v,f){}
iv.axis3d.prototype._cmpViews=function (a,b){return iv.window.prototype._cmpViews.call(this,a,b);}
iv.axis3d.prototype._playFavAnimation =function(v,flags){return 0;}
iv.axis3d.prototype.load=function (file,path)
{
	this.space=new iv.space(this,this.gl);
	if(path!=undefined)this.space.path=path;
    var request  = iv.createRequest(file,path,function(r)
    {
        var s=r.ivspace,w=r.ivwnd;
        s.loadBin(r);s.view={from:[w.camDistance,0,0],to:[0,0,0],up:[w.camDistance,0,1],fov:40};
        mat4.identity(s.unitMatrix);
        w.setView(new iv.viewInfo(s.view));w.invalidate();
    }
    );
	request.ivspace=this.space;
	request.ivwnd=this;
	request.responseType = "arraybuffer"
	request.send();
}
iv.axis3d.prototype.invalidate=function(flags) {
    if(flags!==undefined) {
        flags&=~IV.INV_VERSION;
    }
    return this.wnd.invalidate(0);
}
iv.axis3d.prototype.draw=function() {
     var w=this.wnd;
    if(w.view) {
        var gl=this.gl;
        var vp=w.viewport;
        if(vp.x>200&&vp.y>200) {
            var W=this.buffer.x=this.viewport.x*w.buffer.x/vp.x,H=this.buffer.y=this.viewport.y*w.buffer.y/vp.y;
            vp=w.buffer;
            switch(this.pos){
               case 0:gl.viewport(0,vp.y-H,W,H);break;
               case 1:gl.viewport(0,0,W,H);break;
               case 2:gl.viewport(vp.x-W,vp.y-H,H,H);break;
               case 3:gl.viewport(vp.x-W,0,W,H);break;
               }
            var rc=this.rcontext;
            if(this.vpVersion!=w.vpVersion) {
                this.vpVersion=rc.version=w.vpVersion;
                rc.W2=W/2;
	            rc.H2=H/2;
                var v=rc.view;
                var a=this.getFOV(v);
                rc.bbScaleFactor=a/rc.H2;
                rc.screenScale=1.0/a;
                vec3.subtractN(w.view.from,w.view.to,v.from);
                vec3.subtractN(w.view.up,w.view.from,v.up);
                vec3.scale(v.from,this.camDistance);
                vec3.add(v.from,v.to);
                vec3.add(v.up,v.from);
                mat4.lookAt(v.from,v.to,v.getUpVector(),rc.mvMatrix);
                this.view=v;
            }
            gl.clear(gl.DEPTH_BUFFER_BIT);
            this.rcontext.space=this.space;
            this.space.render(rc);
        }
    }
}
//ivrectsel.js
iv.CLIP_INSIDE=0x10000;
iv.CLIP_OUTSIDE=0x20000;
iv.CLIP_INTERSECT=0x40000;
iv.rectSelectionHandler=function(wnd)
{
	this.wnd=wnd;
}
iv.getSubElementById=function ( dNode, id ) {
	var dResult = null;
	if ( dNode.getAttribute('id') == id )
		return dNode;
	for ( var i = 0; i < dNode.childNodes.length; i++ ) {
		if ( dNode.childNodes[i].nodeType == 1 ) {
			dResult = iv.getSubElementById( dNode.childNodes[i], id );
			if ( dResult != null )
				break;
		}
	}
	return dResult;
}
iv.rectSelectionHandler.prototype.createRect=function() {
	var w=this.wnd;
	if(!w.divRectangle)
		w.divRectangle=iv.getSubElementById(w.imp.xdiv.parentElement,"selectionRect");
	if(w.divRectangle)
		this.rect=w.divRectangle;
	else {
		var r=document.createElement("div"),s=r.style;
		s.position="absolute";
		s.background="rgba(0,122,204,0.2)";
		s.display="none";
		s.borderColor="#ffffff";
		s.borderStyle="solid";
		s.borderWidth="1px";
		s["z-index"]=1;
		w.imp.xdiv.parentElement.appendChild(r);
		this.rect=w.divRectangle=r;
	}
}
iv.rectSelectionHandler.prototype.onMouseDown =function(p,event)
{
    this.X0=p.x;
    this.Y0=p.y;
    this.rectData={};
    return 2;
}
iv.rectSelectionHandler.prototype.onMouseUp=function(p,event) {
	if(this.rect)
		this.wnd.selectByRect(this.rectData,this.wnd.cfgRectSelectionFullMode);
	else {
		var w=this.wnd;
		var h=w.hitTest(p.x,p.y);
		var n=null;
		if(h) n=h.node;
		var bCtrl=(event.ctrlKey==1);
		var bSelect=true;
		if(n&&bCtrl&&n.state&4) bSelect=false;
		w.space.select(n,bSelect,bCtrl);
	}
	return 4;
};
iv.rectSelectionHandler.prototype.onMouseMove=function(p,event) {
	if(!this.rect)
		this.createRect();
	var w=this.wnd;
	var d=this.rectData;
	var x=Math.max(Math.min(p.x,w.viewport.x),0);
	var y=Math.max(Math.min(p.y,w.viewport.y),0);
	d.x0=Math.min(this.X0,x); d.x1=Math.max(this.X0,x);
	d.y0=Math.min(this.Y0,y); d.y1=Math.max(this.Y0,y);
	var r=this.rect.style;
	r.width=(d.x1-d.x0)+"px";
	r.height=(d.y1-d.y0)+"px";
	r.left=d.x0+"px";
	r.top=d.y0+"px";
	r.display="";
	return 0;
}
iv.rectSelectionHandler.prototype.onMouseHover=function(p,event) {
    var rezult=0;
    return rezult;
}
iv.rectSelectionHandler.prototype.detach=function(w)
{
    if(this.rect){
        this.rect.style.display="none";
        this.rect=null;
    }
    var rezult=0;
    return rezult;
}
iv.clipper=function(w,d)
{
    var p=this.planes=[];
    var rTL=w.getRay(d.x0,d.y0);
    var rTR=w.getRay(d.x1,d.y0);
    var rBR=w.getRay(d.x1,d.y1);
    var rBL=w.getRay(d.x0,d.y1);
    p.push(this.planeEquation(rTL,iv.getRayPoint(rTL,1),iv.getRayPoint(rTR,1)));
    p.push(this.planeEquation(rBR,iv.getRayPoint(rBR,1),iv.getRayPoint(rBL,1)));
    p.push(this.planeEquation(rTL,iv.getRayPoint(rBL,1),iv.getRayPoint(rTL,1)));
    p.push(this.planeEquation(rTR,iv.getRayPoint(rTR,1),iv.getRayPoint(rBR,1)));
    this.clipMask=0x0f;
    this.v=[];
	for(var i=0;i<8;i++)this.v.push({v:[0.0,0.0,0.0],f:0});
}
iv.clipper.prototype.planeEquation=function(p0,p1,p2,k)
{
    if(!k)k=[];
	var e1=vec3.subtract(p1,p0,[]);
	var e2=vec3.subtract(p2,p0,[]);
	vec3.crossN(e1,e2,k);
	k[3]= -vec3.dot(p0,k);
    return k;
}
iv.clipper.prototype.clip=function(v)
{
	var f=0;
	var p=this.planes;
	for(var j=0;j<p.length;j++)
		{
			var plane=p[j];
			var a=vec3.dot(plane,v)+plane[3];
			if(a<0)
				f|=1<<j;
		}
	return f;
}
iv.clipper.prototype.clipPlaneByPlane=function(poly,plane,mask)
{
	var _c=poly.length,i;
	var _poly=[],pd=plane[3];
	var bAny=false;
	for ( i = 0;i < _c;i++ )
	{
		if ( poly[i].f&mask){bAny=true;break;}
	}
	if(!bAny)return poly;
	for ( i = 0;i < _c;i++ )
	{
		var in1 = poly[i];
		var in2 = poly[(i < (_c- 1)) ? (i + 1) : 0];
		if ( !(in1.f&mask) )_poly.push(in1);
		if ( (in1.f&mask) != (in2.f&mask) )
		{
			var d1 = vec3.dot(plane,in1.v)+pd;
			var d2 = vec3.dot(plane,in2.v)+pd;
			if ( d2 < 0 )
			{
				var _b = d1;
				d1 = d2;
				d2 = _b;
				_b = in1;
				in1 = in2;
				in2 = _b;
			}
			var d = d2 - d1;
			if ( d <= 0 )
				return null;
			var k = -d1 / d;
			var _i={v:[0.0,0.0,0.0],f:0};
			vec3.lerp(in1.v,in2.v,k,_i.v);
			_i.f=this.clip(_i.v);
			_poly.push(_i);
		}
	}
	return _poly.length?_poly:null;
}
iv.clipper.prototype.clipPlane=function(p)
{
	var flags = 0,_flags = this.clipMask;
	var i;
	for (i = 0;i < p.length;i++ )
	{
		var f=p[i].f;
		flags |= f;
		_flags &= f;
	}
	if(!flags)return true;
	if(_flags)return false;
	for(i=0;i<4;i++)
	{
		var mask=1<<i;
		p=this.clipPlaneByPlane(p,this.planes[i],mask);
		if ( !p )return false;
	}
	return true;
}
iv.clipper.prototype.clipMesh=function(tm,p,faces,full)
{
    var v=this.v;
    var c=p.length/3;
    var d=c-v.length;
    if(d>0)
    {
        for(var i=0;i<d;i++)
        v.push({v:[0.0,0.0,0.0],f:0});
    }
    var j=0,i;
    for(i=0;i<c;i++)
    {
        var a=v[i];
        a.v[0]=p[j];j++;
        a.v[1]=p[j];j++;
        a.v[2]=p[j];j++;
        if(tm)mat4.mulPoint(tm,a.v);
		var f=this.clip(a.v);
        if(!f && !full)return true;
		a.f=f;
    }
    c=faces.length/3;j=0;
    var ok=0;
    for(i=0;i<c;i++)
    {
        var i0=faces[j],i1=faces[j+1],i2=faces[j+2];j+=3;
        if(full)
        {
            if(v[i0].f || v[i1].f || v[i2].f)
                return false;
        }else
        {
            if(this.clipPlane([v[i0],v[i1],v[i2]]))
                return true;
        }
    }
    return full;
}
iv.clipper.prototype.clipBox=function(tm,_min,_max)
{
	var out=0x0f,inside=0,_out=0;
	var y=this.v;
	for(var i=0;i<8;i++) {
		var v=y[i];
		v.v[0]=(i&1)?_max[0]:_min[0];
		v.v[1]=(i&2)?_max[1]:_min[1];
		v.v[2]=(i&4)?_max[2]:_min[2];
		if(tm)mat4.mulPoint(tm,v.v);
		var f=this.clip(v.v);
		_out|=f;
		out&=f;
		inside|= (~f)&0x0f;
		v.f=f;
	}
	if(out)
		return iv.CLIP_OUTSIDE;
	if((inside==0x0f) && (!_out))
		return iv.CLIP_INSIDE;
	if(this.clipPlane([y[0],y[1],y[3],y[2]]))return iv.CLIP_INTERSECT;
	if(this.clipPlane([y[4],y[6],y[7],y[5]]))return iv.CLIP_INTERSECT;
	if(this.clipPlane([y[2],y[3],y[7],y[6]]))return iv.CLIP_INTERSECT;
	if(this.clipPlane([y[0],y[2],y[6],y[4]]))return iv.CLIP_INTERSECT;
	if(this.clipPlane([y[1],y[0],y[4],y[5]]))return iv.CLIP_INTERSECT;
	if(this.clipPlane([y[3],y[1],y[5],y[7]]))return iv.CLIP_INTERSECT;
	return iv.CLIP_OUTSIDE;
}
iv.nodeRectSelectProc=function(node,tm,d,state) {
	if(node.name=='$markups$')
		return false;
	if(node.object&&(node.object.meshMode!=2))
	{
		var obj=node.object;
		var rez=d.c.clipBox(tm,obj.boxMin,obj.boxMax);
		if(rez&iv.CLIP_OUTSIDE)
			d.no.push(node);
		if(rez&iv.CLIP_INSIDE)
			d.yes.push(node);
		else
			if(rez&iv.CLIP_INTERSECT) {
				if(d.c.clipMesh(tm,obj.points,obj.faces,d.full))
					d.yes.push(node);
				else d.no.push(node);
			}
	}
	return true;
}
iv.window.prototype.getClosedNode=function(node) {
	var _node=node;
	while(_node) {
		if(_node.state&8)
			node=_node;
		_node=_node.parent;
	}
	return node;
}
iv.window.prototype.selectByRect=function(d,full) {
	var doDef=true;
	if(d&&d.x1>d.x0&&d.y1>d.y0) {
		var wnd=this;
		var data=new iv.selcontext(this,d,full);
		var tm=[];
		mat4.identity(tm);
		this.space.root.traverse(data,tm,0,1.0);
		if(data.yes.length) {
			var nodes=[];
			for(var i=0;i<data.yes.length;i++) {
				var node=this.getClosedNode(data.yes[i]);
				if(iv.indexOf(nodes,node)<0) nodes.push(node);
			}
			if(full) {
				for(var i=0;i<data.no.length;i++) {
					var node=this.getClosedNode(data.no[i]);
					var index=iv.indexOf(nodes,node);
					if(index>=0) {
						nodes.splice(index,1);
					}
				}
			}
			if(nodes.length) {
				var keep=false;
				var r=this.space.root;
				var old=r.getSelection(null);
				for(var i=0;i<nodes.length;i++) {
					if(keep) nodes[i].state|=4;
					else {
						r.select(nodes[i],true,keep);
						keep=true;
					}
				}
				var selection=r.getSelection(null);
				this.notify("selection",{ old: old,current: selection,node: nodes[0] });
				this.space.updateXRay(selection!=null);
				this.space.selNode=nodes[0];
				this.invalidate();
				doDef=false;
			}
		}
	}
	if(doDef) this.space.select(null,false,false);
}
iv.selcontext=function(wnd,d,full) {
	iv.context.call(this,wnd);
	this.c=new iv.clipper(wnd,d);
	this.yes=[];
	this.no=[];
	this.full=full;
}
iv.selcontext.prototype=new iv.context(null);
iv.selcontext.prototype.update=function(utm) {
	iv.context.prototype.update.call(this,utm);
	this.nodes.length=[];
}
iv.selcontext.prototype.action=function(node,tm,b,c) {
	if(node.name=='$markups$')
		return false;
	if(node.object&&(node.object.meshMode!=2))
	{
		var obj=node.object;
		if(obj.boxMin) {
			var rez=this.c.clipBox(tm,obj.boxMin,obj.boxMax);
			if(rez&iv.CLIP_OUTSIDE)
				this.no.push(node);
			if(rez&iv.CLIP_INSIDE)
				this.yes.push(node);
			else
				if(rez&iv.CLIP_INTERSECT) {
					if(this.c.clipMesh(tm,obj.points,obj.faces,this.full))
						this.yes.push(node);
					else this.no.push(node);
				}
		}
	}
	return true;
}
//api/ivtest.js
var view3d=null;
iv.window.prototype.testToggleClipPlane=function(index)
{
	var info=this.getClipPlane(index);
	if(info && info.visible)
		this.setClipPlane(index,{visible:false});
	else
	this.setClipPlane(index,{visible:true});
}
iv.window.prototype.OnCommand=function(id)
{
function updateSelMode(text)
{
	var span=document.getElementById("select-mode-menu");
	span.innerHTML="Mode:"+text;
}
	var updateAll=false;
	var _id=id.substring(0,12);
	if(_id=="view3d-lbtn-"){this.setNavigationMode("left",id.substring(12));updateAll=true;}
	else
	if(_id=="view3d-rbtn-"){this.setNavigationMode("right",id.substring(12));updateAll=true;}
	else
	if(_id=="view3d-mbtn-"){this.setNavigationMode("middle",id.substring(12));updateAll=true;}
	else
	switch(id)
	{
		case "view3d-clip-0":this.testToggleClipPlane(0);break;
		case "view3d-clip-1":this.testToggleClipPlane(1);break;
		case "view3d-clip-2":this.testToggleClipPlane(2);break;
		case "view3d-clip-mode":this.setClipMode(!this.cfgClipMode);break;
		case "view3d-mode-select":this.setMode("select");updateSelMode("Select");updateAll=true;break;
		case "view3d-mode-move":this.setMode("move");updateSelMode("Move");updateAll=true;break;
		case "view3d-mode-rotate":this.setMode("rotate");updateSelMode("Rotate");updateAll=true;break;
		case "view3d-mode-scale":this.setMode("scale");updateSelMode("Scale");updateAll=true;break;
		case "view3d-mode-measure":this.setMode("measure");updateSelMode("Measure");updateAll=true;break;
		case "view3d-cfg-tree":iv.showTreeView= !iv.showTreeView;window.onresize();break;
		case "view3d-cfg-rotationcenter":this.cfgRotateMouseHit=!this.cfgRotateMouseHit;break;
		case "view3d-cfg-rectselect":this.cfgRectSelectionFullMode=!this.cfgRectSelectionFullMode;break;
		case "view3d-home":view3d.setDefView(iv.VIEW_TRANSITION|iv.VIEW_RESTORE|iv.VIEW_RESET_RCENTER);break;
		case "view3d-cfg-xray":this.setXRAY(!this.getXRAY());break;
		case "view3d-user":
		case "view3d-left":
		case "view3d-right":
		case "view3d-top":
		case "view3d-bottom":
		case "view3d-front":
		case "view3d-back":{
			var _id=id.substring(7);
			view3d.setStdView(_id);
			updateAll=true;
		}break;
		case 'view3d-ortho':this.setOrtho(true);updateAll=true;break;
		case 'view3d-perspective':this.setOrtho(false);updateAll=true;break;
		case "view3d-cfg-textures":this.setTextures(!this.getTextures());break;
		case "view3d-cfg-dblside":this.setDoubleSided(!this.getDoubleSided());break;
		case "view3d-cfg-materials":this.setMaterials(!this.getMaterials());break;
		case "view3d-rm-solid":
		case "view3d-rm-wire":
		case "view3d-rm-wireshaded":
		case "view3d-rm-hiddenwire":
		case "view3d-rm-outline":
		case "view3d-rm-illustration":if(this.space){
					var _id=id.substring(10,id.length);
					  view3d.setRMode(_id);
					  updateAll=true;
				}break;
	}
	return updateAll;
};
iv.window.prototype.getStdViewName=function()
{
	var _i=iv.stdViews;
	var v=this.getView();
	var dir=v.getViewVectorN(),up=v.getUpVector();
	vec3.normalize(up);
	vec3.scale(dir,-1);
	var epsilon=1e-5;
	var _up;
	for(var i in _i)
	{
		var V=_i[i];
		 _up=vec3.subtract(V.u,V.f,[]);
		if(vec3.compare(_up,up,epsilon)&&
		   vec3.compare(V.f,dir,epsilon))
		   return i;
	}
	return "user";
}
iv.window.prototype.updateLeftMouseMenuItem=function(ibtn,id)
{
	id=id.substring(12);
	var mode=this.cfgButtons[ibtn];
	switch(id)
	{
		case "none":return mode==-1;
		case "orbit":return mode==1;
		case "zoom":return mode==2;
		case "pan":return mode==4;
		case "rectSelect":return mode==16;
	}
	return undefined;
}
iv.window.prototype.updateMenuItem=function(menuItem,id)
{
	if(!id)id=menuItem.id;
	var check=undefined;
	var _id=id.substring(0,12);
	if(_id=="view3d-lbtn-")check=this.updateLeftMouseMenuItem(0,id);
	else
	if(_id=="view3d-rbtn-")check=this.updateLeftMouseMenuItem(1,id);
	else
	if(_id=="view3d-mbtn-")check=this.updateLeftMouseMenuItem(2,id);
	else
	switch(id)
	{
		case "view3d-clip-0":{
			var info=check=this.getClipPlane(0);
			check=(info && info.visible);
		}break;
		case "view3d-clip-1":{
			var info=check=this.getClipPlane(1);
			check=(info && info.visible);
		}break;
		case "view3d-clip-2":{
			var info=check=this.getClipPlane(2);
			check=(info && info.visible);
		}break;
		case "view3d-clip-mode":check= this.cfgClipMode;break;
		case "view3d-mode-select":check=this.cfgEditorMode=="";break;
		case "view3d-mode-move":check=this.cfgEditorMode=="move";break;
		case "view3d-mode-rotate":check=this.cfgEditorMode=="rotate";break;
		case "view3d-mode-scale":check=this.cfgEditorMode=="scale";break;
		case "view3d-cfg-tree":check=iv.showTreeView;break;
		case "view3d-cfg-rectselect":check=!!this.cfgRectSelectionFullMode;break;
		case "view3d-cfg-rotationcenter":check=!!this.cfgRotateMouseHit;break;
		case "view3d-cfg-xray":check=this.getXRAY();break;
		case "view3d-user":
		case "view3d-left":
		case "view3d-right":
		case "view3d-top":
		case "view3d-bottom":
		case "view3d-front":
		case "view3d-back":check=("view3d-"+this.getStdViewName())==id;break;
		case 'view3d-ortho':check=this.isOrtho();break;
		case 'view3d-perspective':check=!this.isOrtho();break;
		case "view3d-cfg-textures":check=this.getTextures();break;
		case "view3d-cfg-dblside":check=this.getDoubleSided();break;
		case "view3d-cfg-materials":check=this.getMaterials();break;
		case "view3d-rm-solid":
		case "view3d-rm-wire":
		case "view3d-rm-wireshaded":
		case "view3d-rm-hiddenwire":
		case "view3d-rm-outline":
		case "view3d-rm-illustration":
				if(this.space){
					var mode=this.space.rmodes[this.space.cfgRMode];
					if(mode)
					{
					var mode="view3d-rm-"+mode.name;
					check=(mode===id);
				}
				}break;
	}
	if(check!==undefined)
	{
		var objs = menuItem.getElementsByTagName("img");
		var img;
		if(objs && objs.length)img=objs[0];
		else
		if(check){
			img=document.createElement("img");
			img.src="test/checkmark.png";
			menuItem.insertBefore(img, menuItem.childNodes[0]);
		}
		if(img)
		{
			var atrr=check?"visible":"hidden";
			if(img.style.visibility!=atrr)
				img.style.visibility=atrr;
		}
	}else
	{
		var idbg=0;
		idbg++;
	}
}
iv.window.prototype.updateMenues=function()
{
	var objs = document.getElementsByClassName("ivmenu");
	if(objs)
	{
		for(var i=0;i<objs.length;i++)this.updateMenu(objs[i]);
	}
	this.updateMenuAxis();
}
iv.window.prototype.updateMenuAxis=function()
{
	var a=this.cfgEditorAxis;
	var div=document.getElementById("axis-x");
	div.className=a&1?"button-checked":"button";
	div=document.getElementById("axis-y");
	div.className=a&2?"button-checked":"button";
	div=document.getElementById("axis-z");
	div.className=a&4?"button-checked":"button";
};
iv.onToggleAxis=function(axis)
{
	view3d.setAxis(view3d.cfgEditorAxis^axis);
	view3d.updateMenuAxis();
}
iv.window.prototype.updateMenu=function(menu)
{
	if(menu)
	{
	var objs = menu.getElementsByTagName("a");
	if(objs)
	{
		for(var i=0;i<objs.length;i++)this.updateMenuItem(objs[i]);
	}
	}
};
iv.onMenuSelected=function(menuItem)
{
	var id=menuItem.id;
	if(view3d.OnCommand(id))
			view3d.updateMenues();
		else
			view3d.updateMenuItem(menuItem,id);
}
function sample3dCallBack(event)
  {
	var wnd=event.wnd;
    switch(event.code)
    {
        case "dataReady":wnd.updateMenues();break;
		case "mousedown":{
			if(0){
			 event.doDef=false;
  			 var hit=event.wnd.hitTest(event.x,event.y);
			 if(hit && hit.node)
			 {
                            console.log(hit.node);
			  }
   			 }
			 }break;
	case "mousehover":{
			 }break;
	case "animend":{
			if(event.type=='spin' || event.type=='view')
			{
				var div=document.getElementById("views");
				if(div)wnd.updateMenu(div);
			}
		}break;
    }
  };
iv.window.prototype.getHandler=function(p,event) {
	var navmode=this.mapButtonToNavigation(p.b);
	var m=this.cfgEditorMode;
	switch(navmode) {
		case 16: return new iv.rectSelectionHandler(this);
	}
	if((!p.hit)) p.hit=this.handleObjSelect(p.x,p.y,event,true);
	if(p.hit){
		if(iv.markup && (p.hit.node instanceof iv.markup)) {
			var bsel=p.hit.node.isSelected();
			var info={ doMove: this.objEditorMode!=0&&bsel,selected: bsel };
			this.notify("allowMoveMeasurements",info);
			if(info.doMove) {
				this.space.select(p.hit.node,true);
				var h=new iv.moveCalloutHandler(this,p.hit,p.hit.node);
				return h;
			}
		}
		if(this.space.selNode)
		switch(m)
		{
			case "move":return new iv.objMoveHandler(this);
			case "rotate":return new iv.objRotateHandler(this);
			case "scale":return new iv.objScaleHandler(this);
		}
	}
	return this.getDefHandler(p,event,navmode);
}
iv.window.prototype.getDefHandler=function(p,event,navmode)
{
	return null;
}
iv.initSample=function(file,color)
{
  iv.showTreeView=true;
  var params={canvas:document.getElementById("canvas3d")};
  if(file)
  {
	params.file=file;
  }
  if(color!=undefined)params.color=color;
  var view=new iv.window(params);
  view.cfgRotateMouseHit=true;
  view.cfgRectSelectionFullMode=true;
  view.addRefTarget(sample3dCallBack);
  var div=document.getElementById("treeview");
  var treeView=null;
  var treeParent=null;
  if(div)
  {
	 treeView=new iv.treeView(div,view);
	 treeParent=div.parentElement;
  }
  var vidivider=document.getElementById("vidivider");
  var wndDiv=new iv.vdivider(vidivider);
  var onResize=function()
  {
	var height=window.innerHeight-50;
	var width = window.innerWidth;
	if(treeView )
	 {
		  if(width<500 || (!iv.showTreeView))
		  {
			treeParent.style.display="none";
			vidivider.style.display="none";
		  }else
		  {
			var w=wndDiv.value;
			if(w===undefined)w=width/4;
			vidivider.style.display="";
			vidivider.style.height=""+height+"px";
			treeParent.style.display="";
			treeParent.style.width=""+w+"px";
			treeParent.style.height=""+height+"px";
			treeParent.style["max-height"]=""+height+"px";
			width-=w+4;
		  }
	 }
	width--;
	if(view)
		view.setViewSize(width,height);
  }
  wndDiv.onValueChanged=function()
  {
		onResize();
  }
  window.onresize = onResize;
  onResize();
  new iv.progressIndicator(view,{size:100,color:0x202020,animation:false});
  view.updateMenues();
  return view;
}//api/ivapp.js
iv.window.prototype.getXRAY=function()
{
    if(this.space)return (this.clrSelection[5]<1.0);
    return undefined;
}
iv.window.prototype.setXRAY=function(mode)
{
    if (mode) {
        this.clrSelection[4] = 1;
        this.clrSelection[5] = 0.5;
    } else {
        this.clrSelection[4] = 1;
        this.clrSelection[5] = 1;
    }
    if(this.space)
        this.space.updateXRay();
    this.invalidate();
}
iv.window.prototype.setNavigationMode=function(button,mode) {
    if(button=='left') button=0;
    else
    if(button=='right') button=1;
    else
    if(button=='middle') button=2;
    if(button>=0&&button<=2) {
    if(mode=='orbit') mode=1;
    else
    if(mode=='zoom') mode=2;
    else
    if(mode=='pan') mode=4;
    else
    if(mode=='none') mode=-1;
    else
    if(mode=='rectSelect') mode=16;
        this.cfgButtons[button]=mode;
    }
}
iv.window.prototype.setAxis=function(a)
{
    if(this.cfgEditorAxis!=a)
    {
    this.cfgEditorAxis=a;
    this.updateTransformGizmo2();
    this.notify("editorAxis",{axis:a});
    return true;
}
    return false;
}
iv.window.prototype.setMode=function(mode,a)
{
    var dropHandler=true;
    if(mode=="editAxis"){
        if(a!=undefined)
            this.setAxis(a);
    }else
    if(mode=="select")this.setEditMode("");
    else
    if(mode=="move")this.setEditMode(mode);
    else
    if(mode=="rotate")this.setEditMode(mode);
    else
    if(mode=="scale")this.setEditMode(mode);
    else
    if(mode=='measure')
    {
        this.setHandler(new iv.measureHandler(this));
        dropHandler=false;
    }
    if(dropHandler)
        this.setHandler(null);
    return false;
}
iv.window.prototype.setClipPlane=function(id,info)
{
var space=this.space;
 if(space && space.unitMatrix)
 {
    var my=space.myClipInfo;
    if(!my)
	{
        var size=1.0;
        if(space.unitMatrix)
        {
          var size=1.3/space.unitMatrix[0];
        }else
        {
            console.error("check this branch");
            var box=space.root.getBoundingBox(null,null,true);
            var size=box3.size(box);
            size=vec3.length(size);
        }
	      my=space.myClipInfo={planes:[],size:size*1.5};
	}
    var n=my.planes[id],inv=false;
    if(info && info.visible)
	{
	  if(n)
	  {
           if(!(n.state&3)){n.show(true);inv=true;}
          }else
	  {
	    n=this.space.root.newNode();
            n.state|=iv.NS_NOCLIP|iv.NS_SYSTEM;
            n.state&= ~(iv.NS_RCVSHADOWS|iv.NS_CASTSHADOWS);
            n.setObject(new iv.clipObject(space.gl,{"axis":5,"appearance":3,"size":my.size,"outline":true,"cap":true} ) );
            if(id)
	    {
                var tm=n.enableTM();
                if(info.plane)
                {
                }else{
                if(id==1)mat4.setRotateX(tm,Math.PI/2);
                else mat4.setRotateY(tm,Math.PI/2);
                }
            }
            my.planes[id]=n;
	   inv=true;
	  }
	}else
	{
	  if(n && (n.state&3)){n.show(false);inv=true;}
	}
	if(inv)space.invalidate(iv.INV_VERSION|iv.INV_STRUCTURE);
 }
}
iv.window.prototype.getClipPlane=function(index)
{
    if((index<0) || (index>2))return null;
    var space=this.space;
    var a={visible:false};
    if(space && space.myClipInfo)
    {
        var my=space.myClipInfo;
        var node=my.planes[index];
        if(node){
            a.visible=node.visible();
        }
    }
    return a;
}
//api/ivdivider.js
iv.vdivider=function (div)
{
    this.div=div;
    this.initInput();
    this.mouseCaptured=false;
}
function ivRemoveEvent(d,e,f)
{
	if (d.detachEvent)
		d.detachEvent("on"+e, f);
	else if (d.removeEventListener)
		d.removeEventListener(e, f);
}
function ivSetEvent(d,e,f)
{
	if (d.attachEvent)
		d.attachEvent("on"+e, f);
	else if (d.addEventListener)
		d.addEventListener(e, f);
}
iv.vdivider.prototype.initInput=function()
{
    var wnd=this;
    var i={"move":function(event) { return wnd._onMouseMove(event); },"down":function(event) { return wnd.onMouseDown(event,false); },"up":function(event) { return wnd.onMouseUp(event,false); },
		"touchstart":function(event) { return wnd.onMouseDown(event,true);},
		"touchcancel":function(event) { return wnd.onTouchCancel(event);},
		"touchend":function(event) { return wnd.onMouseUp(event);},
		"touchmove":function(event) { return wnd.onTouchMove(event);},
    };
    this.input=i;
    ivSetEvent(this.div,"mousedown",i.down);
    ivSetEvent(this.div,"mousemove",i.move);
    ivSetEvent(this.div,"touchstart",i.touchstart);
}
iv.vdivider.prototype.releaseCapture=function()
{
    if(this.mouseCaptured)
    {
        var e=this.div;
        if(e.releaseCapture)e.releaseCapture();
        else
        {
            var i=this.input;
            ivRemoveEvent(document,"mousemove",i.move);
            ivRemoveEvent(document,"mouseup",i.up);
        }
	ivRemoveEvent(e,"mouseup",i.up);
	ivRemoveEvent(e,"touchmove", i.touchmove);
	ivRemoveEvent(e,"touchend", i.touchend);
	ivRemoveEvent(e,"touchcancel", i.touchcancel);
        this.mouseCaptured=false;
    }
}
iv.vdivider.prototype.setCapture=function()
{
    if(!this.mouseCaptured)
    {
	var e=this.div,i=this.input;
       if(e.setCapture)e.setCapture();else
       {
        ivSetEvent(document,"mousemove",i.move);
        ivSetEvent(document,"mouseup",i.up);
       }
	    ivSetEvent(e,"touchmove", i.touchmove);
	    ivSetEvent(e,"touchend", i.touchend);
	    ivSetEvent(e,"touchcancel", i.touchcancel);
       this.mouseCaptured=true;
    }
}
iv.vdivider.prototype.onTouchMove=function(event)
{
	this.onMouseMove(event,true);
	iv.pd(event);
	return false;
}
iv.vdivider.prototype.onTouchCancel=function (event)
{
	this.onMouseUp(event,true);
	if(event.cancelable)iv.pd(event);
}
iv.vdivider.prototype.getEvent=function(event,touch) {
    if(touch) {
        if(event.touches&&event.touches.length) {
            event=event.touches[0];
        }else return null;
    }
    return event;
}
iv.vdivider.prototype.onMouseDown=function(event,touch)
{
    if(1)
    {
    var w=event.currentTarget;
    var _w=event.target;
    event=this.getEvent(event,touch);
    if(!event)return false;
        this.setCapture();
        var r=w.getBoundingClientRect();
        var rp=w.parentElement.getBoundingClientRect();
        this.drag_offsetX=r.left-event.clientX;
    }else
    {
    }
}
iv.vdivider.prototype.onMouseUp=function (event)
{
    this.releaseCapture();
    iv.pd(event);
}
iv.vdivider.prototype.isResizeCursor=function (event,r)
{
	var d=15;
	if ( ((r.bottom-d)<event.clientY) && ((r.right-d)<event.clientX) )return true;
	return false;
}
iv.vdivider.prototype.closeThisPopup=function() {
    var div=this.div;
    var p=div.parentElement;
    p.removeChild(div);
}
iv.vdivider.prototype._onMouseMove=function(event) {
	if (this.mouseCaptured){
		var b= this.decodeButtons.call(event,false);
		if(b)this.onMouseMove(event,false);
		else this.onMouseUp(event,false);
		iv.pd(event);
		event.stopPropagation();
		return true;
	}else this.onMouseHover(event);
}
iv.vdivider.prototype.onMouseHover=function(event)
{
}
iv.vdivider.prototype.decodeButtons=function(e,bt)
{
	var btn=0;
	if(bt && e.touches!=undefined)
	{
		if(e.touches.length>=3)return 4;
		return 1;
	}
	if(e.buttons==undefined)
	{
		if(e.which==1)btn=1;
		else
		if(e.which==2)btn=4;
		else
		if(e.which==3)btn=2;
		else btn=1;
	}else btn=e.buttons;
	return btn;
}
iv.vdivider.prototype.onMouseMove=function(event,touch) {
    var b=this.decodeButtons(event,false);
    if(b) {
        var e=this.getEvent(event,touch);
        if(!e)return false;
        this.value=e.pageX+this.drag_offsetX;
        if(this.onValueChanged)this.onValueChanged(this);
    } else this.releaseCapture();
    iv.sp(event);
}

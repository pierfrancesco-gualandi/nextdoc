var iv={
//invalidate
INV_MTLS:2,
INV_VERSION:4,
INV_STRUCTURE:8,
//setView
VIEW_TRANSITION:1,
VIEW_UNDO:2,
VIEW_INVALIDATE:4,
VIEW_ANIM_SET:8,
VIEW_ANIM_PLAY:16,
VIEW_VISIBLE:32,
VIEW_RESET_RCENTER:64,
// Traverse flags
R_SELECTION:4,
R_Z_NOWRITE:16,
R_Z_OFFSET:0x30000,// available in render queue item only
R_CLIP:0x1c0000,// number of clip planes

FILTER_LINEAR:1,
FILTER_MIPMAP:2,
FILTER_BOX:3,
// hit flags
HIT_LAST:1,
HIT_FULL:2,
HIT_ALL:0x0ff00,
HIT_ROOT:0x0100,
HIT_CLIP:0x0200,
HIT_GIZMO:0x0400,
//node states
NS_VIS_THIS:1,//visible this
NS_VIS_CHILDREN:2,//visible children
NS_SELECTED:4,	// selection
NS_CLOSED:8,	// closed
NS_NOZWRITE:16, // no z write
NS_NOHIT:64,	// no hit testing
NS_NOTREE:0x80, // hide in tree view
NS_CASTSHADOWS:0x100,//*
NS_RCVSHADOWS:0x200, //*
NS_NOXRAY:	0x40000,
NS_NOCLIP:32,	//* no clip
NS_MASK:16|32|0x70000|0x300,
// * - this object only

RECURSIVE:8,
OPAQUEONLY:16,
NOKEEPOLD:32,

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
getV:function (a,i,v){v[0]=a[i*3];v[1]=a[i*3+1];v[2]=a[i*3+2];},
sp:function(e){if(e)e.stopPropagation();},
pd:function(e){if(e && e.preventDefault)e.preventDefault();},
pdsp:function(e){iv.pd(e);iv.sp(e);},
stdViews:{left:{f:[-1,0,0],u:[-1,0,1]},right:{f:[1,0,0],u:[1,0,1]},front:{f:[0,-1,0],u:[0,-1,1]},back:{f:[0,1,0],u:[0,1,1]},top:{f:[0,0,1],u:[0,1,1]},bottom:{f:[0,0,-1],u:[0,-1,-1]}},
abstract:function(){this.ref=0;},
refSource:function(rc){;},
ftoI:function(a){return Math.max(Math.min(Math.round(255*a),255),0);},
f00:function(a){return[((a>>16)&0xff)/255,((a>>8)&0xff)/255,(a&0xff)/255];},
parseColor:function(a,alpha)
{
	var c;
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
			var i=a.indexOf("#");
			if(i>=0)c=iv.f00(parseInt(a.substr(i+1).trim(),16));
		}break;
	}
	if(!c)c=[1,1,1];
	if(alpha){if(c.length==3)c[3]=1.0;}else{if(c.length>3)c.splice(3);}
	return c;
},
isColor:function(a){return typeof a ==='object';}
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

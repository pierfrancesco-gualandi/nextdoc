/*
	node states


	0x40000 - do not use xray
	0x80000 - do not render. Reserved for future

traverse astate
	32 - double sided - force double sided on/off. 
	0xff00000 - render mode
*/

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

iv.node.prototype.commonTraverse = function(ctx,ptm,flags,opacity)
{
	var m=this.rmode;
	if(m!==undefined)
	{
		flags&=~0xff00000;
		if(typeof m =='string')
		{
			var M=ctx.space.getRMode(m);
			if(M)
			{
				m=this.rmode=M.index<<20;
			}else {delete this.rmode;m=0;}
		}
		flags|=m&0xff00000;
	}
	if(this.cull)
	{
		if(this.cull===1)flags|=64;
		else flags&=~64;
	}
	if(this.opacity!==undefined && opacity!==undefined)opacity*=this.opacity;

	flags|=(this.state&4);//selection
	if(this.state&1){
        m=opacity;
        if(!(flags&4)&&ctx.space.anySelection&&!(this.state&0x40000))m*=ctx.space.clrSelection[5];
        if(!ctx.action(this,ptm,flags,m))return;

    }

	if(this.state&2){
		var a=this.firstChild;
		while(a)
		{
			a.traverse(ctx,ptm,flags,opacity);
			a=a.next;
		}
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
			case 'skin':iv.initSkin(this,a,info);break;

			case 'speaker':this.setObject(new iv.speaker(a));break;  
			case 'object':this.setObject(info.objects[a]);break;
			case 'mtl':a=info.materials[a];if(a){this.material=a;if(a.bump && this.object)this.object.bump=true;}break;// generate bump tangents

			case 'bbaxis':
				this.bbtm = mat4.create();
				this.bbaxis=a;
				this.traverse=this.traverseBB;
				if(d.dir)this.bbaxisDir=d.dir;
				this.getBoundingBox=this.getBoundingBoxEmpty;
				break;

			case 'markup':
				this.traverse=this.traverseMarkup;
				this.getBoundingBox=this.getBoundingBoxEmpty;
				this.markup=a;
				if(typeof a.camera == 'number' && info.space.views)
					a.camera=info.space.views[a.camera];
				break;
			case 's':this.state=a^0x300;break;// cast/receive shadows are inverted in file
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
				return false;//?
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
				case 1:if(_c&1)a=this.d-a;break;//ping pong
				default:break;//cycle
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
iv.node.prototype.show = function(b)
{
	return this.setState((b || b==undefined)?3:0,3);
}

iv.node.prototype.showAll = function()
{
	this.setState(3,3);
	var n=this.firstChild;
	while(n)
	{
		n.showAll();
		n=n.next;
	}
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
iv.node.prototype.isSelected=function() {
	var n=this;
	while(n) {
		if(n.state&4) return true;
		n=n.parent;
	}
	return false;

}

;/*billboard functionality*/


iv.node.prototype.switchToBB = function(axis)
{
    this.bbtm = mat4.create();
	this.bbaxis=axis;
	this.traverse=this.traverseBB;
}

iv.node.prototype.traverseBB = function(ctx,ptm,astate,opacity)
{
	if(!(this.state&3))return;

	var _ptm=ptm;
	if(this.tm)
	{
		var newtm = mat4.create();
		mat4.m(this.tm,ptm,newtm);
		ptm=newtm;
	}
	
// update matrix

	var tm=this.bbtm,w=ctx.window;

	var norg=ptm?[ptm[12],ptm[13],ptm[14]]:[0.0,0.0,0.0];// node origin in world crd
	norg=mat4.mulPoint(ctx.mvMatrix,norg);
	if(norg[2]>=0)return false; //clip

    var bbScaleFactor=1;
    if(this.bbunit&&this.bbscale) {
        if(this.bbunit=='3d') bbScaleFactor=this.bbscale; else {
            bbScaleFactor=ctx.getScaleFactor(this.bbunit);
            if(!ctx.ortho)
                bbScaleFactor=-bbScaleFactor*norg[2];
            bbScaleFactor*=this.bbscale;
        }
    }

	mat4.invert(tm,ptm);
	cOrg=mat4.mulPoint(tm,ctx.view.from,[]);
	var a=this.bbaxis,alen=vec3.dot(a,a),a0=[],a1,a2=[];
	if(alen>1e-4)// around axis
	{
		vec3.normalize(cOrg);//billboard-to-viewer vector now
		alen=Math.sqrt(alen);
		if(this.bbaxisDir)
		{
			mat4.m(ptm,ctx.mvMatrix,tm);
			var p0=[_ptm[12],_ptm[13],_ptm[14]],p1=[],bF=false;
			mat4.mulPoint(tm,p0);
			mat4.mulPoint(tm,a,p1);
			if(this.bbaxisDir==1){bF=(p1[0]>p0[0]);}else if(this.bbaxisDir==2)bF=(p1[0]<p0[0]);
			if(bF)alen*=-1;
		}
		a1=[a[0]/alen,a[1]/alen,a[2]/alen];//normalization
		vec3.crossN(a1,cOrg,a0);
		vec3.crossN(a0,a1,a2);
	}else
	{
		var cUp=mat4.mulPoint(tm,ctx.view.up,[]);
		var cTarget=mat4.mulPoint(tm,ctx.view.to,[]);
		vec3.subtractN(cOrg,cTarget,a2); //billboard-to-viewer vector
		var aY=vec3.subtractN(cUp,cOrg,[]);
		vec3.crossN(aY,a2,a0);
		a1=[0,0,0];
		vec3.crossN(a2,a0,a1);
	}
	mat4.identity(tm);
    if(bbScaleFactor!=1.0)
    {
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


/*billboard functionality*/

;function zip(a){this.WSIZE=32768,this.LBITS=9,this.DBITS=6,this.slide=new Uint8Array(2*this.WSIZE),this.wp=0,this.bitBuf=0,this.bitLen=0,this.method=-1,this.eof=!1,this.copyLen=this.zip_copy_dist=0,this.tl=null,this.pos=0,this.src=a,this.srcLength=a.byteLength,this.STORED_BLOCK=0,this.fixedTL=null,this.MASK_BITS=ZIP.MASK_BITS}var ZIP={MASK_BITS:[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],cplens:[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],cplext:[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,99,99],cpdist:[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],cpdext:[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],b:[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],inflateBin:function(a,b){var c=new zip(a);return c.inflateBin(b)},inflateStr:function(a,b){var c=new zip(a);return c.inflateStr(b)},HuftNode:function(){this.e=0,this.b=0,this.n=0,this.t=null},HuftList:function(){this.next=null,this.list=null},HuftBuild:function(a,b,c,d,e,f){this.N_MAX=288,this.status=0,this.root=null,this.m=0;var g,i,j,k,l,m,n,o,q,r,s,w,y,z,A,B,C,h=new Array(17),p=new Array(17),t=new ZIP.HuftNode,u=new Array(16),v=new Array(this.N_MAX),x=new Array(17);for(C=this.root=null,m=0;m<h.length;m++)h[m]=0;for(m=0;m<p.length;m++)p[m]=0;for(m=0;m<u.length;m++)u[m]=null;for(m=0;m<v.length;m++)v[m]=0;for(m=0;m<x.length;m++)x[m]=0;i=b>256?a[256]:16,q=a,r=0,m=b;do h[q[r]]++,r++;while(--m>0);if(h[0]==b)return this.root=null,this.m=0,void(this.status=0);for(n=1;n<=16&&0==h[n];n++);for(o=n,f<n&&(f=n),m=16;0!=m&&0==h[m];m--);for(k=m,f>m&&(f=m),z=1<<n;n<m;n++,z<<=1)if((z-=h[n])<0)return this.status=2,void(this.m=f);if((z-=h[m])<0)return this.status=2,void(this.m=f);for(h[m]+=z,x[1]=n=0,q=h,r=1,y=2;--m>0;)x[y++]=n+=q[r++];q=a,r=0,m=0;do 0!=(n=q[r++])&&(v[x[n]++]=m);while(++m<b);for(b=x[k],x[0]=m=0,q=v,r=0,l=-1,w=p[0]=0,s=null,A=0;o<=k;o++)for(g=h[o];g-- >0;){for(;o>w+p[1+l];){if(w+=p[1+l],l++,A=(A=k-w)>f?f:A,(j=1<<(n=o-w))>g+1)for(j-=g+1,y=o;++n<A&&!((j<<=1)<=h[++y]);)j-=h[y];for(w+n>i&&w<i&&(n=i-w),A=1<<n,p[1+l]=n,s=new Array(A),B=0;B<A;B++)s[B]=new ZIP.HuftNode;C=null==C?this.root=new ZIP.HuftList:C.next=new ZIP.HuftList,C.next=null,C.list=s,u[l]=s,l>0&&(x[l]=m,t.b=p[l],t.e=16+n,t.t=s,n=(m&(1<<w)-1)>>w-p[l],u[l-1][n].e=t.e,u[l-1][n].b=t.b,u[l-1][n].n=t.n,u[l-1][n].t=t.t)}for(t.b=o-w,r>=b?t.e=99:q[r]<c?(t.e=q[r]<256?16:15,t.n=q[r++]):(t.e=e[q[r]-c],t.n=d[q[r++]-c]),j=1<<o-w,n=m>>w;n<A;n+=j)s[n].e=t.e,s[n].b=t.b,s[n].n=t.n,s[n].t=t.t;for(n=1<<o-1;0!=(m&n);n>>=1)m^=n;for(m^=n;(m&(1<<w)-1)!=x[l];)w-=p[l],l--}this.m=p[1],this.status=0!=z&&1!=k?1:0}};zip.prototype.getByte=function(){return this.srcLength===this.pos?-1:this.src[this.pos++]},zip.prototype.needBits=function(a){for(;this.bitLen<a;)this.bitBuf|=this.getByte()<<this.bitLen,this.bitLen+=8},zip.prototype.getBits=function(a){return this.bitBuf&this.MASK_BITS[a]},zip.prototype.ngb=function(a){for(;this.bitLen<a;)this.bitBuf|=this.getByte()<<this.bitLen,this.bitLen+=8;return this.bitBuf&this.MASK_BITS[a]},zip.prototype.dumpBits=function(a){this.bitBuf>>=a,this.bitLen-=a},zip.prototype.inflateCodes=function(a,b,c){var d,e,f=0;if(0==c)return 0;for(;;){for(e=this.tl.list[this.ngb(this.zip_bl)],d=e.e;d>16;){if(99==d)return-1;this.dumpBits(e.b),e=e.t[this.ngb(d-16)],d=e.e}if(this.dumpBits(e.b),16!=d){if(15==d)break;for(this.copyLen=e.n+this.ngb(d),this.dumpBits(d),e=this.zip_td.list[this.ngb(this.zip_bd)],d=e.e;d>16;){if(99==d)return-1;this.dumpBits(e.b),e=e.t[this.ngb(d-16)],d=e.e}for(this.dumpBits(e.b),this.zip_copy_dist=this.wp-e.n-this.ngb(d),this.dumpBits(d);this.copyLen>0&&f<c;)this.copyLen--,this.zip_copy_dist&=32767,this.wp&=32767,a[b+f++]=this.slide[this.wp++]=this.slide[this.zip_copy_dist++];if(f==c)return c}else if(this.wp&=32767,a[b+f++]=this.slide[this.wp++]=e.n,f==c)return c}return this.method=-1,f},zip.prototype.inflateStored=function(a,b,c){var d;if(d=7&this.bitLen,this.dumpBits(d),d=this.ngb(16),this.dumpBits(16),this.needBits(16),d!=(65535&~this.bitBuf))return-1;for(this.dumpBits(16),this.copyLen=d,d=0;this.copyLen>0&&d<c;)this.copyLen--,this.wp&=32767,a[b+d++]=this.slide[this.wp++]=this.ngb(8),this.dumpBits(8);return 0==this.copyLen&&(this.method=-1),d},zip.prototype.inflateFixed=function(a,b,c){if(null==this.fixedTL){var d,f,e=new Array(288);for(d=0;d<144;d++)e[d]=8;for(;d<256;d++)e[d]=9;for(;d<280;d++)e[d]=7;for(;d<288;d++)e[d]=8;if(this.zip_fixed_bl=7,f=new ZIP.HuftBuild(e,288,257,ZIP.cplens,ZIP.cplext,this.zip_fixed_bl),0!=f.status)return alert("HufBuild error: "+f.status),-1;for(this.fixedTL=f.root,this.zip_fixed_bl=f.m,d=0;d<30;d++)e[d]=5;if(this.zip_fixed_bd=5,f=new ZIP.HuftBuild(e,30,0,ZIP.cpdist,ZIP.cpdext,this.zip_fixed_bd),f.status>1)return this.fixedTL=null,alert("HufBuild error: "+f.status),-1;this.zip_fixed_td=f.root,this.zip_fixed_bd=f.m}return this.tl=this.fixedTL,this.zip_td=this.zip_fixed_td,this.zip_bl=this.zip_fixed_bl,this.zip_bd=this.zip_fixed_bd,this.inflateCodes(a,b,c)},zip.prototype.inflateDynamic=function(a,b,c){var d,e,f,g,h,i,j,k,m,l=new Array(316);for(d=0;d<l.length;d++)l[d]=0;if(j=257+this.ngb(5),this.dumpBits(5),k=1+this.ngb(5),this.dumpBits(5),i=4+this.ngb(4),this.dumpBits(4),j>286||k>30)return-1;for(e=0;e<i;e++)l[ZIP.b[e]]=this.ngb(3),this.dumpBits(3);for(;e<19;e++)l[ZIP.b[e]]=0;if(this.zip_bl=7,m=new ZIP.HuftBuild(l,19,19,null,null,this.zip_bl),0!=m.status)return-1;for(this.tl=m.root,this.zip_bl=m.m,g=j+k,d=f=0;d<g;)if(h=this.tl.list[this.ngb(this.zip_bl)],e=h.b,this.dumpBits(e),e=h.n,e<16)l[d++]=f=e;else if(16==e){if(e=3+this.ngb(2),this.dumpBits(2),d+e>g)return-1;for(;e-- >0;)l[d++]=f}else if(17==e){if(e=3+this.ngb(3),this.dumpBits(3),d+e>g)return-1;for(;e-- >0;)l[d++]=0;f=0}else{if(e=11+this.ngb(7),this.dumpBits(7),d+e>g)return-1;for(;e-- >0;)l[d++]=0;f=0}if(this.zip_bl=this.LBITS,m=new ZIP.HuftBuild(l,j,257,ZIP.cplens,ZIP.cplext,this.zip_bl),0==this.zip_bl&&(m.status=1),0!=m.status)return 1==m.status,-1;for(this.tl=m.root,this.zip_bl=m.m,d=0;d<k;d++)l[d]=l[d+j];return this.zip_bd=this.DBITS,m=new ZIP.HuftBuild(l,k,0,ZIP.cpdist,ZIP.cpdext,this.zip_bd),this.zip_td=m.root,this.zip_bd=m.m,0==this.zip_bd&&j>257?-1:(1==m.status,0!=m.status?-1:this.inflateCodes(a,b,c))},zip.prototype.inflateInternal=function(a,b,c){var d,e;for(d=0;d<c;){if(this.eof&&this.method==-1)return d;if(this.copyLen>0){if(this.method!=this.STORED_BLOCK)for(;this.copyLen>0&&d<c;)this.copyLen--,this.zip_copy_dist&=32767,this.wp&=32767,a[b+d++]=this.slide[this.wp++]=this.slide[this.zip_copy_dist++];else{for(;this.copyLen>0&&d<c;)this.copyLen--,this.wp&=32767,a[b+d++]=this.slide[this.wp++]=this.ngb(8),this.dumpBits(8);0==this.copyLen&&(this.method=-1)}if(d==c)return d}if(this.method==-1){if(this.eof)break;0!=this.ngb(1)&&(this.eof=!0),this.dumpBits(1),this.method=this.ngb(2),this.dumpBits(2),this.tl=null,this.copyLen=0}switch(this.method){case 0:e=this.inflateStored(a,b+d,c-d);break;case 1:e=null!=this.tl?this.inflateCodes(a,b+d,c-d):this.inflateFixed(a,b+d,c-d);break;case 2:e=null!=this.tl?this.inflateCodes(a,b+d,c-d):this.inflateDynamic(a,b+d,c-d);break;default:e=-1}if(e==-1)return this.eof?0:-1;d+=e}return d},zip.prototype.inflateStr=function(a){for(var b,c,d=-1,e=new Array(1024),f="",g=0,h=0;(b=this.inflateInternal(e,0,e.length))>0&&d!=this.pos;)for(d=this.pos,c=0;c<b;c++){var i=e[c];g?(g--,h|=(63&i)<<6*g,g||(f+=String.fromCharCode(h))):i<128?f+=String.fromCharCode(i):i<224?(g=1,h=(65567&i)<<6):i<240?(g=2,h=(65567&i)<<12):i<248?(g=3,h=(65543&i)<<18):i<252?(g=4,h=(65543&i)<<18):i<254?(g=5,h=(65537&i)<<30):f+=String.fromCharCode(i)}return f},zip.prototype.inflateBin=function(a){for(var b,c=0,d=-1,e=new ArrayBuffer(a),f=new Uint8Array(e);(b=this.inflateInternal(f,c=0,f.length))>0&&d!=this.pos;)d=this.pos,c+=b;return e};
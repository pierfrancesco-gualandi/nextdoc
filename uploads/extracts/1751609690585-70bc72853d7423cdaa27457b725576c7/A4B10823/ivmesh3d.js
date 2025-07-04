
iv.object=function(){iv.abstract.call(this);}
iv.object.prototype=new iv.abstract();

iv.object.prototype.preRender=function(node,tm,space,state,opacity){return true;}
iv.object.prototype.hitTest=function(ctx,tm,node){return false;}
iv.object.prototype.preHitTest=function(ctx,tm){return false;}

iv.object.prototype.setTime=function(a,t){};

// light
iv.light=function (d)
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

// camera
iv.camera=function (d)
{ 
	this.ref=0;
    this.perspective=false;
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
	 	this.player=document.createElement("audio");
		if(this.player)
		{
			this.player.autoplay=false;
			this.player.preload="auto";
			this.player.src=this.media;
		}
	}
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
		this.lineMode=false;
	}
}
iv.mesh.prototype=new iv.object();

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

// generate edge list
iv.mesh.prototype.addEdge=function (e,v1,v2)
{
	if(v2>v1){var _v=v2;v2=v1;v1=_v;}//swap vertices
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
iv.mesh.prototype.updateBumpInfo = function(f,v,n,uv)
{
	if(f&&v&&n&&uv)
	{
		if(!iv.bGetT){
			iv.bGetT=function (a,i,t){t[0]=a[i*2];t[1]=a[i*2+1];};
		}
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
	var s=space.activateMaterial(mtl,info,shFlags);
	var gl=space.gl;
	var _i=s.attrs,c=_i.length;
	for(var i=0;i<c;i++) {
		var v=_i[i];
		var b=null,f=gl.FLOAT,n=false;
		switch(v.id) {
			case 4300:b=this.vBuffer;break;
			case 4301:b=this.nBuffer;break;
			case 4302:b=this.uvBuffer;break;
			case 4306:b=this.uv2Buffer;break;
			case 4303:b=this.bnBuffer;break;
			case 4304:b=this.btBuffer;break;
			case 4305:b=this.cBuffer;f=gl.UNSIGNED_BYTE;n=true;break;
			case 4307:b=this.ceBuffer;f=gl.UNSIGNED_BYTE;n=true;break;
		}
		if(b){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.vertexAttribPointer(v.slot,b.itemSize,f,n,0,0);}
	}
}
iv.mesh.prototype.render=function(space,info) {
	
	if(this.vBuffer) {
		var state=info.state,gl=space.gl,f,F=8,fb=null;
		if(state&iv.R_Z_NOWRITE) gl.depthMask(false);
		var rm=space.rmodes[(state>>20)&0xff],m=rm.e,lm=this.lineMode,M=lm?(rm.l||rm.f):rm.f;
if(space.clips && space.clips.length && !(state&iv.NS_NOCLIP))F|=(space.clips.length<<18);
		if (m && !lm){
			f=F;

			if(m.submode==2)
				fb=this.updateEdgesI(space,info);
			else
			fb=this.updateEdges(gl);
			if (fb) {
				if(M)f|=iv.R_Z_OFFSET;
				if(this.nBuffer && m.n)f|=1;
				this.activateShader(space,m.mtl,info,f);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,fb);
				gl.drawElements(gl.LINES,fb.numItems,gl.UNSIGNED_SHORT,0);
			}
		}
		if (M)
		{
			fb=this.fBuffer;
			if(fb){
				f=F;
				if(this.nBuffer && M.n)f|=1;
				if(this.uvBuffer){f|=2;if(this.uvBuffer.itemSize==3)f|=0x1000;}
				if(this.uv2Buffer){f|=32;if(this.uv2Buffer.itemSize==3)f|=0x2000;}
				if(this.cBuffer)f|=4;
				if(this.ceBuffer)f|=64;
				if(this.bnBuffer)f|=16;
				if(state&iv.R_SELECTION)f|=256;
				if(state&64)f|=512;
				if(info.opacity<1.0)f|=1024;
				f|=(state&(iv.R_Z_OFFSET));
				this.activateShader(space,M.mtl,info,f);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,fb);
				gl.drawElements(lm?gl.LINES:gl.TRIANGLES,fb.numItems,gl.UNSIGNED_SHORT,fb.offset||0);
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

iv.bufferUpdateF=function(gl,b,v)
{
	gl.bindBuffer(gl.ARRAY_BUFFER, b);
	gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
};

iv.bufferF=function (gl,v,cmp){
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
this.setBuffer('i',null);
	this.setBuffer('c',null);
	this.setBuffer('ce',null);
	this.setBuffer('bn',null);
	this.setBuffer('bt',null);
}
iv.mesh.prototype.calcBBox=function(va) {
    if(!va)va=this.points;
    if(!va)return;
	var count=va.length;
	if(count) {
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


;iv.mesh.prototype.updateEdges2=function(force){
	var n=0,j=0,i;
	var edges=this.edges,ec=edges.length,v=this.faceVisibility;
	var changes=false;
	for(i=0;i<ec;i++) {
		var e=edges[i];
		if(e.soft) n++;
		else {
			var a=v[e.f0],b=v[e.f1];
			var bound=((a&1)!=(b&1))||(a&2)||(b&2);
			if(bound!=e.bound) {
				e.bound=bound;
				changes=true;
			}
			if(bound) n++;
		}
	}
	if(!changes&&!force)
		return null;
	var ei=new Uint16Array(n*2);
	for(i=0;i<ec;i++) {
		var e=edges[i];
		if(e.soft||e.bound) {
			ei[j]=e.v0;
			ei[j+1]=e.v1;
			j+=2;
		}
	}
	return ei;
}

vec3.fromArray=function(a,i,v)
{
	v[0]=a[i*3];
	v[1]=a[i*3+1];
	v[2]=a[i*3+2];
};

iv.updateBufferI=function(gl,b,v) {
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
	if(gl.currentBuffers) gl.currentBuffers[16]=b;
};

iv.mesh.prototype.calcFaceNormals=function(n) {
	var f=this.faces;
	var v=this.points;
	var to=f.length;
	var v1=[],v2=[];
	for(var i=0;i<to;i+=3) {
		var i0=f[i]*3,i1=f[i+1]*3,i2=f[i+2]*3;
		var x=v[i0],y=v[i0+1],z=v[i0+2];
		v1[0]=v[i1]; v1[1]=v[i1+1]; v1[2]=v[i1+2];
		v2[0]=v[i2]; v2[1]=v[i2+1]; v2[2]=v[i2+2];
		v1[0]-=x; v1[1]-=y; v1[2]-=z;
		v2[0]-=x; v2[1]-=y; v2[2]-=z;
		vec3.crossN(v1,v2);
		n[i]=v1[0];
		n[i+1]=v1[1];
		n[i+2]=v1[2];
	}
}
iv.mesh.prototype.setEdges=function(b,ei) {
	if(b) {
		if(b.numItems==ei.length) {
			iv.updateBufferI(this.gl,b,ei);
			return b;
		}
		b.ref--;
		if(b.ref<1) this.gl.deleteBuffer(b);
	}
	b=iv.bufferI(this.gl,ei,true);
	return b;
}
iv.mesh.prototype.updateFacesVisibility=function(space,info) {
	var tm=[],n;
	mat4.invert(tm,info.tm);
	var w=space.window,ctx=w.rcontext,view=w.view.getViewVectorN();
	mat4.mulVector(tm,view);
	vec3.normalize(view);
	if(this.lastEdgeVector) {
		if(vec3.compare(this.lastEdgeVector,view,1e-5))
			return false;
		vec3.cpy(this.lastEdgeVector,view);
	} else this.lastEdgeVector=view;
	var x=view[0],y=view[1],z=view[2],n=this.faceNormals,nc=n.length/3,treshold=0.0001,i,a,f;

	for(var i=0;i<nc;i++) {
		var a=(n[i*3]*x+n[i*3+1]*y+n[i*3+2]*z);
		var f=(a>=0)?1:0
		if(Math.abs(a)<treshold)
			f|=2;// show edged when normal is almost perpedicular to view vector
		this.faceVisibility[i]=f;
	}
	return true;
}

iv.mesh.prototype.updateEdgesIllustrationImp=function(space,info,force){
	if(this.faces && (this.edges || this.updateEdgesList())){
	if(!this.faceVisibility) {
		var threshold=Math.cos(23.5*Math.PI/180),edges=this.edges,ec=edges.length,n=[],i;
		this.calcFaceNormals(n);
		this.faceNormals=n;
		this.faceVisibility=new Uint8Array(this.faces.length/3);
		var n0=[],n1=[],nsoft=0;
		for(i=0;i<ec;i++) {
			var e=edges[i];
			if(e.f1==null) {
				e.soft=true;
				nsoft++;
			} else {
				vec3.fromArray(n,e.f0,n0);
				vec3.fromArray(n,e.f1,n1);
				var _cos=vec3.dot(n0,n1);
				if(_cos<threshold) {
					e.soft=true;
					nsoft++;
				}
			}
		}
	}
	if(this.updateFacesVisibility(space,info)||force) {
		var ei=this.updateEdges2(force);
		return ei;
	}}
	return null;
}

iv.mesh.prototype.updateEdgesI=function(space,info) {
	if(!this.faces) return null;
	var ei=this.updateEdgesIllustrationImp(space,info);
	if(ei) this.iBuffer=this.setEdges(this.iBuffer,ei);
	return this.iBuffer;
}

// generate edge list
iv.mesh.prototype.addEdgeI=function(e,v1,v2,f,map){
	if(map) {
		v1=map[v1];
		v2=map[v2];
	}
	if(v2<v1) { var _v=v2; v2=v1; v1=_v; }//swap vertices
	var _e0=e[v1],_e=_e0;
	if(_e) {
		while(_e) {
			if(_e.v==v2) {
				_e.f1=f;
				return;
			}
			_e=_e.next;
		}
	}
	var d={ v: v2,f0: f,f1: null };
	if(_e0) d.next=_e0;
	e[v1]=d;
};


iv.mesh.prototype.updateEdgesList=function() {
	if(!this.edges) {
		var map=this.makePointsMap();
		//var map=this.makePointsMap_old();
		var e=[];
		var f=this.faces;
		if(!f) return false;
		var nf=f.length/3;
		var j=0,i;
		for(i=0;i<nf;i++) {
			this.addEdgeI(e,f[j],f[j+1],i,map);
			this.addEdgeI(e,f[j+1],f[j+2],i,map);
			this.addEdgeI(e,f[j+2],f[j],i,map);
			j+=3;
		}
		var ne=e.length;
		if(!ne) return false;
		var edges=[];
		for(i=0;i<ne;i++) {
			var edge=e[i];
			while(edge) {
				edges.push({ v0: i,v1: edge.v,f0: edge.f0,f1: edge.f1 });
				edge=edge.next;
			}
		}
		this.edges=edges;
	}
	return true;
}

iv.mesh.prototype.makePointsMap=function() {
	var p=this.points;
	if(!p) return null;
	var c=p.length/3;
	if(c<3) return null;
	var map=[],i;
	var cmp=new iv.FMCP(p);
	var _minx=this.boxMin[0],_miny=this.boxMin[1],_minz=this.boxMin[2],
	dx=this.boxMax[0]-_minx,dy=this.boxMax[1]-_miny,dz=this.boxMax[2]-_minz,
	hx=cmp.htable[0],hy=cmp.htable[1],hz=cmp.htable[2];
	for(i=0;i<c;i++) {
		map[i]=cmp.add(
		hx*Math.ceil(((p[i*3]-_minx)/dx)*65535)+
		hy*Math.ceil(((p[i*3+1]-_miny)/dy)*65535)+
		hz*Math.ceil(((p[i*3+2]-_minz)/dz)*65535),i);
	}
	return map;
}


function MCPItem(h,iPnt) {
	this.n=null;
	this.l=null;
	this.r=null;
	this.h=h;
	this.i=iPnt;
};


iv.FMCP=function(p) {
	this.points=p;
	this.root=null;
};

iv.FMCPItem=function(h,iPnt) {
	this.n=null;
	this.l=null;
	this.r=null;
	this.h=h;
	this.i=iPnt;
};

iv.FMCP.prototype.htable=[1,87,98];
iv.FMCP.prototype.add=function(h,iPnt) {
	var pi=this.root;
	var _pi=null;
	var f=0;
	while(pi) {
		var _h=pi.h;
		_pi=pi;
		if(_h<h) {
			f=1;
			pi=pi.l;
		}
		else
			if(_h>h) {
				f=2;
				pi=pi.r;
			}
			else {
				if(pi) {
					var z=this.points;
					var x=z[iPnt*3];
					while(pi) {
						var _iPnt=pi.i;
						if((x===z[_iPnt*3])&&(z[iPnt*3+1]===z[_iPnt*3+1])&&(z[iPnt*3+2]===z[_iPnt*3+2])) return _iPnt;
						_pi=pi;
						pi=pi.n;
					}
				}
				break;
			}
	}
	pi=new iv.FMCPItem(h,iPnt);
	if(_pi) {
		switch(f) {
			case 1: _pi.l=pi; break;
			case 2: _pi.r=pi; break;
			default: _pi.n=pi; break;
		}
	} else this.root=pi;
	return iPnt;
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
			if(code==7)//op_delta
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
	l=Math.sqrt(nx*nx+ny*ny+nz*nz);//normalize, in order to avoid rounding 
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
	c=v.length;
	for(i=0;i<c;i+=3)
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
	var offset=6,n3=numPoints*3;
	if(flags&0x1000)
	{
		flags|=data.getUint16(6,true)<<16;
		offset+=2;
	}
	if(flags&0x400)nF+=65536;
	if(flags&8){this.lineMode=true;nF*=2;}else nF*=3;
	// vertices
	var v=new Float32Array(n3);
	this.readCmp(data,v,numPoints,0,3,offset,true);
	this.readCmp(data,v,numPoints,1,3,offset,true);
	this.readCmp(data,v,numPoints,2,3,offset,true);
	this.setPoints(v,space.cfgKeepMeshData&2||this.keepPoints);
	offset+=24+numPoints*6;
	var index=0,i;
	// faces
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
	//normals
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
		this.setNormals(n,this.keepNormals);
	}

	if(flags&32)// UV0
		offset=this.loadUV(data,numPoints,(flags&0x10000)?3:2,offset,0);
	if(flags&0x200)// UV1
		offset=this.loadUV(data,numPoints,(flags&0x20000)?3:2,offset,1);


	if(flags&64)// per vertex diffuse colors
	{
		var colors = new Uint8Array(n3);
		for(i=0;i<n3;i++)colors[i]=data.getUint8(offset++);
		this.setBuffer('c',iv.bufferF(this.gl,colors,3));
	}
	if(flags&128)// per vertex emissive colors
	{
		var colors = new Uint8Array(n3);
		for(i=0;i<n3;i++)colors[i]=data.getUint8(offset++);
		this.setBuffer('ce',iv.bufferF(this.gl,colors,3));
	}


	if(this.bump){this.updateBumpInfo(f,v,n,this.uvpoints);delete this.bump;}

}
iv.mesh.prototype.loadUV = function(data,numPoints,cmp,offset,ch)
{
	var uv=new Float32Array(numPoints*cmp);
	this.readCmp(data,uv,numPoints,0,cmp,offset);
	this.readCmp(data,uv,numPoints,1,cmp,offset);
	if(cmp==3)this.readCmp(data,uv,numPoints,2,cmp,offset);
	if(ch)this.setUV2(uv,false,cmp);
	else this.setUV(uv,this.bump,cmp);
	return offset+numPoints*(cmp*2)+8*cmp;
}


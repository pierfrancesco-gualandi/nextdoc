iv.clip={
// clip object

	calcClipFromTM: function(tm,c) {
		var n=[0,0,1];
		mat4.mulVector(tm,n);
		vec3.normalize(n);
		vec3.cpy(c,n);
		iv.clip._updateClipPlaneD(c,tm);
	},
_updateClipPlaneD: function(c,tm) // update D coefficient of plane equation
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
calcFace: function(mesh,p,l,i)//clipCalcFace
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
calcIntersection: function(p,i0,i1,l0,l1,segs)//clipCalcIntersection
{
	if(l1<0) {   //swap
		var a=l1; l1=l0; l0=a;
		a=i1; i1=i0; i0=a;
	}
	var d=l1-l0;
	if(d<=0) return;
	var K=-l0/d;
	var pnt=[];
	//i0*=3;i1*=3;
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
	//this.clipAble=false;
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
			//case 'dir':
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
				n=[1,0,0,1,0,0,1,0,0,1,0,0]; break;//X
			case 1:
			case 4: v=[-a,z,a,a,z,a,a,z,-a,-a,z,-a];
				n=[0,1,0,0,1,0,0,1,0,0,1,0];
				break;//Y
			default: v=[-a,a,z,a,a,z,a,-a,z,-a,-a,z];
				n=[0,0,1,0,0,1,0,0,1,0,0,1];//Z
		}

		clip.node.state|=iv.NS_NOZWRITE|iv.NS_NOCLIP;
		clip.node.state&=mask;// no shadows
		clip.node.cull=1;
		if(lines) {
			var m2=c;
			m2.setPoints(v,false);
			m2.lineMode=true;
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
			node2.material=this.getSolidMaterial(w.cfgClipPlaneColor);
			node2.setObject(m);
			//node2.opacity=0.2;
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
		if(this.clipRoot) {
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
			mesh.lineMode=true;
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
			if(!this.clipXMtl) this.clipXMtl=this.newMaterial({ "name": "clipX","emissive": { "color": cfgClipLineColor } });//clip color
			node.material=this.clipXMtl;
			node.setObject(mesh);
			node.tm=clip.tm;
		}
	}

	if(_contour.xcontour) contour=_contour.xcontour;
	if(iv.tesselator&&clip.clip.cap && _contour.cap) {
		var cdata={ contour: contour,itm: clip.itm,index: 0 },tri=new iv.tesselator();
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
	if(mesh&&mesh.points&&!(node.state&iv.NS_NOCLIP)&&!mesh.lineMode) {
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

			for(var i=0;i<c;i+=3) {// for each edge
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


iv.size=function (x,y){this.x=x||0;this.y=y||0};
iv.size.prototype.set=function (x,y)
{
	if(this.x!=x || this.y!=y)
	{this.x=x;this.y=y;return true;}
	return false;
};

iv.window=function (info)
{
	this.viewport=new iv.size();this.buffer=new iv.size();
	if(info.canvas){this.canvas=info.canvas;this.canvas.style['touch-action']='none';this.updateViewSize();}else this.canvas=null;
	if(info.callback)this.addRefTarget(info.callback);
	this.spaceId=0;
	this.view=new iv.viewInfo({from:[0,0,6],to:[0,0,0],up:[0,1,0],fov:90});
	this.cfgAutoSpin=1;// &1 - auto rotation on mouse up, &2 0 
	this.cfgMouseDelta=2;
	this.cfgSpinSpeed=1.0;
	this.cfgOrbitMode=1;
	this.cfgButtons=[1,2,4];
	this.cfgMinDistance=1e-6;this.cfgMaxDistance=1e8;

	this.cfgMouseWheel=2;
	this.cfgBkColor=(info.color!==undefined)?info.color:0x7f7f7f;
	this.cfgResources="res/";
	this.clrSelection=[1,0,0,0.5,1,1];
	this.cfgXRayAlways=false;
	this.initHardware();
	this.vpVersion=0;
	this.structVersion=0;// used by shadows
	this.textures=[];
	this.imp={lastTouchDistance:-1,LY:0,LX:0,mouseMoved:false,mouseCancelPopup:false,mouseCaptured:false,numFrames:0};

	this.cfgClipLineColor=[1,1,1];
	this.cfgClipCapsColor=null;
	this.cfgClipCapsByObj=true;
	this.cfgClipPlaneColor=[0,0,0.25,0.2];//0x010140;
	this.cfgClipBorderColor=0xffffffff;


	this.handler=null;
	this.m_undo=null;
	this.m_undovp=null;
	this.cfgEditorCrd="local";//local,world,parent
	this.cfgEditorMode="";
	this.cfgEditorAxis=1;
	this.cfgSelOnDown=false;

	this.cfgRotateMouseHit=false;
	this.cfgAllowSelection=true;

	this.timer=false;
	this.postRepaint=false;
	if(this.gl)
	{
		if(info.file)this.load(info.file,info);else this.space=null;
		this.gl.enable(this.gl.DEPTH_TEST);
		this.initHandlers();
		this.initEvents();
		this.invalidate();
	}
	if(window.performance && window.performance.now)
		this.getTickCount=function(){return window.performance.now();};else	this.getTickCount=function(){var d=new Date();var time=d.getTime();return time;};
	this.rcontext=new iv.rcontext(this);
	this.layer=null;
}
iv.window.prototype=new iv.refSource();
iv.window.prototype.refSourceName="wnd";
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
	var c=this.canvas,r=c.getBoundingClientRect();
	this._uvs(r.width,r.height,c.width,c.height);
}
iv.window.prototype.setViewSize=function(w,h,bw,bh){
	var c=this.canvas;
	if(w&&h&&c){
		if(!bh)bh=h;
		if(!bw)bw=w;
		c.height=bh;c.width=bw;
		c.style.width=''+w+'px';
		c.style.height=''+h+'px';
		this._uvs(w,h,bw,bh);
	}
}
iv.window.prototype.initHandlers=function()
{
	var w=this,i={move:function(event){return w._onMouseMove(event);},down:function(event){return w.onMouseDown(event,false);},up:function(event){return w.onMouseUp(event,false);},
		dbl:function(event){return w._onDblClick(event); },
		touchstart:function(event){return w.onTouchStart(event);},
		touchcancel:function(event){return w.onTouchCancel(event);},
		touchend:function(event){return w.onTouchEnd(event,true);},
		touchmove:function(event){return w.onTouchMove(event);},
		pointerdown:function(event){return w.onPointerDown(event);},
		pointerup:function(event){return w.onPointerUp(event);},
		pointermove:function(event){return w.onPointerMove(event);},
		lostcapture :function(event){return w.onLostCapture(event);},
		menu:function(event){return w._onContextMenu(event);},
		wheel:function(event){w.onMouseWheel(event);},
		a:function(){w.animate();}};
	this.input=i;
}
iv.window.prototype.initEvents=function()
{
	var w=(/Firefox/i.test(navigator.userAgent))?"DOMMouseScroll":"mousewheel",c=this.canvas,i=this.input;
	this.setEvent(c,w,i.wheel);
	this.setEvent(c,"contextmenu",i.menu);	
	this.setEvent(c,"selectstart",function(){return false;});// Chrome/FF
	if (window.PointerEvent && navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && this.canvas.setPointerCapture)//>1 was here
	{
		this.pointers=[];
		this.setEvent(c,"pointerdown",i.pointerdown);
		this.setEvent(c,"pointermove",i.pointermove);
		this.setEvent(c,"pointerup",i.pointerup);
		this.setEvent(c,"lostpointercapture",i.lostcapture)
	}else
	{
		this.setEvent(c,"mousedown",i.down);
		this.setEvent(c,"mousemove",i.move);
		this.setEvent(c,"dblclick",i.dbl);	
		this.setEvent(c,"touchstart",i.touchstart);
	}
}
iv.window.prototype.releaseCapture=function()
{
	if(this.imp.mouseCaptured)
	{
		var e=this.canvas,i=this.input;
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
		this.delEvent(e,"touchcancel", i.touchcancel);
		this.imp.mouseCaptured=false;
	}
}
iv.window.prototype.checkRCenter=function(p)
{
	var I=this.imp,h=this.cfgRotateMouseHit;
	if(h)
	{
		if(h.length==3)I.rCenter=h.slice();
		else{
		var h=this.hitTest(p);
		if(h)I.rCenter=h.pnt.slice();
		}
	}else I.rCenter=null;
	I.x0=p.x;
	I.y0=p.y;
}
iv.window.prototype.setCapture=function()
{
	if(!this.imp.mouseCaptured)
	{
		var e=this.canvas,i=this.input;
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
		this.imp.mouseCaptured=true;
	}
}
iv.window.prototype.delEvent=function(d,e,f)
{
	if (d.detachEvent) //if IE (and Opera depending on user setting)
		d.detachEvent("on"+e, f);
	else if (d.removeEventListener) //WC3 browsers
		d.removeEventListener(e, f);
}
iv.window.prototype.setEvent=function(d,e,f)
{
	if (d.attachEvent) //if IE (and Opera depending on user setting)
		d.attachEvent("on"+e, f);
	else if(d.addEventListener) //WC3 browsers
		d.addEventListener(e, f);
}
iv.window.prototype.initHardware=function()
{
	var r=null;
	if(window.requestAnimationFrame)r=window.requestAnimationFrame;else
	if(window.webkitRequestAnimationFrame)r=window.webkitRequestAnimationFrame;else
	if(window.mozRequestAnimationFrame)r=window.mozRequestAnimationFrame;else
	r=function(callback){window.setTimeout(callback,1000/60)};
	this.requestAnimFrame=r;
	var n = ["webgl","experimental-webgl","webkit-3d","moz-webgl"],cfg={alpha:false};

	if(this.cfgBkColor===null){cfg.alpha=true;cfg.premultipliedAlpha= true};

	for (var i=0;i<n.length;i++) 
	{
		try {
			this.gl = this.canvas.getContext(n[i],cfg);
		}catch (e){  }
		if(this.gl)break;
	}
	if (!this.gl) this.notify("error",{type:"hardware",info:"Could not initialise WebGL"});
	return this.gl!=null;
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
iv.transitionView=function(wnd,view,flags)
{
	this.transition=iv.easeInOut;
	this.type="view";
	this.wnd=wnd;
	this.old=wnd.getView();
	this.target=view;
	this.current=new iv.viewInfo(null);
	this.current.bind=view.bind;
	this.current.fov=view.fov;
	if(flags)this.flags=flags;
	this.duration=600;
	this.tm=[];
	this.prepare(view);
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
		if(!c.ortho)c.fov=t.fov*k+o.fov*_k;
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
	if(b){
		v.scale= 1.0/(l*Math.tan(Math.PI*v.fov/(360)));
	}else
	{
		l*=v.scale;
		if(l>1e-6)
			v.fov=Math.atan(1/l)*360/Math.PI;
	}
	v.ortho=b;
	this.invalidate(iv.INV_VERSION);
	return true;
}
iv.window.prototype.getFOV=function(v) // return half FOV in radians
{
	if(!v)v=this.view;
	var fov=v.fov*Math.PI/360;// FOV/2
	var sx=this.viewport.x/2,sy=this.viewport.y/2,bind=v.bind;
	if(bind=='max')
		bind=sx>sy?'h':'v';
	else
		if(bind=='min')bind=sx<sy?'h':'v';
	if(bind=='h')
	{ 
		var d=sx/Math.tan(fov);
		fov=Math.atan(sy/d);
	}else
	if(bind=='d')
	{
		var sxy=Math.sqrt(sx*sx+sy*sy);
		var d=sxy/Math.tan(fov);
		fov=Math.atan(sy/d);
	}
	return fov;
}

iv.window.prototype._activateFavourite=function(f,toend)
{
	if(f.anim)
	{
		var _a=f.anim,s=this.space,a=s.getAnimation(_a.id);
		if(a)
		{
			var start=iv.any(_a.start,a.start),end=iv.any(_a.end,a.end);
			var t=toend?end:start;
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
		var i=_i.length-1;
		var wasFound=false;
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
iv.window.prototype.setView=function(V,flags)
{
	if(!V)return;
	var v=new iv.viewInfo(V);
	v.src=V;// reference to original

	if(V.anim)v.anim=V.anim;
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
	if(flags===undefined)flags=0;
	V=this.view;
	if(V.camera && (V.camera!=v.camera))V.camera=null;
	if(!this._cmpViews(V,v))
	{

	if(flags&iv.VIEW_UNDO)this.undoVp("View");
	if(flags&iv.VIEW_RESET_RCENTER)this.imp.rCenter=null;


	if(flags&iv.VIEW_TRANSITION)
	{
		this.stopAR();
		this.removeAnimationType("view",true);
		this.addAnimation(new iv.transitionView(this,v,flags));
		return;
	}
	V.update(v);
	}

	if(flags&iv.VIEW_ANIM_SET)flags|=this._playFavAnimation(v,flags);

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
    var ortho=(c.perspective===false);
    if(ortho==this.isOrtho())
    {
        this.setView(d,flags);
    }else
    {
        this.setView(d,0);
        this.setOrtho(ortho);
    }
}
iv.window.prototype.unload=function()
{
	var _i=this.transitions;
	while(_i && _i.length)this._removeAnimation(0);
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
		this.space=null;
	}
}
iv.cloneNode=function(parent,node,params)
{
	var n=parent.newNode();
	if(node.object)
		n.setObject(node.object);
	if(node.material)n.material=node.material
	n.name=node.name;
	if(node.bbaxis)// billboard stuff
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
	if(info.ext=='IV3D') s.loadBin(r.response);
	else s.load(JSON.parse(r.responseText));
	var notify={space:s,file: info.file};
	if(info.iid)
		notify.iid=info.iid;
	var code,g=null;
	if(info.merge){
		if(info.nolights)info.space.removeLights();
		g=this.space.merge(info.space);
		if(g)
			code="merged";
	}else
{
		this.checkLightsAndView();
		if(info.zoom)this.setDefView();
		
		code="dataReady";
	}
	if(info.nonotify)code=null;
	if(info.parent && g){
		g.addRef();
		g.parent.remove(g);
		info.parent.insert(g);
		g.release();
	}
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
			this.setView(v);
			this.space.view=this.getView();
		}
	}

	if(!searchLight(s.root)){
		var l=[
			{color:[0.5,0.5,0.5],dir:[-0.57735,-0.57735,-0.57735],type:1},
			{color:[0.8,0.8,0.9],dir:[0.57735,0.57735,-0.57735],type:1},
			{color:[0.9,0.9,0.9],dir:[-0.242536,0,0.970143],type:1}];
			for(var i=0;i<l.length;i++)l[i].shadow=true;
		this.setLights(l);
	}
};

iv.window.prototype.load=function (file,d)
{
	var s=new iv.space(this,this.gl),w=this,ext=((d && d.type)?d.type:file.substr(file.lastIndexOf('.') + 1)).toUpperCase(),p={loaded:0,total:1};
	var index=ext.indexOf('?');if(index>0)ext=ext.substring(0,index);
	if(d && d.path)s.path=d.path;

	var _info={file:file,space:s,ext:ext};
	if(d){
		_info.merge=!!d.merge;
		if(d.nonotify)_info.nonotify=d.nonotify;
		if(d.iid)_info.iid=d.iid;
		if(d.callback)_info.callback=d.callback;
		if(d.parent)_info.parent=d.parent;
		if(d.nolights)_info.nolights=true;
		if(d.nonotify)p=null;
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
	if(!this.space)return;
	var I=this.mouseUpInfo,n=I.node;
	if(!this.cfgAllowSelection)return;
	if(n && this.isGizmo && this.isGizmo(n))return;
	var old=this.space.selNode,doDef=true;
	if(!this.notify('selection',{node:n,old:old,shift:I.shift,ctrl:I.ctrl},true))return;
	if(I.shift)doDef=!this.space.selectRange(old,n);
	if(doDef){
		if(I.ctrl||n){
			var bSelect=true;
			if(I.ctrl&&n&&n.state&4) bSelect=false;
			this.space.select(n,bSelect,I.ctrl);
		}else {
			if(old){
				if(down)
					I.deselect=true;
				else
				{
					if(I.deselect)this.space.select(null,false,false);
				}
			}
		}
	}
}
iv.window.prototype.handleObjSelect_down=function(x,y,event)
{
	this.mouseUpInfo=null;
	this.imp.mouseMoved=false;
	var h=this.hitTest(x,y),n=h?h.node:null,bCtrl=(event.ctrlKey==1),i={node:n,hitInfo:h,x:x,y:y};
	if(this.notify("mousedown",i,true))
	{
		this.mouseUpInfo={h:h,node:i.node,ctrl:bCtrl,shift:event.shiftKey};
		if(this.cfgSelOnDown)
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
	var ar=this.commonMouseUp1(), e=event;
	if(touch){
		if(event.touches.length)
			e=event.touches[0];
		else e=null;
	}
	var p=this.getClientPoint(e,touch);
	p.b=1;
	if(!touch && (event.button!==undefined))p.b=1<<event.button;
	this.commonMouseUp2(p,event,ar);
	this.releaseCapture();
}
iv.window.prototype.commonMouseUp1=function(){
	var a=this.last,ar=this.cfgAutoSpin;
	if(a){
		if(ar&1){
			var dt=this.getTickCount()-a.t;
			if(dt<200){ this.removeAnimationType("view"); this.addAnimation(new iv.anim.spin(this,dt));ar=0;}
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
iv.window.prototype.getClientPoint=function (e,touch)
{
	var r=this.canvas.getBoundingClientRect(),x=null,y=null,j,_e,l;
	if(e){
		x=e.clientX;y=e.clientY;
		if(touch && e.touches)
		{
			l=e.touches.length;
			if(l){
				_e=e.touches[0];
				x=_e.clientX;y=_e.clientY;
				if(l>1)
				{
					for(j=1;j<l;j++){_e=e.touches[j];x+=_e.clientX;y+=_e.clientY;}
					x/=l;y/=l;
				}
			}
		}
		x-=r.left;y-=r.top;
	}else {x=this.imp.LX;y=this.imp.LY;}
	return {x:x,y:y,r:r}
}
iv.window.prototype.decodeButtons=function(e,bt)
{
	var btn=0;
	if(bt && e.touches!=undefined)
	{
		if(e.touches.length>=3)return 4;// pan
		return 1;
	}
	if(e.buttons===undefined)//chrome stuff
	{
		switch(e.which)
		{
		case 2:btn=4;break;
		case 3:btn=2;break;
		default:btn=1;
		}
	}else btn=e.buttons;// IE and Mozila
	return btn;
}
iv.window.prototype._onContextMenu=function(event)
{
	iv.pd(event);
	var I=this.imp;
	if(I.mouseCancelPopup&&I.mouseMoved)
	{
		iv.sp(event);
		I.mouseCancelPopup=false;return false;
	}
	if(this.onContextMenu)this.onContextMenu(event);
	return true;
}
iv.window.prototype._onDblClick=function(event){
	if(this.onDblClick)this.onDblClick(event,false);
	iv.pdsp(event);
	return true;
}
iv.window.prototype.onTouchMove=function(event) 
{
	var p=this.getClientPoint(event,true),t=event.touches;
	this.onMouseMove(event,p,t&&t.length>1?t:null,1);
	iv.pd(event);
	return false;
}

iv.window.prototype.onTouchCancel=function (event)
{
	this.onMouseUp(event,true);
	if(event.cancelable)iv.pd(event);
}
iv.window.prototype._onMouseMove=function(event){
	if (this.imp.mouseCaptured){
		var b=this.decodeButtons(event,false),p;
		if(b){
			p=this.getClientPoint(event,false);
			this.onMouseMove(event,p,null,b);
		}else this.onMouseUp(event,false);
		iv.pdsp(event);
		return true;
	}else {
		p=this.getClientPoint(event,false);p.b=0;
		this._onMouseHover(event,p);
	}
	return false;
}
iv.window.prototype._onMouseHover=function(event,p) 
{
	if(this.handler && this.handler.onMouseHover){
		if(!this.onHandler(this.handler.onMouseHover(p,event)))
			return false;
	}
	this.onMouseHover(event,p);
}
iv.window.prototype.onMouseHover=function(event,p)
{
	if(!this.notify("mousehover",p,true))return 0;
if(!this.notifyNode("mousehover",p))return 0;if(this.nodeNotifyMask&1)this.canvas.style.cursor=(p.url)?"pointer":"default";
	if(this.onMouseHoverGizmo)this.onMouseHoverGizmo(event,p);
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
	if(a && a.detach)flags|=a.detach(this);
	this.handler=h?h:null;
	return flags;
}

// pointer support
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
iv.window.prototype.commonTouch=function(event)
{
	var p=this.getClientPoint(event,true),I=this.imp;
	I.LX=p.x;I.LY=p.y;
	I.lastTouchDistance=-1;
	I.mouseMoved=false;
}
iv.window.prototype.onTouchEnd=function (event)
{
	if(!event.touches || !event.touches.length)this.onMouseUp(event,true);
	else this.commonTouch(event);
	if(event.cancelable)iv.pd(event);
}
iv.window.prototype.checkDblTap=function(event)
{
	var t=this.getTickCount(),i=this.imp,r=true;
	if(this.onDblClick&& (i.lastTouchTime!==undefined))
	{
		var dt=(t-i.lastTouchTime);
		if(dt<500){
		this.onDblClick(event,true);
		t=undefined;
		r=false;}
	}
	i.lastTouchTime=t;
	return r;
}
iv.window.prototype.onTouchStart=function(event)
{
	var t=event.touches;
	if(t){
		if(((t.length==1) || (t.length>1 && !this.imp.mouseCaptured))){
			if(this.checkDblTap(event))this.onMouseDown(event,true);
		}else if(t.length>1 && this.imp.mouseCaptured)this.commonTouch(event);
	}
}
iv.window.prototype.onPointerDown=function(event)
{
	if(!this.pointers || !this.pointers.length)
	{
		if(!this.checkDblTap(event))return;
	}
	var p=this.getClientPoint(event),id=event.pointerId,I=this.imp;
	p.b=this.decodeButtonsPointer(event);
	var ptr=this.getPointer(id,true);
	ptr.clientX=p.x;ptr.clientY=p.y;
	if(this.pointers.length==1)
	{
		this.last={x:0,y:0,t:0};
		I.lastTouchDistance=-1;
		if(this.commonMouseDown1(p,event))
		{
			this.canvas.setPointerCapture(id);
			this.commonMouseDown2(p,event);
		}
	}
}
iv.window.prototype.onPointerUp=function(event)
{
	iv.pdsp(event);
	if(event.pointerId){
		this.deletePointer(event.pointerId);
		this.canvas.releasePointerCapture(event.pointerId);
	}else this.pointers=[];
	if(!this.pointers.length)
	{
		this.commonMouseUp1();
		var p=this.getClientPoint(event);
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
		this.canvas.releasePointerCapture(_i[i].id);
	this.pointers=[];
	this.commonMouseUp1();
	this.commonMouseUp2({x:10,y:10,b:1},event);
}
iv.window.prototype.onPointerMove=function(event)
{
	iv.pdsp(event);
	var p=this.getClientPoint(event),ptr=this.getPointer(event.pointerId,false);
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
		this._onMouseHover(event,p);
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
	var p=this.getClientPoint(event,touch);
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

	b=this.mapButtonToNavigation(b,event);

		switch(b)
		{
			case 1:if(!I.mouseMoved)this.undoVp("Orbit");
				this.addIR(dX,dY,1);this.doOrbit(dX,dY);flags|=8;break;
			case 2:if(!I.mouseMoved)this.undoVp("Zoom via Dolly");
				if(!this.doDolly(dX,dY))return;
				flags|=8;break;
			case 3:if(!I.mouseMoved)this.undoVp("Zoom via FOV");
				if(!this.doFOV(dX,dY))return;
				flags|=8;break;
			case 4:if(!I.mouseMoved)this.undoVp("Pan");this.doPan(dX,dY);flags|=8;break;
		}

		}

	}}
	this.onHandler(flags);
	I.mouseMoved|=mv;
	if(I.mouseMoved){I.LX=p.x;I.LY=p.y;}
}
iv.window.prototype.mapButtonToNavigation=function(b,event){
	switch(b){
		case 1:b=this.cfgButtons[0];break;
		case 2:b=this.cfgButtons[1];this.imp.mouseCancelPopup=true;break;
		case 4:b=this.cfgButtons[2];break;
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
iv.window.prototype.onMouseWheel=function(event)
{
	var d;
	if(event.wheelDelta!=undefined)d=event.wheelDelta/-10;
	else
		if(event.detail!=undefined){
			d=event.detail;
			if(d>10)d=10;else if(d<-10)d=-10;
			d*=4;
		}

	if(this.m_undovp)
	{
		var u=this.m_undovp;
		var name="Mouse Wheel";
		if(u.canRedo() || u.getLastUndoDescription()!=name && u.open())
		{
			u.add(new iv.undo.vp(this));
			u.accept(name);
		}
	}
	this.checkRCenter(this.getClientPoint(event));

	switch(this.cfgMouseWheel)
	{
		case 2:this.doDolly(0,d);break;
		case 3:this.doFOV(0,d);break;
	}
	this.invalidate(iv.INV_VERSION);
	iv.pd(event);
}
iv.window.prototype.commonVPNotify=function(t,v,x,y){return {type:t,dX:x,dY:y,center:(this.imp.rCenter||v.to).slice()}};
iv.window.prototype.isCustomCenter=function(i,v){return i.center && !vec3.compare(i.center,v.to,1e-8);}
iv.window.prototype.doPan=function(dX,dY)
{
	var v=this.getView(),i=this.commonVPNotify("pan",v,dX,dY),d;
	if(this.notify("camera",i,true)){
		if(this.isCustomCenter(i,v))
		{
			this.hcontext.update();
			var V=this.hcontext.worldToView(i.center,[]);
			V[0]+=dX;V[1]+=dY;
			d=vec3.subtract(i.center,this.hcontext.viewToWorld(V,[]),[]);
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
		if(this.isCustomCenter(i,v))
		{
			var r0=this.getRay(I.x0,I.y0);
			this.setView(v);
			v.transform(vec3.subtract(r0,this.getRay(I.x0,I.y0)));
		}
	}else{
		var dir=vec3.subtract(v.from,i.center,[]),l=vec3.length(dir);
		i.len=Math.min(Math.max(l+l*dY/100,this.cfgMinDistance),this.cfgMaxDistance);
		if(!this.notify("camera",i,true))return false;
		var _dir=vec3.add(vec3.scale(dir,i.len/l,[]),i.center);
		var delta=vec3.subtract(_dir,v.from,[]);
		vec3.cpy(v.from,_dir);
		vec3.add(v.up,delta);
		if(this.isCustomCenter(i,v))// move traget point too
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
	/* function returns two points - start, end*/
	var w=this.viewport.x,h=this.viewport.y,v=this.view,p1=v.from,p2=v.to,dir=v.getViewVector(),up=v.getUpVector();
	vec3.normalize(up);
	var vx=vec3.crossN(dir,up,[]),h2=h/2,w2=w/2,i;
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
iv.context.prototype.addClip=function(node,a){/*do nothing*/}
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
			}}
		this.ortho=!!v.ortho;
		if(v.ortho)
			this.screenScale=this.bbScaleFactor=1/(this.H2*v.scale);
		else {
			var fov=w.getFOV(v);
			this.bbScaleFactor=Math.tan(fov)/this.H2;
			this.screenScale=1.0/Math.tan(fov);
			if(utm){
				this.bbScaleFactor/=utm[0];
				this.screenScale/=utm[0];
			}
		}
		this.utm=utm;
		if(utm){
			mat4.lookAt(mat4.mulPoint(utm,v.from,V.from),mat4.mulPoint(utm,v.to,V.to),mat4.mulVector(utm,up,V.up),this.mvMatrix);
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
iv.context.prototype.worldToView=function(w,v)
{
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
iv.rcontext.prototype.worldToView=function(w,v)
{
	var _w=w;
	if(this.utm)
		_w=mat4.mulPoint(this.utm,w,[]);
	return iv.context.prototype.worldToView.call(this,_w,v);
}
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
	var s=this.space,l=this.layer;
	if(s){
		this.rcontext.update(s.unitMatrix);
		s.render(this.rcontext);
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
	if(this.timer)return ;
	this.timer=true;
	this.requestAnimFrame.call(window,this.drawScene.bind(this));
}
iv.easeInOut=function(a){return 0.5+Math.sin((a-0.5)*Math.PI)/2;}

iv.window.prototype.animate=function()
{
	var j=0,rez=0,uFlags=0,inv=false;
	var time = this.getTickCount(),_i=this.transitions;
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
			if(t.type && t.type==type)
				return i;
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
iv.window.prototype.setModelView =function(v,flags)
{
	if(!flags)flags=iv.VIEW_ANIM_SET|iv.VIEW_ANIM_PLAY|iv.VIEW_TRANSITION|iv.VIEW_RESET_RCENTER;
	this.stopAR();
	if(v.from)this.setView(v,flags);else{
		var s=this.space;
		if(s && s.views && v>=0 && v<s.views.length)
		{
			v=s.views[v];
			if(v)this.setView(v,flags);
		}}
}
iv.window.prototype.getStdView=function (m)
{
	var v=this.getView(),d=vec3.distance(v.from,v.to),t=v.to,i;
	m=iv.stdViews[m];
	if(m){for(i=0;i<3;i++){v.from[i]=t[i]+d*m.f[i];v.up[i]=t[i]+d*m.u[i];}}
	return v;
}
iv.window.prototype.setStdView=function(mode,flags){
	var v=this.getStdView(mode);
	if (v){
		this.stopAR();
		if(flags==undefined)flags=iv.VIEW_RESET_RCENTER;
		if(flags&iv.VIEW_UNDO){this.undoVp("Set "+mode);flags&=~iv.VIEW_UNDO;}
		this.setView(v,flags);
	}
}
iv.window.prototype.getViewToBox=function(v,b)
{
	if(!v)v=this.getView();
	var sz=box3.size(b),to=box3.middle(b),l=vec3.length(sz)/2;
	if(this.view.ortho)
	{
		v.scale=1/l;
		l=vec3.subtract(to,v.to,[]);
		vec3.add(v.from,l);
		vec3.add(v.up,l);
	}else{
		var dir=v.getViewVectorN(),up=v.getUpVector();
		vec3.scale(dir,-l/Math.sin(this.getFOV(v)));
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
	if(flags==undefined)flags=iv.VIEW_RESET_RCENTER;
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
iv.window.prototype.loadObject=function(name,parent,cb){
	if(this.space){
		var r=this.space.resources;
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
			var n=this.space.root.newNode();n.state=0;
			r=this.space.resources={group:n,items:[]};
		}
		var res={name:name,node:null,items:[{parent:parent,cb:cb}]};
		r.items.push(res);
		var info={path:this.cfgResources,callback:function(n)
			{
				res.node=n;
				for(var i=0;i<res.items.length;i++)
					{var a=res.items[i];var _n=iv.cloneNode(a.parent,n);if(a.cb)a.cb(_n);};
		    },parent:r.group,merge:true,nonotify:true,nolights:true};
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

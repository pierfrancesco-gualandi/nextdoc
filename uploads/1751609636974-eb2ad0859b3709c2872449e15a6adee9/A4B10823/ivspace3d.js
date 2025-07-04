iv.space=function (view,gl){
	this.gl=gl;
	this.window=view;
	this.spaceId=view.spaceId;
	view.spaceId++;
	this.activeShader=this.view=this.root=null;
	this.materials=[];
	this.shaders={v:[],p:[]};
	this.cfgDbl=this.cfgTextures=true;
	this.cfgKeepMeshData=3;// & 1 - faces, & 2 - vertices
	this.cfgDefMtl=null;
	this.cfgSelZOffset=false;
	this.cfgRMode=0;
	this.clrSelection=view.clrSelection;
	this.stdLights=this.anySelection=false;
	this.extensions={};
	// each item f - faces, e - edge, n - normals, mtl - custom material
	this.rmodes=[/*render modes*/
	{f:{n:true},name:"solid"},
	{f:null,e:{n:false,color:0},name:"wire"},
	{f:null,e:{n:true},name:"wireshaded"},
	{f:{n:true},e:{n:false,color:0},name:"solidwire"},
	{f:{n:true,color:0xffffff},e:{n:false,color:0},l:{n:false,color:0},name:"hiddenwire"},
	{f:{n:false,color:0xffffff},e:{n:false,submode:2,color:0},l:{n:false,color:0},name:"illustration"},
	{f:{n:true},e:{n:false,submode:2,color:0},l:{n:false,color:0},name:"solidillustration"},
	{f:{n:true},e:{n:false,submode:2,color:0},l:{n:false,color:0},name:"outline"}

];
this.lights=[];
this.projectionTM = mat4.create();
this.modelviewTM = mat4.create();	
this.meshesInQueue=0;
if(gl){
	this.e_ans=(this.getExtension('EXT_texture_filter_anisotropic') ||this.getExtension('MOZ_EXT_texture_filter_anisotropic') ||this.getExtension('WEBKIT_EXT_texture_filter_anisotropic'));
	
	var e=this.getExtension("EXT_blend_minmax");
	this.e_alpha_blend=e?e.MAX_EXT:gl.FUNC_ADD;
	
	if(this.e_ans)
		this.e_ansMax = gl.getParameter(this.e_ans.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
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
	C|=iv.ftoI(a)<24;
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

// update shader inputs
iv.space.prototype.updateShadeArgs=function(a){
	var gl=this.gl,i,p=this.activeShader,ca=(p)?p.attrs.length:0,na=a?a.attrs.length:0;//current attributes, new attributes

	if(na>ca) //enable the missing attributes
	{
		for(i=ca;i<na;i++) gl.enableVertexAttribArray(i);
	}
	else if(na<ca) //disable the extra attributes
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
		if(this.activeShader)this.activateShader(null,null);// disable material
		s.update();
	}
	this.activateShader(s,info,flags);
	return s;
}

iv.bk3d=function(space,txt)
{
	var gl=space.gl;
	this.uv=new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]);
	this.uvBuffer=iv.bufferF(gl,this.uv,2);
	this.vBuffer=iv.bufferF(gl,[-1.0,-1.0, 0.0,1.0, -1.0, 0.0,-1.0,1.0, 0.0,-1.0,1.0, 0.0,1.0,-1.0, 0.0,1.0,1.0,0.0],3);
	var mtl=new iv.material(space);
	var d={wrapS:gl.CLAMP_TO_EDGE,wrapT:gl.CLAMP_TO_EDGE};
	if(typeof txt==='number')d.inline=txt;else d.texture=txt;
	mtl.load({emissive:d});
	this.mtl=mtl;
	this.texture=mtl.emissive[0].texture;
}
iv.space.prototype.drawBk=function(){

	if(this.bk&&this.bk.texture.ready) {
		var gl=this.gl,wnd=this.window;
		if(wnd.buffer.y&&wnd.buffer.x) {
			gl.clear(gl.DEPTH_BUFFER_BIT);
			var bk=this.bk,b=null,w=512,h=512,img=bk.texture.image;
			if(img && img.naturalWidth)w=img.naturalWidth;else if(bk.texture.width)w=bk.texture.width;
			if(img && img.naturalHeight)h=img.naturalHeight;else if(bk.texture.height)h=bk.texture.height;
			var s=this.activateMaterial(bk.mtl,{opacity:1.0},2);
			for(var i=0;i<s.attrs.length;i++) {
				var v=s.attrs[i];
				switch(v.id) {
					case 4300: b=bk.vBuffer; gl.bindBuffer(gl.ARRAY_BUFFER,b); break;
					case 4302: {b=bk.uvBuffer;
						gl.bindBuffer(gl.ARRAY_BUFFER,b);

					} break;
				}
				if(b) gl.vertexAttribPointer(v.slot,b.itemSize,gl.FLOAT,false,0,0);
			}
			gl.disable(gl.DEPTH_TEST);
			gl.depthMask(false);
			gl.drawArrays(gl.TRIANGLES,0,6);
			gl.enable(gl.DEPTH_TEST);
			gl.depthMask(true);
			return true;
		}
	}
	return false;
}

iv.space.prototype.invalidate = function(f){this.window.invalidate(f);}
iv._handle_txt=function(i,t){t.notify("status");delete i.ivtexture;if(t.inline)URL.revokeObjectURL(i.src);}
iv.handleLoadedTexture=function(){
	var t=this.ivtexture,s=t.space;
	if(this.naturalWidth>0 && this.naturalHeight>0)
	{	
		t.bind().setImage(this);
		if(t.filter==iv.FILTER_MIPMAP)t.mipMap();
		t.unbind();
	}else t.error=true;
	iv._handle_txt(this,t);
	s.checkTextures();
	s.invalidate();
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
// no insertion into list
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
iv.space.prototype.getTexture = function(str,target,mtl) {	
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
	}else
		if(str=='$(camera)'){if(iv.HandleCameraTexture)iv.HandleCameraTexture(t);}
		else this.loadTexture2d(t,path?path+str:str);    
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
		if(n.object && n.object instanceof iv.light)n.setObject(null);
		n=n.firstChild;
		while(n)
		{
			t(n);
			n=n.next;
		}
	}
	if(this.root)t(this.root);
}
iv.space.prototype.merge=function(s) {
	if(s.root) { 
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
		this.root.insert(n);// check refcounts
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
iv.space.prototype.loadBin=function(buffer)
{
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
			d={objects:[],textures:is};l=ms.length;

			for(i=0;i<l;i++)d.objects.push(new iv.mesh(this.gl));
			this.loadImp(js,d);
			for(i=0;i<l;i++)
			{
				var info=ms[i];
				d.objects[i].load(this,ZIP.inflateBin(this.getBinData(buffer,info),info.sz));
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

	var m=n.markup;
	if(m)
	{
		if(m.pin0Target)m.pin0Target=this.root.searchId(m.pin0Target);
		if(m.pin1Target)m.pin1Target=this.root.searchId(m.pin1Target);
	}

	var m=n.pmi;
	if(m)
	{
		var _i=m.destination,d=[];
		if(_i){
		for(var i=0;i<_i.length;i++)
		{
			var n=this.root.searchId(_i[i]);
			if(n)d.push(n);
		}
		m.destination=d;
		}
	}

	n=n.firstChild;
	while(n)
	{
		this.postProcessNode(n);
		n=n.next;
	}
};

iv.space.prototype.postProcess=function(d)
{
if(d.skins)for(i=0;i<d.skins.length;i++)d.skins[i].post(this);
	if(this.root)this.postProcessNode(this.root)
}

iv.space.prototype.loadImp=function(data,d) {
	var s=data.space,i,a,c;
	d.materials=[];d.space=this;
	if(s.materials)
		for(i=0;i<s.materials.length;i++) {
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
			var v=s.views[i];
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
	if(s.bbox)
	{
		mat4.setScale(tm,s.bbox[0]);
		tm[12]=s.bbox[1];
		tm[13]=s.bbox[2];
		tm[14]=s.bbox[3];
	}

	if(s.view){
		a=s.view;
		c=this.view={from:a.from||a.org,to:a.to||a.target,up:a.up};
		if(a.fov)c.fov=a.fov;
		if(a.viewScale){c.scale=a.viewScale;c.ortho=true;}
		if(a.camera)c.camera=this.root.searchId(a.camera);
		if(a.bind)c.bind=a.bind;
	}
	c=s.config;
	if(c)
	{
		for(var v in c)
		{
			switch(v)
			{
				case "bkfaces":this.cfgDbl=c[v];break;
			}
		}
	}
	if(s.meta)this.meta=s.meta;
	this.postProcess(d);
	if(s.bkinline)
		this.bk=new iv.bk3d(this,s.bkinline);
	else
		if(s.bk!=undefined)
			this.bk=new iv.bk3d(this,s.bk);
}
iv.space.prototype.load=function(data){
	if(data && data.space) {
			var m=data.space.meshes,d={ objects:[]},i,obj;
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

iv.space.prototype.renderQueue=function(items)
{
	var c=items.length,a,gl=this.gl,i,b,d;
	for(i=0;i<c;i++){
		b=items[i],d=(b.state&8)!=0;
		if(d!=a) {
			if(d) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
			a=d;
		}
		b.object.render(this,b);
	}
}

iv.space.prototype.updatePrjTM=function(ctx) {
	var wnd=this.window,V=wnd.view,gl=this.gl,ok=false,far=0,near=0,tm=this.projectionTM,kx;
    
	for(var iPass=1;iPass<ctx.q.length;iPass++) {
		var q=ctx.q[iPass],c=q.L;
		if(!c)continue;
		var items=q.I,iO,d;
		for(iO=0;iO<c;iO++) {
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
}
iv.space.prototype.zCompareFunc=function(a, b) {
	var _a = a ? a.near : -1e38, _b = b ? b.near : -1e38;
	if (_a > _b) return -1; if (_a < _b) return 1; return 0;
}
iv.space.prototype.prepareLights=function() {
	var _i=this.lights,d=_i.length-this.currentLight,org=[0,0,0],i;

	if(d>0) {  
		
		_i.splice(this.currentLight,d);
	}
	for(i=0;i<_i.length;i++) {
		var l=_i[i],L=l.light;
		if(L.type!==l.type)l.type=L.type;
		l.color=L.color;
		if(L.type!=1) {
			if(l.tm) l.org=mat4.mulPoint(l.tm,org,[]); else l.org=org;
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
		var gl=this.gl,astate=this.cfgRMode<<20,i,blend=false,q,L,_i;
		if(this.cfgDbl)astate|=8;
		this.currentLight=0;
		this.root.traverse(ctx,this.unitMatrix,astate,1.0);
		if(this.clipCheckPlanes)this.clipCheckPlanes(ctx,astate);
		if(!this.stdLights)
			this.prepareLights();
		this.window.drawBk(this);
		gl.cullFace(gl.BACK);
		this.updatePrjTM(ctx);
		for(i=1;i<ctx.q.length;i++) {
			q=ctx.q[i];L=q.L;
			if(!L)continue;
			_i=q.I;
			if(_i.length>q.L)_i.splice(q.L, _i.length-q.L);
			if(i>3)
			{
				if(!blend)
				{
					gl.enable(gl.BLEND);
					gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

					if(ctx.window.cfgBkColor===null)gl.blendEquationSeparate(gl.FUNC_ADD, this.e_alpha_blend);

					blend=true;
				}
				if(i>=7)gl.clear(gl.DEPTH_BUFFER_BIT);
				_i.sort(this.zCompareFunc);
			}
			this.renderQueue(_i);
			q.L=0;
		}
		if(blend)gl.disable(gl.BLEND);
		this.activateMaterial(null);//reset state
	}
}
iv.space.prototype.getMaterial=function(name){
	var it=this.materials,i,m;
	for(i=0;i<it.length;i++) {
		m=it[i];
		if((m.name!==undefined)&&m.name==name) return m;
	}
	return null;
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
iv.space.prototype.setTime = function(t)
{
	var A=this.anim,i,_i;
	if(A&&A.snap)t=Math.round(t*A.fps)/A.fps;
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

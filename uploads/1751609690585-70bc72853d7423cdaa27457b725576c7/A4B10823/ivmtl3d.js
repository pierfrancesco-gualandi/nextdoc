/* material 3d interface
Material flags
 1 - n
 2 - uv
 4 - colors
 8 - tm
 16 - bump
 32 - uv2
 64 - color emissive
 256 - selected
 512 - double sided
 1024 - transparency
 2048 - shadows (0x800)
 0x1000 - UV0 Q
 0x2000 - UV1 Q
 0x30000 - z offset
0x1c0000 - clip planes. R_CLIP
*/

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
	this.attrs=[];// list of attributes
	this.vars=[];// list of variables
	this.textures=[];
	this.program=null;
	this.vShader=null;
	this.fShader=null;
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

iv.material.prototype.clear = function()
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

iv.material.prototype.isChannel  = function(c)
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

iv.material.prototype.newChannel = function(type,ch)
{
	if(!ch)ch=new iv.mtlchannel();
	if(!(type in this))this[type]=[];
	this[type].push(ch);
	this.valid=false;
	return ch;
}

iv.material.prototype.getChannel = function(type)//returns first channel
{
	if(!(type in this))return null;
	var items=this[type];
	return items[0];
}


iv.material.prototype.newTexture = function(c,name,type)
{
	var gl=this.gl;
	if(type===undefined)type=gl.TEXTURE_2D;
	c.texture=this.space.getTexture(name,type,this);
	if(type==gl.TEXTURE_CUBE_MAP)c.wrapT=c.wrapS=gl.CLAMP_TO_EDGE;
	else
	{
		if(!c.wrapS)c.wrapS=gl.REPEAT;
		if(!c.wrapT)c.wrapT=gl.REPEAT;
	}
}

iv.material.prototype.cnvTtxMatrix=function (a)
{
	var tm=mat3.create(),index=0,i,j;
	for(i=0;i<3;i++)
	{
		for(j=0;j<2;j++){tm[i*3+j]= a[index];index++;}
	}
	tm[2]=0;tm[5]=0;tm[8]=1;
	return tm;
}

iv.material.prototype.loadChannelImp=function(v,name) {
	var c=this.newChannel(name),t=v.texture;
	if(v.color!==undefined) c.setColor(v.color);
	if(v.amount!==undefined) c.amount=v.amount;
	if(v.blend) c.blend=v.blend;
	if(!t && v.inline)t="?s"+this.spaceId+"i"+v.inline;
	if(t!==undefined){
		var type;
		if(v.type&&v.type=="cube") {
			if(this.gl) type=this.gl.TEXTURE_CUBE_MAP;
			else type=0x8513;// double check this
		}
		if(v.tm)
			c.tm=this.cnvTtxMatrix(v.tm);
		if(v.cmp) c.cmp=v.cmp;
		if(v.filter) c.filter=v.filter;
		if(v.uvset)c.uv=v.uvset;else c.uv=0;
		if(v.wrapT) c.wrapT=v.wrapT;
		if(v.wrapS) c.wrapS=v.wrapS;
		if(v.format) c.format=v.format;
		this.newTexture(c,t,type);
	}

	if(v.anims)c.anims=v.anims;

}

iv.material.prototype.loadChannel=function(v,name) {
	var type=typeof v;
	if(type==="number") {
		var c=this.newChannel(name);
		if(name=='opacity') c.amount=v; else c.setColor(v);
	}else
		if(type==="object") {
			if(v instanceof Array) {
				var len=v.length;
				if((len==3)&&(typeof v[0]=='number')&&(typeof v[1]=='number')&&(typeof v[2]=='number')) {
					var c=this.newChannel(name);
					c.setColor(v);
				} else {
					for(var i=0;i<len;i++) this.loadChannelImp(v[i],name);
				}
			} else this.loadChannelImp(v,name);
		}
};

iv.material.prototype.load=function(d)
{
	for(var v in d)
	{
	var a=d[v];
	switch(v)
	{
	case "lightmap":
	case "diffuse":
	case "specular":
	case "emissive":
	case "reflection":
	case "opacity":
	case "bump":this.loadChannel(a,v);break;
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
	if(!this.staticColors)flags&=~256;// remove selection
	if(!this.space.cfgTextures)flags&=~(2|32);
	// we may need to remove bits from flags
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
	else	return this.addChU(4104,"ch"+c._id+"amount",1,c).name;
}

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
					text+="vec3 lup=reflect(eyeDirection,normal);lup.y*=-1.0;vec4 refColor="+"textureCube(txtUnit"+t.slot+",lup);";//sorry - only one reflection texture, remove lup.y-1 from here
					tname="refColor";
				}else{
					tname="txtColor"+t.slot;
				}
			}
		}
		if(tname && c.amount!==null)aname=this.addAmount(c);
		if(cname || tname)
		{
			var local=null;
			if(aname && tname){local="vec3("+aname+")*vec3("+tname +")";
				if(cname)local+="*"+cname;
			}else
				if(cname && tname)local=cname+"*vec3("+tname+")";// color by texture
				else
					if(cname)local=cname;
					else local="vec3("+tname+")";
			if(i && c.texture)
			{
				if(c.format=='rgba'){
					if(aname)aname=aname+'*'+tname+'.a';
					else
						aname=tname+'.a';
				}}
			if(text2.length)
			{
				if(c.blend=='blend' && aname)text2="mix("+text2+","+local+','+aname+')';
				else
					text2="("+text2+")"+this.getBlend(c)+local;
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
		var txt=null,tAlpha=false;
		for(var i=0;i<ch.length;i++)
		{
			var c=ch[i],tname=null,aname=null;
			c._id=this.channelId++;
			if(c.texture && c.texture.ready)
			{
				var t=this.getTexture(c);
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

iv.shader.prototype.compile=function(i,type){return this.mtl.space.getShader(i.join('\r\n'),type);}

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
				a++;//counter of textures
			}
			ft.push("vec4 txtColor"+t.slot+"=texture2D(txtUnit"+t.slot+","+ ((t.tm)?"_uv":"vUV"+t.uv)+");");
		}
	}
}

iv.shader.prototype.addUVV = function(a,c,s)
{
	var S=s?3:2;
	this.addVarying("vUV"+(s?"Q":"")+a,S);
	this.addAttr(c,"inUV"+a,S);
}

iv.shader.prototype.update = function()
{
	var mtl=this.mtl,gl=mtl.gl,i,vt=[],ft=[],F=this.flags,space=mtl.space,lights=space.lights;
	if(this.program)this.detach(mtl.gl);
	this.numLights=lights.length;
	this.channelId=0;
	this.loadedtextures=0;

	this.t={varyings:[],ft:ft,vt:vt};

	var bNormals=(F&1)!=0,bSpecular=false,bDiffuse=false,bLights=false,bReflection=false,bBump=false,bLightMap=false;
	var bEmissive=mtl.isChannel(mtl.emissive);
	var bOpacity=mtl.isChannel(mtl.opacity) || (F&1024);
	this.addAttr(4300,"inV",3);

	if(F&8)this.addVarying("wPosition",4);

	if(F&4){//diffuse colors
		this.addAttr(4305,"inC",3);
		this.addVarying("vC",3);
	}

	if(F&64){// emissive colors
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
		if(F&iv.R_Z_OFFSET)// z offset
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
			case 0://point

			break;
			case 1:ls.dirName=ls.vdir.name;//Infinite
break;
			case 2://Spot
				var	vspot=this.addLightVar(4117,"light"+i+"Spot",l,3);
				ft.push("angle=smoothstep("+vspot.name+"[1],"+vspot.name+"[0],dot(lightDir,"+ls.vdir.name+"));");aUsed=true;
break;
			}
			if(l.attenuation)// at this point lightDistance is not used
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
	var alpha="1.0";

	if(bOpacity)
	{
		var n;
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
		ft.push("gl_FragColor=vec4(color,"+n+");");
	}else {
	if(bReflection)this.handleChannel(gl,mtl.reflection,null,ft);
		ft.push("gl_FragColor=vec4(color,1.0);");
	}
	ft.push("}");

	this.insertVars(vt,ft);

	

	ft.splice(0,0,"precision mediump float;");

	this.vShader = this.compile(vt,gl.VERTEX_SHADER);
	this.fShader = this.compile(ft,gl.FRAGMENT_SHADER);

	var shPrg=this.program=gl.createProgram();
	gl.attachShader(shPrg,this.vShader.handle);
	gl.attachShader(shPrg,this.fShader.handle);
	gl.linkProgram(shPrg);

	if (!gl.getProgramParameter(shPrg, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

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

// newObj means that we only update shader
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
			//case 4105:gl.uniform1f(s,-0.0006);break;// positive - move backward
			case 4106:gl.uniform1f(s,info.opacity);break;
			default:
			if(!newObj)// update this only for fully new shader
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


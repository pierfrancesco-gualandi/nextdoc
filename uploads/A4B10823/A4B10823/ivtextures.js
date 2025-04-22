iv.texture=function(gl,a){
	if(gl) {
		iv.abstract.call(this);
		this.ref=1;
		this.gl=gl;
		this.target=gl.TEXTURE_2D;
		this.channels=gl.RGBA;
		this.type=gl.UNSIGNED_BYTE;
		this.width=this.height=0;
		this.filter=iv.FILTER_MIPMAP;
		this.ready=false;
		if(a) {
			if(a.target) this.target=a.target;
			if(a.channels) this.channels=a.channels;
			if(a.type) this.type=a.type;
		}
		this.handle=gl.createTexture();
	}
}
iv.texture.prototype=new iv.abstract();
iv.texture.prototype.isCube=function() { return this.target==this.gl.TEXTURE_CUBE_MAP;}
iv.texture.prototype.is2d=function() { return this.target==this.gl.TEXTURE_2D;}
iv.texture.prototype.destroy=function() {
	if(this.handle) { this.gl.deleteTexture(this.handle); this.handle=null;}
	this.ready=false;
	return this;
};
iv.texture.prototype._bind=function(unit,v){
	if(!unit) unit=0;
	this.gl.activeTexture(this.gl.TEXTURE0+unit);
	this.gl.bindTexture(this.target,v);
	return this;
};
iv.texture.prototype.bind=function(unit){return this._bind(unit,this.handle);};
iv.texture.prototype.unbind=function(unit){return this._bind(unit,null);};
iv.texture.prototype.setImage=function(img,i){
	var gl=this.gl; if(i===undefined) i=this.target;
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,this.is2d());
	gl.texImage2D(i,0,this.channels,this.channels,this.type,img);
	this.width=img.naturalWidth;
	this.height=img.naturalHeight;
	if(this.is2d()) this.ready=true;
	return this;
}
iv.texture.prototype.setSize=function(w,h){
	this.width=w;
	this.height=h;
	this.gl.texImage2D(this.target,0,this.channels,w,h,0,this.channels,this.type,null);
	return this;
};
iv.texture.prototype.setFilter=function(min,mag){
	if(!mag)mag=min;
	this.gl.texParameteri(this.target,this.gl.TEXTURE_MAG_FILTER,mag);
	this.gl.texParameteri(this.target,this.gl.TEXTURE_MIN_FILTER,min);
	return this;
}
iv.texture.prototype.mipMap=function() {
	var pot=iv.isPOW2(this.width)&&iv.isPOW2(this.height),gl=this.gl,min=this.gl.LINEAR,max=pot?gl.LINEAR_MIPMAP_NEAREST:
	this.setFilter(min,max);
	if(pot)gl.generateMipmap(this.target);
	return this;
}
iv.texture.prototype.linear=function() { return this.setFilter(this.gl.LINEAR);};
iv.texture.prototype.nearest=function() { return this.setFilter(this.gl.NEAREST);};
iv.texture.prototype.wrap=function(s,t) {
	if(!t) t=s;
	this.gl.texParameteri(this.target,this.gl.TEXTURE_WRAP_S,s);
	this.gl.texParameteri(this.target,this.gl.TEXTURE_WRAP_T,t);
	return this;
}

iv.texture.prototype.clampToEdge=function() { this.wrap(this.gl.CLAMP_TO_EDGE); return this; };
iv.texture.prototype.repeat=function() { this.wrap(this.gl.REPEAT); return this; };
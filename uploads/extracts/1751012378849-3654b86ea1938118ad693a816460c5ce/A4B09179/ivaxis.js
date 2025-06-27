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
iv.axis3d.prototype._cmpViews=function (a,b)
{
  return iv.window.prototype._cmpViews.call(this,a,b);
}
iv.axis3d.prototype._playFavAnimation =function(v,flags){return 0;}
iv.axis3d.prototype.load=function (file,path)
{
	this.space=new iv.space(this,this.gl);
	if(path!=undefined)this.space.path=path;
    var request  = iv.createRequest(file,path);
	request.ivspace=this.space;
	request.ivwnd=this;
    request.responseType = "arraybuffer"
	request.onreadystatechange = function () {
		if (this.readyState == 4 && this.status==200) {
			this.ivspace.loadBin(this.response);
            this.ivspace.view={from:[this.ivwnd.camDistance,0,0],to:[0,0,0],up:[this.ivwnd.camDistance,0,1],fov:40};
            this.ivwnd.setView( new iv.viewInfo(this.ivspace.view));
            this.ivwnd.invalidate();
		}
	}
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
               case 0:gl.viewport(0,vp.y-H,W,H);break;// left, top corner
               case 1:gl.viewport(0,0,W,H);break;// left, bottom corner
               case 2:gl.viewport(vp.x-W,vp.y-H,H,H);break;// right, top corner
               case 3:gl.viewport(vp.x-W,0,W,H);break;// right, bottom corner
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



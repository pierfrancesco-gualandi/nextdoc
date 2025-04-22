// clip result flags
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
	if(!w.divRectangle) {
		w.divRectangle=iv.getSubElementById(w.canvas.parentElement,"selectionRect");
	}
	if(w.divRectangle)
		this.rect=w.divRectangle;
	else {

		var r=document.createElement("div");
		var s=r.style;
		s.position="absolute";
		s.background="rgba(0,122,204,0.2)";
		s.display="none";
		s.borderColor="#ffffff";
		s.borderStyle="solid";
		s.borderWidth="1px";
		s["z-index"]=1;
		w.canvas.parentElement.appendChild(r);
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
	// limit to viewport width
	var d=this.rectData;
	var x=Math.max(Math.min(p.x,w.viewport.x),0);
	var y=Math.max(Math.min(p.y,w.viewport.y),0);

	d.x0=Math.min(this.X0,x); d.x1=Math.max(this.X0,x);// right order
	d.y0=Math.min(this.Y0,y); d.y1=Math.max(this.Y0,y);// right order

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
        //this.rect.parentElement.removeChild(this.rect);
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
    // we have directions, now- compute clip plav    
    
    p.push(this.planeEquation(rTL,iv.getRayPoint(rTL,1),iv.getRayPoint(rTR,1)));//top
    p.push(this.planeEquation(rBR,iv.getRayPoint(rBR,1),iv.getRayPoint(rBL,1)));//bottom
    p.push(this.planeEquation(rTL,iv.getRayPoint(rBL,1),iv.getRayPoint(rTL,1)));//left    
    p.push(this.planeEquation(rTR,iv.getRayPoint(rTR,1),iv.getRayPoint(rBR,1)));//right
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
		//var nextflag = 0;
		if ( !(in1.f&mask) )_poly.push(in1); // first point of edge 'inside' plane

		if ( (in1.f&mask) != (in2.f&mask) )
		{
			
			var d1 = vec3.dot(plane,in1.v)+pd;
			var d2 = vec3.dot(plane,in2.v)+pd;

			if ( d2 < 0 )//swap
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
				return null;//sort of bug in calculation
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
	if(out) // fully outside
		return iv.CLIP_OUTSIDE;
	
	if((inside==0x0f) && (!_out))
		return iv.CLIP_INSIDE;
    
	if(this.clipPlane([y[0],y[1],y[3],y[2]]))return iv.CLIP_INTERSECT;// top face
	if(this.clipPlane([y[4],y[6],y[7],y[5]]))return iv.CLIP_INTERSECT;// bottom face
	if(this.clipPlane([y[2],y[3],y[7],y[6]]))return iv.CLIP_INTERSECT;// 
	if(this.clipPlane([y[0],y[2],y[6],y[4]]))return iv.CLIP_INTERSECT;// 
	if(this.clipPlane([y[1],y[0],y[4],y[5]]))return iv.CLIP_INTERSECT;// 
	if(this.clipPlane([y[3],y[1],y[5],y[7]]))return iv.CLIP_INTERSECT;// 
    
	return iv.CLIP_OUTSIDE;
}


iv.nodeRectSelectProc=function(node,tm,d,state) {
	if(node.name=='$markups$')
		return false;
	if(node.object&&(!node.object.lineMode))// do not test lines for now
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
	if(node.object&&(!node.object.lineMode))// do not test lines for now
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

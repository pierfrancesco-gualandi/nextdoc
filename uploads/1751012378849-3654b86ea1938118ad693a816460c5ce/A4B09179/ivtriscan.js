 var iv=iv||{};

iv.tesselator=function() {
	this.contour=[];
	this.segments=[];
};

iv.tesselator.prototype.setData=function(data)
{
	if(data.contour)this.contour=data.contour;	
}

iv.tesselator.segment=function(v0,v1)
{
	if(v0){
	this.y= v0[1];
	this.a=	v0;
	this.b=	v1;
}
}

iv.tesselator.knot=function(y)
{
	this.y=y;
	this.up=null;
	this.down=null;
	this.index=0;
}
iv.tesselator.knot.prototype.addSegment=function(s)
{
	if(this.segments)this.segments.push(s);
	else this.segments=[s];
}
iv.tessKnotsCompareFunc=function(a,b)
{
	if(a.a.x<b.a.x)return -1;
	if(a.a.x>b.a.x)return 1;
	return 0;
}

iv.tessSegCompareFunc=function(a,b)
{
	if(a.y<b.y)return -1;
	if(a.y>b.y)return 1;
	return 0;
}

iv.tesselator.prototype.makeSegments=function()
{
	var _i=this.contour,i,_s=this.segments;
	for(i=0;i<_i.length;i+=2)
	{
		var v0=_i[i],v1=_i[i+1];
		if(v0[1]==v1[1])continue;// ignore horiontal segments
		var seg;
		if(v0[1]<v1[1])seg=new iv.tesselator.segment(v0,v1);
		else seg=new iv.tesselator.segment(v1,v0);
		_s.push(seg);
	}
	if(_s.length<2)return false;
	_s.sort(iv.tessSegCompareFunc);
	var _top=_s[0].a[1];
	var _bottom=_s[this.segments.length-1].b[1];
	if(this.bounds){
	if(_top==this.bounds.top && _bottom==this.bounds.bottom)
	{
		
	}else
	{
    //console.log("error");		
	}
	}else
	{
		this.bounds={top:_top,bottom:_bottom};
		this.epsilon=(_bottom-_top)*1e-5;
	}
	return true;
}

iv.tesselator.prototype.updateBounds=function() {
	
	var p=this.contour[0];
	var left=p[0],right=p[0],top=p[1],bottom=p[1];	
	
	for(var iC=1;iC<this.contour.length;iC++) {
		var p=this.contour[iC];
		var x=p[0],y=p[1];
		if(x<left)left=x;
		else
		if(x>right)right=x;
		if(y<top)top=y;
		else
		if(y>bottom)bottom=y;
	}
	if(top<bottom){
	this.bounds={top:top,bottom:bottom,left:left,right:right};
	this.epsilon=(bottom-top)*1e-6;
	return true;
}
return false;
}

iv.tesselator.prototype.getKnot=function(y)
{
	var k=this.knots,_k=null,t;
	while(k)
	{
		_k=k;
		if(Math.abs(k.y-y)<this.epsilon)return k;
		if(y<k.y){k=k.top;t=true;}
		else {k=k.bottom;t=false;}
	}
	k=new iv.tesselator.knot(y);
	if(_k)
	{
		if(t)_k.top=k;
		else _k.bottom=k;

	}else this.knots=k;
	return k;
}
iv.tesselator.prototype.knotifySegment=function(s)
{
	var k0=this.getKnot(s.a[1]),xa=s.a[0];
	var k1=this.getKnot(s.b[1]),xb=s.b[0];
	s.a={knot:k0,x:xa};
	s.b={knot:k1,x:xb};
}

iv.tesselator.prototype.makeKnotsList=function(k,_i)
{
	if(k.top)this.makeKnotsList(k.top,_i);
	_i.push(k);
	if(k.bottom)this.makeKnotsList(k.bottom,_i);
}

iv.tesselator.prototype.splitSegment=function(s)
{
	var top=s.a,bottom=s.b;
	if(top.knot===bottom.knot)return false;// horizontal segment
	var y0=top.knot.y, height=bottom.knot.y-y0,x0=top.x;
	var from=top.knot.index,to=bottom.knot.index;
	var split=(to-1)-from;
	if(split<1 /*|| split>1*/)
	{
		this.segments.push(s);
		top.knot.addSegment(s);
	}else{
		
		for(var i=from+1;i<to;i++)
		{
			var k=this.knots[i];
			var K=(k.y-y0)/height;
			var b={x:x0*(1.0-K)+bottom.x*K,knot:k};

			var s=new iv.tesselator.segment(null);
			s.a=top;
			top.knot.addSegment(s);
			
			s.b=b;
			top=b;
			this.segments.push(s);
		}
		s=new iv.tesselator.segment(null);
		s.a=top;
		s.b=bottom;
		top.knot.addSegment(s);
		this.segments.push(s);

	}

}
iv.tesselator.prototype.splitSegments=function()
{
	var _i=this.segments;
	this.segments=[];
	for(var i=0;i<_i.length;i++)
	{
		this.splitSegment(_i[i]);
	}
	//console.log(this.segments.length);
};
iv.tesselator.prototype.makeKnots=function()
{
	this.knots=null;
	var _i=this.segments;
	var i0=Math.ceil(_i.length/2),i1=i0+1;
	var any=true;
	while(any)
	{
		any=false;
		if(i0>=0)
		{
			this.knotifySegment(_i[i0]);
			i0--;
			any=true;
		}
		if(i1<_i.length)
		{
			this.knotifySegment(_i[i1]);
			i1++;
			any=true;
		}
	}
	var _i=[];
	this.makeKnotsList(this.knots,_i);
	this.knots=_i;	
	for(var i=0;i<_i.length;i++)
	{
		var k=_i[i];
		k.index=i;
		k.top=k.bottom=null;
		if(i && (_i[i-1].y>=_i[i].y)) // debug code
		{
				console.error("error in knots array");
		}

	}
	//console.log(_i.length);
};

iv.tesselator.prototype.processVertex=function(a,start)
{
	if(a.V===undefined)
	{
	var x=a.x,y=a.knot.y;
	var v=this.vertices;
	for(var iv=start;iv<v.length;iv++)
	{
		var V=v[iv];
		if(V[1]==y && V[0]==x)
		{
			a.V=iv;
			return;
		}
	}
		a.V=v.length;
		v.push([x,y]);
	}
}

iv.tesselator.prototype.makeVertices=function()
{
	var _i=this.knots,i,_t=this.trianges=[],v=this.vertices=[],start=0;
	for(i=0;i<_i.length;i++)
	{
		var k=_i[i];
		if(k.segments)
		{
			k.segments.sort(iv.tessKnotsCompareFunc);
			for(var j=0;j<k.segments.length;j++)
			{
				this.processVertex(k.segments[j].a,start);
			}
			start=v.length;
			for(var j=0;j<k.segments.length;j++)
			{
				this.processVertex(k.segments[j].b,start);
			}
		}
	}
	//console.log("vertices:",v.length);
}

iv.tesselator.prototype.finalize=function()
{
	var _i=this.knots,i;
	var t=this.triangles=[],v=[];
	
	for(i=0;i<_i.length;i++)
	{
		var k=_i[i];
		if(k.segments)
		{
		
		for(var j=0;j<k.segments.length;j+=2)
		{
			var s0=k.segments[j],s1=k.segments[j+1];
			if(s0 && s1){
			 v[0]=s0.a;
			 v[1]=s1.a;
			 v[2]=s1.b;
			 v[3]=s0.b;
			 if(v[0].V==v[1].V)
			 {
				//triangle
				t.push([v[1].V,v[2].V,v[3].V]);
			 }else
			 if(v[2].V==v[3].V)
			 {
				//triangle
				t.push([v[0].V,v[1].V,v[2].V]);
			 }else
			 {
				// quad
				t.push([v[0].V,v[1].V,v[2].V]);
				t.push([v[2].V,v[3].V,v[0].V]);
			 }}
		}
	}
	}
	//console.log("triangles:",t.length);
};


iv.tesselator.prototype.process=function()
{
	if(this.updateBounds()&&this.makeSegments())
	{
	this.makeKnots();
	this.splitSegments();
	//this.dbgDraw();
	this.makeVertices();
	this.finalize();
	}
}
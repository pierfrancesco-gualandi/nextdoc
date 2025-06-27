/*vertical divider*/

iv.vdivider=function (div)
{
    this.div=div;
    this.initInput();
    this.mouseCaptured=false;
}
function ivRemoveEvent(d,e,f)
{
	if (d.detachEvent) //if IE (and Opera depending on user setting)
		d.detachEvent("on"+e, f);
	else if (d.removeEventListener) //WC3 browsers
		d.removeEventListener(e, f);
}

function ivSetEvent(d,e,f)
{
	if (d.attachEvent) //if IE (and Opera depending on user setting)
		d.attachEvent("on"+e, f);
	else if (d.addEventListener) //WC3 browsers
		d.addEventListener(e, f);
}
iv.vdivider.prototype.initInput=function()
{
    var wnd=this;
    var i={"move":function(event) { return wnd._onMouseMove(event); },"down":function(event) { return wnd.onMouseDown(event,false); },"up":function(event) { return wnd.onMouseUp(event,false); },
		"touchstart":function(event) { return wnd.onMouseDown(event,true);},
		"touchcancel":function(event) { return wnd.onTouchCancel(event);},
		"touchend":function(event) { return wnd.onMouseUp(event);},
		"touchmove":function(event) { return wnd.onTouchMove(event);},
    };
    this.input=i;
    ivSetEvent(this.div,"mousedown",i.down);
    ivSetEvent(this.div,"mousemove",i.move);
    ivSetEvent(this.div,"touchstart",i.touchstart);
}

iv.vdivider.prototype.releaseCapture=function()
{
    if(this.mouseCaptured)
    {
        var e=this.div;
        if(e.releaseCapture)e.releaseCapture();
        else
        {
            var i=this.input;
            ivRemoveEvent(document,"mousemove",i.move);
            ivRemoveEvent(document,"mouseup",i.up);
        }
	ivRemoveEvent(e,"mouseup",i.up);
	ivRemoveEvent(e,"touchmove", i.touchmove);
	ivRemoveEvent(e,"touchend", i.touchend);
	ivRemoveEvent(e,"touchcancel", i.touchcancel);
        this.mouseCaptured=false;

    }
}

iv.vdivider.prototype.setCapture=function()
{
    if(!this.mouseCaptured)
    {
	var e=this.div,i=this.input;
       if(e.setCapture)e.setCapture();else
       {
        ivSetEvent(document,"mousemove",i.move);
        ivSetEvent(document,"mouseup",i.up);
       }
	    ivSetEvent(e,"touchmove", i.touchmove);
	    ivSetEvent(e,"touchend", i.touchend);
	    ivSetEvent(e,"touchcancel", i.touchcancel);

       this.mouseCaptured=true;
    }
}
iv.vdivider.prototype.onTouchMove=function(event) 
{
	this.onMouseMove(event,true);
	iv.pd(event);
	return false;
}

iv.vdivider.prototype.onTouchCancel=function (event)
{
	this.onMouseUp(event,true);
	if(event.cancelable)iv.pd(event);
}


iv.vdivider.prototype.getEvent=function(event,touch) {
    if(touch) {
        if(event.touches&&event.touches.length) {
            event=event.touches[0];
        }else return null;
    }
    return event;
}

iv.vdivider.prototype.onMouseDown=function(event,touch)
{   
    if(1)
    {
    var w=event.currentTarget;    
    var _w=event.target;
    event=this.getEvent(event,touch);
    if(!event)return false;

        this.setCapture();
        var r=w.getBoundingClientRect();
        var rp=w.parentElement.getBoundingClientRect();
        this.drag_offsetX=r.left-event.clientX;

    }else
    {
    //console.log("fail");
    }
    //iv.pd(event);
}

iv.vdivider.prototype.onMouseUp=function (event)
{
    this.releaseCapture();
    iv.pd(event);
}

iv.vdivider.prototype.isResizeCursor=function (event,r)
{
	var d=15;
	if ( ((r.bottom-d)<event.clientY) && ((r.right-d)<event.clientX) )return true;
	return false;
}


iv.vdivider.prototype.closeThisPopup=function() {
    var div=this.div;
    var p=div.parentElement;    
    p.removeChild(div);
}

iv.vdivider.prototype._onMouseMove=function(event) {
	if (this.mouseCaptured){
		var b= this.decodeButtons.call(event,false);
		if(b)this.onMouseMove(event,false);
		else this.onMouseUp(event,false);
		iv.pd(event);
		event.stopPropagation();
		return true;
	}else this.onMouseHover(event);
}

iv.vdivider.prototype.onMouseHover=function(event) 
{

}

iv.vdivider.prototype.decodeButtons=function(e,bt)
{
	var btn=0;
	if(bt && e.touches!=undefined)
	{
		if(e.touches.length>=3)return 4;// pan
		return 1;
	}
	if(e.buttons==undefined)
	{
		// chrome stuff
		if(e.which==1)btn=1;
		else
		if(e.which==2)btn=4;
		else
		if(e.which==3)btn=2;
		else btn=1;// just in case
	}else btn=e.buttons;// IE and Mozila
	return btn;
}


iv.vdivider.prototype.onMouseMove=function(event,touch) {

    var b=this.decodeButtons(event,false);
    if(b) {
        var e=this.getEvent(event,touch);
        if(!e)return false;
        
        //var div=this.div;
        //div.style.left=(e.pageX+this.drag_offsetX)+"px";
        //div.style.top=(e.pageY+this.drag_offsetY)+"px";
        //console.log(e.pageX+this.drag_offsetX);
        this.value=e.pageX+this.drag_offsetX;
        if(this.onValueChanged)this.onValueChanged(this);
        
    } else this.releaseCapture();

    iv.sp(event);
}



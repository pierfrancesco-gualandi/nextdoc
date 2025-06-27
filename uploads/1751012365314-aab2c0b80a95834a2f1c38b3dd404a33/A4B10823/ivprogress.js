iv.progressIndicator=function(view,p)
{
  var v=this;
  v.view=view;
  v.enabled=-1;
  v.animation=!!p.animation;
  v.color=p.color||"#000000";
  v.timeOffset=0;
  var c= v.canvas=document.createElement("canvas");
  var s=v.size=p.size||100;
  c.width=c.height=s;
  c.style="width:"+s+"px;height:"+s+"px;position:absolute;";
  var ctx=v.context = c.getContext('2d');
if(ctx){
  view.canvas.parentElement.appendChild(c);
  ctx.textAlign='center';
  ctx.textBaseline='middle';  
  v.updatePos();
  v.update(0.0);  
  view.addRefTarget(function(a)
 {
switch(a.code)
	{
	case "viewsize":v.updatePos();break;
        case "loadError":
	case "merged":
	case "dataReady":v.enable(false);break;
	case "progress":v.update(a.loaded/a.total);v.enable(true);break;
 }});}
};
iv.progressIndicator.prototype.updatePos=function()
{
 var s=this.canvas.style,v=this.view.viewport;
 s.left=''+Math.floor((v.x-this.size)/2)+'px';
 s.top=''+Math.floor((v.y-this.size)/2)+'px';
};
iv.progressIndicator.prototype.enable=function(e)
{
 if(this.enabled!==e){
  this.enabled=e;
  this.canvas.style.display=e?"":"none";
  if(this.animation)
  {
   if(e)
   {
      var v=this;
      if(!this.timer)this.timer=setInterval(function()
	{v.timeOffset=(v.timeOffset+17)%360;
	v.update(v.value);
       },50);
   }else
   {
    if(this.timer){clearInterval(this.timer);this.timer=0;}
   }
  }
}
}
iv.progressIndicator.prototype.update=function(value)
{
  this.value=value;
  var ctx=this.context;
  var x=this.size;
  ctx.clearRect(0,0,x,x);  
  x/=2;
  var r=x-4,lw=r/6,offset=Math.PI*(this.timeOffset-90)/180;
  ctx.lineWidth = lw;
  ctx.fillStyle = ctx.strokeStyle = this.color;
  ctx.beginPath();
  ctx.arc(x, x, r, offset, offset+Math.PI*2*value);
  ctx.stroke();
  ctx.font =""+Math.ceil(r/2)+"px Segoe UI,Tahoma, Arial, Helvetica";
  ctx.fillText(""+Math.floor(100*value)+"%",x,x);  
}

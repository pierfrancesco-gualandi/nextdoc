iv.window.prototype.getXRAY=function()
{
    if(this.space)return (this.clrSelection[5]<1.0);
    return undefined;
}
iv.window.prototype.setXRAY=function(mode)
{
    if (mode) {
        this.clrSelection[4] = 1; // selected object
        this.clrSelection[5] = 0.5; // non selected objects        
    } else {
        this.clrSelection[4] = 1; // selected object
        this.clrSelection[5] = 1; // non selected objects
    }
    if(this.space)    
        this.space.updateXRay();
    
    this.invalidate();
}

iv.window.prototype.setNavigationMode=function(button,mode) {
    if(button=='left') button=0;
    else
    if(button=='right') button=1;
    else
    if(button=='middle') button=2;


    if(button>=0&&button<=2) {
    if(mode=='orbit') mode=1;
    else
    if(mode=='zoom') mode=2;
    else
    if(mode=='pan') mode=4;
    else
    if(mode=='none') mode=-1;
    else
    if(mode=='rectSelect') mode=16;    
        this.cfgButtons[button]=mode;
    }   
}

iv.window.prototype.setAxis=function(a)
{
    if(this.cfgEditorAxis!=a)
    {
    this.cfgEditorAxis=a;

    this.updateTransformGizmo2();
    this.notify("editorAxis",{axis:a});
    return true;
}
    return false;
}

iv.window.prototype.setMode=function(mode,a)
{
    var dropHandler=true;
    if(mode=="editAxis"){
        if(a!=undefined)
            this.setAxis(a);
    }else
/*    
    if(mode=="pickRCenter")
    {
        this.setHandler(new iv.pickRCenterHandler(this));
        dropHandler=false;
        return true;
    }else*/
    if(mode=="select")this.setEditMode("");
    else
    if(mode=="move")this.setEditMode(mode);
    else
    if(mode=="rotate")this.setEditMode(mode);
    else
    if(mode=="scale")this.setEditMode(mode);
    else/*
    if(mode=="newClip")
    {
        this.setHandler(new iv.newClipHandler(this));
        dropHandler=false;
    }else */
    if(mode=='measure')
    {
        this.setHandler(new iv.measureHandler(this));
        dropHandler=false;
    }

    if(dropHandler)
        this.setHandler(null);

    return false;
}


iv.window.prototype.setClipPlane=function(id,info)
{
var space=this.space;
 if(space && space.unitMatrix)
 {
    
    var my=space.myClipInfo;
    if(!my)
	{
        //var box=space.root.getBoundingBox(null,null,true);
        //var size=box3.size(box);
        //size=vec3.length(size);
        var size=1.0;
        if(space.unitMatrix)
        {
          var size=1.3/space.unitMatrix[0];
        }else
        {
            console.error("check this branch");
            var box=space.root.getBoundingBox(null,null,true);
            var size=box3.size(box);
            size=vec3.length(size);
        }
	      my=space.myClipInfo={planes:[],size:size*1.5};
	}

    var n=my.planes[id],inv=false;
    if(info && info.visible)
	{
	  if(n)
	  {
           if(!(n.state&3)){n.show(true);inv=true;}
          }else
	  {
	    n=this.space.root.newNode();
            n.state|=iv.NS_NOCLIP;
            n.state&= ~(iv.NS_RCVSHADOWS|iv.NS_CASTSHADOWS);
            n.setObject(new iv.clipObject(space.gl,{"axis":5,"appearance":3,"size":my.size,"outline":true,"cap":true} ) );
            if(id)
	    {
                var tm=n.enableTM();
                if(info.plane)
                {


                }else{
                if(id==1)mat4.setRotateX(tm,Math.PI/2);
                else mat4.setRotateY(tm,Math.PI/2);
                }
            }
            my.planes[id]=n;
	   inv=true;
	  }
	}else
	{
	  if(n && (n.state&3)){n.show(false);inv=true;}
	}
	if(inv)space.invalidate(iv.INV_VERSION|iv.INV_STRUCTURE);
 }
}

iv.window.prototype.getClipPlane=function(index)
{

    if((index<0) || (index>2))return null;
    var space=this.space;
    var a={visible:false};
    if(space && space.myClipInfo)
    {
        var my=space.myClipInfo;
        var node=my.planes[index];
        if(node){
            a.visible=node.visible();
            //return {visible:node.visible,plane:a.plane.slice()};
        }
    }
    //var  a=this.defClipPlaneData(index);
    //  a.visible=false;            
    return a;
}


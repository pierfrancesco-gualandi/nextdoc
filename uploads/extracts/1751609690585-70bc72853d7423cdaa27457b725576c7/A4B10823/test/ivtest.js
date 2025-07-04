var view3d=null;// no need to be global, just for sample purposes


iv.window.prototype.testToggleClipPlane=function(index)
{
	var info=this.getClipPlane(index);
	if(info && info.visible)
		this.setClipPlane(index,{visible:false});
	else
	this.setClipPlane(index,{visible:true});
}

iv.window.prototype.OnCommand=function(id)
{

function updateSelMode(text)
{
	var span=document.getElementById("select-mode-menu");
	span.innerHTML="Mode:"+text;
}

	var updateAll=false;

	var _id=id.substring(0,12);
	if(_id=="view3d-lbtn-"){this.setNavigationMode("left",id.substring(12));updateAll=true;}
	else
	if(_id=="view3d-rbtn-"){this.setNavigationMode("right",id.substring(12));updateAll=true;}
	else
	if(_id=="view3d-mbtn-"){this.setNavigationMode("middle",id.substring(12));updateAll=true;}
	else	
	switch(id)
	{

		case "view3d-clip-0":this.testToggleClipPlane(0);break;
		case "view3d-clip-1":this.testToggleClipPlane(1);break;
		case "view3d-clip-2":this.testToggleClipPlane(2);break;
		case "view3d-clip-mode":this.setClipMode(!this.cfgClipMode);break;


		case "view3d-mode-select":this.setMode("select");updateSelMode("Select");updateAll=true;break;
		case "view3d-mode-move":this.setMode("move");updateSelMode("Move");updateAll=true;break;
		case "view3d-mode-rotate":this.setMode("rotate");updateSelMode("Rotate");updateAll=true;break;
		case "view3d-mode-scale":this.setMode("scale");updateSelMode("Scale");updateAll=true;break;
		case "view3d-mode-measure":this.setMode("measure");updateSelMode("Measure");updateAll=true;break;
		
		case "view3d-cfg-tree":iv.showTreeView= !iv.showTreeView;window.onresize();break;
		case "view3d-cfg-rotationcenter":this.cfgRotateMouseHit=!this.cfgRotateMouseHit;break;
		case "view3d-cfg-rectselect":this.cfgRectSelectionFullMode=!this.cfgRectSelectionFullMode;break;
		case "view3d-home":view3d.setDefView(iv.VIEW_TRANSITION|iv.VIEW_RESTORE|iv.VIEW_RESET_RCENTER);break;
		case "view3d-cfg-xray":this.setXRAY(!this.getXRAY());break;
		case "view3d-user":
		case "view3d-left":
		case "view3d-right":
		case "view3d-top":
		case "view3d-bottom":
		case "view3d-front":
		case "view3d-back":{
			var _id=id.substring(7);
			view3d.setStdView(_id);
			updateAll=true;
		}break;		
		case 'view3d-ortho':this.setOrtho(true);updateAll=true;break;
		case 'view3d-perspective':this.setOrtho(false);updateAll=true;break;

		case "view3d-cfg-textures":this.setTextures(!this.getTextures());break;
		case "view3d-cfg-dblside":this.setDoubleSided(!this.getDoubleSided());break;
		case "view3d-cfg-materials":this.setMaterials(!this.getMaterials());break;
		case "view3d-rm-solid":
		case "view3d-rm-wire":
		case "view3d-rm-wireshaded":
		case "view3d-rm-hiddenwire":
		case "view3d-rm-outline":
		case "view3d-rm-illustration":if(this.space){
					var _id=id.substring(10,id.length);
					  view3d.setRMode(_id);
					  updateAll=true;
				}break;
	}
	return updateAll;	
};

iv.window.prototype.getStdViewName=function()
{
	var _i=iv.stdViews;
	var v=this.getView();
	var dir=v.getViewVectorN(),up=v.getUpVector();
	vec3.normalize(up);
	vec3.scale(dir,-1);
	var epsilon=1e-5;
	var _up;
	for(var i in _i)
	{
		var V=_i[i];
		 _up=vec3.subtract(V.u,V.f,[]);
		if(vec3.compare(_up,up,epsilon)&&
		   vec3.compare(V.f,dir,epsilon))
		   return i;
	}
	return "user";
}

iv.window.prototype.updateLeftMouseMenuItem=function(ibtn,id)
{
	id=id.substring(12);
	var mode=this.cfgButtons[ibtn];
	switch(id)
	{
		case "none":return mode==-1;
		case "orbit":return mode==1;
		case "zoom":return mode==2;
		case "pan":return mode==4;
		case "rectSelect":return mode==16;
	}
	return undefined;
}

iv.window.prototype.updateMenuItem=function(menuItem,id)
{
	if(!id)id=menuItem.id;
	var check=undefined;

	var _id=id.substring(0,12);
	if(_id=="view3d-lbtn-")check=this.updateLeftMouseMenuItem(0,id);
	else
	if(_id=="view3d-rbtn-")check=this.updateLeftMouseMenuItem(1,id);
	else
	if(_id=="view3d-mbtn-")check=this.updateLeftMouseMenuItem(2,id);
	else
	switch(id)
	{

		case "view3d-clip-0":{
			var info=check=this.getClipPlane(0);
			check=(info && info.visible);
		}break;
		case "view3d-clip-1":{
			var info=check=this.getClipPlane(1);
			check=(info && info.visible);
		}break;		
		case "view3d-clip-2":{
			var info=check=this.getClipPlane(2);
			check=(info && info.visible);
		}break;		
		case "view3d-clip-mode":check= this.cfgClipMode;break;


		case "view3d-mode-select":check=this.cfgEditorMode=="";break;
		case "view3d-mode-move":check=this.cfgEditorMode=="move";break;
		case "view3d-mode-rotate":check=this.cfgEditorMode=="rotate";break;
		case "view3d-mode-scale":check=this.cfgEditorMode=="scale";break;

		case "view3d-cfg-tree":check=iv.showTreeView;break;
		case "view3d-cfg-rectselect":check=!!this.cfgRectSelectionFullMode;break;
		case "view3d-cfg-rotationcenter":check=!!this.cfgRotateMouseHit;break;
		case "view3d-cfg-xray":check=this.getXRAY();break;
		case "view3d-user":
		case "view3d-left":
		case "view3d-right":
		case "view3d-top":
		case "view3d-bottom":
		case "view3d-front":
		case "view3d-back":check=("view3d-"+this.getStdViewName())==id;break;
		case 'view3d-ortho':check=this.isOrtho();break;
		case 'view3d-perspective':check=!this.isOrtho();break;

		case "view3d-cfg-textures":check=this.getTextures();break;
		case "view3d-cfg-dblside":check=this.getDoubleSided();break;
		case "view3d-cfg-materials":check=this.getMaterials();break;
		case "view3d-rm-solid":
		case "view3d-rm-wire":
		case "view3d-rm-wireshaded":
		case "view3d-rm-hiddenwire":
		case "view3d-rm-outline":
		case "view3d-rm-illustration":
				if(this.space){
					var mode=this.space.rmodes[this.space.cfgRMode];
					if(mode)
					{
					var mode="view3d-rm-"+mode.name;
					check=(mode===id);
				}
				}break;
		
	}
	if(check!==undefined)
	{
		var objs = menuItem.getElementsByTagName("img");
		var img;
		if(objs && objs.length)img=objs[0];
		else
		if(check){
			img=document.createElement("img");
			img.src="test/checkmark.png";
			menuItem.insertBefore(img, menuItem.childNodes[0]); 
		}
		if(img)
		{
			var atrr=check?"visible":"hidden";
			if(img.style.visibility!=atrr)
				img.style.visibility=atrr;
		}
	}else
	{
		var idbg=0;
		idbg++;
	}
}
iv.window.prototype.updateMenues=function()
{
	var objs = document.getElementsByClassName("ivmenu");
	if(objs)
	{
		for(var i=0;i<objs.length;i++)this.updateMenu(objs[i]);
	}

	this.updateMenuAxis();

}

iv.window.prototype.updateMenuAxis=function()
{
	var a=this.cfgEditorAxis;
	var div=document.getElementById("axis-x");
	div.className=a&1?"button-checked":"button";
	div=document.getElementById("axis-y");
	div.className=a&2?"button-checked":"button";
	div=document.getElementById("axis-z");
	div.className=a&4?"button-checked":"button";

};
iv.onToggleAxis=function(axis)
{
	view3d.setAxis(view3d.cfgEditorAxis^axis);
	view3d.updateMenuAxis();
}


iv.window.prototype.updateMenu=function(menu)
{
	if(menu)
	{
	var objs = menu.getElementsByTagName("a");
	if(objs)
	{
		for(var i=0;i<objs.length;i++)this.updateMenuItem(objs[i]);
	}
	}
};



iv.onMenuSelected=function(menuItem)
{
	var id=menuItem.id;
	if(view3d.OnCommand(id))
			view3d.updateMenues();
		else
			view3d.updateMenuItem(menuItem,id);
}


function sample3dCallBack(event)
  {
	var wnd=event.wnd;
    switch(event.code)
    {
        case "dataReady":wnd.updateMenues();break;
		case "mousedown":{
			  //if you want to disable selections set event.doDef to false. 
			  //But if you want just to monitor selections, check selections notifications
			if(0){
			 event.doDef=false;
  			 var hit=event.wnd.hitTest(event.x,event.y);
			 if(hit && hit.node)
			 {
                            console.log(hit.node);
			  }
   			 }
			 }break; // prevent selection
	case "mousehover":{
	
			 }break;
    }
//    console.log(event);
  };

iv.window.prototype.getHandler=function(p,event) {

	var navmode=this.mapButtonToNavigation(p.b);
	var m=this.cfgEditorMode;
	switch(navmode) {
		case 16: return new iv.rectSelectionHandler(this);
		//case 17:return new iv.measureHandler(this);
	}

	if((!p.hit)) p.hit=this.handleObjSelect(p.x,p.y,event,true);
	if(p.hit){
		if(iv.markup && (p.hit.node instanceof iv.markup)) {
			//this.objEditorMode
			var bsel=p.hit.node.isSelected();
			var info={ doMove: this.objEditorMode!=0&&bsel,selected: bsel };
			this.notify("allowMoveMeasurements",info);
			if(info.doMove) {
				this.space.select(p.hit.node,true);
				var h=new iv.moveCalloutHandler(this,p.hit,p.hit.node);
				return h;
			}
		}

		if(this.space.selNode)
		switch(m)
		{
			case "move":return new iv.objMoveHandler(this);
			case "rotate":return new iv.objRotateHandler(this);
			case "scale":return new iv.objScaleHandler(this);
		}
	
	}
	return this.getDefHandler(p,event,navmode);
}

iv.window.prototype.getDefHandler=function(p,event,navmode)
{
	return null;
}

iv.initSample=function(file,color)
{
  iv.showTreeView=true;
  var params={canvas:document.getElementById("canvas3d")};
  if(file)
  {
	params.file=file;
	//params.path="files/";// custom folder
  }
  if(color!=undefined)params.color=color;
  var view=new iv.window(params);
  view.cfgRotateMouseHit=true;
  view.cfgRectSelectionFullMode=true;
  
  /*
   file can be loaded later with help of view3d.load(file,params);
  */  
  view.addRefTarget(sample3dCallBack);

  // tree view. no need to pass notifications to tree view
  // treeView - is just for example

  var div=document.getElementById("treeview");
  var treeView=null;
  var treeParent=null;
  if(div)
  {
	 treeView=new iv.treeView(div,view);
	 treeParent=div.parentElement;
  }

  var vidivider=document.getElementById("vidivider");
  var wndDiv=new iv.vdivider(vidivider); 

  var onResize=function()
  {
	var height=window.innerHeight-50;
	var width = window.innerWidth;
	
	if(treeView /*&& treeView.div.style.display!="none"*/)
	 {
		  
		  if(width<500 || (!iv.showTreeView))
		  {
			treeParent.style.display="none";
			vidivider.style.display="none";
		  }else
		  {
			var w=wndDiv.value;
			if(w===undefined)w=width/4;
			vidivider.style.display="";
			vidivider.style.height=""+height+"px";

			treeParent.style.display="";
			treeParent.style.width=""+w+"px";
			treeParent.style.height=""+height+"px";
			treeParent.style["max-height"]=""+height+"px";
			width-=w+4;
		  }
	 }
	width--;
	if(view)
		view.setViewSize(width,height);
  }
  wndDiv.onValueChanged=function()
  {
		onResize();	
  }



  window.onresize = onResize;
  onResize();


  // Sample Progress Indicator
  new iv.progressIndicator(view,{size:100,color:"#202020",animation:false}); 


  var axis=new iv.axis3d(view,{file:"viewaxis.iv3d",path:"res/",pos:1,size:200});

  view.updateMenues();

  return view;
}
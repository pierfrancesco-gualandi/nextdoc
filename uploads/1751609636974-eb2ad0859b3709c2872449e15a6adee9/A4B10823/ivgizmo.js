/*
 for each app.
 - on selection call updateTransformGizmo(list of selected nodes,active node);
 - on change edit mode, call updateTransformGizmo2();
 - getTransformGizmoMode - is specific, depending on application mode
 - stages - are specific too :( we need two stages after z buffer clear

  - iv.window.prototype.getHLMaterial=function(tr) required
*/


iv._postLoadGizmo=function(n) {
	while(n) {
		n.state|=iv.NS_NOCLIP;
		if(n.object) {

			if(n.material&&n.material.opacity)
				n.stage=11;
			else n.stage=10;
		}
		if(n.firstChild) iv._postLoadGizmo(n.firstChild);
		n=n.next;
	}
}

iv.window.prototype._updateGizmoPosition=function(g,_i,active) {
	if(!g) return;
	//this.gizmo=g;
	g.show(!!_i);
	
	if(_i) {
		var crd=this.cfgEditorCrd;
		var v=[0,0,0];
		var tm=g.enableTM(),c=_i.length;

		for(var i=0;i<c;i++) {
			var n=_i[i];
			var wtm=n.getWTM();
			if(wtm) {
				v[0]+=wtm[12];
				v[1]+=wtm[13];
				v[2]+=wtm[14];
			}
		}
		mat4.identity(tm);
		if(active)
		{
			var wtm;
			switch(this.cfgEditorCrd)
			{
				case "custom":wtm=this.cfgCustomTm;break;
				case "local":wtm=active.getWTM();break;
				case "parent":if(active.parent)wtm=active.parent.getWTM();break;
			}
			if(wtm)mat4.copy(wtm,tm);
		}
		tm[12]=v[0]/c;
		tm[13]=v[1]/c;
		tm[14]=v[2]/c;
		this.invalidate();
	}
};

iv.window.prototype.isGizmo=function(node) {
    while(node) {
        if(node.gizmo)
            return node;
        node=node.parent;
    }
    return null;
}

iv.window.prototype.getActiveGizmo=function() {
    if(!this.space||!this.space.gizmos) return null;
    var _g=this.space.gizmos.firstChild;
    while(_g) {
        if(_g.visible()) return _g;
        _g=_g.next;
    }
    return null;
}

iv.window.prototype.setNodeMaterial2=function(n,mtl1,mtl2) {
	if(n.material&&n.material.name!='halo') {
		if(n.material) {

			if(mtl1) {
				var m=mtl1;
				if(n.material.opacity) m=mtl2;
				if(n.material!=m) {
					n.oldMaterial=n.material;
					n.material=m;
				}
			} else {
				if(n.oldMaterial) { n.material=n.oldMaterial; n.oldMaterial=null; }
			}
		}
	}

	n=n.firstChild;
	while(n) {
		this.setNodeMaterial2(n,mtl1,mtl2);
		n=n.next;
	}
	return true;
}


iv.window.prototype.__setGizmoAxis=function(node,axis,mtl,mtl2) {
	switch(node.name) {
		case "move-X": this.setNodeMaterial2(node,(axis&1)?mtl:null,mtl2); return;
		case "move-Y": this.setNodeMaterial2(node,(axis&2)?mtl:null,mtl2); return;
		case "move-Z": this.setNodeMaterial2(node,(axis&4)?mtl:null,mtl2); return;
		case "move-XY": this.setNodeMaterial2(node,((axis&3)==3)?mtl:null,mtl2); return;
		case "move-XZ": this.setNodeMaterial2(node,((axis&5)==5)?mtl:null,mtl2); return;
		case "move-YZ": this.setNodeMaterial2(node,((axis&6)==6)?mtl:null,mtl2); return;

		case "rotate-X": this.setNodeMaterial2(node,(axis&1)?mtl:null,mtl2); return;
		case "rotate-Y": this.setNodeMaterial2(node,(axis&2)?mtl:null,mtl2); return;
		case "rotate-Z": this.setNodeMaterial2(node,(axis&4)?mtl:null,mtl2); return;

		case "scale-X": this.setNodeMaterial2(node,(axis&1)?mtl:null,mtl2); return;
		case "scale-Y": this.setNodeMaterial2(node,(axis&2)?mtl:null,mtl2); return;
		case "scale-Z": this.setNodeMaterial2(node,(axis&4)?mtl:null,mtl2); return;
		case "scale-XY": this.setNodeMaterial2(node,((axis&3)==3)?mtl:null,mtl2); return;
		case "scale-XZ": this.setNodeMaterial2(node,((axis&5)==5)?mtl:null,mtl2); return;
		case "scale-YZ": this.setNodeMaterial2(node,((axis&6)==6)?mtl:null,mtl2); return;
		case "scale-XYZ": this.setNodeMaterial2(node,((axis&6)==7)?mtl:null,mtl2); return;

	}
	node=node.firstChild;
	while(node) {
		this.__setGizmoAxis(node,axis,mtl,mtl2);
		node=node.next;
	}
}

iv.window.prototype.setGizmoAxis=function(g,axis) {
	if(!g) g=this.getActiveGizmo();
	if(!g) return false;
	//console.log("gizmo axis",axis);
	if(g.axis!=axis) {
		g.axis=axis;
		var mtl=this.getHLMaterial();
		var mtl2=this.getHLMaterial(true);
		this.__setGizmoAxis(g,axis,mtl,mtl2);
		this.invalidate();
		return true;
	}
	return false;
}


iv.gizmoTraverseProc=function(ctx,ptm,flags,opacity) {
	if(!(this.state&3))return;
	if(iv.shadowcontext && ctx instanceof iv.shadowcontext)return ;
	var vtm=ctx.mvMatrix;// view matrix
	var k=ctx.bbScaleFactor;
	k*=128;// size of icon in pixels?
	var v;
	if(ptm) {
		var _tm=[];
		mat4.m(this.tm,ptm,_tm);//check this
		v=mat4.getTranslate(_tm);
	} else v=mat4.getTranslate(this.tm);

	var scale=mat4.mulPointZ(vtm,v)*k;
	if(scale>0) return 0;
	scale*=-1;
	

	var _tm=[];
	mat4.identity(_tm);
	mat4.setScale(_tm,scale);
	mat4.m(_tm,this.tm,_tm);
	if(ptm){
		var w=this.wtm,i=ctx.itmw;
		if(!w[i])w[i]=mat4.create();
		ptm=mat4.m(_tm,ptm,w[i]);
	}else ptm=_tm;

	this.commonTraverse(ctx,ptm,flags,opacity);
}

iv.window.prototype.showTransformGizmo=function(name) {
	var wnd=this;

	var gz=this.space.gizmos;
	if(!gz) this.space.gizmos=gz=this.space.root.newNode();
	
	gz.state|=3;
	gz.state&=~(0x100|0x200 );
	var _g=gz.firstChild,g=null;
	while(_g) {
		if(_g.name==name) g=_g;
		else _g.show(false);
		_g=_g.next;
	}

	if(!g) {
		g=gz.newNode();
		g.gizmo=true;
		g.name=name;

		var cb=function(n) {
			var tm=n.enableTM();
			n.traverse=iv.gizmoTraverseProc;
			iv._postLoadGizmo(n);
			if(g.axis) {
				var axis=g.axis;
				g.axis=0; wnd.setGizmoAxis(g,axis);
			}
			wnd.invalidate(iv.INV_VERSION);
		};
		this.load(name+".iv3d",{ parent:g,callback:cb,path:this.cfgResources,merge:true,nonotify:true});
	}else
	g.show(true);
	return g;
};

iv.window.prototype.getTransformGizmoMode=function(_i) {
	if(this.space) {
	        switch(this.cfgEditorMode)
		{
		 case 'move':
                 case 'rotate':
                 case 'scale':return this.cfgEditorMode+"-gizmo";
		}
	}
	return null;
}

iv.window.prototype.hideTransformGizmo=function() {
	if(this.space&&this.space.gizmos&&this.space.gizmos.visible()) {
		this.space.gizmos.show(false);
                //this.canvas.style.cursor=undefined;
		this.invalidate();
	}
}

iv.window.prototype.updateTransformGizmo=function(_i,active) {
	var name=this.getTransformGizmoMode(_i);
	if(name&&_i && _i.length) {
		var g=this.showTransformGizmo(name);
		if(g) {
			this._updateGizmoPosition(g,_i,active);
			this.setGizmoAxis(g,this.cfgEditorAxis);
		}
	} else this.hideTransformGizmo();
}

iv.window.prototype.updateTransformGizmo2=function() {
        var s=this.space,_i=s.root.getSelection();
	var name=this.getTransformGizmoMode(_i);
	if(name&&_i) {
		var g=this.showTransformGizmo(name);
		if(g) {
			this._updateGizmoPosition(g,_i,this.space.selNode);
			this.setGizmoAxis(g,this.cfgEditorAxis);
		}
	} else this.hideTransformGizmo();
}
iv.window.prototype.getHLMaterial=function(tr)
{
    if(tr){
    if(!this.space.highlightMtlAlpha)this.space.highlightMtlAlpha=this.space.newMaterial({name:"highlightAlpha",emissive:{color:[1,1,0]},opacity:{amount:0.23}});
    return this.space.highlightMtlAlpha;
    }else{
    if(!this.space.highlightMtl)this.space.highlightMtl=this.space.newMaterial({"name":"highlight","emissive":{"color":[1,1,0]}});
    return this.space.highlightMtl;
    }
}
iv.window.prototype.onMouseHoverGizmo=function(event,p)
{

    var cursor="default";

    if(this.space && this.space.gizmos && this.space.gizmos.visible())
    {
        var h=this.hitTest(p.x,p.y,iv.HIT_GIZMO);
        var g=null;
        if(h)
        {
            var g=this.isGizmo(h.node);
            if(g)
            {
            //var anyaxis=true;            
            var ids=h.node.name.split('-');
            if(ids && ids.length==2)
            {
                var axis=0;
                var strAxis=ids[1];
                
                if(strAxis.indexOf('X')>=0)axis|=1;
                if(strAxis.indexOf('Y')>=0)axis|=2;
                if(strAxis.indexOf('Z')>=0)axis|=4;
                
                this.setGizmoAxis(g,axis);
                cursor="progress";

            }else 
                this.setGizmoAxis(g,this.cfgEditorAxis);
            }
        }
        if(!g)
        {
            this.setGizmoAxis(null,this.cfgEditorAxis);
        }
      //this.canvas.style.cursor=cursor;
    }    
    return 0;
}

iv.treeView=function(div,wnd,size) {
	if(!size)size=16;
	this.div=div;
	this.view3d=wnd;
	this.size=size;
	this.lockNotify=0;
	var tree=this;
	this._doSelect=function(event){tree.doSelect(this,event);};
	this._doDblClickItem=function(event){tree.doDblClickItem(this,event);};
	this._doToggleVisibility=function(event){tree.doToggleVisibility(this);};
	this._doToggleExpand=function(event){tree.doToggleExpand(this);iv.pdsp(event);};
	div.onclick=function(event){if(wnd.space)wnd.space.select(null);}
	wnd.addRefTarget(tree);
	if(wnd.space)this.init(wnd.space);
}

iv.treeView.prototype.getNodeFromItem=function(obj) {
	if(obj.ivnode) return obj.ivnode;
	var item=obj.parentNode;
	if(item.className.indexOf("gitem")>=0) item=item.parentNode;
	return item.ivnode;
}

iv.treeView.prototype.isGroup=function(item) {
	return (item.className.indexOf('group')>=0);
}

iv.treeView.prototype.groupGetGitem=function(item) {
	_item=item.firstChild;// must be gitem
	while(_item&&(_item.className.indexOf('gitem')<0)) _item=_item.nextSibling;
	return _item;
}

iv.treeView.prototype.searchItem=function(node,bExpand) {
	var item;
	if(node.parent&&node.parent.parent) item=this.searchItem(node.parent,bExpand); else item=this.div;
	if(item) {
		if(item.className=='group-c') this.doToggleExpandImp(item);
		if(item.className=='group') item=this.getGroupItems(item);
		if(!item) return null;
		var _item=item.firstChild;
		while(_item) {
			if(_item.ivnode&&_item.ivnode==node)
				return _item;
			_item=_item.nextSibling;
		}
	}
	return null;
}

iv.treeView.prototype.ensureVisible=function(item) {
	var y=item.offsetTop,se=this.div;
	y-=se.offsetTop;
	se=se.parentNode;
	if(y<se.scrollTop) { se.scrollTop=y; return; }
	var height=se.clientHeight;
	y+=this.size;
	if(y>(se.scrollTop+height))
		se.scrollTop=y-height;
};

iv.treeView.prototype.removeSelection=function(item) {
	var item=item.firstChild;
	while(item) {
		var _item=item;
		if(this.isGroup(item)) {
			var items=this.getGroupItems(item);
			if(items)
				this.removeSelection(items);
			_item=this.groupGetGitem(item);
		}
		if(_item&&!(item.ivnode.state&4)) {
			var index=_item.className.indexOf(" selected");
			if(index>=0) {
				_item.className=_item.className.replace(" selected","").trim();
			}
		}
		item=item.nextSibling;
	}
}

iv.treeView.prototype.doToggleVisibility=function(obj) {
	var node=this.getNodeFromItem(obj);
	if(node) {
		var s,w=this.view3d;
		if(obj.className=='vis') { obj.className='hdn'; s=0; } else
		{ obj.className='vis'; s=3; }
		if(iv.undo &&iv.undo.nodeVis)
		{
			var u=w.m_undo;    
			if(u && u.open())
			{
				u.add(new iv.undo.nodeVis(w,node));
				u.accept("Node Visibility");
			}
		}
		this.lockNotify++;
		w.notify("visibility",{node:node});
	    this.lockNotify--;
		if(node.keepState)node.keepState();
		node.setState(s,3);
		this.view3d.invalidate(iv.INV_STRUCTURE);
	}
};

iv.treeView.prototype.doDblClickItem=function(obj,event) {
	var node=this.getNodeFromItem(obj),v=this.view3d;
	if(node) {
		if(node.pmi){if(v.pmiActivate)v.pmiActivate(node);}else
		if(node.object instanceof iv.camera)v.setCamera(node);
	}
	iv.pdsp(event);
}

iv.treeView.prototype.doSelect=function(obj,event) {
	var node=this.getNodeFromItem(obj);
	if(node) {
		var s=this.view3d.space;
		if(!(event.shiftKey&&s.selectRange(node,s.selNode)))
			s.select(node,true,event&&event.ctrlKey!=0);
	}
	iv.pdsp(event);
}

iv.treeView.prototype.getGroupItems=function(g){
	var i=g.firstChild;
	while(i)
	{
		if(i.className=="items")return i;
		i=i.nextSibling;
	}
	return null;
}

iv.treeView.prototype.expandItem=function(g,expand)
{
	if(expand){
		g.className='group';
		var items=this.getGroupItems(g);
		if(items&&!items.firstChild)this.expandNode(items,g.ivnode);
	}else g.className='group-c';
}
iv.treeView.prototype.isExpanded=function(group){return (group.className=='group');}
iv.treeView.prototype.doToggleExpandImp=function(group) {
	this.expandItem(group,!this.isExpanded(group));
}

iv.treeView.prototype.doToggleExpand=function (obj){this.doToggleExpandImp(obj.parentNode.parentNode);}

iv.treeView.prototype.isGroup3d=function(node) {
	var f=node.firstChild;
	while(f&&f.state&0x80) f=f.next;
	return !!f;
}
iv.treeView.prototype.createElement=function(t,c){var i=document.createElement(t);if(c)i.className=c;return i;}
iv.treeView.prototype.newIcon=function(parent,item,node) {
	var _icon=this.createElement('span','node');
	var id=8,g=this.isGroup3d(node);
	if(g)
	{
		if(node.pmi)
		switch(node.pmi.type){
			case 'ModelView':id=18;break;
			case 'Product':id=17;break;
		}
	}else{
		var obj=node.object;
		if(!obj&&node.firstChild) obj=node.firstChild.object;
		if(obj){
			if(obj instanceof iv.light)id=11;else
				if(obj instanceof iv.camera)id=12;else id=10;
		}
	}
	_icon.style.backgroundPosition="-"+id*this.size+"px 0px";
	var label=this.createElement('span','label');
	var name=node.name;
	if(name)label.title=name;else name=g?"Group":"Object";
	label.innerHTML=name;
	var div=this.createElement('div',node.state&4?'selected':'normal');
	div.appendChild(_icon);
	div.appendChild(label);
	item.ivlabel=label;
	parent.ondblclick=this._doDblClickItem;
	parent.onclick=this._doSelect;
	var t=this;
	node.addRefTarget(function(event)
	{
	 switch(event.code)
	{
	 case "state":if((event.source.state&3)!=(event.old&3))t._updateVisibility(item);break;
	}
	});
	parent.appendChild(div);
	return div;
}

iv.treeView.prototype.newTreeItem=function(parent,node,bGroup) {

	var item=this.createElement('div');
	item.ivnode=node;
	var chk=this.createElement('span',(node.state&&node.state&3)?"vis":"hdn");
	chk.onclick=this._doToggleVisibility;
	var _icon=this.createElement('span'),s;
	_icon.onclick=this._doSelect;
	_icon.ondblclick=this._doDblClickItem;
	if(bGroup) {
		item.className='group-c';
		var div=this.createElement('div','gitem');
		var _open=this.createElement('span','open');
		_open.onclick=this._doToggleExpand;
		div.appendChild(_open);
		div.appendChild(chk);
		s=this.newIcon(div,item,node);
		var _items=this.createElement('div','items');
		item.appendChild(div);
		item.appendChild(_items);
	} else {
		item.className='item';
		item.appendChild(chk);
		s=this.newIcon(item,item,node);
	}
	item.ivselitem=s;
	item.ivcheckbox=chk;
	parent.appendChild(item);
}

iv.treeView.prototype.expandNode=function(treeParent,parent) {
	for(var node=parent.firstChild;node;node=node.next) {
		if(node.state&iv.NS_NOTREE) continue;
		var g=this.isGroup3d(node);
		if(g&&node.state&iv.NS_CLOSED) g=false;
		this.newTreeItem(treeParent,node,g);
	}
}

iv.treeView.prototype._updateSelection=function(item) {
	var _item=item.ivselitem;
	if(_item) {
		var oldSel=_item.className=="selected",sel=((item.ivnode.state&4)!=0);
		if(sel!=oldSel) _item.className=sel?"selected":"normal";
	}
}
iv.treeView.prototype._updateVisibility=function(item) {
	var chk=item.ivcheckbox,n=item.ivnode;
	if(n.state&&n.state&3) chk.className="vis"; else chk.className="hdn";
}

iv.treeView.prototype.udpateNode=function(item,f) {
	var item=item.firstChild;
	while(item) {
		if(this.isGroup(item)) {
			var items=this.getGroupItems(item);
			if(items)
				this.udpateNode(items,f);
		}
		if(f&1)this._updateSelection(item);
		if(f&2)this._updateVisibility(item);
		item=item.nextSibling;
	}
};

iv.treeView.prototype.onNodeSelected=function(node) {
	this.udpateNode(this.div,1);
	if(node) {
		var item=this.searchItem(node,true);
		if(item)
			this.ensureVisible(item);
	}
}
iv.clearDIV=function(div)
{
    while(div.firstChild)
    {
      var f=div.firstChild;
        if(f.remove)f.remove();
        else
        if(div.removeChild)div.removeChild(f);// IE
        else break;
    }
}
iv.treeView.prototype.clear=function(){iv.clearDIV(this.div);}

iv.treeView.prototype.init=function(space) {
	var r=space.root;
	if(r) { if(r.firstChild) this.expandNode(this.div,r); else this.newTreeItem(this.div,r,false); }
}

iv.treeView.prototype.onNotify=function(event) {
	if(!this.lockNotify)
		switch(event.code) {
			case "merged":
			case "dataReady": this.clear(); this.init(event.space); break;
			case "visibility": {
				var item=this.searchItem(event.node,false);
				if(item)
					this._updateVisibility(item);
			} break;
			case "selection": this.onNodeSelected(event.node); break;
			case "updated": this.udpateNode(this.div,3);break;
		}
}

iv.treeView.prototype.searchImp=function(div,info)
{
	var item=div.firstChild;
	while(item)
	{
		var node=this.getNodeFromItem(item),f=node._filtered;
		if(f)
		{
			item.style.display="";
			if(f&1){
			item.ivlabel.className="labelSerch";
			if(!info.first)info.first=item;			
			}else item.ivlabel.className="label";
			var expanded=this.isExpanded(item), e=(f&2)!=0;
			if(e!=expanded)
			{
				this.expandItem(item,e);
				if(item.expandedBySearch===undefined)item.expandedBySearch=expanded;
			}
			if(e)
			{
				var _item=this.getGroupItems(item);
				if(_item)this.searchImp(_item,info);
			}
		}else item.style.display = "none";
		item=item.nextSibling;
	}
}
iv.treeView.prototype.searchDone=function(div)
{
	var item=div.firstChild;
	while(item)
	{
		if(item.ivlabel)item.ivlabel.className="label";
		item.style.display="";
		var expanded=this.isExpanded(item);
		if(item.expandedBySearch!==undefined)
		{
			if(item.expandedBySearch!=expanded)
				{
				expanded=item.expandedBySearch;
				this.expandItem(item,expanded);
			}
			delete item.expandedBySearch;
		}

		var _item=this.getGroupItems(item);
		if(_item)this.searchDone(_item);
		item=item.nextSibling;
	}
}

iv.treeView.prototype.searchNodes=function(n,func)
{
	var f=0;
	if(func && func(n))f=1;
	var _n=n.firstChild,any=false;
	while(_n)
	{
		any|=this.searchNodes(_n,func);
		_n=_n.next;
	}
	if(any)f|=2;
	if(f)n._filtered=f;
	else 
	if(n._filtered)delete n._filtered;
	return f!=0;
}

iv.treeView.prototype.search=function(func)
{
	var node=this.view3d.space.root;
	if(node.firstChild)
	{
		node=node.firstChild;
		while(node)
		{
			this.searchNodes(node,func);
			node=node.next;
		}
	}else this.searchNodes(node,func);
	
	var div=this.div;
	if(func){
		var info={first:null};
		this.searchImp(div,info);
		if(info.first)
			this.ensureVisible(info.first);
	}else this.searchDone(div);
}

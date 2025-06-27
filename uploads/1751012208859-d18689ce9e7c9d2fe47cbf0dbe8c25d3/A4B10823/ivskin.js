iv.skin={};

iv.skin.traverse = function(ctx,ptm,astate,opacity)
{
    if(this.state&1)
    {
        if(!this.skinValid)this.updateSkin();
    }
    return iv.node.prototype.traverse.call(this,ctx,ptm,astate,opacity);
}
iv.skin.init=function(space)
{
    var obj=this.object;
    if(obj)
    {
        obj.keepPoints=true;
        obj.keepNormals=true;
    }
    var skin=this.skin;
    if(skin.rest)
    {   
        skin.rest=iv.convertMatrix(skin.rest);
        skin.restI=mat4.invert(mat4.create(),skin.rest)
    }
    var bones=skin.bones;
    for(var i=0;i<bones.length;i++)
    {
        var b=bones[i];
        if(b.rest)b.rest=iv.convertMatrix(b.rest);
        b.delta=mat4.create();
        b.node=space.root.searchId(b.id);
        if(!b.node)log.error("bone not found");
    }
}
iv.skin.setTime=function(t)
{
    this.skinValid=false;
    return iv.node.prototype.setTime.call(this,t)
}
iv.skin.activateAnimation=function(a,reset)
{
    this.skinValid=false;
    return iv.node.prototype.activateAnimation.call(a,reset);
}

iv.skin.update=function()
{
    var skin=this.skin;
    if(this.object && this.object.points)
    {
        if(!this.skin.restPoints)
        {
            this.skin.restPoints=new Float32Array(this.object.points);
            this.skin.restNormals=new Float32Array(this.object.normals);
        }
        var i;
        var tm=mat4.create();
        var bones=skin.bones;
        var np=this.skin.restPoints/3;

        var points=new Float32Array(this.skin.restPoints.length);
        var normals=new Float32Array(this.skin.restPoints.length);
        var v=[],V=this.skin.restPoints,N=this.skin.restNormals;
        for(var i=0;i<bones.length;i++)
        {
            var b=bones[i];
            if(b.node)
            {
                b.current=b.node.getWTM();
                mat4.invert(  tm,b.rest);
                if(b.current)
                    mat4.m(tm,b.current,b.delta);
                else mat4.copy(tm,b.delta);

                if(skin.rest)
                {
                    mat4.m(skin.rest,b.delta,tm);
                    mat4.m(tm,skin.restI,b.delta);
                }
                if(b.v)
                {
                    var c=b.v.length;
                    for(var j=0;j<c;j++)
                    {
                        var sv=b.v[j],I=sv.i,w=sv.w;
                        iv.getV(V,I,v);
                        mat4.mulPoint(b.delta,v);
                        points[I*3]+=v[0]*w;
                        points[I*3+1]+=v[1]*w;
                        points[I*3+2]+=v[2]*w;

                        iv.getV(N,I,v);
                        mat4.mulVector(b.delta,v);
                        normals[I*3]+=v[0]*w;
                        normals[I*3+1]+=v[1]*w;
                        normals[I*3+2]+=v[2]*w;
                    }
                }
            }
        }
        this.object.calcBBox(points);
        this.object.setPoints(points);
        this.object.setNormals(normals);
        this.skinValid=true;
        return true;
    }
    return false;
}


iv.initSkin=function(node,a,info)
{
   node.skin=a;
   node.traverse=iv.skin.traverse;
   node.updateSkin=iv.skin.update;
   node.post=iv.skin.init;
   node.setTime =iv.skin.setTime
   if(!info.skins)info.skins=[];
    info.skins.push(node);
   node.skinValid=false;
   return true;
}
//  ~   Barsortjs - Fast full or range sorting of large arrays   ~  + 
/*           Copyright 2017 by Andrew Strain. No warranty           * 
 *  This program can be redistributed and modified under the terms  * 
 *  of the Apache License Version 2.0 - see LICENSE for details     * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * **/ 

var Barsortfactory = function(){ return (function(){ 
  'use strict'

  function version(){ return "0.9.0" }


  var _cntofsub=[],_destrema=[],_destosub=[] //these arrays reused between calls
  var wkcnt=0,wkcyc=100 //these count use of workspace arrays


  function barassign(pr){ //barnum:,scores:,st:,ov:,keysbar:,barfreq:,burnscore:
    
    var scores,pscores = pr.scores
       ,st     = pr.st||0 
       ,ov     = pr.ov||pscores.length
       ,barnm  = pr.barnum
       ,resol  = pr.resolution||5  //over sample x5
       ,kysbar = pr.keysbar        //bari into kysbar[st..ov]
       ,barppl = pr.barppl
  
    if(pr.secure){
      var ixkeys=sortorder(pscores,[],0,0,pr.descend)  //unoptimal without st,ov
                                //this should leave original scores untouched
      if(pr.ordinate) return ixkeys
      
      var barsiz=(ov-st)/barnm, dubar=0, barppl=barppl||[]
      for(var i=0;i<barnm;i++){ barppl[i]=0 }
      for(var c=0,e=ixkeys.length;c<e;c++){
        if(ixkeys[c]>=st&&ixkeys[c]<ov){
          var cbr=Math.round(dubar++/barsiz)
          kysbar[ixkeys[c]]= cbr 
          barppl[cbr]++ 
        } 
      } 
      return
    }
    
    if(!pr.burnscore){  //clone score
      scores=new Array(pscores.length)
    }else{ scores=pscores }
    
    var smnm=0, qvl=-0 ,nb=ov-st
    
    var minv=pscores[st] ,maxv=minv ,minv2=minv ,maxv2=minv 
    var lowex=-281474976710656 //-2^48

    var delt=0,delt2=0,mean=0,me2=0 
    
    for(var i=st; i<ov; i++) //need to max,min 
    { 
      if(!(pscores[i]>lowex)){ pscores[i]=lowex }  //but score should not be NaN!
      qvl=pscores[i]||0 
      
      if (qvl>maxv){ if (qvl>maxv2){ maxv=maxv2, maxv2=qvl }else{ maxv=qvl } 
      }else if (qvl<minv){ if (qvl<minv2){ minv=minv2, minv2=qvl }else{ minv=qvl } }
          
      //variance.. welfords alg
      smnm++	
      delt  = qvl - mean
      mean += delt/smnm
      delt2 = qvl - mean
      me2  += delt*delt2	

    }
    
    var sdev=Math.sqrt( me2/(smnm-1) )
    
    var maxy=mean+sdev*3.5, miny=mean-sdev*3.5
    
    //~ console.log("minmax",miny,maxy)
    
    if(maxy>maxv) maxy=maxv
    if(miny<minv) miny=minv
    
    var subdvn=resol*barnm-1
    var qun=(subdvn-1)/(maxy-miny)
   
    if(pr.descend){
      //~ console.log("minmax",miny,maxy)
      for(var i=st; i<ov; i++) 
      { qvl=Math.floor(qun*(maxy-pscores[i]))
        //~ console.log(qvl)
        scores[i]=qvl<0? 0:qvl>subdvn? subdvn:qvl
        //~ console.log(scores[i])
      }
    }else{
      for(var i=st; i<ov; i++) 
      { 
        qvl=qun*(pscores[i]-miny )
        scores[i]=qvl<0? 0: qvl>subdvn? subdvn: qvl>>>0
      }
    }
    
    subdvn++  //true number of subdivisions
    
    //~ console.log(subdvn)
    //recycle these temp arrays
    //var _cntofsub=new Array(subdvn), _destosub=new Array(subdvn)
    
    if( true || _cntofsub.length<subdvn 
     ||( wkcnt++>wkcyc && _cntofsub.length>subdvn) ){
      _cntofsub = new Array(subdvn) 
      _destosub = new Array(subdvn)
      wkcnt=0
    } //just maintaining workspace arrays here ...
    
    for(var ch=0; ch<subdvn; ch++){ _cntofsub[ch]=0 }
    if (_destrema.length<barnm){ _destrema=new Array(barnm) }
    for(var ch=0; ch<barnm; ch++){ _destrema[ch]=0 }

    for(var i=st; i<ov; i++){  _cntofsub[scores[i]]++  } ///...
    
    var rlbar=(nb/barnm)
       ,fllbar=0,fldbar=0,spills=[]
       ,nxtcap=rlbar+0.5, fcap=Math.floor(nxtcap)
    //largest subdv is sometimes getting a key - fixit....
    
    //determining sub anchors to bar anchors  (anchor is first address)
    //~ console.log("subdvn:",subdvn,'barnm:',barnm)
    //~ 
    
    for(var sub=0; sub<subdvn; sub++){
      
      _destosub[sub]=fllbar            //_cntofsub bar sub goes to dest[fllbar]
      _destrema[fllbar]+=_cntofsub[sub]  //_destrema[fllbar] gets population of bar sub

      while(_destrema[fllbar]>=fcap){
        _destrema[fllbar+1]+=_destrema[fllbar]-fcap
        _destrema[fllbar]=fcap
        fllbar++
        nxtcap+=rlbar-fcap
        //~ fcap=Math.floor(nxtcap)
        fcap=nxtcap >>>0
        //~ if(fllbar-fldbar>1){ spills.push(fldbar); fldbar++ }
      }
      //~ fldbar=fllbar
    }
      
    //_cntofsub[h] is the freq of sub 
    //_destrema[fillit] is capacity of bars
       
    //_destrema is parallel to barppl
    //_destrema must empty but barppl wants returned
    //ceil of _destrema is complicated here by dvrems fraction..
    
    if(pr.ordinate){  //write ordinals into kysbar instead of bars
      var bapos=[0]   //barAnchorPositions
      for(var i=0;i<barnm-1;i++){ bapos[i+1]=bapos[i]+_destrema[i] }
    
      for(var i=st; i<ov; i++){ //not st ov capable
        var subposi=scores[i]
        
        while(_destrema[_destosub[subposi]]===0){ 
          //_destrema[_destosub[subposi]]--
          _destosub[subposi]++ 
        }
        _destrema[_destosub[subposi]]--
        kysbar[bapos[_destosub[subposi]]++ ]=i  //i know its crazy, but its true
      }
    }else{ 
      if(barppl) //this array is used by an external callee
      { for(var i=0;i<barnm;i++){ barppl[i]=_destrema[i] } }

      for(var i=st; i<ov; i++){ 
        var subposi=scores[i]
        
        while(_destrema[_destosub[subposi]]===0){ 
          //~ _destrema[_destosub[subposi]]--
          _destosub[subposi]++ 
        }
        _destrema[_destosub[subposi]]--
        kysbar[i]=_destosub[subposi] /// /// /// business line
        
      }
    }
    
    return _destrema //this was used for checking but is not used now
  }
  
  
  function barstoix(Ax,bfill,st,ov){
    
    st=st||0, ov=ov||Ax.length
    
    var rfill=bfill[0]; bfill[0]=0
    for(var i=0,e=bfill.length-1; i<e; i++) {
      var c=bfill[i+1]
      bfill[i+1]=rfill
      rfill+=c
    }
    
    var ind=Ax.slice(st,ov)
    
    for(var i=0,e=ov-st; i<e; i++){
      Ax[st+bfill[ind[i]]++ ]=i+st
    }
    
    return Ax
  }
    
  function fliparray(A){
    for(var e=A.length-1,i=(e+1)>>>1,sw=A[i]; i<=e; i++){
      sw=A[i], A[i]=A[e-i], A[e-i]=sw
    }
    return A
  }
    
  var compar
  function lessthan(a,b){ return a<b }
  function morethan(a,b){ return a>b }
  
  function sortorder(Av,desc,Ax,skiptry,skipfix){
    
    see=true//false//true//false//true//false//true
    if(see)console.log("doing sortorder",desc)
    
    var flipp=false, Alen=Av.length, minlen=10, hard=false
    if((!skiptry)&&Alen>minlen){
      
      var up=0,dw=0, samp=ntain(Alen>>>5,minlen)  // /64
            
      var dd,bb=dd=Av[0] ,nc=Math.ceil(0.1+Alen/(samp*8))
      for(var j=Alen-nc*samp; j<Alen; j+=nc){ //fast gamble on intro sample
        //~ console.log (j)
        bb=dd,dd=Av[j]
        if(dd<bb){ up++ }
        if(dd>bb){ dw++ }
      }

      var upness=(up-dw)/samp

      if(desc) upness=-upness
      
      var threshup=0.3 //1 maxout -1 neg-out
      if(upness>threshup){ flipp=true; }
      if((up*4>samp)&&(dw*4>samp)) hard=true
    }
    if(see)console.log ("hard:",hard,"flipp:",flipp)
    if( !(Ax&&Ax.length>=Alen) ){ Ax = ixArray(Av,flipp) }
    
    if(desc) { compar=lessthan } else { compar=morethan }
    var st=0
    ////////////////////////////////// take away true!!!!!!!!!!!!!!!!!!!!!
    if((!skiptry)&&!(hard&&(Alen>75))){ //try insertsort
      if(see) console.log ("easysoul sorting")
      
      var prema=3000, stint=400, trig=30, bottle=1,ramp=5000 //bottle much earlier!!
      st = soulsort(Av,Ax,stint,prema,bottle,trig,ramp)
      
      //~ while ( (sresult=insertndx(Av,Ax,stint,st)).bk < Alen){
        
        //~ if( sresult.du <(Alen*trys/15)) {
          //console.log("pre-ins bust trying",st,sresult.du)
          //~ break 
        //~ }
        //~ st=sresult.du,trys++
        //~ stint*=1.2
      //~ }
      
      if(st===Alen){ 
        if(see)console.log("solved by easysoul")
        return Ax 
      }
    }
 
    if(st<Alen*0.2) //made poor progress before
    { 
      if(see)console.log("doing barsort")
      
      var barlen=14, reso=2 //these values mined, mebbie 16/4 or other better?
      if(Av.length<1500000){ barlen=10}
      if(Av.length<300000){ barlen=6}
      
      var bars=Math.ceil(Av.length/barlen)+1 
      //~ var barppl=new Array(bars)
      Ax=Ax||new Array(Alen)
      //~ console.log("Barlen:",barlen,"reso:",reso)
        
      var rgallocs=barassign({
        barnum: bars
       ,scores: Av     //will be copied if no burnscore:true
       ,keysbar:Ax
       //~ ,barppl:barppl  //comment this out 
       ,savscore:1
       ,resolution:reso
       ,descend:desc
       ,secure:false
       ,ordinate:true
      })
            
    }else if( !(Ax&&Ax.length>=Av.length) ){ Ax = ixArray(Av,flipp) }
    
    if(skipfix){ return Ax }

    //~ return combubinsort(Av,Ax,desc)
    
    if(see)console.log("doing hardsoul") 
    
    prema=3000, stint=400, trig=30, bottle=150 //check bottle val
    
    st = soulsort(Av,Ax,stint,prema,bottle,trig,ramp)
    
    if(st<Alen) { 
      if(see)console.log("standarized") 
      stndindex(Av,desc,Ax) }
    
    //~ console.log(Ax.join(" "))
    return Ax
    
  }

  
  function ntain(a,b,c){ //contain a by b and c
    if(a<b) return b
    if(c<a) return c
    return a
  }
  
  
  function stndindex(Ai,desc,Ax){
    
    if(!Ax||Ax.length<Ai.length){
      Ax=new Array(Ai.length)
      for (var i=0,e=Ai.length; i<e; i++) Ax[i] = i
    }
    
    if(desc){
      Ax.sort( function (b, a) { return Ai[a] - Ai[b] } )
    }else{
      Ax.sort( function (a, b) { return Ai[a] - Ai[b] } )
    }
    return Ax
  }


  function ixArray(A,flipp){
    var Ar=new Array(A.length)
    if(flipp){
      for(var c=0,e=Ar.length,d=e; c<e; c++){ Ar[c]=--d}
    }else{
      for(var c=0,e=Ar.length; c<e; c++){ Ar[c]=c} 
    }
    
    return Ar
  }
    
  var see=false
  function soulsort(Av,Ax, stint, prema, bottle, trig,ramp){
    
    if(see)console.log("soul")
    if(see)console.log(Ax.slice(0,10).join(" "))
    
    var trys=0 ,bst=0,st=0,Alen=Av.length  ,shfts=0,sresult
    bottle = 1/bottle
    
    while ( (sresult=insertndx(Av,Ax,stint,st)).bk < Alen){
      bst=st,st=sresult.du,trys+=stint
      
      shfts=(shfts+stint/(st-bst+1))*0.45
      if(see)console.log("st",st,"shfts",shfts)
      if(shfts>trig){
        var Alnt=Math.ceil((prema)/50) 
        if(st<trys*bottle-5000) break
        if(see)console.log("st+Alnt",st,Alnt,prema)
        st=submerge(Av,Ax,prema,st,ntain(st+Alnt,0,Alen) )
        trys+=prema
        
        prema=prema>1000000?1000000:prema+ramp
      }else{
        prema=prema-ramp
        if(prema<2000) prema=2000
      }
    }
    
    //~ console.log (trys,sresult.du)
    if(see)console.log(Ax.slice(0,10).join(" "))
    //~ if(sresult.du<Alen) console.log("early",trys,sresult.bk,sresult.du)
    return sresult.du
    
  }

  var submcach=[] 
  function submerge(Av,Ax,prema,s,e){
   
    if(see)console.log ("min:",s,e,e-s) 
    //~ if(see)console.log(Ax.slice(0,10).join(" "))
    var res=insertndx(Av,Ax,prema,s+1,e,s)
    
    e=res.du
    
    if(e-s>submcach.length) submcach=new Array(e-s)
    for(var h=0,j=s,ee=e-s;h<ee; ) submcach[h++]=Ax[j++]
    
    //~ var cop=Ax.slice(s,e)
    
    if(see)console.log ("sli:",s,e,e-s)
     
    
    //~ var wrpos=e-1, clonx=e-s-1, hipt=s(-1), bhipt=hipt, lep=1 
    var wrpos=e-1, clonx=e-s-1, hipt=s-1, bhipt=hipt, lep=1 

    //loop till clonx<0 
    while(clonx!==-1)// ix of copyel to place
    {
      lep=1,bhipt=hipt
      
      if(see) console.log("wrpos:",wrpos)
      if(see) console.log("clopt",clonx,"clova",Av[submcach[clonx]])
      if(see) console.log("hipt:",hipt ,"hiva:",Av[Ax[hipt]])
      //~ if(see) console.log("test:",compar( Av[Ax[hipt]],Av[submcach[clonx]] ))
      
      //find hipt for clonel, the highest ix where clonel can go 
      //~ if( (hipt>-1) && !compar( Av[Ax[hipt]] , Av[submcach[clonx]]) ) // is not jdest
      while( (hipt>-1) && compar( Av[Ax[hipt]],Av[submcach[clonx]] ) ) // is not jdest
      { hipt=hipt-(lep++) } 
      if(hipt<1){ hipt=0 } 
      
      //~ if( (hipt<=bhipt) && compar( Av[Ax[hipt]] , Av[submcach[clonx]]) ) // is jdest
      while( (hipt<=bhipt) && !compar( Av[Ax[hipt]],Av[submcach[clonx]] ) ) // is jdest
      { hipt++ }  //careful with stability here, get equal high as poss
      hipt--
      
      if(see) console.log("hapt:",hipt ,"hava:",Av[Ax[hipt]])
      //if hipt is bhipt
      
      //move bhipt to hipt up to wrpos (up by wrpos-bhipt)
      //for(var c=bhipt(-1),d=c+copn; c>(=)hipt; c--){
      for(var c=bhipt,d=c+wrpos-bhipt;  c>hipt; ){
        Ax[d--]=Ax[c--]  //fiddle these byones
      }
      
      //bhipt moving to wrpos, mvby wrpos-bhipt
      //add bhipt-hipt to wrpos
      wrpos-=(bhipt-hipt)
      //THEN place copyel in wrpos
      Ax[wrpos]=submcach[clonx]
      //then dec wrpos and dec clonx
      wrpos--,clonx--
      
    }//while
    
    /*
    var c=e, hipt=s-1, clonx=e-s-1 ,colen=e-s ,hiplace=clonx


    while(clonx>-1){
      if( compar( Av[Ax[hipt]] , Av[submcach[clonx]]) ){
        Ax[--c]= Ax[hipt--]
      }else{
        Ax[--c]= submcach[clonx--]
      }
    }
    */
    //~ if(see)console.log(Ax.slice(0,10).join(" "))
    return e
  }

    
    
  function insertndx(Av,Ax,prema,s,e,a){ 
    
    if(a===undefined) a=0
    if(s===undefined) s=1
    if(e===undefined) e=Ax.length
    
    var moved=0, prema=Math.ceil( prema||20*e )
    var pickv=compar(Av[Ax[s]],Av[Ax[s]]+1)?Av[Ax[s]]+1:Av[Ax[s]]-1
    var oback=0,bacway=0,pickx
    
    for(var dueway=s ;dueway<e; dueway++){
      
      pickx = Ax[dueway] 
      
      //this pick is lower or equal than last pick
      //which was placed oback
      if( !compar( Av[pickx],pickv ) ){ 
        for(var t=dueway;t>oback;){ Ax[t] = Ax[--t] }
        moved+=bacway-oback ; bacway=oback
      }else{
        bacway=dueway-1
      }
      pickv=Av[pickx]
      
      while( bacway>=a && compar(Av[Ax[bacway]] , pickv)){ //if pre is smaller
        Ax[bacway+1] = Ax[bacway]              //
        bacway--
        moved++
      }
      Ax[++bacway] = pickx                     //put pickx down
      oback=bacway
      //~ moved+=dueway-bacway
      if( moved > prema){ 
        return {bk:bacway,du:dueway} 
      }
    }
     
    return {bk:dueway,du:dueway}
  }
     
  function combubble(Av,Ax,s,e,jmp,fin){
    
    var r=0
    s=s||0 ,e=e||Av.length ,fin=fin||70 
    for( jmp=jmp||(e-s)*0.66667 ; jmp>=fin ; jmp=jmp*0.66667 ){
         
      var jmpb=Math.floor(jmp*0.28)
         ,jmpe=Math.floor(jmp*0.98)
         ,jmpf=Math.floor(jmp)
         ,t=0
         
      for(var cc=s ,es=e-jmpf; cc<es; cc+=1)
      { 
        var jd=cc+jmpb ,je=cc+jmpe ,jf=cc+jmpf 
        if( compar(Av[Ax[cc]] , Av[Ax[jd]]) ){ t=Ax[cc],Ax[cc]=Ax[jd],Ax[jd]=t }
        if( compar(Av[Ax[jd]] , Av[Ax[je]]) ){ t=Ax[jd],Ax[jd]=Ax[je],Ax[je]=t }
        if( compar(Av[Ax[cc]] , Av[Ax[jf]]) ){ t=Ax[cc],Ax[cc]=Ax[jf],Ax[jf]=t,r++ }
      }
    
    }
    return r/(e-s)
  } 
    
    
  function reorder(Av,Ax){
    
    var Ar=new Array(Av.length)
    for(var j=0,e=Ax.length;j<e;j++){
      Ar[j]=Av[Ax[j]]
    }
    return Av=Ar
  }

  function sort(Av,desc){
    return reorder(Av,sortorder(Av,desc))
  }
    
  return{
     barassign : barassign 
    ,sortorder : sortorder
    ,sort      : sort
    ,reorder   : reorder
    
    ,stndindex : stndindex
    ,insertndx : insertndx
    
    ,barstoix  : barstoix
    ,version   : version 
  }

}())}


var mdname='Barsort', facfnc=Barsortfactory
if (typeof exports !== 'undefined') 
{ if (typeof module !== 'undefined' && module.exports)
  { exports = module.exports = facfnc({}) }
  else { exports[mdname] = facfnc({}) }
} else {
  if (typeof define === 'function' && define.amd) 
  { define( mdname,[],function(){return facfnc({})} ) }
  else
  { (1,eval)('this')[mdname] = facfnc({}) } 
}

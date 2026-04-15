// VERSION 3 - FIXED - April 15 2026
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

var PRESET_SNACKS = [
  { name: "Doritos", price: 1.75, satisfaction: 8 },
  { name: "Snickers", price: 1.50, satisfaction: 7 },
  { name: "Cheez-Its", price: 2.00, satisfaction: 9 },
  { name: "Skittles", price: 1.00, satisfaction: 5 },
  { name: "Goldfish", price: 0.75, satisfaction: 4 },
  { name: "Trail Mix", price: 2.25, satisfaction: 9 },
  { name: "Pretzels", price: 1.25, satisfaction: 6 },
  { name: "Cookies", price: 1.50, satisfaction: 7 },
];

function fmt(c) { return "$" + (c / 100).toFixed(2); }

function solveDP(snacks, B) {
  var n = snacks.length;
  var dp = []; for (var r = 0; r <= n; r++) { var row = []; for (var c = 0; c <= B; c++) row.push(0); dp.push(row); }
  var decisions = [];
  for (var i = 1; i <= n; i++) {
    var s = snacks[i - 1]; var rd = [];
    for (var w = 0; w <= B; w++) {
      if (s.priceCents <= w) { var sk = dp[i-1][w]; var tk = dp[i-1][w-s.priceCents]+s.satisfaction; dp[i][w] = Math.max(sk,tk);
        if (w===B||w%Math.max(25,Math.floor(B/8))===0) rd.push({w:w,skip:sk,take:tk,chose:tk>sk?"take":"skip",val:dp[i][w]});
      } else { dp[i][w]=dp[i-1][w];
        if (w===B||w%Math.max(25,Math.floor(B/8))===0) rd.push({w:w,skip:dp[i-1][w],take:null,chose:"cant-afford",val:dp[i][w]}); } }
    decisions.push({snack:s,row:i,decisions:rd}); }
  var sel=[]; var ww=B; var bts=[];
  for (var ii=n;ii>0;ii--) { if (dp[ii][ww]!==dp[ii-1][ww]) { bts.push({sn:snacks[ii-1].name,action:"TAKE",w:ww,nw:ww-snacks[ii-1].priceCents,v:dp[ii][ww],pv:dp[ii-1][ww]}); sel.push(snacks[ii-1]); ww-=snacks[ii-1].priceCents; } else { bts.push({sn:snacks[ii-1].name,action:"SKIP",w:ww,nw:ww,v:dp[ii][ww],pv:dp[ii-1][ww]}); } }
  sel.reverse(); return {maxSat:dp[n][B],selected:sel,table:dp,decisions:decisions,bts:bts};
}

function solveGreedy(snacks, B) {
  var items = []; for (var i=0;i<snacks.length;i++) { var s=snacks[i]; items.push({name:s.name,pc:s.priceCents,sat:s.satisfaction,id:s.id,ratio:s.satisfaction/s.priceCents}); }
  items.sort(function(a,b){return b.ratio-a.ratio;});
  var sel=[]; var rem=B; var steps=[];
  for (var j=0;j<items.length;j++) { var it=items[j];
    if (it.pc<=rem) { sel.push(it); var tot=0; for(var k=0;k<sel.length;k++) tot+=sel[k].sat;
      steps.push({name:it.name,pc:it.pc,sat:it.sat,ratio:it.ratio,action:"PICK",reason:it.name+" costs "+fmt(it.pc)+", we have "+fmt(rem)+". Fits!",rem:rem,nrem:rem-it.pc,rtot:tot}); rem-=it.pc;
    } else { var tot2=0; for(var k2=0;k2<sel.length;k2++) tot2+=sel[k2].sat;
      steps.push({name:it.name,pc:it.pc,sat:it.sat,ratio:it.ratio,action:"SKIP",reason:it.name+" costs "+fmt(it.pc)+", only "+fmt(rem)+" left. Skip.",rem:rem,nrem:rem,rtot:tot2}); } }
  var ft=0; for(var m=0;m<sel.length;m++) ft+=sel[m].sat;
  return {totalSat:ft,selected:sel,steps:steps,sorted:items};
}

function genGreedyTrace(snacks, B) {
  var lines=["GREEDY-SNACKS(snacks, B):","  Compute ratio = satisfaction / price","  Sort snacks by ratio descending","  selected ← [ ]","  remaining ← B","  for each snack in sorted order:","    if snack.price ≤ remaining:","      selected.append(snack)","      remaining ← remaining - snack.price","    else:","      skip this snack","  return selected"];
  var items=[]; for(var i=0;i<snacks.length;i++){var s=snacks[i]; items.push({name:s.name,pc:s.priceCents,sat:s.satisfaction,ratio:s.satisfaction/s.priceCents});}
  var sorted=items.slice().sort(function(a,b){return b.ratio-a.ratio;});
  var trace=[];
  var mk=function(line,vars,desc,sn,rem,cur,ph){return{line:line,vars:vars,desc:desc,sn:sn,rem:rem,cur:cur,ph:ph};};
  trace.push(mk(0,{snacks:snacks.map(function(s){return s.name;}).join(", "),B:fmt(B)},"Begin greedy algorithm",[],B,"","start"));
  trace.push(mk(1,{ratios:items.map(function(s){return s.name+": "+s.ratio.toFixed(4);}).join(", ")},"Calculate satisfaction ÷ price for each snack",[],B,"","ratios"));
  trace.push(mk(2,{sorted:sorted.map(function(s){return s.name+" ("+s.ratio.toFixed(4)+")";}).join(", ")},"Sort by ratio: highest first",[],B,"","sort"));
  trace.push(mk(3,{selected:"[ ]"},"Initialize empty selection",[],B,"","init"));
  trace.push(mk(4,{remaining:fmt(B)},"Set remaining budget to "+fmt(B),[],B,"","init"));
  var rem=B; var sel=[];
  for(var j=0;j<sorted.length;j++){var s=sorted[j]; var names=sel.map(function(x){return x.name;});
    trace.push(mk(5,{snack:s.name,price:fmt(s.pc),sat:""+s.sat,ratio:s.ratio.toFixed(4)},"Considering \""+s.name+"\" ("+fmt(s.pc)+", sat="+s.sat+")",names,rem,s.name,"loop"));
    if(s.pc<=rem){
      trace.push(mk(6,{check:fmt(s.pc)+" ≤ "+fmt(rem)+" → TRUE"},"Can we afford it? "+fmt(s.pc)+" ≤ "+fmt(rem)+"? YES!",names,rem,s.name,"check-yes"));
      sel.push(s); var na=sel.map(function(x){return x.name;});
      trace.push(mk(7,{selected:na.join(", ")},"Add \""+s.name+"\" to selected",na,rem,s.name,"add"));
      rem-=s.pc;
      trace.push(mk(8,{remaining:fmt(rem+s.pc)+" - "+fmt(s.pc)+" = "+fmt(rem)},"Subtract price: remaining = "+fmt(rem),na,rem,s.name,"subtract"));
    } else {
      trace.push(mk(6,{check:fmt(s.pc)+" ≤ "+fmt(rem)+" → FALSE"},"Can we afford it? "+fmt(s.pc)+" ≤ "+fmt(rem)+"? NO",names,rem,s.name,"check-no"));
      trace.push(mk(10,{skipped:s.name},"Skip \""+s.name+"\" — too expensive",names,rem,s.name,"skip"));
    }}
  var ft=0;for(var m=0;m<sel.length;m++)ft+=sel[m].sat; var fn=sel.map(function(x){return x.name;});
  trace.push(mk(11,{result:fn.join(" + "),totalSat:""+ft},"Done! Total satisfaction = "+ft,fn,rem,"","done"));
  return{lines:lines,trace:trace};
}

function genDPTrace(snacks, B) {
  var lines=["KNAPSACK-SNACKS(snacks, B):","  n ← length(snacks)","  Create DP[0..n][0..B] = all zeros","  for i ← 1 to n:","    for w ← 0 to B:","      if snacks[i].price ≤ w:","        skip ← DP[i-1][w]","        take ← DP[i-1][w-price] + satisfaction","        DP[i][w] ← max(skip, take)","      else:","        DP[i][w] ← DP[i-1][w]","  return DP[n][B]"];
  var n=snacks.length; var step=B<=300?25:B<=600?50:100;
  var cols=[]; for(var w=0;w<=B;w+=step) cols.push(w); if(cols[cols.length-1]!==B) cols.push(B);
  var dp=[]; for(var r=0;r<=n;r++){var row=[];for(var c=0;c<=B;c++)row.push(0);dp.push(row);}
  var trace=[]; var snap=function(){var t=[];for(var i=0;i<=n;i++){var r=[];for(var j=0;j<cols.length;j++)r.push(dp[i][cols[j]]);t.push(r);}return t;};
  trace.push({line:0,vars:{snacks:snacks.map(function(s){return s.name;}).join(", "),B:fmt(B)},desc:"Begin DP algorithm",table:snap(),hc:null,cr:0,ph:""});
  trace.push({line:1,vars:{n:""+n},desc:"n = "+n+" snacks",table:snap(),hc:null,cr:0,ph:""});
  trace.push({line:2,vars:{size:(n+1)+" × "+(B+1)},desc:"Create "+(n+1)+" × "+(B+1)+" table, all zeros",table:snap(),hc:null,cr:0,ph:""});
  for(var i=1;i<=n;i++){var s=snacks[i-1];
    trace.push({line:3,vars:{i:""+i,snack:s.name,price:fmt(s.priceCents),sat:""+s.satisfaction},desc:"Row "+i+": \""+s.name+"\" ("+fmt(s.priceCents)+", sat="+s.satisfaction+")",table:snap(),hc:null,cr:i,ph:""});
    for(var ww=0;ww<=B;ww++){if(s.priceCents<=ww)dp[i][ww]=Math.max(dp[i-1][ww],dp[i-1][ww-s.priceCents]+s.satisfaction);else dp[i][ww]=dp[i-1][ww];}
    for(var ci=0;ci<cols.length;ci++){var wc=cols[ci];
      if(s.priceCents<=wc){var sk=dp[i-1][wc];var lw=wc-s.priceCents;var lv=dp[i-1][lw];var tk=lv+s.satisfaction;var ch=tk>sk?"take":"skip";
        trace.push({line:5,vars:{w:fmt(wc),check:fmt(s.priceCents)+" ≤ "+fmt(wc)+" → YES"},desc:"Budget "+fmt(wc)+": can afford "+s.name,table:snap(),hc:[i,ci],cr:i,ph:""});
        trace.push({line:6,vars:{skip:"DP["+(i-1)+"]["+wc+"] = "+sk},desc:"Skip value = "+sk,table:snap(),hc:[i,ci],cr:i,ph:""});
        trace.push({line:7,vars:{take:"DP["+(i-1)+"]["+lw+"] + "+s.satisfaction+" = "+lv+" + "+s.satisfaction+" = "+tk},desc:"Take value = "+lv+" + "+s.satisfaction+" = "+tk,table:snap(),hc:[i,ci],cr:i,ph:""});
        trace.push({line:8,vars:{result:"max("+sk+", "+tk+") = "+dp[i][wc],chose:ch},desc:"DP["+i+"]["+wc+"] = max("+sk+", "+tk+") = "+dp[i][wc]+(ch==="take"?" ← TAKE!":" ← skip"),table:snap(),hc:[i,ci],cr:i,ph:""});
      } else {trace.push({line:10,vars:{w:fmt(wc),result:"DP["+i+"]["+wc+"] = "+dp[i][wc]},desc:"Budget "+fmt(wc)+": can't afford ("+fmt(s.priceCents)+" > "+fmt(wc)+"). Copy "+dp[i][wc],table:snap(),hc:[i,ci],cr:i,ph:""});}}}
  trace.push({line:11,vars:{answer:""+dp[n][B]},desc:"Done! DP["+n+"]["+B+"] = "+dp[n][B],table:snap(),hc:[n,cols.length-1],cr:n,ph:"done"});
  return{lines:lines,trace:trace,cols:cols};
}

function SatDots(props){var v=props.value;var d=[];for(var i=0;i<10;i++)d.push(<div key={i} style={{width:8,height:8,borderRadius:"50%",background:i<v?"#e11d63":"#f0e4e8"}}/>);return(<div style={{display:"flex",gap:3,alignItems:"center"}}>{d}<span style={{fontSize:11,color:"#b0899a",marginLeft:4}}>{v}/10</span></div>);}

var P={bg:"#fffbfc",card:"#ffffff",cb:"#f5dde5",pk:"#e11d63",pl:"#fdf0f4",pm:"#f8d0dd",ps:"#fbe8ef",rose:"#be185d",tx:"#3f1a2b",tm:"#9a7085",tl:"#c9a3b4",gn:"#16a34a",gb:"#ecfdf5",gbd:"#bbf7d0",rb:"#fef2f2",rbd:"#fecaca",gd:"#ca8a04",gdb:"#fefce8",gdbd:"#fef08a",ib:"#fdf6f8",ibd:"#edd5dc"};
var CS={background:P.card,borderRadius:16,border:"1px solid "+P.cb,boxShadow:"0 1px 4px rgba(190,24,93,0.06)"};

function CodeVis(props){
  var lines=props.lines;var trace=props.trace;var renderSt=props.renderSt;var title=props.title;
  var _s=useState(0);var step=_s[0];var setStep=_s[1];
  var _p=useState(false);var playing=_p[0];var setPlaying=_p[1];
  var timer=useRef(null);var cur=trace[step]||trace[0];
  useEffect(function(){setStep(0);setPlaying(false);},[trace]);
  useEffect(function(){if(playing&&step<trace.length-1){timer.current=setTimeout(function(){setStep(function(s){return s+1;});},900);return function(){clearTimeout(timer.current);};}else if(step>=trace.length-1)setPlaying(false);},[playing,step,trace.length]);
  var toggle=function(){if(step>=trace.length-1){setStep(0);setPlaying(true);}else setPlaying(!playing);};
  var ve=[];var vk=Object.keys(cur.vars);for(var i=0;i<vk.length;i++)ve.push({k:vk[i],v:String(cur.vars[vk[i]])});
  return(<div>
    <div style={{...CS,padding:20,marginBottom:16}}><h2 style={{margin:"0 0 6px 0",fontSize:20,color:P.rose}}>{"▶️ "+title}</h2><p style={{color:P.tm,fontSize:13,margin:0}}>Step through the code line by line.</p></div>
    <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
      <button onClick={function(){setStep(0);setPlaying(false);}} style={{padding:"8px 14px",border:"1px solid "+P.pm,borderRadius:8,background:P.card,cursor:"pointer",fontWeight:700,color:P.tm,fontSize:13}}>⏮</button>
      <button onClick={function(){setStep(Math.max(0,step-1));}} style={{padding:"8px 14px",border:"1px solid "+P.pm,borderRadius:8,background:P.card,cursor:step===0?"default":"pointer",fontWeight:700,color:step===0?P.tl:P.tx,fontSize:13}}>◀ Prev</button>
      <button onClick={toggle} style={{padding:"8px 18px",border:"none",borderRadius:8,background:playing?"#dc2626":P.pk,color:"white",cursor:"pointer",fontWeight:700,fontSize:13}}>{playing?"⏸ Pause":"▶ Play"}</button>
      <button onClick={function(){setPlaying(false);setStep(Math.min(trace.length-1,step+1));}} style={{padding:"8px 14px",border:"1px solid "+P.pm,borderRadius:8,background:P.card,cursor:step>=trace.length-1?"default":"pointer",fontWeight:700,color:step>=trace.length-1?P.tl:P.tx,fontSize:13}}>Next ▶</button>
      <button onClick={function(){setPlaying(false);setStep(trace.length-1);}} style={{padding:"8px 14px",border:"1px solid "+P.pm,borderRadius:8,background:P.card,cursor:"pointer",fontWeight:700,color:P.tm,fontSize:13}}>⏭</button>
      <span style={{marginLeft:"auto",fontSize:12,color:P.tl}}>Step {step+1} / {trace.length}</span>
    </div>
    <div style={{height:4,background:P.pl,borderRadius:4,marginBottom:16,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,"+P.pk+","+P.rose+")",width:((step+1)/trace.length*100)+"%",transition:"width 0.3s",borderRadius:4}}/></div>
    <div style={{...CS,padding:"12px 18px",marginBottom:14,background:P.ps,borderColor:P.pm}}><div style={{fontSize:14,fontWeight:700,color:P.tx}}>{cur.desc}</div></div>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:16}}>
      <div style={{flex:"1 1 360px",background:"#2d1b25",borderRadius:14,overflow:"hidden",border:"1px solid #4a2a38"}}>
        <div style={{padding:"10px 16px",background:"#3f1a2b",fontSize:11,color:"#f9a8c9",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Pseudocode</div>
        <div style={{padding:"12px 0",fontFamily:"'Consolas','Courier New',monospace",fontSize:13,lineHeight:2}}>
          {lines.map(function(line,idx){return(<div key={idx} style={{padding:"0 16px",background:idx===cur.line?"rgba(225,29,99,0.25)":"transparent",borderLeft:idx===cur.line?"3px solid "+P.pk:"3px solid transparent",color:idx===cur.line?"#fff":"#c9a3b4"}}><span style={{color:"#6b4a5a",marginRight:10,fontSize:11}}>{String(idx+1).padStart(2," ")}</span>{line}</div>);})}
        </div>
      </div>
      <div style={{flex:"1 1 280px",...CS,padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",background:P.pl,fontSize:11,color:P.rose,fontWeight:700,textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid "+P.pm}}>Variables</div>
        <div style={{padding:14}}>
          {ve.length>0?ve.map(function(e){return(<div key={e.k} style={{display:"flex",gap:8,padding:"6px 10px",background:P.pl,borderRadius:8,marginBottom:4,fontSize:12,border:"1px solid "+P.pm}}><span style={{fontWeight:800,color:P.rose,minWidth:70,fontFamily:"Consolas,monospace"}}>{e.k}</span><span style={{color:P.tx,wordBreak:"break-all"}}>{e.v}</span></div>);}):<div style={{color:P.tl,fontSize:12,fontStyle:"italic"}}>No changes</div>}
        </div>
      </div>
    </div>
    {renderSt(cur)}
  </div>);
}

export default function App(){
  var[snacks,setSnacks]=useState([]);var[budget,setBudget]=useState("5.00");var[nn,setNN]=useState("");var[np,setNP]=useState("");var[ns,setNS]=useState(5);
  var[results,setResults]=useState(null);var[tab,setTab]=useState("input");var[ei,setEI]=useState(null);var[en,setEN]=useState("");var[ep,setEP]=useState("");var[es,setES]=useState(5);
  var[gt,setGT]=useState(null);var[dt,setDT]=useState(null);

  var add=function(){if(!nn.trim()||!np||parseFloat(np)<=0)return;setSnacks(function(p){return p.concat([{name:nn.trim(),price:parseFloat(np),priceCents:Math.round(parseFloat(np)*100),satisfaction:ns,id:Date.now()}]);});setNN("");setNP("");setNS(5);};
  var rm=function(id){setSnacks(function(p){return p.filter(function(s){return s.id!==id;});});};
  var lp=function(){setSnacks(PRESET_SNACKS.map(function(s,i){return{name:s.name,price:s.price,priceCents:Math.round(s.price*100),satisfaction:s.satisfaction,id:Date.now()+i};}));};
  var se=function(idx){var s=snacks[idx];setEI(idx);setEN(s.name);setEP(s.price.toString());setES(s.satisfaction);};
  var sv=function(){if(ei===null)return;setSnacks(function(p){return p.map(function(s,i){return i===ei?{name:en,price:parseFloat(ep),priceCents:Math.round(parseFloat(ep)*100),satisfaction:es,id:s.id}:s;});});setEI(null);};

  var opt=function(){if(snacks.length<2)return;var bc=Math.round(parseFloat(budget)*100);if(bc<=0)return;
    setResults({dp:solveDP(snacks,bc),greedy:solveGreedy(snacks,bc),bc:bc});setGT(genGreedyTrace(snacks,bc));setDT(genDPTrace(snacks,bc));setTab("results");};

  var bc=Math.round(parseFloat(budget||0)*100);
  var tStep=useMemo(function(){if(!results)return 25;var b=results.bc;return b<=300?25:b<=600?50:b<=1200?75:100;},[results]);
  var tCols=useMemo(function(){if(!results)return[];var c=[];for(var w=0;w<=results.bc;w+=tStep)c.push(w);if(c[c.length-1]!==results.bc)c.push(results.bc);return c;},[results,tStep]);

  var renderGS=useCallback(function(cur){
    var sa=cur.sn||[];var ph=cur.ph||"";var phG=ph==="check-yes"||ph==="add"||ph==="subtract";var phR=ph==="check-no"||ph==="skip";
    return(<div style={{...CS,padding:16}}><div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
      <div style={{flex:"1 1 200px"}}><div style={{fontSize:11,fontWeight:700,color:P.tm,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Selected</div>
        {sa.length>0?sa.map(function(name,i){return(<div key={i} style={{padding:"5px 10px",background:P.gb,borderRadius:7,marginBottom:3,fontSize:12,fontWeight:600,border:"1px solid "+P.gbd,color:P.gn}}>{"✓ "+name}</div>);}):<div style={{fontSize:12,color:P.tl,fontStyle:"italic"}}>None yet</div>}
      </div>
      <div style={{flex:"1 1 200px"}}><div style={{fontSize:11,fontWeight:700,color:P.tm,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Budget</div>
        <div style={{fontSize:22,fontWeight:800,color:P.rose}}>{fmt(cur.rem)}</div>
        <div style={{fontSize:11,color:P.tl}}>{"remaining"+(results?" of "+fmt(results.bc):"")}</div>
        {results&&<div style={{marginTop:6,height:8,background:P.pl,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:P.pk,width:(cur.rem/results.bc*100)+"%",borderRadius:4,transition:"width 0.3s"}}/></div>}
      </div>
      {cur.cur?<div style={{flex:"1 1 200px"}}><div style={{fontSize:11,fontWeight:700,color:P.tm,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Evaluating</div>
        <div style={{padding:"8px 12px",borderRadius:8,background:phG?P.gb:phR?P.rb:P.gdb,border:"1px solid "+(phG?P.gbd:phR?P.rbd:P.gdbd)}}><div style={{fontWeight:700,fontSize:14}}>{cur.cur}</div></div></div>:null}
    </div></div>);
  },[results]);

  var renderDS=useCallback(function(cur){
    if(!cur.table||!dt)return null;
    return(<div style={{...CS,padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",background:P.pl,fontSize:11,color:P.rose,fontWeight:700,textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid "+P.pm}}>DP Table (Live)</div>
      <div style={{overflowX:"auto",padding:4}}>
        <table style={{borderCollapse:"collapse",fontSize:11,width:"100%",minWidth:dt.cols.length*55+100}}>
          <thead><tr><th style={{padding:"6px 8px",textAlign:"left",color:P.tm,fontSize:9,borderBottom:"1px solid "+P.pm,background:P.pl,position:"sticky",left:0,zIndex:1}}>Snack</th>
            {dt.cols.map(function(w,ci){return(<th key={ci} style={{padding:"6px 4px",textAlign:"center",fontSize:9,color:results&&w===results.bc?P.rose:P.tm,fontWeight:results&&w===results.bc?800:500,borderBottom:"1px solid "+P.pm,background:P.pl}}>{fmt(w)}</th>);})}</tr></thead>
          <tbody>
            <tr><td style={{padding:"5px 8px",color:P.tl,fontStyle:"italic",fontSize:10,borderBottom:"1px solid #fce7ef",background:P.card,position:"sticky",left:0,zIndex:1}}>(none)</td>
              {cur.table[0].map(function(v,ci){return(<td key={ci} style={{padding:"5px 4px",textAlign:"center",color:P.tl,borderBottom:"1px solid #fce7ef"}}>{v}</td>);})}</tr>
            {snacks.map(function(s,idx){var ri=idx+1;var rd=cur.table[ri]||[];return(<tr key={idx}>
              <td style={{padding:"5px 8px",fontWeight:600,fontSize:10,borderBottom:"1px solid #fce7ef",color:ri===cur.cr?P.rose:P.tx,background:ri===cur.cr?P.ps:P.card,position:"sticky",left:0,zIndex:1,whiteSpace:"nowrap"}}>{s.name}</td>
              {rd.map(function(v,ci){var ih=cur.hc&&cur.hc[0]===ri&&cur.hc[1]===ci;var pv=cur.table[ri-1]?cur.table[ri-1][ci]:0;var ch=v!==pv&&v>0;var fin=ri===snacks.length&&ci===dt.cols.length-1&&cur.ph==="done";
                return(<td key={ci} style={{padding:"5px 4px",textAlign:"center",fontWeight:ch||ih?700:400,borderBottom:"1px solid #fce7ef",transition:"all 0.3s",color:fin?"white":ih?P.rose:ch?P.gn:P.tl,background:fin?P.rose:ih?"rgba(225,29,99,0.12)":ch?P.gb:"transparent",borderRadius:fin?4:0,boxShadow:ih?"inset 0 0 0 2px #e11d63":"none"}}>{v}</td>);})}</tr>);})}
          </tbody>
        </table>
      </div>
    </div>);
  },[dt,snacks,results]);

  var tabs=[{k:"input",l:"📋 Input",b:snacks.length,d:false},{k:"results",l:"📊 Results",b:0,d:!results},{k:"greedy-steps",l:"🟡 Greedy",b:0,d:!results},{k:"dp-steps",l:"🟢 DP",b:0,d:!results},{k:"greedy-code",l:"▶️ Greedy Code",b:0,d:!gt},{k:"dp-code",l:"▶️ DP Code",b:0,d:!dt},{k:"table",l:"🧮 Table",b:0,d:!results}];

  return(<div style={{minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",background:P.bg,color:P.tx}}>
    <div style={{height:4,background:"linear-gradient(90deg,#f9a8c9,#e11d63,#f472b6,#e11d63,#f9a8c9)"}}/>
    <div style={{maxWidth:960,margin:"0 auto",padding:"28px 16px"}}>
      <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:38,marginBottom:2}}>🍫🪙</div><h1 style={{fontSize:26,fontWeight:800,margin:0,color:P.rose}}>Vending Machine Optimizer</h1><p style={{color:P.tm,fontSize:13,marginTop:4}}>0/1 Knapsack DP vs. Greedy — CS 5800</p></div>

      <div style={{display:"flex",gap:3,marginBottom:24,background:P.pl,borderRadius:14,padding:4,border:"1px solid "+P.pm,flexWrap:"wrap"}}>
        {tabs.map(function(t){return(<button key={t.k} onClick={function(){if(!t.d)setTab(t.k);}} style={{flex:1,padding:"9px 2px",border:"none",borderRadius:11,cursor:t.d?"default":"pointer",fontSize:11,fontWeight:600,minWidth:70,background:tab===t.k?P.card:"transparent",color:t.d?P.tl:tab===t.k?P.pk:P.tm,opacity:t.d?0.4:1,boxShadow:tab===t.k?"0 1px 4px rgba(190,24,93,0.1)":"none"}}>{t.l}{t.b?" ("+t.b+")":""}</button>);})}</div>

      {/* INPUT */}
      {tab==="input"&&<div>
        <div style={{...CS,padding:20,marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:P.tm,textTransform:"uppercase",letterSpacing:1.2}}>💰 Budget</label><div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><span style={{fontSize:26,fontWeight:800,color:P.pk}}>$</span><input value={budget} onChange={function(e){setBudget(e.target.value);}} type="number" step="0.25" min="0.25" style={{background:P.ib,border:"2px solid "+P.ibd,borderRadius:10,color:P.rose,fontSize:26,fontWeight:800,padding:"8px 14px",width:140,outline:"none"}}/><span style={{fontSize:13,color:P.tl}}>({bc}¢)</span></div></div>
        <div style={{...CS,padding:20,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:P.tm,textTransform:"uppercase",letterSpacing:1.2}}>🍿 Add Snack</label><button onClick={lp} style={{background:P.pl,border:"1px solid "+P.pm,color:P.pk,borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Load Examples</button></div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:"1 1 160px"}}><div style={{fontSize:11,color:P.tm,marginBottom:4,fontWeight:600}}>Name</div><input value={nn} onChange={function(e){setNN(e.target.value);}} placeholder="e.g. Doritos" onKeyDown={function(e){if(e.key==="Enter")add();}} style={{background:P.ib,border:"1.5px solid "+P.ibd,borderRadius:9,color:P.tx,fontSize:14,padding:"9px 12px",width:"100%",outline:"none",boxSizing:"border-box"}}/></div>
            <div style={{flex:"0 0 100px"}}><div style={{fontSize:11,color:P.tm,marginBottom:4,fontWeight:600}}>Price ($)</div><input value={np} onChange={function(e){setNP(e.target.value);}} type="number" step="0.25" min="0.25" placeholder="1.50" onKeyDown={function(e){if(e.key==="Enter")add();}} style={{background:P.ib,border:"1.5px solid "+P.ibd,borderRadius:9,color:P.tx,fontSize:14,padding:"9px 12px",width:"100%",outline:"none",boxSizing:"border-box"}}/></div>
            <div style={{flex:"0 0 150px"}}><div style={{fontSize:11,color:P.tm,marginBottom:4,fontWeight:600}}>Satisfaction: <span style={{color:P.pk,fontWeight:800}}>{ns}</span>/10</div><input type="range" min={1} max={10} value={ns} onChange={function(e){setNS(Number(e.target.value));}} style={{width:"100%",accentColor:P.pk}}/></div>
            <button onClick={add} style={{background:P.pk,border:"none",borderRadius:10,color:"white",fontWeight:700,fontSize:14,padding:"9px 22px",cursor:"pointer",flexShrink:0,boxShadow:"0 3px 10px rgba(225,29,99,0.25)"}}>+ Add</button>
          </div>
        </div>
        {snacks.length>0&&<div style={{...CS,padding:20,marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:P.tm,textTransform:"uppercase",letterSpacing:1.2,display:"block",marginBottom:12}}>Vending Machine ({snacks.length} snacks)</label>
          {snacks.map(function(s,idx){return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:P.pl,borderRadius:11,border:"1px solid "+P.pm,marginBottom:6}}>
            {ei===idx?<><input value={en} onChange={function(e){setEN(e.target.value);}} style={{background:"white",border:"2px solid "+P.pk,borderRadius:7,color:P.tx,padding:"5px 8px",width:120,fontSize:13,outline:"none"}}/><input value={ep} onChange={function(e){setEP(e.target.value);}} type="number" step="0.25" style={{background:"white",border:"2px solid "+P.pk,borderRadius:7,color:P.tx,padding:"5px 8px",width:70,fontSize:13,outline:"none"}}/><input type="range" min={1} max={10} value={es} onChange={function(e){setES(Number(e.target.value));}} style={{width:80,accentColor:P.pk}}/><span style={{fontSize:12,color:P.pk,fontWeight:700}}>{es}</span><button onClick={sv} style={{background:P.gn,border:"none",borderRadius:7,color:"white",padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",marginLeft:"auto"}}>Save</button></>
            :<><span style={{fontSize:16}}>🍬</span><span style={{fontWeight:700,flex:"1 1 120px",minWidth:80}}>{s.name}</span><span style={{background:"white",color:P.rose,borderRadius:7,padding:"3px 10px",fontSize:13,fontWeight:800,border:"1px solid "+P.pm}}>{fmt(s.priceCents)}</span><div style={{flex:"0 0 160px"}}><SatDots value={s.satisfaction}/></div><button onClick={function(){se(idx);}} style={{background:"none",border:"none",color:P.tm,cursor:"pointer",fontSize:13}}>✏️</button><button onClick={function(){rm(s.id);}} style={{background:"none",border:"none",color:"#e11d48",cursor:"pointer",fontSize:14}}>✕</button></>}
          </div>);})}</div>}
        <button onClick={opt} disabled={snacks.length<2||bc<=0} style={{width:"100%",padding:"16px 24px",border:"none",borderRadius:14,cursor:snacks.length<2?"default":"pointer",fontSize:17,fontWeight:800,background:snacks.length<2?"#f0e4e8":"linear-gradient(135deg,#e11d63,#be185d)",color:snacks.length<2?P.tl:"white",boxShadow:snacks.length<2?"none":"0 6px 20px rgba(225,29,99,0.3)"}}>{snacks.length<2?"Add at least 2 snacks":"🚀 Find Optimal Snack Combo"}</button>
      </div>}

      {/* RESULTS */}
      {tab==="results"&&results&&(function(){var dw=results.dp.maxSat>results.greedy.totalSat;var dc=results.dp.selected.reduce(function(a,b){return a+b.priceCents;},0);var gc=results.greedy.selected.reduce(function(a,b){return a+b.pc;},0);var diff=results.dp.maxSat-results.greedy.totalSat;return(<div>
        <div style={{textAlign:"center",padding:"24px 16px",borderRadius:16,marginBottom:20,background:dw?P.gb:P.gdb,border:"1px solid "+(dw?P.gbd:P.gdbd)}}><div style={{fontSize:36,marginBottom:6}}>{dw?"🏆":"🤝"}</div><div style={{fontSize:21,fontWeight:800,color:dw?P.gn:P.gd}}>{dw?"DP Wins by "+diff+" Point"+(diff>1?"s":"")+"!":"It's a Tie!"}</div></div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:20}}>
          <div style={{flex:"1 1 300px",borderRadius:16,overflow:"hidden",border:"1px solid "+P.gbd,background:P.card}}><div style={{background:P.gb,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:700,color:P.gn}}>✅ DP</span><span style={{background:P.gn,color:"white",borderRadius:20,padding:"3px 14px",fontSize:14,fontWeight:800}}>Score: {results.dp.maxSat}</span></div>
            <div style={{padding:16}}>{results.dp.selected.map(function(s,i){return(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:P.gb,borderRadius:9,marginBottom:4,border:"1px solid "+P.gbd}}><span style={{fontWeight:600}}>{"🍬 "+s.name}</span><span><span style={{color:P.rose,fontWeight:700}}>{fmt(s.priceCents)}</span><span style={{color:P.gn,fontWeight:600,marginLeft:8}}>{"sat "+s.satisfaction}</span></span></div>);})}
            <div style={{marginTop:12,padding:"10px 12px",background:P.pl,borderRadius:9,display:"flex",justifyContent:"space-between",fontSize:13}}><span>Cost: <b style={{color:P.rose}}>{fmt(dc)}</b></span><span>Left: <b>{fmt(results.bc-dc)}</b></span></div></div></div>
          <div style={{flex:"1 1 300px",borderRadius:16,overflow:"hidden",border:"1px solid "+(dw?P.rbd:P.gdbd),background:P.card}}><div style={{background:dw?P.rb:P.gdb,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:700,color:dw?"#dc2626":P.gd}}>{dw?"⚠️ Greedy":"✅ Greedy"}</span><span style={{background:dw?"#dc2626":P.gd,color:"white",borderRadius:20,padding:"3px 14px",fontSize:14,fontWeight:800}}>Score: {results.greedy.totalSat}</span></div>
            <div style={{padding:16}}>{results.greedy.selected.map(function(s,i){return(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:dw?P.rb:P.gdb,borderRadius:9,marginBottom:4,border:"1px solid "+(dw?P.rbd:P.gdbd)}}><span style={{fontWeight:600}}>{"🍬 "+s.name}</span><span><span style={{color:P.rose,fontWeight:700}}>{fmt(s.pc)}</span><span style={{color:P.tm,marginLeft:8}}>{"sat "+s.sat}</span></span></div>);})}
            <div style={{marginTop:12,padding:"10px 12px",background:P.pl,borderRadius:9,display:"flex",justifyContent:"space-between",fontSize:13}}><span>Cost: <b style={{color:P.rose}}>{fmt(gc)}</b></span><span>Wasted: <b style={{color:results.bc-gc>0?"#dc2626":P.tm}}>{fmt(results.bc-gc)}</b></span></div></div></div>
        </div>
        {dw&&<div style={{...CS,padding:20,marginBottom:16,borderColor:P.pm,background:P.ps}}><div style={{fontWeight:700,color:P.pk,marginBottom:8}}>💡 Why Greedy Failed</div><p style={{color:P.tx,fontSize:13,lineHeight:1.7,margin:0}}>{"Greedy spent "+fmt(gc)+", leaving "+fmt(results.bc-gc)+" unused. DP used "+fmt(dc)+" and got "+diff+" more satisfaction."}</p></div>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["greedy-steps","🟡 Greedy Steps"],["dp-steps","🟢 DP Steps"],["greedy-code","▶️ Greedy Code"],["dp-code","▶️ DP Code"]].map(function(p){return(<button key={p[0]} onClick={function(){setTab(p[0]);}} style={{flex:1,padding:12,border:"1px solid "+P.cb,borderRadius:12,background:P.card,color:P.tx,fontSize:13,fontWeight:700,cursor:"pointer",minWidth:120}}>{p[1]}</button>);})}</div>
      </div>);})()}

      {/* GREEDY STEPS */}
      {tab==="greedy-steps"&&results&&<div>
        <div style={{...CS,padding:20,marginBottom:16}}><h2 style={{margin:"0 0 6px 0",fontSize:20,color:P.rose}}>🟡 Greedy — Step by Step</h2></div>
        <div style={{...CS,padding:18,marginBottom:14}}><div style={{fontWeight:700,color:P.pk,marginBottom:10,fontSize:14}}>Step 1: Compute Ratios</div>{snacks.map(function(s,i){return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:P.pl,borderRadius:9,marginBottom:4,border:"1px solid "+P.pm,fontSize:13}}><span style={{fontWeight:700,minWidth:100}}>{s.name}</span><span style={{color:P.tm}}>{s.satisfaction+" ÷ "+s.priceCents+"¢ ="}</span><span style={{fontWeight:800,color:P.rose}}>{(s.satisfaction/s.priceCents).toFixed(4)}</span></div>);})}</div>
        <div style={{...CS,padding:18,marginBottom:14}}><div style={{fontWeight:700,color:P.pk,marginBottom:10,fontSize:14}}>Step 2: Sort by Ratio</div>{results.greedy.sorted.map(function(s,i){return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:i===0?P.gb:P.pl,borderRadius:9,marginBottom:4,border:"1px solid "+(i===0?P.gbd:P.pm),fontSize:13}}><span style={{fontWeight:800,color:P.rose,minWidth:22}}>{"#"+(i+1)}</span><span style={{fontWeight:700,minWidth:100}}>{s.name}</span><span style={{color:P.tm}}>{fmt(s.pc)}</span><span style={{fontWeight:700,color:P.rose,marginLeft:"auto"}}>{"ratio: "+s.ratio.toFixed(4)}</span></div>);})}</div>
        <div style={{...CS,padding:18,marginBottom:14}}><div style={{fontWeight:700,color:P.pk,marginBottom:10,fontSize:14}}>Step 3: Pick Snacks</div><div style={{fontSize:12,color:P.tm,marginBottom:10}}>Budget: <b style={{color:P.rose}}>{fmt(results.bc)}</b></div>
          {results.greedy.steps.map(function(st,i){return(<div key={i} style={{padding:"10px 14px",borderRadius:10,marginBottom:6,background:st.action==="PICK"?P.gb:P.rb,border:"1px solid "+(st.action==="PICK"?P.gbd:P.rbd)}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontWeight:800,fontSize:11,padding:"2px 8px",borderRadius:6,background:st.action==="PICK"?P.gn:"#dc2626",color:"white"}}>{st.action==="PICK"?"✓ PICK":"✗ SKIP"}</span><span style={{fontWeight:700,fontSize:14}}>{st.name}</span></div><div style={{fontSize:12,color:P.tx}}>{st.reason}{st.action==="PICK"?<span style={{color:P.gn,fontWeight:600}}>{" Budget: "+fmt(st.rem)+" → "+fmt(st.nrem)+". Sat: "+st.rtot}</span>:null}</div></div>);})}</div>
        <div style={{display:"flex",gap:10}}><button onClick={function(){setTab("results");}} style={{flex:1,padding:14,border:"1px solid "+P.cb,borderRadius:12,background:P.card,color:P.tx,fontSize:14,fontWeight:700,cursor:"pointer"}}>← Results</button><button onClick={function(){setTab("greedy-code");}} style={{flex:1,padding:14,border:"1px solid "+P.cb,borderRadius:12,background:P.card,color:P.tx,fontSize:14,fontWeight:700,cursor:"pointer"}}>▶️ Greedy Code →</button></div>
      </div>}

      {/* DP STEPS */}
      {tab==="dp-steps"&&results&&<div>
        <div style={{...CS,padding:20,marginBottom:16}}><h2 style={{margin:"0 0 6px 0",fontSize:20,color:P.rose}}>🟢 DP — Step by Step</h2></div>
        <div style={{...CS,padding:18,marginBottom:14,background:"#f8f0f3"}}><div style={{fontWeight:700,color:P.pk,marginBottom:8,fontSize:14}}>Recurrence</div><div style={{background:"#3f1a2b",borderRadius:10,padding:"14px 18px",fontFamily:"Consolas,monospace",fontSize:13,color:"#f9a8c9",lineHeight:1.8}}><span style={{color:"#facc15"}}>if</span>{" price ≤ w: DP[i][w] = "}<span style={{color:"#4ade80"}}>max</span>{"( DP[i-1][w], DP[i-1][w-price] + sat )"}<br/><span style={{color:"#facc15"}}>else</span>{": DP[i][w] = DP[i-1][w]"}</div></div>
        <div style={{...CS,padding:18,marginBottom:14}}><div style={{fontWeight:700,color:P.pk,marginBottom:10,fontSize:14}}>{"Row by Row at "+fmt(results.bc)}</div>
          {results.dp.decisions.map(function(row,idx){var a=row.decisions.find(function(d){return d.w===results.bc;});if(!a)return null;return(<div key={idx} style={{padding:"12px 14px",borderRadius:10,marginBottom:8,background:a.chose==="take"?P.gb:P.pl,border:"1px solid "+(a.chose==="take"?P.gbd:P.pm)}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontWeight:800,fontSize:12,color:P.rose}}>{"Row "+row.row}</span><span style={{fontWeight:700,fontSize:14}}>{'"'+row.snack.name+'" ('+fmt(row.snack.priceCents)+", sat="+row.snack.satisfaction+")"}</span></div><div style={{fontSize:12,color:P.tx,lineHeight:1.7,paddingLeft:4}}>{a.chose==="cant-afford"?<span style={{color:"#dc2626"}}>{"Can't afford. Value stays "+a.val+"."}</span>:<span>{"• Skip: "+a.skip+" • Take: "+a.take}<br/><span style={{fontWeight:700,color:a.chose==="take"?P.gn:P.tm}}>{"→ max("+a.skip+", "+a.take+") = "+a.val+(a.chose==="take"?" ← TAKE!":" ← skip")}</span></span>}</div></div>);})}
          <div style={{padding:"10px 14px",background:P.gb,borderRadius:10,border:"1px solid "+P.gbd,fontSize:13,fontWeight:700}}>{"Answer: DP["+snacks.length+"]["+results.bc+"] = "}<span style={{color:P.gn,fontSize:16}}>{results.dp.maxSat}</span></div>
        </div>
        <div style={{...CS,padding:18,marginBottom:14}}><div style={{fontWeight:700,color:P.pk,marginBottom:10,fontSize:14}}>🔍 Backtracking</div>
          {results.dp.bts.map(function(s,i){return(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:s.action==="TAKE"?P.gb:P.pl,borderRadius:9,marginBottom:5,fontSize:12,border:"1px solid "+(s.action==="TAKE"?P.gbd:P.pm)}}><span style={{fontWeight:800,fontSize:11,padding:"2px 8px",borderRadius:6,background:s.action==="TAKE"?P.gn:P.pm,color:s.action==="TAKE"?"white":P.tm}}>{s.action}</span><span style={{fontWeight:700}}>{s.sn}</span><span style={{color:P.tm}}>{s.action==="TAKE"?s.v+" ≠ "+s.pv+" → taken! "+fmt(s.w)+" → "+fmt(s.nw):s.v+" = "+s.pv+" → not taken"}</span></div>);})}
          <div style={{marginTop:10,padding:"10px 14px",background:P.gb,borderRadius:10,border:"1px solid "+P.gbd,fontSize:13}}><b>Optimal: </b>{results.dp.selected.map(function(s){return s.name;}).join(" + ")+" = "}<b style={{color:P.gn}}>{"sat "+results.dp.maxSat}</b></div>
        </div>
        <div style={{display:"flex",gap:10}}><button onClick={function(){setTab("results");}} style={{flex:1,padding:14,border:"1px solid "+P.cb,borderRadius:12,background:P.card,color:P.tx,fontSize:14,fontWeight:700,cursor:"pointer"}}>← Results</button><button onClick={function(){setTab("dp-code");}} style={{flex:1,padding:14,border:"1px solid "+P.cb,borderRadius:12,background:P.card,color:P.tx,fontSize:14,fontWeight:700,cursor:"pointer"}}>▶️ DP Code →</button></div>
      </div>}

      {/* CODE VISUALIZERS */}
      {tab==="greedy-code"&&gt&&<CodeVis lines={gt.lines} trace={gt.trace} title="Greedy Code Trace" renderSt={renderGS}/>}
      {tab==="dp-code"&&dt&&<CodeVis lines={dt.lines} trace={dt.trace} title="DP Code Trace" renderSt={renderDS}/>}

      {/* TABLE */}
      {tab==="table"&&results&&<div>
        <div style={{...CS,padding:16,marginBottom:16}}><div style={{fontWeight:700,color:P.tx,marginBottom:6}}>Full DP Table</div><p style={{fontSize:12,color:P.tm,margin:0}}><span style={{color:P.gn,fontWeight:700}}>Green</span>{" = included. "}<span style={{color:"white",fontWeight:700,background:P.rose,padding:"0 4px",borderRadius:3}}>Pink</span>{" = answer."}</p></div>
        <div style={{overflowX:"auto",borderRadius:16,border:"1px solid "+P.cb,background:P.card}}>
          <table style={{borderCollapse:"collapse",fontSize:12,width:"100%",minWidth:tCols.length*58+130}}>
            <thead><tr><th style={{position:"sticky",left:0,zIndex:2,background:P.pl,padding:"10px 12px",textAlign:"left",borderBottom:"2px solid "+P.pm,color:P.tm,fontSize:10,textTransform:"uppercase",minWidth:110}}>Snack / Budget</th>{tCols.map(function(w){return(<th key={w} style={{padding:"10px 6px",textAlign:"center",borderBottom:"2px solid "+P.pm,color:w===results.bc?P.rose:P.tm,fontWeight:w===results.bc?800:600,fontSize:10,background:w===results.bc?P.ps:P.pl}}>{fmt(w)}</th>);})}</tr></thead>
            <tbody><tr><td style={{position:"sticky",left:0,zIndex:1,background:P.card,padding:"8px 12px",color:P.tl,fontStyle:"italic",borderBottom:"1px solid #fce7ef"}}>(none)</td>{tCols.map(function(w){return(<td key={w} style={{padding:"8px 6px",textAlign:"center",color:P.tl,borderBottom:"1px solid #fce7ef"}}>0</td>);})}</tr>
            {snacks.map(function(s,idx){var i=idx+1;var last=i===snacks.length;var isSel=results.dp.selected.some(function(x){return x.id===s.id;});return(<tr key={s.id}><td style={{position:"sticky",left:0,zIndex:1,background:P.card,padding:"8px 12px",fontWeight:600,whiteSpace:"nowrap",borderBottom:"1px solid #fce7ef",color:isSel?P.gn:P.tx}}>{(isSel?"✓ ":"")+s.name} <span style={{color:P.tl,fontWeight:400,fontSize:10}}>{fmt(s.priceCents)}</span></td>{tCols.map(function(w){var v=results.dp.table[i][w];var ch=v!==results.dp.table[i-1][w];var fin=last&&w===results.bc;return(<td key={w} style={{padding:"8px 6px",textAlign:"center",fontWeight:ch?700:400,borderBottom:"1px solid #fce7ef",color:fin?"white":ch?P.gn:P.tl,background:fin?P.rose:ch?P.gb:w===results.bc?"rgba(225,29,99,0.03)":"transparent",borderRadius:fin?6:0}}>{v}</td>);})}</tr>);})}</tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}><button onClick={function(){setTab("dp-steps");}} style={{flex:1,padding:14,border:"1px solid "+P.cb,borderRadius:12,background:P.card,color:P.tx,fontSize:14,fontWeight:700,cursor:"pointer"}}>← DP Steps</button><button onClick={function(){setTab("results");}} style={{flex:1,padding:14,border:"1px solid "+P.cb,borderRadius:12,background:P.card,color:P.tx,fontSize:14,fontWeight:700,cursor:"pointer"}}>📊 Results</button></div>
      </div>}

      <div style={{textAlign:"center",marginTop:32,padding:"16px 0",borderTop:"1px solid "+P.cb}}><p style={{fontSize:11,color:P.tl,margin:0}}>CS 5800 — Algorithms | Aakriti & Karina | Northeastern University | Spring 2026</p></div>
    </div>
  </div>);
}

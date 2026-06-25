import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 CONFIG — paste your published Google Sheet CSV URL here
// Sheet → File → Share → Publish to web → Sheet1 → CSV → Copy link
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";
const AUTO_REFRESH_SECONDS = 120; // refresh every 2 min (0 to disable)

// ── FIFA RANKINGS (Jun 11 2026 — official) ────────────────────────────────
const FIFA_RANK = {
  Argentina:1,Spain:2,France:3,England:4,Portugal:5,
  Brazil:6,Morocco:7,Netherlands:8,Belgium:9,Germany:10,
  Croatia:11,Colombia:13,Mexico:14,Senegal:15,Uruguay:16,
  USA:17,Japan:18,Switzerland:19,Iran:20,Turkiye:22,
  Ecuador:23,Austria:24,"Korea Republic":25,Australia:27,
  Algeria:28,Egypt:29,Canada:30,Norway:31,"Ivory Coast":33,
  Panama:34,Sweden:38,Czechia:40,Paraguay:41,Scotland:42,
  Tunisia:45,"DR Congo":46,Uzbekistan:50,Qatar:56,Iraq:57,
  "South Africa":60,"Saudi Arabia":61,Jordan:63,
  "Bosnia and Herzegovina":64,"Cape Verde":67,Ghana:73,
  Curacao:82,Haiti:83,"New Zealand":85,"Congo DR":46,
};
const rank = (n) => FIFA_RANK[n] ? `#${FIFA_RANK[n]}` : null;

const FLAG = {
  Mexico:"🇲🇽","South Africa":"🇿🇦","Korea Republic":"🇰🇷",Czechia:"🇨🇿",
  Canada:"🇨🇦","Bosnia and Herzegovina":"🇧🇦",Qatar:"🇶🇦",Switzerland:"🇨🇭",
  Brazil:"🇧🇷",Morocco:"🇲🇦",Haiti:"🇭🇹",Scotland:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA:"🇺🇸",Paraguay:"🇵🇾",Australia:"🇦🇺",Turkiye:"🇹🇷",
  Germany:"🇩🇪","Ivory Coast":"🇨🇮",Ecuador:"🇪🇨",Curacao:"🇨🇼",
  Netherlands:"🇳🇱",Japan:"🇯🇵",Sweden:"🇸🇪",Tunisia:"🇹🇳",
  Belgium:"🇧🇪",Egypt:"🇪🇬",Iran:"🇮🇷","New Zealand":"🇳🇿",
  Spain:"🇪🇸",Uruguay:"🇺🇾","Cape Verde":"🇨🇻","Saudi Arabia":"🇸🇦",
  France:"🇫🇷",Senegal:"🇸🇳",Iraq:"🇮🇶",Norway:"🇳🇴",
  Argentina:"🇦🇷",Austria:"🇦🇹",Algeria:"🇩🇿","Congo DR":"🇨🇩",Jordan:"🇯🇴",
  Colombia:"🇨🇴",Portugal:"🇵🇹",Uzbekistan:"🇺🇿","DR Congo":"🇨🇩",
  England:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",Ghana:"🇬🇭",Croatia:"🇭🇷",Panama:"🇵🇦",
};
const fl = (n) => FLAG[n] || null;

// ── SEED STANDINGS (after Matchday 2 — base before sheet data) ───────────
const SEED = {
  A:{Mexico:{pts:6,p:2,w:2,d:0,l:0,f:3,a:0},"Korea Republic":{pts:3,p:2,w:1,d:0,l:1,f:2,a:2},Czechia:{pts:1,p:2,w:0,d:1,l:1,f:2,a:3},"South Africa":{pts:1,p:2,w:0,d:1,l:1,f:1,a:3}},
  B:{Canada:{pts:4,p:2,w:1,d:1,l:0,f:7,a:1},Switzerland:{pts:4,p:2,w:1,d:1,l:0,f:5,a:2},"Bosnia and Herzegovina":{pts:1,p:2,w:0,d:1,l:1,f:2,a:5},Qatar:{pts:1,p:2,w:0,d:1,l:1,f:1,a:7}},
  C:{Brazil:{pts:4,p:2,w:1,d:1,l:0,f:4,a:1},Morocco:{pts:4,p:2,w:1,d:1,l:0,f:2,a:1},Scotland:{pts:3,p:2,w:1,d:0,l:1,f:1,a:1},Haiti:{pts:0,p:2,w:0,d:0,l:2,f:0,a:4}},
  D:{USA:{pts:6,p:2,w:2,d:0,l:0,f:6,a:1},Australia:{pts:3,p:2,w:1,d:0,l:1,f:2,a:2},Paraguay:{pts:3,p:2,w:1,d:0,l:1,f:2,a:4},Turkiye:{pts:0,p:2,w:0,d:0,l:2,f:0,a:3}},
  E:{Germany:{pts:6,p:2,w:2,d:0,l:0,f:9,a:2},"Ivory Coast":{pts:3,p:2,w:1,d:0,l:1,f:2,a:2},Ecuador:{pts:1,p:2,w:0,d:1,l:1,f:0,a:1},Curacao:{pts:1,p:2,w:0,d:1,l:1,f:1,a:7}},
  F:{Netherlands:{pts:4,p:2,w:1,d:1,l:0,f:7,a:3},Japan:{pts:4,p:2,w:1,d:1,l:0,f:6,a:2},Sweden:{pts:3,p:2,w:1,d:0,l:1,f:6,a:6},Tunisia:{pts:0,p:2,w:0,d:0,l:2,f:1,a:9}},
  G:{Egypt:{pts:4,p:2,w:1,d:1,l:0,f:4,a:2},Iran:{pts:2,p:2,w:0,d:2,l:0,f:2,a:2},Belgium:{pts:2,p:2,w:0,d:2,l:0,f:1,a:1},"New Zealand":{pts:1,p:2,w:0,d:1,l:1,f:3,a:5}},
  H:{Spain:{pts:4,p:2,w:1,d:1,l:0,f:4,a:0},Uruguay:{pts:2,p:2,w:0,d:2,l:0,f:3,a:3},"Cape Verde":{pts:2,p:2,w:0,d:2,l:0,f:2,a:2},"Saudi Arabia":{pts:1,p:2,w:0,d:1,l:1,f:1,a:5}},
  I:{France:{pts:6,p:2,w:2,d:0,l:0,f:6,a:1},Norway:{pts:6,p:2,w:2,d:0,l:0,f:7,a:3},Senegal:{pts:0,p:2,w:0,d:0,l:2,f:3,a:6},Iraq:{pts:0,p:2,w:0,d:0,l:2,f:1,a:7}},
  J:{Argentina:{pts:6,p:2,w:2,d:0,l:0,f:5,a:0},Austria:{pts:3,p:2,w:1,d:0,l:1,f:3,a:3},Algeria:{pts:3,p:2,w:1,d:0,l:1,f:2,a:4},"Congo DR":{pts:0,p:2,w:0,d:0,l:2,f:2,a:5}},
  K:{Colombia:{pts:6,p:2,w:2,d:0,l:0,f:4,a:1},Portugal:{pts:4,p:2,w:1,d:1,l:0,f:6,a:1},"DR Congo":{pts:1,p:2,w:0,d:1,l:1,f:1,a:2},Uzbekistan:{pts:0,p:2,w:0,d:0,l:2,f:1,a:8}},
  L:{England:{pts:4,p:2,w:1,d:1,l:0,f:4,a:2},Ghana:{pts:4,p:2,w:1,d:1,l:0,f:1,a:0},Croatia:{pts:3,p:2,w:1,d:0,l:1,f:3,a:4},Panama:{pts:0,p:2,w:0,d:0,l:2,f:0,a:2}},
};

// ── KNOCKOUT FIXTURES ─────────────────────────────────────────────────────
const R32_FIXTURE = [
  {match:73,home:"2A",away:"2B",kickoff:"Jun 28 · 3:00 PM ET · SoFi Stadium, LA"},
  {match:74,home:"1E",away:"3ABCDF",kickoff:"Jun 29 · 4:30 PM ET · Gillette Stadium, Boston"},
  {match:75,home:"1F",away:"2C",kickoff:"Jun 29 · 1:00 PM ET · NRG Stadium, Houston"},
  {match:76,home:"1C",away:"2F",kickoff:"Jun 29 · 9:00 PM ET · Estadio BBVA, Monterrey"},
  {match:77,home:"1I",away:"3CDFGH",kickoff:"Jun 30 · 5:00 PM ET · MetLife Stadium, NY/NJ"},
  {match:78,home:"2E",away:"2I",kickoff:"Jun 30 · 1:00 PM ET · AT&T Stadium, Dallas"},
  {match:79,home:"1A",away:"3CEFHI",kickoff:"Jun 30 · 9:00 PM ET · Estadio Azteca, Mexico City"},
  {match:80,home:"1L",away:"3EHIJK",kickoff:"Jul 1 · 12:00 PM ET · Mercedes-Benz, Atlanta"},
  {match:81,home:"1D",away:"3BEFIJ",kickoff:"Jul 1 · 8:00 PM ET · Levi's Stadium, San Francisco"},
  {match:82,home:"1G",away:"3AEHIJ",kickoff:"Jul 1 · 4:00 PM ET · Lumen Field, Seattle"},
  {match:83,home:"2K",away:"2L",kickoff:"Jul 2 · 7:00 PM ET · BMO Field, Toronto"},
  {match:84,home:"1H",away:"2J",kickoff:"Jul 2 · 3:00 PM ET · SoFi Stadium, LA"},
  {match:85,home:"1B",away:"3EFGIJ",kickoff:"Jul 2 · 11:00 PM ET · BC Place, Vancouver"},
  {match:86,home:"1J",away:"2H",kickoff:"Jul 3 · 6:00 PM ET · Hard Rock Stadium, Miami"},
  {match:87,home:"1K",away:"3DEIJL",kickoff:"Jul 3 · 9:30 PM ET · Arrowhead Stadium, Kansas City"},
  {match:88,home:"2D",away:"2G",kickoff:"Jul 3 · 2:00 PM ET · AT&T Stadium, Dallas"},
];
const R16_FIXTURE = [
  {match:89,home:"W74",away:"W77",kickoff:"Jul 4 · 5:00 PM ET · Lincoln Financial, Philadelphia"},
  {match:90,home:"W73",away:"W75",kickoff:"Jul 4 · 1:00 PM ET · NRG Stadium, Houston"},
  {match:91,home:"W76",away:"W78",kickoff:"Jul 5 · 4:00 PM ET · MetLife Stadium, NY/NJ"},
  {match:92,home:"W79",away:"W80",kickoff:"Jul 5 · 8:00 PM ET · Estadio Azteca, Mexico City"},
  {match:93,home:"W83",away:"W84",kickoff:"Jul 6 · 3:00 PM ET · AT&T Stadium, Dallas"},
  {match:94,home:"W81",away:"W82",kickoff:"Jul 6 · 8:00 PM ET · Lumen Field, Seattle"},
  {match:95,home:"W86",away:"W88",kickoff:"Jul 7 · 12:00 PM ET · Mercedes-Benz, Atlanta"},
  {match:96,home:"W85",away:"W87",kickoff:"Jul 7 · 4:00 PM ET · BC Place, Vancouver"},
];
const QF_FIXTURE = [
  {match:97,home:"W89",away:"W90",kickoff:"Jul 9 · 4:00 PM ET · Gillette Stadium, Boston"},
  {match:98,home:"W93",away:"W94",kickoff:"Jul 10 · 3:00 PM ET · SoFi Stadium, LA"},
  {match:99,home:"W91",away:"W92",kickoff:"Jul 11 · 5:00 PM ET · Hard Rock Stadium, Miami"},
  {match:100,home:"W95",away:"W96",kickoff:"Jul 11 · 9:00 PM ET · Arrowhead Stadium, Kansas City"},
];
const SF_FIXTURE = [
  {match:101,home:"W97",away:"W98",kickoff:"Jul 14 · 3:00 PM ET · AT&T Stadium, Dallas"},
  {match:102,home:"W99",away:"W100",kickoff:"Jul 15 · 3:00 PM ET · Mercedes-Benz, Atlanta"},
];
const THIRD_FIXTURE = [{match:103,home:"L101",away:"L102",kickoff:"Jul 18 · 5:00 PM ET · Hard Rock Stadium, Miami"}];
const FINAL_FIXTURE = [{match:104,home:"W101",away:"W102",kickoff:"Jul 19 · 3:00 PM ET · MetLife Stadium, NY/NJ"}];

// ── CSV PARSER ────────────────────────────────────────────────────────────
function parseCSV(csv) {
  const lines = csv.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g,""));
    const row = {};
    headers.forEach((h, i) => row[h] = vals[i] || "");
    return {
      group: row.group?.toUpperCase() || null,
      home: row.home || "",
      away: row.away || "",
      hg: row.hg !== "" && row.hg !== "-" ? parseInt(row.hg) : null,
      ag: row.ag !== "" && row.ag !== "-" ? parseInt(row.ag) : null,
      status: row.status || "scheduled",
      kickoff: row.kickoff || "",
      prob_home: row.prob_home ? parseFloat(row.prob_home) : null,
      prob_away: row.prob_away ? parseFloat(row.prob_away) : null,
      prob_draw: row.prob_draw ? parseFloat(row.prob_draw) : null,
    };
  }).filter(r => r.home && r.away);
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function applyResult(s, group, home, away, hg, ag) {
  const g = JSON.parse(JSON.stringify(s[group] || {}));
  if (!g[home]) g[home] = {pts:0,p:0,w:0,d:0,l:0,f:0,a:0};
  if (!g[away]) g[away] = {pts:0,p:0,w:0,d:0,l:0,f:0,a:0};
  g[home].p++; g[away].p++;
  g[home].f += hg; g[home].a += ag;
  g[away].f += ag; g[away].a += hg;
  if (hg > ag) { g[home].pts += 3; g[home].w++; g[away].l++; }
  else if (hg < ag) { g[away].pts += 3; g[away].w++; g[home].l++; }
  else { g[home].pts++; g[away].pts++; g[home].d++; g[away].d++; }
  return { ...s, [group]: g };
}
function sortGroup(teams) {
  return Object.entries(teams)
    .map(([name, s]) => ({ name, ...s, gd: (s.f||0)-(s.a||0) }))
    .sort((a, b) => b.pts-a.pts || b.gd-a.gd || b.f-a.f);
}
function buildStandings(seed, results) {
  let s = JSON.parse(JSON.stringify(seed));
  for (const r of results)
    if (r.hg !== null && r.ag !== null && r.group) s = applyResult(s, r.group, r.home, r.away, r.hg, r.ag);
  return s;
}
function getBestThirds(standings) {
  return Object.entries(standings)
    .map(([grp, teams]) => { const s = sortGroup(teams); return s.length >= 3 ? {...s[2], group: grp} : null; })
    .filter(Boolean).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.f-a.f);
}
function buildSlotMap(standings, thirds, results) {
  const map = {};
  const done = new Set((results||[]).filter(r => r.hg !== null).map(r => r.group));
  for (const grp of Object.keys(standings)) {
    if (!done.has(grp)) continue;
    const s = sortGroup(standings[grp]);
    if (s[0]) map[`1${grp}`] = s[0].name;
    if (s[1]) map[`2${grp}`] = s[1].name;
    if (s[2]) map[`3${grp}`] = s[2].name;
  }
  const thirdSlots = ["3ABCDF","3CDFGH","3CEFHI","3EHIJK","3BEFIJ","3AEHIJ","3EFGIJ","3DEIJL"];
  thirds.slice(0,8).forEach((t,i) => { if (thirdSlots[i]) map[thirdSlots[i]] = t.name; });
  return map;
}
function resolveSlot(slot, slotMap) {
  if (slotMap[slot]) return { label: slotMap[slot], team: slotMap[slot], confirmed: true };
  return { label: slot, team: null, confirmed: false };
}

// ── COLORS ────────────────────────────────────────────────────────────────
const C = {
  bg:"#060d1a", card:"#0f1520", border:"#1e2a4a", muted:"#37474f",
  dim:"#546e7a", text:"#e8eaf6", sub:"#90a4ae",
  blue:"#3d5afe", blueDark:"#1a237e", green:"#00e676",
  orange:"#ff9800", red:"#ef5350", gold:"#ffd600",
};

// ── UI COMPONENTS ─────────────────────────────────────────────────────────
function Tab({label, active, onClick}) {
  return <button onClick={onClick} style={{padding:"7px 13px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,whiteSpace:"nowrap",background:active?C.blue:"#111827",color:active?"#fff":C.dim}}>{label}</button>;
}
function SectionHeader({title, color=C.muted}) {
  return <div style={{fontSize:10,fontWeight:700,letterSpacing:2.5,color,textTransform:"uppercase",marginBottom:10,marginTop:4}}>{title}</div>;
}
function RankBadge({name, style={}}) {
  const r = rank(name); if (!r) return null;
  return <span style={{fontSize:9,fontWeight:700,color:"#607d8b",background:"#0a1428",border:"1px solid #1e2a4a",borderRadius:3,padding:"1px 4px",lineHeight:1,whiteSpace:"nowrap",...style}}>{r}</span>;
}
function TeamName({name, align="right", bold=false}) {
  const emoji = fl(name), isRight = align==="right";
  return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:isRight?"flex-end":"flex-start",gap:5}}>
      {isRight && <><RankBadge name={name}/><span style={{fontSize:13,fontWeight:bold?700:500,color:bold?C.text:C.sub,textAlign:"right"}}>{name}</span>{emoji&&<span style={{fontSize:20}}>{emoji}</span>}</>}
      {!isRight && <>{emoji&&<span style={{fontSize:20}}>{emoji}</span>}<span style={{fontSize:13,fontWeight:bold?700:500,color:bold?C.text:C.sub}}>{name}</span><RankBadge name={name}/></>}
    </div>
  );
}

function MatchRow({home, away, hg, ag, status, kickoff, prob_home, prob_away, compact}) {
  const played = hg!==null && ag!==null;
  const live = status==="in_progress", fin = status==="final";
  const hWin=played&&hg>ag, aWin=played&&ag>hg;
  return (
    <div style={{background:C.card,borderRadius:10,padding:compact?"10px 14px":"14px 18px",marginBottom:7,border:`1px solid ${live?"#ff980055":C.border}`,boxShadow:live?"0 0 12px #ff980018":"none"}}>
      {kickoff&&!played&&<div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:6}}>🕐 {kickoff}</div>}
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <TeamName name={home} align="right" bold={hWin}/>
        <div style={{textAlign:"center",minWidth:72}}>
          {live&&<div style={{fontSize:8,color:C.orange,fontWeight:700,letterSpacing:1,marginBottom:1}}>● LIVE</div>}
          {fin&&<div style={{fontSize:8,color:C.green,fontWeight:700,letterSpacing:1,marginBottom:1}}>FT</div>}
          {played
            ? <div style={{fontSize:compact?17:20,fontWeight:900,color:"#fff",letterSpacing:2}}>{hg}<span style={{color:C.border}}> – </span>{ag}</div>
            : <div><div style={{fontSize:11,color:C.muted,fontWeight:700}}>vs</div>
                {prob_home&&<div style={{fontSize:9,color:C.dim,marginTop:2}}>{prob_home}% · {prob_away}%</div>}
              </div>
          }
        </div>
        <TeamName name={away} align="left" bold={aWin}/>
      </div>
    </div>
  );
}

function StandingsTable({teams}) {
  return (
    <div style={{background:C.card,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
      <div style={{display:"grid",gridTemplateColumns:"22px 1fr 34px 26px 26px 26px 26px 26px 26px 34px",padding:"8px 12px",background:"#0a1020",borderBottom:`1px solid ${C.border}`}}>
        {["#","Team","Pts","P","W","D","L","F","A","GD"].map((h,i)=><div key={h} style={{fontSize:9,fontWeight:700,color:C.muted,textAlign:i>1?"center":"left",textTransform:"uppercase",letterSpacing:1}}>{h}</div>)}
      </div>
      {teams.map((t,idx)=>{
        const isQ=idx<2, is3=idx===2;
        return (
          <div key={t.name} style={{display:"grid",gridTemplateColumns:"22px 1fr 34px 26px 26px 26px 26px 26px 26px 34px",padding:"11px 12px",alignItems:"center",borderBottom:idx<teams.length-1?"1px solid #0d1428":"none",borderLeft:`3px solid ${isQ?C.blue:is3?"#546e7a55":"transparent"}`,background:idx%2===0?C.card:"#0a1228"}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700}}>{idx+1}</div>
            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              {fl(t.name)&&<span style={{fontSize:16}}>{fl(t.name)}</span>}
              <span style={{fontSize:13,fontWeight:600,color:isQ?C.text:C.sub}}>{t.name}</span>
              <RankBadge name={t.name}/>
              {isQ&&<span style={{fontSize:7,background:C.blueDark,color:"#7986cb",padding:"2px 4px",borderRadius:3,fontWeight:700}}>Q</span>}
              {is3&&<span style={{fontSize:7,background:"#37474f33",color:C.dim,padding:"2px 4px",borderRadius:3,fontWeight:700}}>3rd</span>}
            </div>
            <div style={{textAlign:"center",fontSize:13,fontWeight:800,color:isQ?C.blue:C.text}}>{t.pts}</div>
            {[t.p,t.w,t.d,t.l,t.f,t.a].map((v,i)=><div key={i} style={{textAlign:"center",fontSize:11,color:C.dim}}>{v}</div>)}
            <div style={{textAlign:"center",fontSize:11,fontWeight:700,color:t.gd>0?C.green:t.gd<0?C.red:C.dim}}>{t.gd>0?"+":""}{t.gd}</div>
          </div>
        );
      })}
    </div>
  );
}

function BestThirdsTable({thirds}) {
  return (
    <div style={{background:C.card,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
      <div style={{display:"grid",gridTemplateColumns:"22px 1fr 26px 32px 24px 24px 24px 24px 24px 24px 30px",padding:"8px 12px",background:"#0a1020",borderBottom:`1px solid ${C.border}`}}>
        {["#","Team","Grp","Pts","P","W","D","L","F","A","GD"].map((h,i)=><div key={h} style={{fontSize:9,fontWeight:700,color:C.muted,textAlign:i>1?"center":"left",textTransform:"uppercase",letterSpacing:1}}>{h}</div>)}
      </div>
      {thirds.map((t,idx)=>{
        const adv=idx<8;
        return (
          <div key={t.name} style={{display:"grid",gridTemplateColumns:"22px 1fr 26px 32px 24px 24px 24px 24px 24px 24px 30px",padding:"10px 12px",alignItems:"center",borderBottom:idx<thirds.length-1?"1px solid #0d1428":"none",borderLeft:`3px solid ${adv?C.gold+"99":"transparent"}`,background:idx%2===0?C.card:"#0a1228"}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700}}>{idx+1}</div>
            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              {fl(t.name)&&<span style={{fontSize:16}}>{fl(t.name)}</span>}
              <span style={{fontSize:13,fontWeight:600,color:adv?C.text:C.sub}}>{t.name}</span>
              <RankBadge name={t.name}/>
              {adv&&<span style={{fontSize:7,background:"#f57f1722",color:C.gold,padding:"2px 4px",borderRadius:3,fontWeight:700}}>ADV</span>}
            </div>
            <div style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.blue}}>{t.group}</div>
            <div style={{textAlign:"center",fontSize:13,fontWeight:800,color:adv?C.gold:C.text}}>{t.pts}</div>
            {[t.p,t.w,t.d,t.l,t.f,t.a].map((v,i)=><div key={i} style={{textAlign:"center",fontSize:11,color:C.dim}}>{v}</div>)}
            <div style={{textAlign:"center",fontSize:11,fontWeight:700,color:t.gd>0?C.green:t.gd<0?C.red:C.dim}}>{t.gd>0?"+":""}{t.gd}</div>
          </div>
        );
      })}
    </div>
  );
}

function TeamSlot({res, align}) {
  const {label, team, confirmed} = res, emoji = team ? fl(team) : null, isRight = align==="right";
  return (
    <div style={{flex:1,display:"flex",alignItems:"center",gap:6,justifyContent:isRight?"flex-end":"flex-start"}}>
      {isRight&&<>{confirmed&&<RankBadge name={team}/>}<span style={{fontSize:13,fontWeight:confirmed?700:400,color:confirmed?C.text:C.muted,textAlign:"right",lineHeight:1.2}}>{label}</span>{emoji?<span style={{fontSize:22}}>{emoji}</span>:<div style={{width:24,height:24,borderRadius:"50%",background:"#1e2a4a",border:`1px solid ${C.border}`,flexShrink:0}}/>}</>}
      {!isRight&&<>{emoji?<span style={{fontSize:22}}>{emoji}</span>:<div style={{width:24,height:24,borderRadius:"50%",background:"#1e2a4a",border:`1px solid ${C.border}`,flexShrink:0}}/> }<span style={{fontSize:13,fontWeight:confirmed?700:400,color:confirmed?C.text:C.muted,lineHeight:1.2}}>{label}</span>{confirmed&&<RankBadge name={team}/>}</>}
    </div>
  );
}

function KnockoutMatchRow({r, slotMap, divider, accent}) {
  const homeRes = resolveSlot(r.home, slotMap), awayRes = resolveSlot(r.away, slotMap);
  return (
    <div style={{borderBottom:divider?`1px solid ${C.border}`:"none"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px 0",flexWrap:"wrap"}}>
        <span style={{fontSize:9,fontWeight:700,color:accent,background:accent+"18",borderRadius:4,padding:"2px 7px"}}>#{r.match}</span>
        {r.kickoff&&<span style={{fontSize:10,fontWeight:700,color:C.gold}}>🕐 {r.kickoff}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",padding:"9px 14px 10px",gap:8}}>
        <TeamSlot res={homeRes} align="right"/>
        <div style={{minWidth:36,textAlign:"center",fontSize:10,fontWeight:700,color:C.muted,borderLeft:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`,padding:"4px 6px"}}>vs</div>
        <TeamSlot res={awayRes} align="left"/>
      </div>
    </div>
  );
}

function KnockoutGrid({rounds, slotMap, accent=C.blue, title, info}) {
  const pairs = [];
  for (let i = 0; i < rounds.length; i += 2) pairs.push(rounds.slice(i,i+2));
  return (
    <div style={{marginBottom:20}}>
      {title&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:3,height:18,background:accent,borderRadius:2}}/><span style={{fontSize:12,fontWeight:800,color:C.text,letterSpacing:1}}>{title}</span></div>}
      {info&&<div style={{background:"#1a237e18",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",marginBottom:12,fontSize:12,color:C.sub}}>{info}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {pairs.map((pair,pi)=>(
          <div key={pi} style={{background:"#0a1020",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            {pair.map((r,ri)=><KnockoutMatchRow key={r.match} r={r} slotMap={slotMap} divider={ri<pair.length-1} accent={accent}/>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBar({loading, error, lastUpdated, onRefresh, isDemo}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      {isDemo&&<div style={{fontSize:10,background:"#ff980022",color:C.orange,border:"1px solid #ff980044",borderRadius:12,padding:"3px 8px",fontWeight:700}}>⚠ DEMO MODE — add Sheet URL</div>}
      {!isDemo&&<div style={{fontSize:10,color:C.muted}}>{loading?"Fetching…":error?"⚠ Sheet error":lastUpdated?`Synced ${lastUpdated}`:""}</div>}
      <button onClick={onRefresh} disabled={loading} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:loading?C.muted:C.dim,cursor:loading?"not-allowed":"pointer",fontSize:11,fontWeight:700}}>
        {loading?"…":"↻ Refresh"}
      </button>
    </div>
  );
}

// ── DEMO DATA ─────────────────────────────────────────────────────────────
const DEMO_RESULTS = [
  {group:"A",home:"Czechia",away:"Mexico",hg:0,ag:3,status:"final",kickoff:""},
  {group:"A",home:"South Africa",away:"Korea Republic",hg:1,ag:0,status:"final",kickoff:""},
  {group:"B",home:"Switzerland",away:"Canada",hg:2,ag:1,status:"final",kickoff:""},
  {group:"B",home:"Bosnia and Herzegovina",away:"Qatar",hg:3,ag:1,status:"final",kickoff:""},
  {group:"C",home:"Scotland",away:"Brazil",hg:0,ag:3,status:"final",kickoff:""},
  {group:"C",home:"Morocco",away:"Haiti",hg:4,ag:2,status:"final",kickoff:""},
  {group:"I",home:"France",away:"Iraq",hg:3,ag:0,status:"final",kickoff:""},
  {group:"I",home:"Norway",away:"Senegal",hg:3,ag:2,status:"final",kickoff:""},
  {group:"J",home:"Argentina",away:"Austria",hg:2,ag:0,status:"final",kickoff:""},
  {group:"J",home:"Jordan",away:"Algeria",hg:1,ag:2,status:"final",kickoff:""},
  {group:"K",home:"Portugal",away:"Uzbekistan",hg:5,ag:0,status:"final",kickoff:""},
  {group:"K",home:"Colombia",away:"Congo DR",hg:1,ag:0,status:"final",kickoff:""},
  {group:"L",home:"England",away:"Ghana",hg:0,ag:0,status:"final",kickoff:""},
  {group:"L",home:"Panama",away:"Croatia",hg:0,ag:1,status:"final",kickoff:""},
  {group:"E",home:"Ecuador",away:"Germany",hg:null,ag:null,status:"scheduled",kickoff:"Jun 25 · 4:00 PM ET",prob_home:17.4,prob_away:62.1},
  {group:"E",home:"Curacao",away:"Ivory Coast",hg:null,ag:null,status:"scheduled",kickoff:"Jun 25 · 4:00 PM ET",prob_home:5.2,prob_away:83.7},
  {group:"F",home:"Tunisia",away:"Netherlands",hg:null,ag:null,status:"scheduled",kickoff:"Jun 25 · 7:00 PM ET",prob_home:2.2,prob_away:90.7},
  {group:"F",home:"Japan",away:"Sweden",hg:null,ag:null,status:"scheduled",kickoff:"Jun 25 · 7:00 PM ET",prob_home:50.6,prob_away:22.4},
  {group:"D",home:"Turkiye",away:"USA",hg:null,ag:null,status:"scheduled",kickoff:"Jun 25 · 10:00 PM ET",prob_home:25.4,prob_away:50.5},
  {group:"D",home:"Paraguay",away:"Australia",hg:null,ag:null,status:"scheduled",kickoff:"Jun 25 · 10:00 PM ET",prob_home:35,prob_away:23.9},
  {group:"G",home:"Egypt",away:"Iran",hg:null,ag:null,status:"scheduled",kickoff:"Jun 27 · 3:00 PM ET"},
  {group:"G",home:"New Zealand",away:"Belgium",hg:null,ag:null,status:"scheduled",kickoff:"Jun 27 · 3:00 PM ET"},
  {group:"H",home:"Uruguay",away:"Spain",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 8:00 PM ET",prob_home:13.8,prob_away:64.9},
  {group:"H",home:"Cape Verde",away:"Saudi Arabia",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 8:00 PM ET",prob_home:37.7,prob_away:34.3},
  {group:"I",home:"Norway",away:"France",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 3:00 PM ET",prob_home:18.7,prob_away:59.5},
  {group:"I",home:"Senegal",away:"Iraq",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 3:00 PM ET",prob_home:79,prob_away:7.4},
];

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function WorldCup2026() {
  const [view, setView] = useState("live");
  const [activeGroup, setActiveGroup] = useState("A");
  const [results, setResults] = useState(DEMO_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isDemo = SHEET_CSV_URL === "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

  const fetchScores = useCallback(async () => {
    if (isDemo) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`);
      if (!res.ok) throw new Error("Sheet fetch failed");
      const text = await res.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setResults(parsed);
        setLastUpdated(new Date().toLocaleTimeString("en-CA", {hour:"2-digit",minute:"2-digit",timeZoneName:"short"}));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [isDemo]);

  useEffect(() => { fetchScores(); }, [fetchScores]);

  useEffect(() => {
    if (isDemo || !AUTO_REFRESH_SECONDS) return;
    const id = setInterval(fetchScores, AUTO_REFRESH_SECONDS * 1000);
    return () => clearInterval(id);
  }, [fetchScores, isDemo]);

  const standings = buildStandings(SEED, results);
  const thirds = getBestThirds(standings);
  const slotMap = buildSlotMap(standings, thirds, results);
  const liveGames = results.filter(g => g.status === "in_progress");
  const finalGames = [...results].filter(g => g.status === "final").reverse();
  const scheduledGames = results.filter(g => g.status === "scheduled");
  const groupTeams = sortGroup(standings[activeGroup] || {});

  const TABS = [
    {id:"live",label:"⚡ Live"},{id:"groups",label:"📊 Groups"},
    {id:"thirds",label:"🥉 Best 3rds"},{id:"r32",label:"Round of 32"},
    {id:"r16",label:"Round of 16"},{id:"qf",label:"Quarterfinals"},
    {id:"sf",label:"Semifinals"},{id:"final",label:"🏆 Final"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} *{box-sizing:border-box}`}</style>
      <div style={{background:"linear-gradient(180deg,#0d1428 0%,#060d1a 100%)",borderBottom:`1px solid ${C.border}`,padding:"18px 18px 0"}}>
        <div style={{maxWidth:820,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:30}}>⚽</span>
              <div>
                <div style={{fontSize:10,letterSpacing:3,color:C.blue,textTransform:"uppercase",fontWeight:700}}>FIFA · Live Tracker</div>
                <div style={{fontSize:19,fontWeight:800,color:"#fff"}}>World Cup 2026</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              {liveGames.length > 0 && (
                <div style={{display:"flex",alignItems:"center",gap:6,background:"#ff980018",border:"1px solid #ff980044",borderRadius:20,padding:"4px 10px"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:C.orange,display:"inline-block",animation:"pulse 1s infinite"}}/>
                  <span style={{fontSize:11,fontWeight:700,color:C.orange}}>{liveGames.length} LIVE</span>
                </div>
              )}
              <StatusBar loading={loading} error={error} lastUpdated={lastUpdated} onRefresh={fetchScores} isDemo={isDemo}/>
            </div>
          </div>
          <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:12}}>
            {TABS.map(t => <Tab key={t.id} label={t.label} active={view===t.id} onClick={()=>setView(t.id)}/>)}
          </div>
        </div>
      </div>

      <div style={{maxWidth:820,margin:"0 auto",padding:"20px 14px"}}>
        {view==="live"&&<div>
          {liveGames.length>0&&<><SectionHeader title="🔴 In Progress" color={C.orange}/>{liveGames.map((g,i)=><MatchRow key={i} {...g}/>)}<div style={{height:16}}/></>}
          {finalGames.length>0&&<><SectionHeader title="✅ Results"/>{finalGames.map((g,i)=><MatchRow key={i} {...g} compact/>)}<div style={{height:16}}/></>}
          {scheduledGames.length>0&&<><SectionHeader title="🕐 Upcoming"/>{scheduledGames.map((g,i)=><MatchRow key={i} {...g}/>)}</>}
          {isDemo&&(
            <div style={{marginTop:16,background:"#ff980010",border:"1px solid #ff980030",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#ffb74d",lineHeight:1.7}}>
              <strong>Demo mode:</strong> Scores are hardcoded. Replace <code style={{background:"#0a1020",padding:"1px 5px",borderRadius:3}}>SHEET_CSV_URL</code> at the top of App.jsx with your published Google Sheet CSV link to go live.
            </div>
          )}
        </div>}

        {view==="groups"&&<div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
            {"ABCDEFGHIJKL".split("").map(g=>(
              <button key={g} onClick={()=>setActiveGroup(g)} style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:activeGroup===g?C.blue:"#111827",color:activeGroup===g?"#fff":C.dim,outline:activeGroup===g?`2px solid #5c6bc0`:"none"}}>{g}</button>
            ))}
          </div>
          <StandingsTable teams={groupTeams}/>
          <div style={{marginTop:12}}>{results.filter(g=>g.group===activeGroup).map((g,i)=><MatchRow key={i} {...g} compact/>)}</div>
        </div>}

        {view==="thirds"&&<div>
          <div style={{background:"#f57f1710",border:"1px solid #f57f1730",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#ffb74d"}}>Top 8 of 12 third-place teams advance to the Round of 32.</div>
          <BestThirdsTable thirds={thirds}/>
        </div>}

        {view==="r32"&&<KnockoutGrid rounds={R32_FIXTURE} slotMap={slotMap} accent={C.blue} title="Round of 32" info="Jun 28 – Jul 3 · FIFA rank shown for confirmed qualifiers"/>}
        {view==="r16"&&<KnockoutGrid rounds={R16_FIXTURE} slotMap={slotMap} accent={C.blue} title="Round of 16" info="Jul 4 – Jul 7"/>}
        {view==="qf"&&<KnockoutGrid rounds={QF_FIXTURE} slotMap={slotMap} accent="#7c4dff" title="Quarterfinals" info="Jul 9 – Jul 11"/>}
        {view==="sf"&&<div>
          <KnockoutGrid rounds={SF_FIXTURE} slotMap={slotMap} accent="#aa00ff" title="Semifinals"/>
          <KnockoutGrid rounds={THIRD_FIXTURE} slotMap={slotMap} accent={C.gold} title="3rd Place Match"/>
        </div>}
        {view==="final"&&<div>
          <div style={{background:"#f57f1710",border:"1px solid #f57f1730",borderRadius:12,padding:"20px",marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>🏆</div>
            <div style={{fontSize:18,fontWeight:900,color:C.gold,letterSpacing:2}}>WORLD CUP FINAL</div>
            <div style={{fontSize:12,color:C.dim,marginTop:4}}>MetLife Stadium · East Rutherford, NJ · July 19 · 3:00 PM ET</div>
          </div>
          <KnockoutGrid rounds={FINAL_FIXTURE} slotMap={slotMap} accent={C.gold} title="The Final"/>
          <KnockoutGrid rounds={THIRD_FIXTURE} slotMap={slotMap} accent={C.gold} title="3rd Place Match · Jul 18"/>
          <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:"16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>🏅 Honours</div>
            {[["🥇","Winner","TBD"],["🥈","Runner-up","TBD"],["🥉","3rd Place","TBD"],["👟","Golden Boot","TBD"],["⚽","Golden Ball","TBD"]].map(([icon,label,val])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:13,color:C.sub}}>{icon} {label}</span>
                <span style={{fontSize:13,fontWeight:700,color:C.dim}}>{val}</span>
              </div>
            ))}
          </div>
        </div>}
      </div>
    </div>
  );
}
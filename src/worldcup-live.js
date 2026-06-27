/**
 * worldcup-live.js
 * Fetches:
 *  1. /api/results  — all stored historical matches from Vercel KV (source of truth)
 *  2. /api/scores   — live ESPN feed for today's matches
 * Merges them, returning a complete picture.
 */

const TEAM_MAP = {
  "United States":"USA","Turkey":"Turkiye","Türkiye":"Turkiye",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde",
  "Bosnia & Herzegovina":"Bosnia and Herzegovina",
  "DR Congo":"Congo DR","Democratic Republic of Congo":"Congo DR",
  "South Korea":"Korea Republic","Czech Republic":"Czechia",
};
function mapTeam(n){ return TEAM_MAP[n]||n; }

function mapStatus(s){
  if(!s) return "scheduled";
  if(s==="STATUS_FINAL"||s==="STATUS_FULL_TIME") return "final";
  if(["STATUS_IN_PROGRESS","STATUS_FIRST_HALF","STATUS_SECOND_HALF",
      "STATUS_HALFTIME","STATUS_EXTRA_TIME","STATUS_PENALTIES"].includes(s)) return "in_progress";
  return "scheduled";
}

function formatKickoff(dateStr){
  if(!dateStr) return "";
  try{
    const d=new Date(dateStr);
    const mo=d.toLocaleString("en-US",{month:"short",timeZone:"America/New_York"});
    const dy=d.toLocaleString("en-US",{day:"numeric",timeZone:"America/New_York"});
    const ti=d.toLocaleString("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:"America/New_York"});
    return `${mo} ${dy} · ${ti} ET`;
  }catch{return "";}
}

function parseKickoff(kickoff){
  if(!kickoff) return null;
  try{
    const clean=kickoff.replace(" · "," ").replace(" ET","");
    const d=new Date(`${clean} 2026 EDT`);
    return isNaN(d.getTime())?null:d;
  }catch{return null;}
}

// Fetch stored results from KV via /api/results
export async function fetchStoredResults(){
  try{
    const res=await fetch("/api/results",{signal:AbortSignal.timeout(8000)});
    if(!res.ok) return null;
    const data=await res.json();
    return data; // { matches, scorers }
  }catch(err){
    console.warn("[worldcup-live] fetchStoredResults failed:",err.message);
    return null;
  }
}

// Fetch live ESPN scores via /api/scores
export async function fetchLiveScores(){
  try{
    const res=await fetch("/api/scores",{signal:AbortSignal.timeout(8000)});
    if(!res.ok) throw new Error(`Proxy ${res.status}`);
    const data=await res.json();
    if(!data.events||data.events.length===0) return null;
    return data.events.map(e=>({
      group:e.group,
      home:mapTeam(e.home),
      away:mapTeam(e.away),
      hg:e.hg,ag:e.ag,
      status:e.status,
      kickoff:formatKickoff(e.date),
      clock:e.clock||"",
      venue:e.venue||"",
      venueLocation:[e.venueCity,e.venueState].filter(Boolean).join(", "),
      scorers:e.scorers||[],
      cards:e.cards||[],
    })).filter(r=>r.home&&r.away);
  }catch(err){
    console.warn("[worldcup-live] fetchLiveScores failed:",err.message);
    return null;
  }
}

export function diffResults(prev,next){
  if(!prev||!next) return true;
  if(prev.length!==next.length) return true;
  for(let i=0;i<prev.length;i++){
    const p=prev[i],n=next[i];
    if(p.hg!==n.hg||p.ag!==n.ag||p.status!==n.status) return true;
  }
  return false;
}

// Merge: static baseline + KV stored results + live ESPN feed
// Priority: live ESPN (for in-progress/today) > KV stored (for all finals) > static baseline
export function mergeResults(staticResults, kvMatches, liveResults){
  const now=new Date();

  // Build KV map keyed by "Home|Away"
  const kvMap={};
  for(const m of (kvMatches||[])){
    if(m&&m.home&&m.away){
      kvMap[`${m.home}|${m.away}`]=m;
      kvMap[`${m.away}|${m.home}`]={...m,home:m.away,away:m.home,hg:m.ag,ag:m.hg,
        scorers:(m.scorers||[]).map(s=>({...s,team:s.team==="home"?"away":"home"})),
        cards:(m.cards||[]).map(c=>({...c,team:c.team==="home"?"away":"home"})),
      };
    }
  }

  // Build live map
  const liveMap={};
  for(const r of (liveResults||[])){
    liveMap[`${r.home}|${r.away}`]=r;
  }

  return staticResults.map(s=>{
    const key=`${s.home}|${s.away}`;
    const kv=kvMap[key];
    const live=liveMap[key];

    // Live ESPN takes top priority (for in-progress and today's finals)
    if(live){
      const hasScore=live.hg!==null&&live.ag!==null&&live.status!=="scheduled";
      return{
        ...s,
        hg:hasScore?live.hg:(kv?.hg??s.hg),
        ag:hasScore?live.ag:(kv?.ag??s.ag),
        status:live.status!=="scheduled"?live.status:(kv?.status??s.status),
        clock:live.clock||"",
        venue:live.venue||kv?.venue||s.venue||"",
        venueLocation:live.venueLocation||kv?.venueLocation||"",
        scorers:live.scorers?.length?live.scorers:(kv?.scorers||s.scorers||[]),
        cards:live.cards?.length?live.cards:(kv?.cards||s.cards||[]),
      };
    }

    // KV stored result (historical finals)
    if(kv){
      return{
        ...s,
        hg:kv.hg??s.hg,
        ag:kv.ag??s.ag,
        status:kv.status||s.status,
        venue:kv.venue||"",
        venueLocation:kv.venueLocation||"",
        scorers:kv.scorers||[],
        cards:kv.cards||[],
      };
    }

    // Auto-finalize: if kickoff was >3hrs ago and we have no data, move out of scheduled
    if(s.status==="scheduled"){
      const ko=parseKickoff(s.kickoff);
      if(ko&&(now-ko)>3*60*60*1000){
        return{...s,status:"final"};
      }
    }

    return s;
  });
}

// Build scorer leaderboard from KV scorer data
export function buildScorerLeaderboard(kvScorers){
  if(!kvScorers||!kvScorers.length) return [];
  return [...kvScorers]
    .filter(s=>s&&s.player&&s.total>0)
    .sort((a,b)=>b.total-a.total||b.goals-a.goals)
    .map(s=>({
      name:s.player,
      team:s.team,
      goals:s.goals||0,
      pens:s.pens||0,
      ogs:s.ogs||0,
      total:s.total||0,
      hattricks:s.goals>=3?1:0,
      pos:"FW",
    }));
}

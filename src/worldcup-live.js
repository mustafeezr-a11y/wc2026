/**
 * worldcup-live.js — fetches live ESPN data + Redis stored data for ALL rounds
 */

const TEAM_MAP={
  "United States":"USA","Turkey":"Turkiye","Türkiye":"Turkiye",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde",
  "Bosnia & Herzegovina":"Bosnia and Herzegovina",
  "DR Congo":"Congo DR","Democratic Republic of Congo":"Congo DR",
  "South Korea":"Korea Republic","Czech Republic":"Czechia",
};
function mapTeam(n){return TEAM_MAP[n]||n;}

function mapStatus(s){
  if(!s) return "scheduled";
  if(s==="STATUS_FINAL") return "final";
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

function mapRound(notes=[]){
  const t=(notes[0]?.text||"").toLowerCase();
  if(t.includes("round of 32")) return "r32";
  if(t.includes("round of 16")) return "r16";
  if(t.includes("quarter")) return "qf";
  if(t.includes("semi")) return "sf";
  if(t.includes("third")) return "third";
  if(t.includes("final")) return "final";
  return "group";
}

export async function fetchStoredResults(){
  try{
    const res=await fetch("/api/results",{signal:AbortSignal.timeout(8000)});
    if(!res.ok) return null;
    return await res.json();
  }catch(e){
    console.warn("[live] fetchStoredResults failed:",e.message);
    return null;
  }
}

export async function fetchLiveScores(){
  try{
    const res=await fetch("/api/scores",{signal:AbortSignal.timeout(8000)});
    if(!res.ok) throw new Error(`Proxy ${res.status}`);
    const data=await res.json();
    if(!data.events?.length) return null;
    return data.events.map(e=>({
      id:e.id,
      round:e.round||"group",
      group:e.group||null,
      matchNum:e.matchNum||null,
      home:mapTeam(e.home),
      away:mapTeam(e.away),
      hg:e.hg,ag:e.ag,
      status:e.status,
      kickoff:formatKickoff(e.date),
      date:e.date,
      clock:e.clock||"",
      venue:e.venue||"",
      venueLocation:e.venueLocation||"",
      scorers:e.scorers||[],
      cards:e.cards||[],
    })).filter(r=>r.home&&r.away);
  }catch(e){
    console.warn("[live] fetchLiveScores failed:",e.message);
    return null;
  }
}

export function diffResults(prev,next){
  if(!prev||!next||prev.length!==next.length) return true;
  for(let i=0;i<prev.length;i++){
    if(prev[i].hg!==next[i].hg||prev[i].ag!==next[i].ag||prev[i].status!==next[i].status) return true;
  }
  return false;
}

// Merge: Redis stored + live ESPN feed
// Live ESPN wins for today's matches; Redis wins for historical; auto-finalize stale scheduled
export function mergeAllRounds(storedRounds, liveResults){
  const now=new Date();

  // Build live map
  const liveMap={};
  for(const r of (liveResults||[])){
    liveMap[`${r.home}|${r.away}`]=r;
    liveMap[`${r.away}|${r.home}`]={...r,home:r.away,away:r.home,hg:r.ag,ag:r.hg};
  }

  const rounds={group:[],r32:[],r16:[],qf:[],sf:[],third:[],final:[]};

  for(const [roundKey,matches] of Object.entries(storedRounds)){
    if(!rounds[roundKey]) continue;
    rounds[roundKey]=matches.map(s=>{
      const key=`${s.home}|${s.away}`;
      const live=liveMap[key];

      if(live){
        const hasScore=live.hg!==null&&live.ag!==null&&live.status!=="scheduled";
        return{
          ...s,
          hg:hasScore?live.hg:s.hg,
          ag:hasScore?live.ag:s.ag,
          status:live.status!=="scheduled"?live.status:s.status,
          clock:live.clock||"",
          kickoff:live.kickoff||s.kickoff||formatKickoff(s.date),
          venue:live.venue||s.venue||"",
          venueLocation:live.venueLocation||s.venueLocation||"",
          scorers:live.scorers?.length?live.scorers:(s.scorers||[]),
          cards:live.cards?.length?live.cards:(s.cards||[]),
        };
      }

      // Auto-finalize: kickoff was >3hrs ago with no score data
      if(s.status==="scheduled"&&s.hg===null){
        const ko=parseKickoff(s.kickoff||formatKickoff(s.date));
        if(ko&&(now-ko)>3*60*60*1000){
          return{...s,status:"final"};
        }
      }

      // Ensure kickoff is formatted
      return{...s, kickoff:s.kickoff||formatKickoff(s.date)};
    });
  }
  return rounds;
}

export function buildScorerLeaderboard(kvScorers){
  if(!kvScorers?.length) return [];
  return [...kvScorers]
    .filter(s=>s?.player&&s.total>0)
    .sort((a,b)=>b.total-a.total||b.goals-a.goals)
    .map(s=>({
      name:s.player, team:s.team,
      goals:s.goals||0, pens:s.pens||0, ogs:s.ogs||0,
      total:s.total||0, hattricks:(s.goals||0)>=3?1:0, pos:"FW",
    }));
}

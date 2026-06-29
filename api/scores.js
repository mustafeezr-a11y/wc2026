/**
 * /api/scores.js
 * Fetches ALL FIFA World Cup 2026 matches from ESPN (group stage + knockout rounds)
 * Saves every completed match to Upstash Redis.
 * Returns live feed to client.
 */
import { redis } from "./_redis.js";

const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard?limit=200&dates=";
const ESPN_SUMMARY    = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/summary?event=";

const TEAM_MAP = {
  "United States":"USA","Turkey":"Turkiye","Türkiye":"Turkiye",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde",
  "Bosnia & Herzegovina":"Bosnia and Herzegovina",
  "DR Congo":"Congo DR","Democratic Republic of Congo":"Congo DR",
  "South Korea":"Korea Republic","Czech Republic":"Czechia",
  "Cabo Verde":"Cape Verde",
};
function mapTeam(n){ return TEAM_MAP[n]||n; }

// ESPN round name → our round key
function mapRound(roundName="", notes=[]){
  const r = (roundName||"").toLowerCase();
  const n = (notes[0]?.text||"").toLowerCase();
  if(r.includes("group")||n.includes("group")) return "group";
  if(r.includes("round of 32")||n.includes("round of 32")) return "r32";
  if(r.includes("round of 16")||n.includes("round of 16")) return "r16";
  if(r.includes("quarter")||n.includes("quarter")) return "qf";
  if(r.includes("semi")||n.includes("semi")) return "sf";
  if(r.includes("third")||n.includes("third place")) return "third";
  if(r.includes("final")||n.includes("final")) return "final";
  return "group";
}

function extractGroup(notes=[]){
  for(const n of notes){
    const m=(n.text||"").match(/Group\s+([A-L])/i);
    if(m) return m[1].toUpperCase();
  }
  return null;
}

function parseDetails(details=[], homeId){
  const scorers=[], cards=[];
  for(const d of details){
    const type=d.type?.text||"";
    const isHome=d.team?.id===homeId;
    const player=d.athletesInvolved?.[0]?.displayName||"";
    const clock=d.clock?.displayValue||"";
    if(type==="Goal"||type==="Penalty - Scored")
      scorers.push({player,team:isHome?"home":"away",clock,type:type==="Penalty - Scored"?"pen":"goal"});
    else if(type==="Own Goal")
      scorers.push({player,team:isHome?"home":"away",clock,type:"og"});
    else if(type==="Yellow Card")
      cards.push({player,team:isHome?"home":"away",clock,type:"Y"});
    else if(type==="Red Card")
      cards.push({player,team:isHome?"home":"away",clock,type:"R"});
    else if(type==="Yellow-Red Card")
      cards.push({player,team:isHome?"home":"away",clock,type:"Y2"});
  }
  return{scorers,cards};
}

async function fetchESPN(url){
  const r = await fetch(url, {
    headers:{"User-Agent":"Mozilla/5.0 Chrome/120"},
    signal: AbortSignal.timeout(8000),
  });
  if(!r.ok) throw new Error(`ESPN ${r.status} ${url}`);
  return r.json();
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","s-maxage=20,stale-while-revalidate=40");
  if(req.method==="OPTIONS") return res.status(200).end();

  try{
    // Fetch today + yesterday to catch recent finals
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
    const today = now.toISOString().slice(0,10).replace(/-/g,"");
    const yday  = yesterday.toISOString().slice(0,10).replace(/-/g,"");

    const [todayData, ydayData] = await Promise.allSettled([
      fetchESPN(`${ESPN_SCOREBOARD}${today}`),
      fetchESPN(`${ESPN_SCOREBOARD}${yday}`),
    ]);

    const allEvents = [
      ...(todayData.value?.events||[]),
      ...(ydayData.value?.events||[]),
    ];

    // Deduplicate by event id
    const seen = new Set();
    const events = [];
    const pipeline = redis.pipeline();
    let hasWrites = false;

    for(const event of allEvents){
      if(seen.has(event.id)) continue;
      seen.add(event.id);

      const comp = event.competitions?.[0];
      if(!comp) continue;
      const home = comp.competitors?.find(c=>c.homeAway==="home");
      const away = comp.competitors?.find(c=>c.homeAway==="away");
      if(!home||!away) continue;

      const homeName = mapTeam(home.team?.displayName||"");
      const awayName = mapTeam(away.team?.displayName||"");
      const statusName = comp.status?.type?.name||"";
      const isFinal = statusName==="STATUS_FINAL";
      const isLive  = ["STATUS_IN_PROGRESS","STATUS_FIRST_HALF","STATUS_SECOND_HALF",
        "STATUS_HALFTIME","STATUS_EXTRA_TIME","STATUS_PENALTIES"].includes(statusName);
      const isScheduled = !isFinal&&!isLive;

      const notes = event.notes||[];
      const round = mapRound(comp.series?.type||comp.type?.text||"", notes);
      const group = extractGroup(notes);

      const homeScore = isScheduled ? null : parseInt(home.score??0);
      const awayScore = isScheduled ? null : parseInt(away.score??0);
      const{scorers,cards} = parseDetails(comp.details||[], home.team?.id);

      const matchObj = {
        id: event.id,
        date: event.date,
        round,
        group,
        matchNum: comp.series?.number || null,
        home: homeName, away: awayName,
        hg: homeScore, ag: awayScore,
        status: isFinal?"final":isLive?"in_progress":"scheduled",
        clock: comp.status?.displayClock||"",
        period: comp.status?.period||0,
        venue: comp.venue?.fullName||"",
        venueCity: comp.venue?.address?.city||"",
        venueState: comp.venue?.address?.state||"",
        venueLocation:[comp.venue?.address?.city,comp.venue?.address?.state].filter(Boolean).join(", "),
        scorers, cards,
        ft: isFinal?(comp.status?.displayClock||"90"):null,
        updatedAt: Date.now(),
      };

      events.push(matchObj);

      // Save ALL matches to Redis (scheduled/live/final) so we have the full schedule
      const key = `match:${round}:${homeName}|${awayName}`;
      pipeline.set(key, JSON.stringify(matchObj), {ex: 60*60*24*90});
      hasWrites = true;
    }

    if(hasWrites) await pipeline.exec().catch(()=>{});

    return res.status(200).json({
      events,
      total: events.length,
      updated: new Date().toISOString(),
    });
  }catch(err){
    return res.status(500).json({error:err.message, events:[]});
  }
}

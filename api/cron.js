/**
 * /api/cron.js
 * Vercel Cron Job — runs every 15 minutes automatically.
 * Fetches ESPN for ALL recent dates, saves any newly completed matches to Redis.
 * No manual intervention needed — fully automatic.
 * 
 * Configure in vercel.json:
 * "crons": [{"path": "/api/cron", "schedule": "*/15 * * * *"}]
 */
import { redis } from "./_redis.js";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard?limit=50&dates=";

const TEAM_MAP = {
  "United States":"USA","Turkey":"Turkiye","Türkiye":"Turkiye",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde",
  "Bosnia & Herzegovina":"Bosnia and Herzegovina",
  "DR Congo":"Congo DR","Democratic Republic of Congo":"Congo DR",
  "South Korea":"Korea Republic","Czech Republic":"Czechia",
};
function mapTeam(n){ return TEAM_MAP[n]||n; }

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

async function fetchDate(dateStr){
  try{
    const r = await fetch(`${ESPN_BASE}${dateStr}`, {
      headers:{"User-Agent":"Mozilla/5.0 Chrome/120"},
      signal: AbortSignal.timeout(6000),
    });
    if(!r.ok) return [];
    const data = await r.json();
    return data.events||[];
  }catch{ return []; }
}

export default async function handler(req, res){
  // Vercel cron sends GET with Authorization header
  // Also allow manual trigger
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET||"wc2026cron";
  if(authHeader !== `Bearer ${cronSecret}` && req.query.secret !== cronSecret){
    return res.status(401).json({error:"Unauthorized"});
  }

  try{
    const now = new Date();
    // Fetch today + yesterday + tomorrow (covers timezone edge cases)
    const dates = [-1, 0, 1].map(offset => {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0,10).replace(/-/g,"");
    });

    const allEvents = [];
    for(const date of dates){
      const events = await fetchDate(date);
      allEvents.push(...events);
    }

    // Deduplicate
    const seen = new Set();
    const pipeline = redis.pipeline();
    let saved = 0;
    let liveCount = 0;

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
      const isLive = ["STATUS_IN_PROGRESS","STATUS_FIRST_HALF","STATUS_SECOND_HALF",
        "STATUS_HALFTIME","STATUS_EXTRA_TIME","STATUS_PENALTIES"].includes(statusName);

      if(isLive) liveCount++;

      // Only save final matches (don't overwrite with partial live data)
      if(!isFinal) continue;

      const notes = event.notes||[];
      const round = mapRound(notes);
      const group = extractGroup(notes);
      const{scorers,cards} = parseDetails(comp.details||[], home.team?.id);

      // Check if we already have this with correct data
      const key = `match:${round}:${homeName}|${awayName}`;
      const existing = await redis.get(key);
      let existingData = null;
      try{ existingData = existing ? JSON.parse(existing) : null; }catch{}

      // Skip if already saved as final with scorers
      if(existingData?.status==="final"&&existingData?.scorers?.length>0&&scorers.length===0){
        continue; // Keep existing data with scorers over ESPN data without
      }

      const matchObj = {
        id: event.id,
        date: event.date,
        round, group,
        matchNum: comp.series?.number||null,
        home: homeName, away: awayName,
        hg: parseInt(home.score??0),
        ag: parseInt(away.score??0),
        status: "final",
        clock: comp.status?.displayClock||"",
        venue: comp.venue?.fullName||"",
        venueCity: comp.venue?.address?.city||"",
        venueState: comp.venue?.address?.state||"",
        venueLocation:[comp.venue?.address?.city,comp.venue?.address?.state].filter(Boolean).join(", "),
        scorers, cards,
        ft: comp.status?.displayClock||"90",
        updatedAt: Date.now(),
      };

      pipeline.set(key, JSON.stringify(matchObj), {ex: 60*60*24*90});
      saved++;
    }

    if(saved > 0) await pipeline.exec();

    // Log the run
    await redis.set("cron:lastRun", JSON.stringify({
      time: now.toISOString(),
      datesChecked: dates,
      matchesSaved: saved,
      liveMatches: liveCount,
      totalEvents: allEvents.length,
    }), {ex: 60*60*24});

    return res.status(200).json({
      ok: true,
      datesChecked: dates,
      totalEvents: allEvents.length,
      matchesSaved: saved,
      liveMatches: liveCount,
      time: now.toISOString(),
    });
  }catch(err){
    return res.status(500).json({error: err.message});
  }
}

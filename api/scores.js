/**
 * /api/scores.js
 * Proxies ESPN scoreboard AND saves completed matches + scorers to Upstash Redis.
 */
import { redis } from "./_redis.js";

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard?limit=200";

const TEAM_MAP = {
  "United States":"USA","Turkey":"Turkiye","Türkiye":"Turkiye",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde",
  "Bosnia & Herzegovina":"Bosnia and Herzegovina",
  "DR Congo":"Congo DR","Democratic Republic of Congo":"Congo DR",
  "South Korea":"Korea Republic","Czech Republic":"Czechia",
};
function mapTeam(n){ return TEAM_MAP[n]||n; }

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

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","s-maxage=20,stale-while-revalidate=40");
  if(req.method==="OPTIONS") return res.status(200).end();

  try{
    const r=await fetch(ESPN_URL,{headers:{"User-Agent":"Mozilla/5.0 Chrome/120"}});
    if(!r.ok) throw new Error(`ESPN ${r.status}`);
    const data=await r.json();

    const events=[];
    const pipeline=redis.pipeline();
    let hasFinals=false;

    for(const event of data.events||[]){
      const comp=event.competitions?.[0];
      if(!comp) continue;
      const home=comp.competitors?.find(c=>c.homeAway==="home");
      const away=comp.competitors?.find(c=>c.homeAway==="away");
      if(!home||!away) continue;

      const homeName=mapTeam(home.team?.displayName||"");
      const awayName=mapTeam(away.team?.displayName||"");
      const statusName=comp.status?.type?.name||"";
      const isFinal=statusName==="STATUS_FINAL";
      const isLive=["STATUS_IN_PROGRESS","STATUS_FIRST_HALF","STATUS_SECOND_HALF",
        "STATUS_HALFTIME","STATUS_EXTRA_TIME","STATUS_PENALTIES"].includes(statusName);
      const isScheduled=!isFinal&&!isLive;

      const homeScore=isScheduled?null:parseInt(home.score??0);
      const awayScore=isScheduled?null:parseInt(away.score??0);
      const group=extractGroup(event.notes);
      const{scorers,cards}=parseDetails(comp.details||[],home.team?.id);

      const matchObj={
        id:event.id, date:event.date, group,
        home:homeName, away:awayName,
        hg:homeScore, ag:awayScore,
        status:isFinal?"final":isLive?"in_progress":"scheduled",
        clock:comp.status?.displayClock||"",
        venue:comp.venue?.fullName||"",
        venueCity:comp.venue?.address?.city||"",
        venueState:comp.venue?.address?.state||"",
        venueLocation:[comp.venue?.address?.city,comp.venue?.address?.state].filter(Boolean).join(", "),
        scorers, cards,
        ft:isFinal?(comp.status?.displayClock||"90"):null,
        updatedAt:Date.now(),
      };

      events.push(matchObj);

      // Persist final matches to Redis
      if(isFinal&&homeName&&awayName){
        hasFinals=true;
        const key=`match:${homeName}|${awayName}`;
        pipeline.set(key, JSON.stringify(matchObj), {ex:60*60*24*60});

        // Aggregate scorers
        for(const s of scorers){
          const teamName=s.team==="home"?homeName:awayName;
          const pKey=`scorer:${teamName}:${s.player}`;
          // Use Redis HINCRBY pattern via set+get in pipeline isn't atomic,
          // so we'll handle scorer aggregation in the results endpoint from match data
        }
      }
    }

    // Execute pipeline
    if(hasFinals) await pipeline.exec();

    return res.status(200).json({events,total:events.length,updated:new Date().toISOString()});
  }catch(err){
    return res.status(500).json({error:err.message});
  }
}

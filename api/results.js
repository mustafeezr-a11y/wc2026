/**
 * /api/results.js
 * Returns all stored matches from Redis, organized by round.
 * Also computes live scorer leaderboard from match data.
 */
import { redis } from "./_redis.js";

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","s-maxage=30,stale-while-revalidate=60");
  if(req.method==="OPTIONS") return res.status(200).end();

  try{
    const keys = await redis.keys("match:*");
    if(!keys||keys.length===0){
      return res.status(200).json({
        matches:[], scorers:[], matchCount:0,
        rounds:{group:[],r32:[],r16:[],qf:[],sf:[],third:[],final:[]},
        updated:new Date().toISOString(),
      });
    }

    // Fetch all in one pipeline
    const pipe = redis.pipeline();
    for(const k of keys) pipe.get(k);
    const raw = await pipe.exec();

    const matches = raw
      .map(r => typeof r==="string" ? JSON.parse(r) : r)
      .filter(Boolean);

    // Organize by round
    const rounds = {group:[],r32:[],r16:[],qf:[],sf:[],third:[],final:[]};
    for(const m of matches){
      const r = m.round||"group";
      if(rounds[r]) rounds[r].push(m);
      else rounds.group.push(m);
    }

    // Sort each round by date
    for(const r of Object.keys(rounds)){
      rounds[r].sort((a,b)=>new Date(a.date)-new Date(b.date));
    }

    // Build scorer leaderboard from all final matches
    const scorerMap = {};
    for(const m of matches){
      if(m.status!=="final") continue;
      for(const s of m.scorers||[]){
        const teamName = s.team==="home" ? m.home : m.away;
        const key = `${teamName}:::${s.player}`;
        if(!scorerMap[key]) scorerMap[key]={player:s.player,team:teamName,goals:0,pens:0,ogs:0,total:0};
        if(s.type==="pen"){ scorerMap[key].pens++; scorerMap[key].total++; }
        else if(s.type==="og"){ scorerMap[key].ogs++; }
        else{ scorerMap[key].goals++; scorerMap[key].total++; }
      }
    }
    const scorers = Object.values(scorerMap)
      .filter(s=>s.total>0)
      .sort((a,b)=>b.total-a.total||b.goals-a.goals);

    return res.status(200).json({
      matches,
      scorers,
      matchCount: matches.length,
      scorerCount: scorers.length,
      rounds,
      updated: new Date().toISOString(),
    });
  }catch(err){
    return res.status(500).json({error:err.message, matches:[], scorers:[], rounds:{group:[],r32:[],r16:[],qf:[],sf:[],third:[],final:[]}});
  }
}

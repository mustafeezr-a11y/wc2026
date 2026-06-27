/**
 * /api/results.js
 * Returns all stored match results from Upstash Redis.
 * Also computes scorer leaderboard from stored match data (no separate scorer keys needed).
 */
import { redis } from "./_redis.js";

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","s-maxage=60,stale-while-revalidate=120");
  if(req.method==="OPTIONS") return res.status(200).end();

  try{
    // Get all match keys
    const matchKeys = await redis.keys("match:*");

    if(!matchKeys||matchKeys.length===0){
      return res.status(200).json({matches:[],scorers:[],matchCount:0,scorerCount:0,updated:new Date().toISOString()});
    }

    // Fetch all matches in one pipeline
    const pipeline=redis.pipeline();
    for(const k of matchKeys) pipeline.get(k);
    const rawMatches=await pipeline.exec();

    const matches=rawMatches
      .map(r=>typeof r==="string"?JSON.parse(r):r)
      .filter(Boolean);

    // Build scorer leaderboard from match data
    const scorerMap={};
    for(const m of matches){
      if(m.status!=="final") continue;
      for(const s of m.scorers||[]){
        const teamName=s.team==="home"?m.home:m.away;
        const key=`${teamName}:::${s.player}`;
        if(!scorerMap[key]) scorerMap[key]={player:s.player,team:teamName,goals:0,pens:0,ogs:0,total:0};
        if(s.type==="pen"){ scorerMap[key].pens++; scorerMap[key].total++; }
        else if(s.type==="og"){ scorerMap[key].ogs++; } // OGs don't count toward total
        else{ scorerMap[key].goals++; scorerMap[key].total++; }
      }
    }

    const scorers=Object.values(scorerMap).filter(s=>s.total>0);

    return res.status(200).json({
      matches,
      scorers,
      matchCount:matches.length,
      scorerCount:scorers.length,
      updated:new Date().toISOString(),
    });
  }catch(err){
    return res.status(500).json({error:err.message,matches:[],scorers:[]});
  }
}

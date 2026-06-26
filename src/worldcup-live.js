/**
 * worldcup-live.js
 * Fetches live World Cup scores via our own /api/scores proxy (Vercel serverless)
 */

const PROXY_URL = "/api/scores";

const TEAM_MAP = {
  "Mexico":"Mexico","South Africa":"South Africa","Korea Republic":"Korea Republic",
  "South Korea":"Korea Republic","Czech Republic":"Czechia","Czechia":"Czechia",
  "Switzerland":"Switzerland","Canada":"Canada",
  "Bosnia & Herzegovina":"Bosnia and Herzegovina","Bosnia-Herzegovina":"Bosnia and Herzegovina",
  "Bosnia and Herzegovina":"Bosnia and Herzegovina",
  "Qatar":"Qatar","Brazil":"Brazil","Morocco":"Morocco","Scotland":"Scotland","Haiti":"Haiti",
  "USA":"USA","United States":"USA","Paraguay":"Paraguay","Australia":"Australia",
  "Turkey":"Turkiye","Türkiye":"Turkiye","Turkiye":"Turkiye",
  "Germany":"Germany","Ivory Coast":"Ivory Coast","Côte d'Ivoire":"Ivory Coast",
  "Cote d'Ivoire":"Ivory Coast","Ecuador":"Ecuador",
  "Curaçao":"Curacao","Curacao":"Curacao",
  "Netherlands":"Netherlands","Japan":"Japan","Sweden":"Sweden","Tunisia":"Tunisia",
  "Belgium":"Belgium","Egypt":"Egypt","Iran":"Iran","IR Iran":"Iran",
  "New Zealand":"New Zealand","Spain":"Spain","Uruguay":"Uruguay",
  "Cape Verde":"Cape Verde","Cabo Verde":"Cape Verde",
  "Saudi Arabia":"Saudi Arabia","France":"France","Senegal":"Senegal",
  "Iraq":"Iraq","Norway":"Norway","Argentina":"Argentina","Austria":"Austria",
  "Algeria":"Algeria","DR Congo":"Congo DR","Congo DR":"Congo DR",
  "Democratic Republic of Congo":"Congo DR","Congo, DR":"Congo DR",
  "Colombia":"Colombia","Portugal":"Portugal","Uzbekistan":"Uzbekistan",
  "England":"England","Ghana":"Ghana","Croatia":"Croatia","Panama":"Panama","Jordan":"Jordan",
};

function mapTeam(name) {
  return TEAM_MAP[name] || name;
}

function mapStatus(espnStatus) {
  if (!espnStatus) return "scheduled";
  if (espnStatus === "STATUS_FINAL" || espnStatus === "STATUS_FULL_TIME") return "final";
  if (
    espnStatus === "STATUS_IN_PROGRESS" ||
    espnStatus === "STATUS_FIRST_HALF" ||
    espnStatus === "STATUS_SECOND_HALF" ||
    espnStatus === "STATUS_HALFTIME" ||
    espnStatus === "STATUS_EXTRA_TIME" ||
    espnStatus === "STATUS_PENALTIES"
  ) return "in_progress";
  return "scheduled";
}

function formatKickoff(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const month = d.toLocaleString("en-US", { month: "short", timeZone: "America/New_York" });
    const day = d.toLocaleString("en-US", { day: "numeric", timeZone: "America/New_York" });
    const time = d.toLocaleString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York",
    });
    return `${month} ${day} · ${time} ET`;
  } catch {
    return "";
  }
}

export async function fetchLiveScores() {
  try {
    const res = await fetch(PROXY_URL, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
    const data = await res.json();
    if (!data.events || data.events.length === 0) return null;

    return data.events.map((e) => ({
      group: extractGroup(e.groupName),
      home: mapTeam(e.home),
      away: mapTeam(e.away),
      hg: e.homeScore !== null ? parseInt(e.homeScore) : null,
      ag: e.awayScore !== null ? parseInt(e.awayScore) : null,
      status: mapStatus(e.status),
      kickoff: formatKickoff(e.date),
      clock: e.clock || "",
      espnId: e.id,
      venue: e.venue || "",
      venueLocation: e.venueLocation || "",
      scorers: e.scorers || [],
      cards: e.cards || [],
    })).filter(r => r.home && r.away);
  } catch (err) {
    console.warn("[worldcup-live] fetch failed:", err.message);
    return null;
  }
}

function extractGroup(text) {
  if (!text) return null;
  const m = text.match(/Group\s+([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

export function diffResults(prev, next) {
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i], n = next[i];
    if (p.hg !== n.hg || p.ag !== n.ag || p.status !== n.status) return true;
  }
  return false;
}

export function mergeResults(staticResults, liveResults) {
  if (!liveResults || liveResults.length === 0) return staticResults;

  const liveMap = {};
  for (const r of liveResults) {
    liveMap[`${r.home}|${r.away}`] = r;
    liveMap[`${r.away}|${r.home}`] = { ...r, hg: r.ag, ag: r.hg };
  }

  return staticResults.map(s => {
    const key = `${s.home}|${s.away}`;
    const live = liveMap[key];
    if (!live) return s;
    // Only update scores if live data is NOT scheduled (prevents 0-0 contaminating upcoming)
    const hasScore = live.hg !== null && live.ag !== null && live.status !== "scheduled";
    return {
      ...s,
      hg: hasScore ? live.hg : s.hg,
      ag: hasScore ? live.ag : s.ag,
      status: live.status !== "scheduled" ? live.status : s.status,
      clock: live.clock || s.clock,
      // Merge in rich detail from live when available
      venue: live.venue || s.venue || "",
      venueLocation: live.venueLocation || s.venueLocation || "",
      scorers: live.scorers?.length ? live.scorers : (s.scorers || []),
      cards: live.cards?.length ? live.cards : (s.cards || []),
    };
  });
}

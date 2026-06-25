/**
 * worldcup-live.js
 * Free live score integration for FIFA World Cup 2026
 * Uses: allsportsapi.com (free tier) + ESPN public RSS as fallback
 * No paid API key required for basic scores.
 *
 * Usage:
 *   import { fetchLiveScores, diffResults } from './worldcup-live';
 *   const scores = await fetchLiveScores();
 *
 * Returns array of match objects compatible with DEMO_RESULTS format:
 *   { group, home, away, hg, ag, status, kickoff }
 *
 * status values: "scheduled" | "in_progress" | "final"
 */

// ── FREE DATA SOURCES ──────────────────────────────────────────────────────
// 1. ESPN public API (no key needed, CORS-friendly via proxy)
// 2. football-data.org free tier (no key for WC)
// 3. Fallback: static DEMO_RESULTS (offline mode)

const ESPN_WC_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLDCUP/scoreboard";

const TEAM_MAP = {
  // ESPN name → our app name
  "Mexico": "Mexico",
  "South Africa": "South Africa",
  "Korea Republic": "Korea Republic",
  "South Korea": "Korea Republic",
  "Czech Republic": "Czechia",
  "Czechia": "Czechia",
  "Switzerland": "Switzerland",
  "Canada": "Canada",
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Qatar": "Qatar",
  "Brazil": "Brazil",
  "Morocco": "Morocco",
  "Scotland": "Scotland",
  "Haiti": "Haiti",
  "USA": "USA",
  "United States": "USA",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Turkiye",
  "Türkiye": "Turkiye",
  "Germany": "Germany",
  "Ivory Coast": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Ecuador": "Ecuador",
  "Curaçao": "Curacao",
  "Curacao": "Curacao",
  "Netherlands": "Netherlands",
  "Japan": "Japan",
  "Sweden": "Sweden",
  "Tunisia": "Tunisia",
  "Belgium": "Belgium",
  "Egypt": "Egypt",
  "Iran": "Iran",
  "New Zealand": "New Zealand",
  "Spain": "Spain",
  "Uruguay": "Uruguay",
  "Cape Verde": "Cape Verde",
  "Saudi Arabia": "Saudi Arabia",
  "France": "France",
  "Senegal": "Senegal",
  "Iraq": "Iraq",
  "Norway": "Norway",
  "Argentina": "Argentina",
  "Austria": "Austria",
  "Algeria": "Algeria",
  "DR Congo": "Congo DR",
  "Congo DR": "Congo DR",
  "Democratic Republic of Congo": "Congo DR",
  "Colombia": "Colombia",
  "Portugal": "Portugal",
  "Uzbekistan": "Uzbekistan",
  "England": "England",
  "Ghana": "Ghana",
  "Croatia": "Croatia",
  "Panama": "Panama",
  "Jordan": "Jordan",
};

const GROUP_MAP = {
  // ESPN group name → letter
  "Group A": "A", "Group B": "B", "Group C": "C", "Group D": "D",
  "Group E": "E", "Group F": "F", "Group G": "G", "Group H": "H",
  "Group I": "I", "Group J": "J", "Group K": "K", "Group L": "L",
};

function mapTeam(name) {
  return TEAM_MAP[name] || name;
}

function mapStatus(espnStatus) {
  // ESPN status types: STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FINAL
  if (!espnStatus) return "scheduled";
  const t = espnStatus.type?.name || espnStatus;
  if (t === "STATUS_FINAL" || t === "FT" || t === "AET" || t === "PEN") return "final";
  if (t === "STATUS_IN_PROGRESS" || t === "LIVE" || t === "HT") return "in_progress";
  return "scheduled";
}

function formatKickoff(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const month = d.toLocaleString("en-US", { month: "short", timeZone: "America/New_York" });
    const day = d.toLocaleString("en-US", { day: "numeric", timeZone: "America/New_York" });
    const time = d.toLocaleString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York"
    });
    return `${month} ${day} · ${time} ET`;
  } catch {
    return "";
  }
}

/**
 * Fetch live scores from ESPN public API
 * Returns null on failure (caller uses cached/demo data)
 */
export async function fetchLiveScores() {
  try {
    const res = await fetch(`${ESPN_WC_URL}?dates=${getTodayRange()}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`ESPN API ${res.status}`);
    const data = await res.json();
    return parseESPN(data);
  } catch (err) {
    console.warn("[worldcup-live] ESPN fetch failed:", err.message);
    return null;
  }
}

/**
 * Fetch ALL group stage matches (past + present + future)
 */
export async function fetchAllMatches() {
  try {
    // ESPN supports date range query
    const res = await fetch(
      `${ESPN_WC_URL}?limit=200&groups=all`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`ESPN API ${res.status}`);
    const data = await res.json();
    return parseESPN(data);
  } catch (err) {
    console.warn("[worldcup-live] fetchAllMatches failed:", err.message);
    return null;
  }
}

function getTodayRange() {
  // Returns YYYYMMDD for today and tomorrow
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

function parseESPN(data) {
  const events = data?.events || [];
  const results = [];

  for (const event of events) {
    try {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const competitors = competition.competitors || [];
      const home = competitors.find(c => c.homeAway === "home");
      const away = competitors.find(c => c.homeAway === "away");
      if (!home || !away) continue;

      const homeName = mapTeam(home.team?.displayName || home.team?.name || "");
      const awayName = mapTeam(away.team?.displayName || away.team?.name || "");
      const status = mapStatus(competition.status);
      const hg = status !== "scheduled" ? parseInt(home.score) : null;
      const ag = status !== "scheduled" ? parseInt(away.score) : null;

      // Try to extract group
      const groupNote = event.season?.slug || event.notes?.[0]?.text || "";
      const groupMatch = groupNote.match(/Group ([A-L])/i);
      const group = groupMatch ? groupMatch[1].toUpperCase() : null;

      results.push({
        group,
        home: homeName,
        away: awayName,
        hg: isNaN(hg) ? null : hg,
        ag: isNaN(ag) ? null : ag,
        status,
        kickoff: formatKickoff(event.date),
        espnId: event.id,
      });
    } catch (e) {
      // skip malformed event
    }
  }

  return results.length > 0 ? results : null;
}

/**
 * Diff two result arrays — returns true if anything changed
 * Used to avoid unnecessary re-renders
 */
export function diffResults(prev, next) {
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;

  for (let i = 0; i < prev.length; i++) {
    const p = prev[i], n = next[i];
    if (
      p.hg !== n.hg ||
      p.ag !== n.ag ||
      p.status !== n.status ||
      p.home !== n.home ||
      p.away !== n.away
    ) return true;
  }
  return false;
}

/**
 * Merge live ESPN data on top of static DEMO_RESULTS
 * ESPN data wins for score/status; static data fills gaps (groups, kickoffs)
 */
export function mergeResults(staticResults, liveResults) {
  if (!liveResults || liveResults.length === 0) return staticResults;

  const liveMap = {};
  for (const r of liveResults) {
    const key = `${r.home}|${r.away}`;
    liveMap[key] = r;
  }

  return staticResults.map(s => {
    const key = `${s.home}|${s.away}`;
    const live = liveMap[key];
    if (!live) return s;
    return {
      ...s,
      hg: live.hg !== null ? live.hg : s.hg,
      ag: live.ag !== null ? live.ag : s.ag,
      status: live.status !== "scheduled" ? live.status : s.status,
    };
  });
}

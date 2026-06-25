/**
 * api/scores.js — Vercel serverless function
 * Proxies ESPN World Cup scoreboard (server-side, no CORS issues)
 * Deploy path: /api/scores
 * Free, no API key needed.
 */

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLDCUP/scoreboard?limit=200";

export default async function handler(req, res) {
  // Allow browser requests from same domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  try {
    const response = await fetch(ESPN_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WC2026Tracker/1.0)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `ESPN returned ${response.status}` });
    }

    const data = await response.json();

    // Extract only what we need — keeps payload small
    const events = (data.events || []).map((event) => {
      const comp = event.competitions?.[0];
      if (!comp) return null;
      const competitors = comp.competitors || [];
      const home = competitors.find((c) => c.homeAway === "home");
      const away = competitors.find((c) => c.homeAway === "away");
      if (!home || !away) return null;

      const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";
      const statusDesc = comp.status?.type?.description || "";

      return {
        id: event.id,
        date: event.date,
        home: home.team?.displayName || home.team?.name || "",
        away: away.team?.displayName || away.team?.name || "",
        homeScore: home.score ?? null,
        awayScore: away.score ?? null,
        status: statusType,
        statusDesc,
        clock: comp.status?.displayClock || "",
        period: comp.status?.period || 0,
        groupName: event.notes?.[0]?.text || "",
        venue: comp.venue?.fullName || "",
      };
    }).filter(Boolean);

    return res.status(200).json({ events, updated: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

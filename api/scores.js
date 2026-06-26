/**
 * Vercel serverless function — proxies ESPN World Cup scoreboard
 * No CORS issues, no API key required
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const ESPN_URL =
      "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard?limit=200";

    const response = await fetch(ESPN_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `ESPN API error: ${response.status}`,
        url: ESPN_URL,
      });
    }

    const data = await response.json();
    const events = (data.events || [])
      .map((event) => {
        const comp = event.competitions?.[0];
        if (!comp) return null;
        const home = comp.competitors?.find((c) => c.homeAway === "home");
        const away = comp.competitors?.find((c) => c.homeAway === "away");
        if (!home || !away) return null;

        const statusName = comp.status?.type?.name || "STATUS_SCHEDULED";
        const isScheduled = statusName === "STATUS_SCHEDULED" || statusName === "STATUS_POSTPONED";

        // Extract venue info
        const venue = comp.venue?.fullName || "";
        const venueCity = comp.venue?.address?.city || "";
        const venueState = comp.venue?.address?.state || "";
        const venueLocation = [venueCity, venueState].filter(Boolean).join(", ");

        // Extract scorers and cards from details
        const details = comp.details || [];
        const scorers = [];
        const cards = [];
        for (const d of details) {
          const type = d.type?.text || "";
          const teamId = d.team?.id;
          const homeTeamId = home.team?.id;
          const playerName = d.athletesInvolved?.[0]?.displayName || "";
          const clock = d.clock?.displayValue || "";
          const isHome = teamId === homeTeamId;
          if (type === "Goal" || type === "Penalty - Scored") {
            scorers.push({ player: playerName, team: isHome ? "home" : "away", clock, type });
          } else if (type === "Own Goal") {
            scorers.push({ player: playerName, team: isHome ? "home" : "away", clock, type: "OG" });
          } else if (type === "Yellow Card") {
            cards.push({ player: playerName, team: isHome ? "home" : "away", clock, type: "Y" });
          } else if (type === "Red Card" || type === "Yellow-Red Card") {
            cards.push({ player: playerName, team: isHome ? "home" : "away", clock, type: type === "Yellow-Red Card" ? "Y2" : "R" });
          }
        }

        return {
          id: event.id,
          date: event.date,
          home: home.team?.displayName || "",
          away: away.team?.displayName || "",
          // Only pass scores for non-scheduled games to avoid 0-0 contaminating upcoming matches
          homeScore: isScheduled ? null : (home.score ?? null),
          awayScore: isScheduled ? null : (away.score ?? null),
          status: statusName,
          statusDesc: comp.status?.type?.description || "",
          clock: comp.status?.displayClock || "",
          period: comp.status?.period || 0,
          groupName: event.notes?.[0]?.text || "",
          venue,
          venueLocation,
          scorers,
          cards,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      events,
      total: events.length,
      updated: new Date().toISOString(),
      source: "ESPN",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

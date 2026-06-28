export const GROUP_LABELS = ["A", "B", "C", "D"];

const COUNTRY_FLAG_CODE_MAP = {
  argentina: "ar",
  brazil: "br",
  croatia: "hr",
  england: "gb-eng",
  france: "fr",
  germany: "de",
  spain: "es",
  portugal: "pt",
  italy: "it",
  netherlands: "nl",
  belgium: "be",
  japan: "jp",
  "south korea": "kr",
  "korea republic": "kr",
  southkorea: "kr",
  mexico: "mx",
  usa: "us",
  "united states": "us",
  "united states of america": "us",
  canada: "ca",
  australia: "au",
  uruguay: "uy",
  colombia: "co",
  chile: "cl",
  peru: "pe",
  ecuador: "ec",
  panama: "pa",
  "costa rica": "cr",
  jamaica: "jm",
  morocco: "ma",
  senegal: "sn",
  nigeria: "ng",
  ghana: "gh",
  egypt: "eg",
  tunisia: "tn",
  algeria: "dz",
  "saudi arabia": "sa",
  iran: "ir",
  qatar: "qa",
  uae: "ae",
  "united arab emirates": "ae",
  turkey: "tr",
  switzerland: "ch",
  poland: "pl",
  austria: "at",
  sweden: "se",
  denmark: "dk",
  norway: "no",
  scotland: "gb-sct",
  wales: "gb-wls",
};

export function getGroupLabel(groupId) {
  if (!groupId) return "Unassigned";
  return String(groupId).toUpperCase();
}

export function getCountryFlagUrl(name) {
  if (!name) return "";
  const normalized = String(name).toLowerCase().trim();
  const code = COUNTRY_FLAG_CODE_MAP[normalized];
  if (!code) return "";
  return `https://flagcdn.com/w40/${code}.png`;
}

function sortStandings(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference)
    return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamName.localeCompare(b.teamName);
}

export function buildGroupStandings(teams, matches) {
  const teamLookup = new Map((teams || []).map((team) => [team.id, team]));
  const grouped = {};

  GROUP_LABELS.forEach((label) => {
    grouped[label] = [];
  });

  (teams || []).forEach((team) => {
    const groupKey = getGroupLabel(
      team.group_id ?? team.group ?? team.group_name,
    );
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push({
      id: team.id,
      teamName: team.name || team.team_name,
      playerName: team.player_name || team.playerName || "",
      group: groupKey,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  (matches || []).forEach((match) => {
    const home = teamLookup.get(match.home_team_id);
    const away = teamLookup.get(match.away_team_id);

    if (!home || !away) return;

    const homeGroup = getGroupLabel(
      home.group_id ?? home.group ?? home.group_name,
    );
    const awayGroup = getGroupLabel(
      away.group_id ?? away.group ?? away.group_name,
    );

    if (homeGroup !== awayGroup) return;

    const homeStats = grouped[homeGroup]?.find((row) => row.id === home.id);
    const awayStats = grouped[awayGroup]?.find((row) => row.id === away.id);

    if (!homeStats || !awayStats) return;

    const homeScore = Number(match.home_score ?? match.homeGoals ?? 0);
    const awayScore = Number(match.away_score ?? match.awayGoals ?? 0);
    const isCompleted =
      match.status === "Completed" ||
      match.status === "Finished" ||
      (match.home_score !== null && match.away_score !== null);

    if (!isCompleted) return;

    homeStats.played += 1;
    awayStats.played += 1;
    homeStats.goalsFor += homeScore;
    homeStats.goalsAgainst += awayScore;
    awayStats.goalsFor += awayScore;
    awayStats.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeStats.wins += 1;
      awayStats.losses += 1;
      homeStats.points += 3;
    } else if (homeScore < awayScore) {
      awayStats.wins += 1;
      homeStats.losses += 1;
      awayStats.points += 3;
    } else {
      homeStats.draws += 1;
      awayStats.draws += 1;
      homeStats.points += 1;
      awayStats.points += 1;
    }
  });

  Object.keys(grouped).forEach((groupKey) => {
    grouped[groupKey] = grouped[groupKey]
      .map((row) => ({
        ...row,
        goalDifference: row.goalsFor - row.goalsAgainst,
      }))
      .sort(sortStandings);
  });

  return grouped;
}

export function buildKnockoutStages(teams, matches) {
  const standings = buildGroupStandings(teams, matches);
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const mapMatch = (match, label) => ({
    id: match.id,
    label,
    stage: match.stage,
    status: match.status,
    homeScore: match.home_score,
    awayScore: match.away_score,
    home: teamMap.get(match.home_team_id)
      ? {
          id: teamMap.get(match.home_team_id).id,
          teamName: teamMap.get(match.home_team_id).name,
          playerName: teamMap.get(match.home_team_id).player_name,
        }
      : null,

    away: teamMap.get(match.away_team_id)
      ? {
          id: teamMap.get(match.away_team_id).id,
          teamName: teamMap.get(match.away_team_id).name,
          playerName: teamMap.get(match.away_team_id).player_name,
        }
      : null,
  });

  const quarterfinals = matches
    .filter((match) => match.stage === "QUARTER_FINAL")
    .sort((a, b) => a.match_number - b.match_number)
    .map((match, index) => mapMatch(match, `Quarter Final ${index + 1}`));

  const semifinals = matches
    .filter((match) => match.stage === "SEMI_FINAL")
    .sort((a, b) => a.match_number - b.match_number)
    .map((match, index) => mapMatch(match, `Semi Final ${index + 1}`));

  const thirdPlace =
    matches
      .filter((match) => match.stage === "THIRD_PLACE")
      .sort((a, b) => a.match_number - b.match_number)
      .map((match) => mapMatch(match, "Third Place"))[0] || null;

  const final =
    matches
      .filter((match) => match.stage === "FINAL")
      .sort((a, b) => a.match_number - b.match_number)
      .map((match) => mapMatch(match, "Final"))[0] || null;

  const champion =
    final && final.status === "Completed"
      ? final.homeScore > final.awayScore
        ? final.home
        : final.away
      : null;

  const runnerUp =
    final && final.status === "Completed"
      ? final.homeScore > final.awayScore
        ? final.away
        : final.home
      : null;

  const thirdPlaceWinner =
    thirdPlace && thirdPlace.status === "Completed"
      ? thirdPlace.homeScore > thirdPlace.awayScore
        ? thirdPlace.home
        : thirdPlace.away
      : null;

  const fourthPlace =
    thirdPlace && thirdPlace.status === "Completed"
      ? thirdPlace.homeScore > thirdPlace.awayScore
        ? thirdPlace.away
        : thirdPlace.home
      : null;

  return {
    standings,
    quarterfinals,
    semifinals,
    thirdPlace,
    final,
    champion,
    runnerUp,
    thirdPlaceWinner,
    fourthPlace,
  };
}

export async function generateSemiFinals(supabase) {
  // Fetch Quarter Finals
  const { data: quarterFinals, error } = await supabase
    .from("matches")
    .select("*")
    .eq("stage", "QUARTER_FINAL")
    .order("match_number");

  if (error) throw error;

  if (quarterFinals.length !== 4) {
    throw new Error("Quarter Final matches not found.");
  }

  // Ensure every match is completed
  const incomplete = quarterFinals.some(
    (match) =>
      match.status !== "Completed" ||
      match.home_score === null ||
      match.away_score === null,
  );

  if (incomplete) {
    throw new Error("Complete all Quarter Final matches first.");
  }

  // Prevent duplicate generation
  const { data: existingSemis } = await supabase
    .from("matches")
    .select("id")
    .eq("stage", "SEMI_FINAL");

  if (existingSemis.length > 0) {
    throw new Error("Semi Finals already generated.");
  }

  const winner = (match) => match.winner_team_id;
  const loser = (match) => match.loser_team_id;

  const semiFinals = [
    {
      stage: "SEMI_FINAL",
      match_number: 1,
      home_team_id: winner(quarterFinals[0]),
      away_team_id: winner(quarterFinals[1]),
      status: "Scheduled",
    },
    {
      stage: "SEMI_FINAL",
      match_number: 2,
      home_team_id: winner(quarterFinals[2]),
      away_team_id: winner(quarterFinals[3]),
      status: "Scheduled",
    },
  ];

  const { error: insertError } = await supabase
    .from("matches")
    .insert(semiFinals);

  if (insertError) throw insertError;
}

export async function generateFinalAndThirdPlace(supabase) {
  // Fetch Semi Finals
  const { data: semiFinals, error } = await supabase
    .from("matches")
    .select("*")
    .eq("stage", "SEMI_FINAL")
    .order("match_number");

  if (error) throw error;

  if (semiFinals.length !== 2) {
    throw new Error("Semi Final matches not found.");
  }

  // Ensure both semis are completed
  const incomplete = semiFinals.some(
    (match) =>
      match.status !== "Completed" ||
      match.home_score === null ||
      match.away_score === null,
  );

  if (incomplete) {
    throw new Error("Complete all Semi Final matches first.");
  }

  // Prevent duplicate generation
  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .in("stage", ["FINAL", "THIRD_PLACE"]);

  if (existing.length > 0) {
    throw new Error("Final fixtures already generated.");
  }

  const winner = (match) => match.winner_team_id;
  const loser = (match) => match.loser_team_id;

  const fixtures = [
    {
      stage: "FINAL",
      match_number: 1,
      home_team_id: winner(semiFinals[0]),
      away_team_id: winner(semiFinals[1]),
      status: "Scheduled",
    },
    {
      stage: "THIRD_PLACE",
      match_number: 1,
      home_team_id: loser(semiFinals[0]),
      away_team_id: loser(semiFinals[1]),
      status: "Scheduled",
    },
  ];

  const { error: insertError } = await supabase
    .from("matches")
    .insert(fixtures);

  if (insertError) throw insertError;
}

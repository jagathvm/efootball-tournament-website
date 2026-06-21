export const GROUP_LABELS = ['A', 'B', 'C', 'D'];

const COUNTRY_FLAG_CODE_MAP = {
  argentina: 'ar',
  brazil: 'br',
  croatia: 'hr',
  england: 'gb-eng',
  france: 'fr',
  germany: 'de',
  spain: 'es',
  portugal: 'pt',
  italy: 'it',
  netherlands: 'nl',
  belgium: 'be',
  japan: 'jp',
  'south korea': 'kr',
  'korea republic': 'kr',
  southkorea: 'kr',
  mexico: 'mx',
  usa: 'us',
  'united states': 'us',
  'united states of america': 'us',
  canada: 'ca',
  australia: 'au',
  uruguay: 'uy',
  colombia: 'co',
  chile: 'cl',
  peru: 'pe',
  ecuador: 'ec',
  panama: 'pa',
  'costa rica': 'cr',
  jamaica: 'jm',
  morocco: 'ma',
  senegal: 'sn',
  nigeria: 'ng',
  ghana: 'gh',
  egypt: 'eg',
  tunisia: 'tn',
  algeria: 'dz',
  'saudi arabia': 'sa',
  iran: 'ir',
  qatar: 'qa',
  uae: 'ae',
  'united arab emirates': 'ae',
  turkey: 'tr',
  switzerland: 'ch',
  poland: 'pl',
  austria: 'at',
  sweden: 'se',
  denmark: 'dk',
  norway: 'no',
  scotland: 'gb-sct',
  wales: 'gb-wls'
};

export function getGroupLabel(groupId) {
  if (!groupId) return 'Unassigned';
  return String(groupId).toUpperCase();
}

export function getCountryFlagUrl(name) {
  if (!name) return '';
  const normalized = String(name).toLowerCase().trim();
  const code = COUNTRY_FLAG_CODE_MAP[normalized];
  if (!code) return '';
  return `https://flagcdn.com/w40/${code}.png`;
}

function sortStandings(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
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
    const groupKey = getGroupLabel(team.group_id ?? team.group ?? team.group_name);
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push({
      id: team.id,
      teamName: team.name || team.team_name,
      playerName: team.player_name || team.playerName || '',
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

    const homeGroup = getGroupLabel(home.group_id ?? home.group ?? home.group_name);
    const awayGroup = getGroupLabel(away.group_id ?? away.group ?? away.group_name);

    if (homeGroup !== awayGroup) return;

    const homeStats = grouped[homeGroup]?.find((row) => row.id === home.id);
    const awayStats = grouped[awayGroup]?.find((row) => row.id === away.id);

    if (!homeStats || !awayStats) return;

    const homeScore = Number(match.home_score ?? match.homeGoals ?? 0);
    const awayScore = Number(match.away_score ?? match.awayGoals ?? 0);
    const isCompleted = match.status === 'Completed' || match.status === 'Finished' || (match.home_score !== null && match.away_score !== null);

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

  const quarterfinals = [];
  const semifinals = [];
  let final = null;

  const firstPlace = (groupKey) => standings[groupKey]?.[0] || null;
  const secondPlace = (groupKey) => standings[groupKey]?.[1] || null;

  if (firstPlace('A') && secondPlace('B')) {
    quarterfinals.push(
      { label: 'Quarter Final 1', home: firstPlace('A'), away: secondPlace('B') },
      { label: 'Quarter Final 2', home: firstPlace('B'), away: secondPlace('A') },
      { label: 'Quarter Final 3', home: firstPlace('C'), away: secondPlace('D') },
      { label: 'Quarter Final 4', home: firstPlace('D'), away: secondPlace('C') }
    );
  }

  if (quarterfinals.length) {
    semifinals.push(
      { label: 'Semi Final 1', home: quarterfinals[0], away: quarterfinals[1] },
      { label: 'Semi Final 2', home: quarterfinals[2], away: quarterfinals[3] }
    );
  }

  if (semifinals.length) {
    final = { label: 'Final', home: semifinals[0], away: semifinals[1] };
  }

  return {
    standings,
    quarterfinals,
    semifinals,
    final,
  };
}

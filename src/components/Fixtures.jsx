import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GROUP_LABELS, getCountryFlagUrl } from '../lib/tournamentUtils';

export default function Fixtures() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [{ data: teamsData, error: teamsError }, { data: matchesData, error: matchesError }] = await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('matches').select('*').order('id', { ascending: true })
        ]);

        if (teamsError) throw teamsError;
        if (matchesError) throw matchesError;

        setTeams(teamsData || []);
        setMatches(matchesData || []);
      } catch (err) {
        console.error('Error fetching fixtures:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading fixtures...</div>;
  if (error) return <div>System Error: {error}</div>;

  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const fixturesByGroup = GROUP_LABELS.reduce((acc, group) => {
    acc[group] = [];
    return acc;
  }, {});

  matches.forEach((match) => {
    const home = teamMap.get(match.home_team_id);
    const away = teamMap.get(match.away_team_id);

    if (!home || !away) return;

    const homeGroup = String(home.group_id || '').toUpperCase();
    const awayGroup = String(away.group_id || '').toUpperCase();

    if (homeGroup !== awayGroup) return;

    fixturesByGroup[homeGroup]?.push({
      ...match,
      homeTeam: home,
      awayTeam: away,
    });
  });

  const buildMatchdayLayout = (groupKey, groupMatches) => {
    const groupTeams = teams.filter(
      (team) => String(team.group_id || '').toUpperCase() === groupKey
    );

    if (groupTeams.length !== 4) {
      return [];
    }

    const pairingsByDay = [
      [
        [groupTeams[0], groupTeams[1]],
        [groupTeams[2], groupTeams[3]],
      ],
      [
        [groupTeams[0], groupTeams[2]],
        [groupTeams[1], groupTeams[3]],
      ],
      [
        [groupTeams[0], groupTeams[3]],
        [groupTeams[1], groupTeams[2]],
      ],
    ];

    return pairingsByDay
      .map((dayPairings, dayIndex) => ({
        dayIndex: dayIndex + 1,
        matches: dayPairings
          .map(([homeTeam, awayTeam]) => {
            const match = (groupMatches || []).find(
              (item) =>
                (item.homeTeam?.id === homeTeam?.id && item.awayTeam?.id === awayTeam?.id) ||
                (item.homeTeam?.id === awayTeam?.id && item.awayTeam?.id === homeTeam?.id)
            );

            return match
              ? {
                  ...match,
                  homeTeam: match.homeTeam || homeTeam,
                  awayTeam: match.awayTeam || awayTeam,
                }
              : null;
          })
          .filter(Boolean),
      }))
      .filter((day) => day.matches.length > 0);
  };

  return (
    <div className="fixtures-container">
      <h2>Fixtures</h2>
      {matches.length === 0 ? (
        <p className="fixtures-empty-state">No fixtures have been generated yet.</p>
      ) : (
        GROUP_LABELS.map((groupKey) => {
          const groupMatches = fixturesByGroup[groupKey] || [];
          const matchdays = buildMatchdayLayout(groupKey, groupMatches);

          if (matchdays.length === 0) {
            return null;
          }

          return (
            <section key={groupKey} className="fixtures-group-block">
              <h3>Group {groupKey}</h3>
              <div className="fixtures-matchdays">
                {matchdays.map((day) => (
                  <div key={`${groupKey}-day-${day.dayIndex}`} className="fixtures-matchday-card">
                    <h4>Matchday {day.dayIndex}</h4>
                    <div className="fixtures-day-grid">
                      {day.matches.map((match) => {
                        const homeName = match.homeTeam?.name || match.homeTeam?.team_name || 'TBD';
                        const awayName = match.awayTeam?.name || match.awayTeam?.team_name || 'TBD';
                        const homeFlag = getCountryFlagUrl(homeName);
                        const awayFlag = getCountryFlagUrl(awayName);
                        const isCompleted = match.status === 'Completed' || match.status === 'Finished';

                        return (
                          <div key={match.id || `${groupKey}-${day.dayIndex}-${homeName}-${awayName}`} className="fixtures-card">
                            <div className="fixtures-team-row fixtures-team-left">
                              <span className="team-name-with-flag fixtures-team-content">
                                {homeFlag ? <img src={homeFlag} alt={`${homeName} flag`} className="country-flag" /> : null}
                                <span>{homeName}</span>
                              </span>
                            </div>
                            <span className="fixtures-vs">vs</span>
                            <div className="fixtures-team-row fixtures-team-right">
                              <span className="team-name-with-flag fixtures-team-content">
                                <span>{awayName}</span>
                                {awayFlag ? <img src={awayFlag} alt={`${awayName} flag`} className="country-flag" /> : null}
                              </span>
                            </div>
                            {isCompleted ? (
                              <span className="fixtures-status fixtures-score-pill">
                                {match.home_score ?? 0} - {match.away_score ?? 0}
                              </span>
                            ) : (
                              <span className="fixtures-status fixtures-status-placeholder" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

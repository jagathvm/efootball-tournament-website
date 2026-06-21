import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildGroupStandings, GROUP_LABELS, getCountryFlagUrl } from '../lib/tournamentUtils';

export default function GroupStandings() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [{ data: teamsData, error: teamsError }, { data: matchesData, error: matchesError }] = await Promise.all([
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('matches').select('*').order('id', { ascending: true })
        ]);

        if (teamsError) throw teamsError;
        if (matchesError) throw matchesError;

        setTeams(teamsData || []);
        setMatches(matchesData || []);
      } catch (err) {
        console.error('Error fetching standings data:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Loading tournament standings...</div>;
  if (error) return <div>System Error: {error}</div>;

  const groups = buildGroupStandings(teams, matches);

  return (
    <div className="standings-container">
      {GROUP_LABELS.map((groupKey) => {
        const rows = groups[groupKey] || [];
        return (
          <div key={groupKey} className="group-table-wrap">
            <h2>Group {groupKey}</h2>
            <div className="table-scroll-wrapper">
              <table className="group-standings-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Team</th>
                    <th>MP</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GD</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((team, index) => {
                    const flagUrl = getCountryFlagUrl(team.teamName);
                    return (
                      <tr key={team.id}>
                        <td>{index + 1}</td>
                        <td className="team-name-cell">
                          <strong className="team-name-with-flag">
                            {flagUrl ? <img src={flagUrl} alt={`${team.teamName} flag`} className="country-flag" /> : null}
                            <span>{team.teamName}</span>
                          </strong>
                          {team.playerName ? <div className="team-player">{team.playerName}</div> : null}
                        </td>
                        <td>{team.played}</td>
                        <td>{team.wins}</td>
                        <td>{team.draws}</td>
                        <td>{team.losses}</td>
                        <td>{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                        <td>{team.goalsFor}</td>
                        <td>{team.goalsAgainst}</td>
                        <td><strong>{team.points}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

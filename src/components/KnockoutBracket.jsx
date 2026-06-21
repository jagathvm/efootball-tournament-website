import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildKnockoutStages, getCountryFlagUrl } from '../lib/tournamentUtils';

export default function KnockoutBracket() {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function buildBracket() {
      try {
        setLoading(true);
        const [{ data: teamsData, error: teamsError }, { data: matchesData, error: matchesError }] = await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('matches').select('*')
        ]);

        if (teamsError) throw teamsError;
        if (matchesError) throw matchesError;

        setTournament(buildKnockoutStages(teamsData || [], matchesData || []));
      } catch (err) {
        console.error('Error building bracket:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    buildBracket();
  }, []);

  if (loading) return <div>Loading Knockout Bracket...</div>;
  if (error) return <div>System Error: {error}</div>;
  if (!tournament) return null;

  const renderMatchCard = (stage, index) => {
    const home = stage?.home?.teamName || stage?.home?.name || 'TBD';
    const away = stage?.away?.teamName || stage?.away?.name || 'TBD';
    const homeFlag = getCountryFlagUrl(home);
    const awayFlag = getCountryFlagUrl(away);
    const label = stage?.label || `Match ${index + 1}`;

    return (
      <div key={`${label}-${index}`} className="match-card">
        <div className="match-header">{label}</div>
        <div className="team-row">
          <span className="team-name team-name-with-flag">
            {homeFlag ? <img src={homeFlag} alt={`${home} flag`} className="country-flag" /> : null}
            <span>{home}</span>
          </span>
        </div>
        <div className="vs-divider">vs</div>
        <div className="team-row">
          <span className="team-name team-name-with-flag">
            {awayFlag ? <img src={awayFlag} alt={`${away} flag`} className="country-flag" /> : null}
            <span>{away}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="knockout-container">
      <h2>Knockout Stage</h2>
      <div className="bracket-grid">
        {tournament.quarterfinals.map((match, index) => renderMatchCard(match, index))}
      </div>
      {tournament.semifinals.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Semi Finals</h3>
          <div className="bracket-grid">
            {tournament.semifinals.map((match, index) => renderMatchCard(match, index))}
          </div>
        </div>
      )}
      {tournament.final && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Final</h3>
          <div className="bracket-grid">
            {renderMatchCard(tournament.final, 0)}
          </div>
        </div>
      )}
    </div>
  );
}

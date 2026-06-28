import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { buildKnockoutStages, getCountryFlagUrl } from "../lib/tournamentUtils";

export default function KnockoutBracket() {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function buildBracket() {
      try {
        setLoading(true);
        const [
          { data: teamsData, error: teamsError },
          { data: matchesData, error: matchesError },
        ] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("matches").select("*"),
        ]);

        if (teamsError) throw teamsError;
        if (matchesError) throw matchesError;

        setTournament(buildKnockoutStages(teamsData || [], matchesData || []));
      } catch (err) {
        console.error("Error building bracket:", err.message);
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

  const championFlag = tournament.champion
    ? getCountryFlagUrl(tournament.champion.teamName)
    : "";

  const runnerUpFlag = tournament.runnerUp
    ? getCountryFlagUrl(tournament.runnerUp.teamName)
    : "";

  const thirdPlaceFlag = tournament.thirdPlaceWinner
    ? getCountryFlagUrl(tournament.thirdPlaceWinner.teamName)
    : "";

  const renderMatchCard = (stage, index) => {
    const home = stage?.home?.teamName || stage?.home?.name || "TBD";
    const away = stage?.away?.teamName || stage?.away?.name || "TBD";

    const homePlayer = stage?.home?.playerName || "";
    const awayPlayer = stage?.away?.playerName || "";

    const homeFlag = getCountryFlagUrl(home);
    const awayFlag = getCountryFlagUrl(away);
    const label = stage?.label || `Match ${index + 1}`;

    return (
      <div key={`${label}-${index}`} className="match-card">
        <div className="match-header">{label}</div>
        <div className="team-row">
          <div className="team-name-with-flag">
            {homeFlag && (
              <img
                src={homeFlag}
                alt={`${home} flag`}
                className="country-flag"
              />
            )}

            <div className="team-details">
              <span className="team-name">{home}</span>

              {homePlayer && (
                <small className="player-name">{homePlayer}</small>
              )}
            </div>
          </div>

          {stage.homeScore !== null && (
            <span className="score-badge">{stage.homeScore}</span>
          )}
        </div>
        <div className="vs-divider">vs</div>
        <div className="team-row">
          <div className="team-name-with-flag">
            {awayFlag && (
              <img
                src={awayFlag}
                alt={`${away} flag`}
                className="country-flag"
              />
            )}

            <div className="team-details">
              <span className="team-name">{away}</span>

              {awayPlayer && (
                <small className="player-name">{awayPlayer}</small>
              )}
            </div>
          </div>

          {stage.awayScore !== null && (
            <span className="score-badge">{stage.awayScore}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="knockout-container">
      <h2>Knockout Stage</h2>

      {/* Quarter Finals */}
      {tournament.quarterfinals.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Quarter Finals</h3>
          <div className="quarterfinal-grid">
            {tournament.quarterfinals.map((match, index) =>
              renderMatchCard(match, index),
            )}
          </div>
        </div>
      )}

      {/* Semi Finals */}
      {tournament.semifinals.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Semi Finals</h3>
          <div className="bracket-grid">
            {tournament.semifinals.map((match, index) =>
              renderMatchCard(match, index),
            )}
          </div>
        </div>
      )}

      {/* Third Place */}
      {tournament.thirdPlace && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Third Place</h3>
          <div className="bracket-grid">
            {renderMatchCard(tournament.thirdPlace, 0)}
          </div>
        </div>
      )}

      {/* Final */}
      {tournament.final && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Final</h3>
          <div className="bracket-grid">
            {renderMatchCard(tournament.final, 0)}
          </div>
        </div>
      )}

      {tournament.champion && (
        <div className="podium-container">
          <h3>Tournament Results</h3>

          <div className="podium-grid">
            <div className="podium-card champion">
              <div className="podium-icon">🏆</div>
              {championFlag && (
                <img
                  src={championFlag}
                  alt={`${tournament.champion.teamName} flag`}
                  className="country-flag podium-flag"
                />
              )}
              <h4>Champion</h4>
              <div className="podium-team-details">
                <p className="podium-team-name">
                  {tournament.champion.teamName}
                </p>

                <small className="podium-player-name">
                  {tournament.champion.playerName}
                </small>
              </div>{" "}
            </div>

            <div className="podium-card runner-up">
              <div className="podium-icon">🥈</div>
              {runnerUpFlag && (
                <img
                  src={runnerUpFlag}
                  alt={`${tournament.runnerUp.teamName} flag`}
                  className="country-flag podium-flag"
                />
              )}
              <h4>Runner Up</h4>
              <div className="podium-team-details">
                <p className="podium-team-name">
                  {tournament.runnerUp.teamName}
                </p>

                <small className="podium-player-name">
                  {tournament.runnerUp.playerName}
                </small>
              </div>{" "}
            </div>

            <div className="podium-card third">
              <div className="podium-icon">🥉</div>
              {thirdPlaceFlag && (
                <img
                  src={thirdPlaceFlag}
                  alt={`${tournament.thirdPlaceWinner.teamName} flag`}
                  className="country-flag podium-flag"
                />
              )}
              <h4>Third Place</h4>
              <div className="podium-team-details">
                <p className="podium-team-name">
                  {tournament.thirdPlaceWinner.teamName}
                </p>

                <small className="podium-player-name">
                  {tournament.thirdPlaceWinner.playerName}
                </small>
              </div>{" "}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

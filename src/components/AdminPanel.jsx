import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  GROUP_LABELS,
  buildKnockoutStages,
  generateSemiFinals,
  generateFinalAndThirdPlace,
  getCountryFlagUrl,
} from "../lib/tournamentUtils";

export default function AdminPanel() {
  const [matches, setMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPlayer, setNewTeamPlayer] = useState("");
  const [newTeamGroup, setNewTeamGroup] = useState("A");
  const [submitting, setSubmitting] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState("teams");

  const [formData, setFormData] = useState({
    homeScore: 0,
    awayScore: 0,
    homeYellows: 0,
    awayYellows: 0,
    homeReds: 0,
    awayReds: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: teamsData, error: teamsError },
        { data: allMatchesData, error: allMatchesError },
        { data: scheduledMatchesData, error: scheduledMatchesError },
      ] = await Promise.all([
        supabase.from("teams").select("*").order("name", { ascending: true }),
        supabase.from("matches").select("*").order("id", { ascending: true }),
        supabase
          .from("matches")
          .select("*")
          .eq("status", "Scheduled")
          .order("id", { ascending: true }),
      ]);

      if (teamsError) throw teamsError;
      if (allMatchesError) throw allMatchesError;
      if (scheduledMatchesError) throw scheduledMatchesError;

      setTeams(teamsData || []);
      setAllMatches(allMatchesData || []);
      setMatches(scheduledMatchesData || []);
    } catch (error) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setFormData({
      homeScore: 0,
      awayScore: 0,
      homeYellows: 0,
      awayYellows: 0,
      homeReds: 0,
      awayReds: 0,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    if (teams.length >= 16) {
      alert("This tournament is limited to 16 teams.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("teams").insert({
        name: newTeamName.trim(),
        player_name: newTeamPlayer.trim(),
        group_id: newTeamGroup,
      });

      if (error) throw error;

      setNewTeamName("");
      setNewTeamPlayer("");
      await fetchData();
    } catch (error) {
      console.error("Error adding team:", error.message);
      alert("Failed to add team.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateFixtures = async () => {
    if (teams.length !== 16) {
      alert("Please add exactly 16 teams before generating fixtures.");
      return;
    }

    const groupedTeams = GROUP_LABELS.map((label) =>
      teams.filter(
        (team) => String(team.group_id || "").toUpperCase() === label,
      ),
    );
    const invalidGroups = groupedTeams.some((group) => group.length !== 4);

    if (invalidGroups) {
      alert("Each group must have exactly 4 teams before generating fixtures.");
      return;
    }

    if (allMatches.length > 0) {
      const shouldContinue = window.confirm(
        "Fixtures already exist. Do you want to regenerate them?",
      );
      if (!shouldContinue) return;
    }

    setSubmitting(true);
    try {
      const fixtures = [];
      groupedTeams.forEach((group) => {
        for (let i = 0; i < group.length; i += 1) {
          for (let j = i + 1; j < group.length; j += 1) {
            fixtures.push({
              home_team_id: group[i].id,
              away_team_id: group[j].id,
              status: "Scheduled",
              home_score: null,
              away_score: null,
            });
          }
        }
      });

      if (fixtures.length === 0) {
        throw new Error("No fixtures were generated.");
      }

      const { error } = await supabase.from("matches").insert(fixtures);
      if (error) throw error;

      await fetchData();
      alert("Fixtures generated successfully.");
    } catch (error) {
      console.error("Error generating fixtures:", error.message);
      alert("Failed to generate fixtures.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateKnockoutFixtures = async () => {
    if (teams.length !== 16) {
      alert("Please add exactly 16 teams before generating knockout fixtures.");
      return;
    }

    const completedMatches = allMatches.filter((match) => {
      const homeScoreIsSet =
        match.home_score !== null && match.home_score !== undefined;
      const awayScoreIsSet =
        match.away_score !== null && match.away_score !== undefined;
      return (
        match.status === "Completed" ||
        match.status === "Finished" ||
        (homeScoreIsSet && awayScoreIsSet)
      );
    });

    const hasAllGroupResults =
      allMatches.length >= 24 && completedMatches.length >= 24;

    if (!hasAllGroupResults) {
      alert(
        "Please finalize all group-stage matches before generating knockout fixtures.",
      );
      return;
    }

    const { quarterfinals, semifinals, final } = buildKnockoutStages(
      teams,
      allMatches,
    );
    const knockoutFixtures = [];

    quarterfinals.forEach((match) => {
      knockoutFixtures.push({
        home_team_id: match.home?.id,
        away_team_id: match.away?.id,
        status: "Scheduled",
        home_score: null,
        away_score: null,
      });
    });

    semifinals.forEach((match) => {
      knockoutFixtures.push({
        home_team_id: match.home?.id,
        away_team_id: match.away?.id,
        status: "Scheduled",
        home_score: null,
        away_score: null,
      });
    });

    if (final) {
      knockoutFixtures.push({
        home_team_id: final.home?.id,
        away_team_id: final.away?.id,
        status: "Scheduled",
        home_score: null,
        away_score: null,
      });
    }

    if (knockoutFixtures.length === 0) {
      alert("Knockout fixtures could not be generated yet.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("matches").insert(knockoutFixtures);
      if (error) throw error;

      await fetchData();
      alert("Knockout fixtures generated successfully.");
    } catch (error) {
      console.error("Error generating knockout fixtures:", error.message);
      alert("Failed to generate knockout fixtures.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateSemiFinals = async () => {
    try {
      await generateSemiFinals(supabase);
      alert("Semi Finals generated successfully.");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateFinals = async () => {
    try {
      await generateFinalAndThirdPlace(supabase);

      alert("Final and Third Place fixtures generated.");

      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;

    if (
      selectedMatch.stage !== "GROUP" &&
      formData.homeScore === formData.awayScore
    ) {
      alert("Knockout matches cannot end in a draw.");
      return;
    }

    try {
      const homeWon = formData.homeScore > formData.awayScore;

      const winnerTeamId = homeWon
        ? selectedMatch.home_team_id
        : selectedMatch.away_team_id;

      const loserTeamId = homeWon
        ? selectedMatch.away_team_id
        : selectedMatch.home_team_id;

      const { error } = await supabase
        .from("matches")
        .update({
          home_score: formData.homeScore,
          away_score: formData.awayScore,

          home_yellow_cards: formData.homeYellows,
          away_yellow_cards: formData.awayYellows,

          home_red_cards: formData.homeReds,
          away_red_cards: formData.awayReds,

          winner_team_id: winnerTeamId,
          loser_team_id: loserTeamId,

          status: "Completed",
        })
        .eq("id", selectedMatch.id);

      if (error) throw error;

      alert("Match successfully finalized!");
      setSelectedMatch(null);
      await fetchData();
    } catch (error) {
      console.error("Error updating match:", error.message);
      alert("Failed to update match. Check console.");
    }
  };

  if (loading) return <div>Loading Admin Panel...</div>;

  return (
    <div className="admin-panel">
      <h2>Tournament Admin Control</h2>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button
          className="view-toggle-btn"
          onClick={() => setActiveAdminTab("teams")}
          style={{ opacity: activeAdminTab === "teams" ? 1 : 0.7 }}
        >
          Teams
        </button>
        <button
          className="view-toggle-btn"
          onClick={() => setActiveAdminTab("fixtures")}
          style={{ opacity: activeAdminTab === "fixtures" ? 1 : 0.7 }}
        >
          Fixtures
        </button>
        <button
          className="view-toggle-btn"
          onClick={() => setActiveAdminTab("results")}
          style={{ opacity: activeAdminTab === "results" ? 1 : 0.7 }}
        >
          Results
        </button>
      </div>

      {activeAdminTab === "teams" && (
        <>
          <section style={{ marginBottom: "1.5rem" }}>
            <h3>Add Team</h3>
            <form
              onSubmit={handleAddTeam}
              style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
            >
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                required
              />
              <input
                type="text"
                value={newTeamPlayer}
                onChange={(e) => setNewTeamPlayer(e.target.value)}
                placeholder="Player / representative name"
                required
              />
              <select
                value={newTeamGroup}
                onChange={(e) => setNewTeamGroup(e.target.value)}
              >
                {GROUP_LABELS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Team"}
              </button>
            </form>
            <p>{teams.length} / 16 teams added</p>
          </section>

          <section style={{ marginBottom: "1.5rem" }}>
            <h3>Team Groups</h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {GROUP_LABELS.map((group) => (
                <div key={group}>
                  <strong>Group {group}:</strong>{" "}
                  {teams
                    .filter(
                      (team) =>
                        String(team.group_id || "").toUpperCase() === group,
                    )
                    .map((team) => {
                      const teamName = team.name || team.team_name;
                      const flagUrl = getCountryFlagUrl(teamName);
                      return (
                        <span
                          key={team.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            marginRight: "0.5rem",
                          }}
                        >
                          {flagUrl ? (
                            <img
                              src={flagUrl}
                              alt={`${teamName} flag`}
                              className="country-flag"
                            />
                          ) : null}
                          {teamName} ({team.player_name || "No player"})
                        </span>
                      );
                    })}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeAdminTab === "fixtures" && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h3>Generate Fixtures</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={handleGenerateFixtures} disabled={submitting}>
              {submitting
                ? "Generating Fixtures..."
                : "Generate Group Fixtures"}
            </button>
            <button
              onClick={handleGenerateKnockoutFixtures}
              disabled={submitting}
            >
              {submitting
                ? "Generating Knockout Fixtures..."
                : "Generate Knockout Fixtures"}
            </button>
            <button onClick={handleGenerateSemiFinals}>
              Generate Semi Finals
            </button>
            <button onClick={handleGenerateFinals}>
              Generate Final & Third Place
            </button>
          </div>
        </section>
      )}

      {activeAdminTab === "results" && (
        <>
          {!selectedMatch ? (
            <div className="match-selector">
              <h3>Select a Match to Finalize</h3>
              {matches.length === 0 ? (
                <p>No scheduled matches yet. Generate fixtures first.</p>
              ) : (
                <ul className="pending-matches-list">
                  {matches.map((m, index) => {
                    const home = teams.find(
                      (team) => team.id === m.home_team_id,
                    );
                    const away = teams.find(
                      (team) => team.id === m.away_team_id,
                    );
                    const homeName = home?.name || home?.team_name;
                    const awayName = away?.name || away?.team_name;
                    const homeFlag = getCountryFlagUrl(homeName);
                    const awayFlag = getCountryFlagUrl(awayName);

                    return (
                      <li key={m.id}>
                        <button onClick={() => handleSelectMatch(m)}>
                          Match {index + 1}:{" "}
                          {homeFlag ? (
                            <img
                              src={homeFlag}
                              alt={`${homeName} flag`}
                              className="country-flag"
                            />
                          ) : null}{" "}
                          {homeName} vs{" "}
                          {awayFlag ? (
                            <img
                              src={awayFlag}
                              alt={`${awayName} flag`}
                              className="country-flag"
                            />
                          ) : null}{" "}
                          {awayName}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="match-entry-form">
              <h3>
                Finalizing:{" "}
                {teams.find((team) => team.id === selectedMatch.home_team_id)
                  ?.name ||
                  teams.find((team) => team.id === selectedMatch.home_team_id)
                    ?.team_name}{" "}
                vs{" "}
                {teams.find((team) => team.id === selectedMatch.away_team_id)
                  ?.name ||
                  teams.find((team) => team.id === selectedMatch.away_team_id)
                    ?.team_name}
              </h3>
              <button
                className="back-btn"
                onClick={() => setSelectedMatch(null)}
              >
                ← Back to List
              </button>

              <form onSubmit={handleSubmit} className="score-form">
                <div className="team-column">
                  <h4>
                    {teams.find(
                      (team) => team.id === selectedMatch.home_team_id,
                    )?.name ||
                      teams.find(
                        (team) => team.id === selectedMatch.home_team_id,
                      )?.team_name}{" "}
                    (Home)
                  </h4>
                  <label>
                    Goals:{" "}
                    <input
                      type="number"
                      min="0"
                      name="homeScore"
                      value={formData.homeScore}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label>
                    Yellow Cards:{" "}
                    <input
                      type="number"
                      min="0"
                      name="homeYellows"
                      value={formData.homeYellows}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label>
                    Red Cards:{" "}
                    <input
                      type="number"
                      min="0"
                      name="homeReds"
                      value={formData.homeReds}
                      onChange={handleInputChange}
                    />
                  </label>
                </div>

                <div className="team-column">
                  <h4>
                    {teams.find(
                      (team) => team.id === selectedMatch.away_team_id,
                    )?.name ||
                      teams.find(
                        (team) => team.id === selectedMatch.away_team_id,
                      )?.team_name}{" "}
                    (Away)
                  </h4>
                  <label>
                    Goals:{" "}
                    <input
                      type="number"
                      min="0"
                      name="awayScore"
                      value={formData.awayScore}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label>
                    Yellow Cards:{" "}
                    <input
                      type="number"
                      min="0"
                      name="awayYellows"
                      value={formData.awayYellows}
                      onChange={handleInputChange}
                    />
                  </label>
                  <label>
                    Red Cards:{" "}
                    <input
                      type="number"
                      min="0"
                      name="awayReds"
                      value={formData.awayReds}
                      onChange={handleInputChange}
                    />
                  </label>
                </div>

                <button type="submit" className="submit-btn">
                  Finalize Match Results
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

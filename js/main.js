// Main entry point & DOM/event wiring for Quake & Landmark Radar

const LEVEL_LABELS = {
  1: "Level 1 · Global",
  2: "Level 2 · Regional",
  3: "Level 3 · Precision",
};

document.addEventListener("DOMContentLoaded", async () => {
  const mapController = createMapController("map-container");
  const gameEngine = createGameEngine();

  // DOM references
  const hudRound = document.getElementById("hud-round");
  const hudScore = document.getElementById("hud-score");
  const hudLives = document.getElementById("hud-lives");
  const difficultyBadge = document.getElementById("difficulty-badge");
  const targetCategory = document.getElementById("target-category");
  const missionPanel = document.getElementById("mission-panel");
  const missionTitle = document.getElementById("mission-title");
  const missionMeta = document.getElementById("mission-meta");
  const missionClue = document.getElementById("mission-clue");
  const feedbackBox = document.getElementById("feedback-box");
  const coordReadout = document.getElementById("coord-readout");
  const startBtn = document.getElementById("btn-start");
  const nextBtn = document.getElementById("btn-next");
  const recenterBtn = document.getElementById("btn-recenter");
  const basemapBtn = document.getElementById("btn-basemap");

  let missionCatalog = [];

  function renderLives(lives, maxLives) {
    const filled = "♥".repeat(lives);
    const empty = "♡".repeat(Math.max(0, maxLives - lives));
    hudLives.textContent = filled + empty;
    hudLives.setAttribute("aria-label", `${lives} lives remaining`);
  }

  function triggerAnimation(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function renderMission(state) {
    const mission = state.currentMission;
    if (!mission) return;

    hudRound.textContent = `${state.round} / ${state.totalRounds}`;
    hudScore.textContent = state.score.toLocaleString();
    renderLives(state.lives, state.maxLives);

    difficultyBadge.textContent = LEVEL_LABELS[mission.level] || `Level ${mission.level}`;
    targetCategory.textContent = mission.category === "seismic" ? "Seismic Zone" : "Landmark";
    missionTitle.textContent = `Target #${state.round}`;
    missionMeta.textContent = `Tolerance Radius: ${mission.maxToleranceKm} km · Region Hint Locked`;
    missionClue.textContent = mission.clue;

    feedbackBox.className = "feedback-box";
    feedbackBox.textContent = "Click on the map to lock in your coordinate guess.";

    nextBtn.classList.add("hidden");
    startBtn.classList.add("hidden");
    mapController.clearRoundOverlays();
    mapController.setCrosshairMode(true);
  }

  function handleStartGame() {
    if (missionCatalog.length === 0) return;
    const state = gameEngine.start(missionCatalog);
    mapController.resetView();
    renderMission(state);
  }

  // Event Handler 1: Map mousemove for live geographic coordinate tracking
  mapController.map.on("mousemove", (event) => {
    const { lat, lng } = event.latlng;
    coordReadout.textContent = `Lat: ${lat.toFixed(2)}°, Lon: ${lng.toFixed(2)}°`;
  });

  // Event Handler 2: Map click to submit coordinate guess and evaluate Haversine distance
  mapController.map.on("click", (event) => {
    const currentState = gameEngine.getState();
    if (currentState.phase !== "playing") return;

    const { lat, lng } = event.latlng;
    const evaluation = gameEngine.evaluateGuess(lat, lng);
    if (!evaluation) return;

    const { record, target, state } = evaluation;

    mapController.setCrosshairMode(false);
    mapController.showGuessResult(event.latlng, target, record.distanceKm, record.isHit);

    hudScore.textContent = state.score.toLocaleString();
    renderLives(state.lives, state.maxLives);
    missionTitle.textContent = target.name;
    missionMeta.textContent =
      `Actual: ${target.lat.toFixed(2)}°, ${target.lon.toFixed(2)}° · ${target.region}`;

    if (record.isHit) {
      triggerAnimation(hudScore, "score-pop");
      feedbackBox.className = "feedback-box hit";
      const streakText = record.streakBonus > 0 ? ` (+${record.streakBonus} streak!)` : "";
      feedbackBox.innerHTML =
        `<strong>Target Locked!</strong> ${record.distanceKm.toLocaleString()} km away ` +
        `(+${record.points.toLocaleString()} pts${streakText})<br/>` +
        `<span class="mission-fact">${target.fact}</span>`;
    } else {
      triggerAnimation(missionPanel, "panel-shake");
      feedbackBox.className = "feedback-box miss";
      feedbackBox.innerHTML =
        `<strong>Out of Range!</strong> ${record.distanceKm.toLocaleString()} km away ` +
        `(max ${record.maxToleranceKm} km). -1 life.<br/>` +
        `<span class="mission-fact">${target.fact}</span>`;
    }

    if (state.phase === "game_over") {
      const hits = state.results.filter((r) => r.isHit).length;
      const reason = state.lives <= 0 ? "All lives lost." : "All 10 rounds completed!";
      feedbackBox.innerHTML +=
        `<br/><br/><strong>Mission Complete:</strong> ${reason} ` +
        `Final Score: <strong>${state.score.toLocaleString()}</strong> (${hits}/${state.results.length} hits).`;

      startBtn.textContent = "Play Again";
      startBtn.classList.remove("hidden");
      nextBtn.classList.add("hidden");
    } else {
      nextBtn.classList.remove("hidden");
    }
  });

  // Event Handler 3: Start / Next / Map tool buttons
  startBtn.addEventListener("click", handleStartGame);

  nextBtn.addEventListener("click", () => {
    const state = gameEngine.nextRound();
    mapController.resetView();
    renderMission(state);
  });

  recenterBtn.addEventListener("click", () => {
    mapController.resetView();
  });

  basemapBtn.addEventListener("click", () => {
    const activeName = mapController.toggleBasemap();
    if (gameEngine.getState().phase === "idle") {
      feedbackBox.textContent = `Switched basemap to ${activeName}.`;
    }
  });

  // Load GeoJSON mission dataset
  try {
    const dataset = await loadMissionDataset();
    missionCatalog = dataset.missions;
    const seismicCount = missionCatalog.filter((m) => m.category === "seismic").length;
    const landmarkCount = missionCatalog.filter((m) => m.category === "landmark").length;

    startBtn.disabled = false;
    feedbackBox.textContent =
      `GeoJSON ready: ${missionCatalog.length} targets ` +
      `(${seismicCount} seismic, ${landmarkCount} landmarks). Press "Start Mission" to begin!`;
  } catch (error) {
    console.error(error);
    feedbackBox.textContent =
      "Could not load local GeoJSON dataset. Serve the project via a local server or GitHub Pages.";
  }
});

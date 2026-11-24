// Main entry point & DOM/event wiring for Quake & Landmark Radar

const LEVEL_LABELS = {
  1: "Level 1 · Global",
  2: "Level 2 · Regional",
  3: "Level 3 · Precision",
};

const MISSION_TIME_SECONDS = 60;

document.addEventListener("DOMContentLoaded", async () => {
  const mapController = createMapController("map-container");
  const gameEngine = createGameEngine();

  // DOM references
  const hudRound = document.getElementById("hud-round");
  const hudTimer = document.getElementById("hud-timer");
  const hudScore = document.getElementById("hud-score");
  const hudLives = document.getElementById("hud-lives");
  const hudHighScore = document.getElementById("hud-highscore");
  const timerProgressFill = document.getElementById("timer-progress-fill");
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

  function renderTimer(remainingSeconds, totalSeconds = MISSION_TIME_SECONDS) {
    hudTimer.textContent = `${remainingSeconds}s`;
    const ratio = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));
    timerProgressFill.style.width = `${ratio}%`;

    const isUrgent = remainingSeconds > 0 && remainingSeconds <= 10;
    hudTimer.classList.toggle("urgent", isUrgent);
    timerProgressFill.classList.toggle("urgent", isUrgent);
  }

  function triggerAnimation(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function renderGameOverSummary(state) {
    missionTimer.stop();
    mapController.setCrosshairMode(false);
    hudHighScore.textContent = state.highScore.toLocaleString();

    const hits = state.results.filter((r) => r.isHit).length;
    let reasonText = "All 10 rounds completed!";
    if (state.endReason === "no_lives") {
      reasonText = "All lives lost.";
    } else if (state.endReason === "timeout") {
      reasonText = "Time's up! 60-second radar window expired.";
      feedbackBox.className = "feedback-box miss";
      triggerAnimation(missionPanel, "panel-shake");
      feedbackBox.innerHTML =
        `<strong>Time Expired!</strong> ${reasonText}<br/>` +
        `Final Score: <strong>${state.score.toLocaleString()}</strong> ` +
        `(${hits}/${state.results.length} targets locked) · Best: <strong>${state.highScore.toLocaleString()}</strong>.`;
    }

    if (state.endReason !== "timeout") {
      feedbackBox.innerHTML +=
        `<br/><br/><strong>Mission Complete:</strong> ${reasonText} ` +
        `Final Score: <strong>${state.score.toLocaleString()}</strong> ` +
        `(${hits}/${state.results.length} hits) · Best: <strong>${state.highScore.toLocaleString()}</strong>.`;
    }

    startBtn.textContent = "Play Again";
    startBtn.classList.remove("hidden");
    nextBtn.classList.add("hidden");
  }

  const missionTimer = createMissionTimer(MISSION_TIME_SECONDS, {
    onTick: (remaining, total) => {
      renderTimer(remaining, total);
    },
    onExpire: () => {
      const state = gameEngine.endByTimeout();
      renderGameOverSummary(state);
    },
  });

  function renderMission(state) {
    const mission = state.currentMission;
    if (!mission) return;

    hudRound.textContent = `${state.round} / ${state.totalRounds}`;
    hudScore.textContent = state.score.toLocaleString();
    hudHighScore.textContent = state.highScore.toLocaleString();
    renderLives(state.lives, state.maxLives);

    difficultyBadge.textContent = LEVEL_LABELS[mission.level] || `Level ${mission.level}`;
    targetCategory.textContent = mission.category === "seismic" ? "Seismic Zone" : "Landmark";
    missionTitle.textContent = `Target #${state.round}`;
    missionMeta.textContent = `Tolerance Radius: ${mission.maxToleranceKm} km · Precision Bonus: +3s`;
    missionClue.textContent = mission.clue;

    feedbackBox.className = "feedback-box";
    feedbackBox.textContent = "Click on the map to lock in your coordinate guess before time runs out.";

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
    missionTimer.start();
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

    const elapsedSeconds = missionTimer.getRoundElapsedSeconds();
    missionTimer.pause();

    const { lat, lng } = event.latlng;
    const evaluation = gameEngine.evaluateGuess(lat, lng, elapsedSeconds);
    if (!evaluation) return;

    const { record, target, state } = evaluation;

    mapController.setCrosshairMode(false);
    mapController.showGuessResult(event.latlng, target, record.distanceKm, record.isHit);

    hudScore.textContent = state.score.toLocaleString();
    hudHighScore.textContent = state.highScore.toLocaleString();
    renderLives(state.lives, state.maxLives);
    missionTitle.textContent = target.name;
    missionMeta.textContent =
      `Actual: ${target.lat.toFixed(2)}°, ${target.lon.toFixed(2)}° · ${target.region}`;

    if (record.isHit) {
      triggerAnimation(hudScore, "score-pop");

      const bonuses = [];
      if (record.speedBonus > 0) bonuses.push(`+${record.speedBonus} speed`);
      if (record.streakBonus > 0) bonuses.push(`+${record.streakBonus} streak`);
      if (record.timeBonusSeconds > 0) {
        missionTimer.addBonusSeconds(record.timeBonusSeconds);
        bonuses.push(`+${record.timeBonusSeconds}s time`);
        hudTimer.classList.add("bonus-flash");
        setTimeout(() => hudTimer.classList.remove("bonus-flash"), 700);
      }
      const bonusText = bonuses.length > 0 ? ` (${bonuses.join(", ")})` : "";

      feedbackBox.className = "feedback-box hit";
      feedbackBox.innerHTML =
        `<strong>Target Locked!</strong> ${record.distanceKm.toLocaleString()} km away in ${record.elapsedSeconds}s ` +
        `(+${record.points.toLocaleString()} pts${bonusText})<br/>` +
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
      renderGameOverSummary(state);
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
    missionTimer.resume();
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

  // Initialize persisted high score and timer display
  hudHighScore.textContent = gameEngine.getState().highScore.toLocaleString();
  renderTimer(MISSION_TIME_SECONDS, MISSION_TIME_SECONDS);

  // Load GeoJSON mission dataset
  try {
    const dataset = await loadMissionDataset();
    missionCatalog = dataset.missions;
    const seismicCount = missionCatalog.filter((m) => m.category === "seismic").length;
    const landmarkCount = missionCatalog.filter((m) => m.category === "landmark").length;

    startBtn.disabled = false;
    feedbackBox.textContent =
      `GeoJSON ready: ${missionCatalog.length} targets ` +
      `(${seismicCount} seismic, ${landmarkCount} landmarks). You have ${MISSION_TIME_SECONDS}s — press "Start Mission"!`;
  } catch (error) {
    console.error(error);
    feedbackBox.textContent =
      "Could not load local GeoJSON dataset. Serve the project via a local server or GitHub Pages.";
  }
});

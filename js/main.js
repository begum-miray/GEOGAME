// Main entry point & DOM/event wiring for Deprem & Coğrafya Radarı

const LEVEL_LABELS = {
  1: "Seviye 1 · Küresel",
  2: "Seviye 2 · Bölgesel",
  3: "Seviye 3 · Hassas",
};

const MISSION_TIME_SECONDS = 60;

document.addEventListener("DOMContentLoaded", async () => {
  const mapController = createMapController("map-container");
  const gameEngine = createGameEngine();
  const analyticsController = createAnalyticsController();

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
  const roundStepper = document.getElementById("round-stepper");
  const streakPill = document.getElementById("streak-pill");
  const missionTitle = document.getElementById("mission-title");
  const missionMeta = document.getElementById("mission-meta");
  const missionClue = document.getElementById("mission-clue");
  const feedbackBox = document.getElementById("feedback-box");
  const coordReadout = document.getElementById("coord-readout");
  const helpBtn = document.getElementById("btn-help");
  const startBtn = document.getElementById("btn-start");
  const nextBtn = document.getElementById("btn-next");
  const analyticsBtn = document.getElementById("btn-analytics");
  const recenterBtn = document.getElementById("btn-recenter");
  const basemapBtn = document.getElementById("btn-basemap");

  // Welcome modal references
  const welcomeModal = document.getElementById("welcome-modal");
  const welcomeCloseBtn = document.getElementById("btn-welcome-close");
  const welcomeExploreBtn = document.getElementById("btn-welcome-explore");
  const welcomeStartBtn = document.getElementById("btn-welcome-start");

  // Analytics modal references
  const modalBackdrop = document.getElementById("analytics-modal");
  const modalCloseBtn = document.getElementById("btn-modal-close");
  const modalInspectBtn = document.getElementById("btn-modal-inspect");
  const modalReplayBtn = document.getElementById("btn-modal-replay");

  let missionCatalog = [];

  function openWelcomeModal() {
    welcomeModal.classList.remove("hidden");
    welcomeModal.setAttribute("aria-hidden", "false");
  }

  function closeWelcomeModal() {
    welcomeModal.classList.add("hidden");
    welcomeModal.setAttribute("aria-hidden", "true");
    mapController.invalidate();
  }

  function renderLives(lives, maxLives) {
    const filled = "♥".repeat(lives);
    const empty = "♡".repeat(Math.max(0, maxLives - lives));
    hudLives.textContent = filled + empty;
    hudLives.setAttribute("aria-label", `${lives} can kaldı`);
  }

  function renderRoundStepper(state) {
    const total = state.totalRounds || 10;
    roundStepper.innerHTML = "";
    for (let i = 0; i < total; i += 1) {
      const dot = document.createElement("span");
      dot.className = "step-dot";
      const result = state.results[i];
      if (result) {
        dot.classList.add(result.isHit ? "hit" : "miss");
      } else if (state.phase === "playing" && i === state.round - 1) {
        dot.classList.add("active");
      }
      roundStepper.appendChild(dot);
    }
  }

  function renderStreak(streak) {
    if (streak >= 2) {
      streakPill.textContent = `${streak}x Seri`;
      streakPill.classList.remove("hidden");
    } else {
      streakPill.classList.add("hidden");
    }
  }

  function renderTimer(remainingSeconds, totalSeconds = MISSION_TIME_SECONDS) {
    hudTimer.textContent = `${remainingSeconds} sn`;
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
    hudHighScore.textContent = state.highScore.toLocaleString("tr-TR");

    const hits = state.results.filter((r) => r.isHit).length;
    let reasonText = "10 turun tamamı tamamlandı!";
    if (state.endReason === "no_lives") {
      reasonText = "Tüm can hakların tükendi.";
    } else if (state.endReason === "timeout") {
      reasonText = "Süre doldu! 60 saniyelik radar penceresi kapandı.";
      feedbackBox.className = "feedback-box miss";
      triggerAnimation(missionPanel, "panel-shake");
      feedbackBox.innerHTML =
        `<strong>Süre Doldu!</strong> ${reasonText}<br/>` +
        `Toplam Puan: <strong>${state.score.toLocaleString("tr-TR")}</strong> ` +
        `(${hits}/${state.results.length} isabet) · Rekor: <strong>${state.highScore.toLocaleString("tr-TR")}</strong>.`;
    }

    if (state.endReason !== "timeout") {
      feedbackBox.innerHTML +=
        `<br/><br/><strong>Görev Tamamlandı:</strong> ${reasonText} ` +
        `Toplam Puan: <strong>${state.score.toLocaleString("tr-TR")}</strong> ` +
        `(${hits}/${state.results.length} isabet) · Rekor: <strong>${state.highScore.toLocaleString("tr-TR")}</strong>.`;
    }

    startBtn.textContent = "Tekrar Oyna";
    startBtn.classList.remove("hidden");
    analyticsBtn.classList.remove("hidden");
    nextBtn.classList.add("hidden");

    analyticsController.open(state);
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
    hudScore.textContent = state.score.toLocaleString("tr-TR");
    hudHighScore.textContent = state.highScore.toLocaleString("tr-TR");
    renderLives(state.lives, state.maxLives);
    renderRoundStepper(state);
    renderStreak(state.streak);

    difficultyBadge.textContent = LEVEL_LABELS[mission.level] || `Seviye ${mission.level}`;
    targetCategory.textContent = mission.category === "seismic" ? "Sismik Bölge" : "Coğrafi Nokta";
    missionTitle.textContent = `Hedef #${state.round}`;
    missionMeta.textContent = `Bölge: ${mission.region} · Tolerans: ${mission.maxToleranceKm} km`;
    missionClue.textContent = mission.clue;

    feedbackBox.className = "feedback-box";
    feedbackBox.textContent = "Süre dolmadan haritada tahmin ettiğin noktaya tıkla.";

    nextBtn.classList.add("hidden");
    startBtn.classList.add("hidden");
    analyticsBtn.classList.add("hidden");
    mapController.clearRoundOverlays();
    mapController.setCrosshairMode(true);
  }

  function handleStartGame() {
    if (missionCatalog.length === 0) return;
    closeWelcomeModal();
    analyticsController.close();
    const state = gameEngine.start(missionCatalog);
    mapController.resetView();
    renderMission(state);
    missionTimer.start();
  }

  // Event Handler 1: Map mousemove for live geographic coordinate tracking
  mapController.map.on("mousemove", (event) => {
    const { lat, lng } = event.latlng;
    coordReadout.textContent = `Enlem: ${lat.toFixed(2)}°, Boylam: ${lng.toFixed(2)}°`;
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

    hudScore.textContent = state.score.toLocaleString("tr-TR");
    hudHighScore.textContent = state.highScore.toLocaleString("tr-TR");
    renderLives(state.lives, state.maxLives);
    renderRoundStepper(state);
    renderStreak(state.streak);
    missionTitle.textContent = target.name;
    missionMeta.textContent =
      `Gerçek Konum: ${target.lat.toFixed(2)}°, ${target.lon.toFixed(2)}° · ${target.region}`;

    if (record.isHit) {
      triggerAnimation(hudScore, "score-pop");

      const bonuses = [];
      if (record.speedBonus > 0) bonuses.push(`+${record.speedBonus} hız`);
      if (record.streakBonus > 0) bonuses.push(`+${record.streakBonus} seri`);
      if (record.timeBonusSeconds > 0) {
        missionTimer.addBonusSeconds(record.timeBonusSeconds);
        bonuses.push(`+${record.timeBonusSeconds} sn süre`);
        hudTimer.classList.add("bonus-flash");
        setTimeout(() => hudTimer.classList.remove("bonus-flash"), 700);
      }
      const bonusText = bonuses.length > 0 ? ` (${bonuses.join(", ")})` : "";

      feedbackBox.className = "feedback-box hit";
      feedbackBox.innerHTML =
        `<strong>Hedef Kilitlendi!</strong> ${record.distanceKm.toLocaleString("tr-TR")} km sapma · ${record.elapsedSeconds} sn ` +
        `(+${record.points.toLocaleString("tr-TR")} puan${bonusText})<br/>` +
        `<span class="mission-fact">${target.fact}</span>`;
    } else {
      triggerAnimation(missionPanel, "panel-shake");
      feedbackBox.className = "feedback-box miss";
      feedbackBox.innerHTML =
        `<strong>Menzil Dışı!</strong> ${record.distanceKm.toLocaleString("tr-TR")} km sapma ` +
        `(maks. ${record.maxToleranceKm} km). -1 can.<br/>` +
        `<span class="mission-fact">${target.fact}</span>`;
    }

    if (state.phase === "game_over") {
      renderGameOverSummary(state);
    } else {
      nextBtn.classList.remove("hidden");
    }
  });

  // Event Handler 3: Buttons, welcome guide & keyboard shortcuts
  helpBtn.addEventListener("click", openWelcomeModal);
  welcomeCloseBtn.addEventListener("click", closeWelcomeModal);
  welcomeExploreBtn.addEventListener("click", closeWelcomeModal);
  welcomeStartBtn.addEventListener("click", handleStartGame);
  welcomeModal.addEventListener("click", (event) => {
    if (event.target === welcomeModal) {
      closeWelcomeModal();
    }
  });

  startBtn.addEventListener("click", handleStartGame);

  nextBtn.addEventListener("click", () => {
    const state = gameEngine.nextRound();
    mapController.resetView();
    renderMission(state);
    missionTimer.resume();
  });

  analyticsBtn.addEventListener("click", () => {
    analyticsController.open(gameEngine.getState());
  });

  modalCloseBtn.addEventListener("click", analyticsController.close);
  modalInspectBtn.addEventListener("click", analyticsController.close);
  modalReplayBtn.addEventListener("click", handleStartGame);

  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      analyticsController.close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!welcomeModal.classList.contains("hidden")) {
        closeWelcomeModal();
        return;
      }
      if (!modalBackdrop.classList.contains("hidden")) {
        analyticsController.close();
        return;
      }
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      !nextBtn.classList.contains("hidden") &&
      modalBackdrop.classList.contains("hidden") &&
      welcomeModal.classList.contains("hidden")
    ) {
      event.preventDefault();
      nextBtn.click();
    }
  });

  recenterBtn.addEventListener("click", () => {
    mapController.resetView();
  });

  basemapBtn.addEventListener("click", () => {
    const activeName = mapController.toggleBasemap();
    if (gameEngine.getState().phase === "idle") {
      feedbackBox.textContent = `Harita altlığı değiştirildi: ${activeName}`;
    }
  });

  // Initialize persisted high score, round stepper, and timer display
  const initialState = gameEngine.getState();
  hudHighScore.textContent = initialState.highScore.toLocaleString("tr-TR");
  renderRoundStepper(initialState);
  renderTimer(MISSION_TIME_SECONDS, MISSION_TIME_SECONDS);

  // Load GeoJSON mission dataset
  try {
    const dataset = await loadMissionDataset();
    missionCatalog = dataset.missions;
    const seismicCount = missionCatalog.filter((m) => m.category === "seismic").length;
    const landmarkCount = missionCatalog.filter((m) => m.category === "landmark").length;

    startBtn.disabled = false;
    welcomeStartBtn.disabled = false;
    feedbackBox.textContent =
      `GeoJSON hazır: ${missionCatalog.length} hedef ` +
      `(${seismicCount} sismik bölge, ${landmarkCount} coğrafi nokta). ${MISSION_TIME_SECONDS} saniyen var — "Oyuna Başla"ya tıkla!`;

    if (new URLSearchParams(window.location.search).has("play")) {
      handleStartGame();
    }
  } catch (error) {
    console.error(error);
    feedbackBox.textContent =
      "GeoJSON veri seti yüklenemedi. Projeyi yerel bir sunucu veya GitHub Pages üzerinden açın.";
  }
});

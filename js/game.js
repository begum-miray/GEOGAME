// Core game engine with Haversine spatial distance, scoring, and localStorage high score

const EARTH_RADIUS_KM = 6371;
const INITIAL_LIVES = 4;
const HIGH_SCORE_KEY = "geogame_quake_radar_highscore";

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function loadHighScore() {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Ignore storage errors in restricted browser contexts
  }
}

function createGameEngine() {
  // Private game state encapsulated via closure
  let deck = [];
  let currentIndex = -1;
  let score = 0;
  let highScore = loadHighScore();
  let lives = INITIAL_LIVES;
  let streak = 0;
  let phase = "idle"; // "idle" | "playing" | "round_end" | "game_over"
  let endReason = null; // "completed" | "no_lives" | "timeout"
  let roundResults = [];

  function syncHighScore() {
    if (score > highScore) {
      highScore = score;
      saveHighScore(highScore);
      return true;
    }
    return false;
  }

  function getSnapshot() {
    return {
      phase,
      endReason,
      round: currentIndex + 1,
      totalRounds: deck.length,
      score,
      highScore,
      lives,
      maxLives: INITIAL_LIVES,
      streak,
      currentMission: deck[currentIndex] || null,
      results: [...roundResults],
    };
  }

  function start(missions) {
    deck = buildMissionDeck(missions, { 1: 4, 2: 3, 3: 3 });
    currentIndex = 0;
    score = 0;
    lives = INITIAL_LIVES;
    streak = 0;
    endReason = null;
    roundResults = [];
    phase = deck.length > 0 ? "playing" : "idle";
    return getSnapshot();
  }

  function evaluateGuess(guessLat, guessLon, elapsedSeconds = 10) {
    if (phase !== "playing" || !deck[currentIndex]) {
      return null;
    }

    const target = deck[currentIndex];
    const distanceKm = calculateHaversineKm(
      guessLat,
      guessLon,
      target.lat,
      target.lon
    );
    const isHit = distanceKm <= target.maxToleranceKm;

    let pointsEarned = 0;
    let streakBonus = 0;
    let speedBonus = 0;
    let timeBonusSeconds = 0;

    if (isHit) {
      streak += 1;
      const accuracyRatio = Math.max(
        0.15,
        1 - distanceKm / (target.maxToleranceKm * 1.15)
      );
      const basePoints = Math.round(1000 * accuracyRatio);
      streakBonus = streak > 1 ? (streak - 1) * 100 : 0;

      if (elapsedSeconds <= 5) {
        speedBonus = 150;
      } else if (elapsedSeconds <= 9) {
        speedBonus = 75;
      }

      if (distanceKm <= target.maxToleranceKm * 0.35) {
        timeBonusSeconds = 3;
      }

      pointsEarned = basePoints + streakBonus + speedBonus;
      score += pointsEarned;
    } else {
      streak = 0;
      lives = Math.max(0, lives - 1);
    }

    const isNewHighScore = syncHighScore();

    const roundRecord = {
      round: currentIndex + 1,
      id: target.id,
      name: target.name,
      category: target.category,
      level: target.level,
      distanceKm: Math.round(distanceKm),
      maxToleranceKm: target.maxToleranceKm,
      elapsedSeconds: Number(elapsedSeconds.toFixed(1)),
      points: pointsEarned,
      streakBonus,
      speedBonus,
      timeBonusSeconds,
      isHit,
    };

    roundResults.push(roundRecord);

    const isLastRound = currentIndex >= deck.length - 1;
    if (lives <= 0) {
      phase = "game_over";
      endReason = "no_lives";
    } else if (isLastRound) {
      phase = "game_over";
      endReason = "completed";
    } else {
      phase = "round_end";
    }

    return {
      record: roundRecord,
      target,
      isNewHighScore,
      state: getSnapshot(),
    };
  }

  function nextRound() {
    if (phase !== "round_end") {
      return getSnapshot();
    }

    currentIndex += 1;
    phase = "playing";
    return getSnapshot();
  }

  function endByTimeout() {
    if (phase === "idle" || phase === "game_over") {
      return getSnapshot();
    }
    phase = "game_over";
    endReason = "timeout";
    syncHighScore();
    return getSnapshot();
  }

  return {
    start,
    evaluateGuess,
    nextRound,
    endByTimeout,
    getState: getSnapshot,
    getResults: () => [...roundResults],
  };
}

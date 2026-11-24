// Core game engine with Haversine spatial distance and closure-encapsulated state

const EARTH_RADIUS_KM = 6371;
const INITIAL_LIVES = 3;

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

function createGameEngine() {
  // Private game state encapsulated via closure
  let deck = [];
  let currentIndex = -1;
  let score = 0;
  let lives = INITIAL_LIVES;
  let streak = 0;
  let phase = "idle"; // "idle" | "playing" | "round_end" | "game_over"
  let roundResults = [];

  function getSnapshot() {
    return {
      phase,
      round: currentIndex + 1,
      totalRounds: deck.length,
      score,
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
    roundResults = [];
    phase = deck.length > 0 ? "playing" : "idle";
    return getSnapshot();
  }

  function evaluateGuess(guessLat, guessLon) {
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

    if (isHit) {
      streak += 1;
      const accuracyRatio = Math.max(0.15, 1 - distanceKm / (target.maxToleranceKm * 1.15));
      const basePoints = Math.round(1000 * accuracyRatio);
      streakBonus = streak > 1 ? (streak - 1) * 100 : 0;
      pointsEarned = basePoints + streakBonus;
      score += pointsEarned;
    } else {
      streak = 0;
      lives = Math.max(0, lives - 1);
    }

    const roundRecord = {
      round: currentIndex + 1,
      id: target.id,
      name: target.name,
      category: target.category,
      level: target.level,
      distanceKm: Math.round(distanceKm),
      maxToleranceKm: target.maxToleranceKm,
      points: pointsEarned,
      streakBonus,
      isHit,
    };

    roundResults.push(roundRecord);

    const isLastRound = currentIndex >= deck.length - 1;
    phase = lives <= 0 || isLastRound ? "game_over" : "round_end";

    return {
      record: roundRecord,
      target,
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

  return {
    start,
    evaluateGuess,
    nextRound,
    getState: getSnapshot,
    getResults: () => [...roundResults],
  };
}

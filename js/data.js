// Open GeoJSON dataset loader and progressive mission deck builder

const DATASET_URL = "data/missions.geojson?v=3";

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadMissionDataset() {
  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Failed to load GeoJSON dataset (HTTP ${response.status})`);
  }

  const geojson = await response.json();
  if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    throw new Error("Invalid GeoJSON structure: expected a FeatureCollection.");
  }

  const missions = geojson.features.map((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    return {
      ...feature.properties,
      lat,
      lon,
    };
  });

  return {
    metadata: geojson.metadata || {},
    missions,
  };
}

function buildMissionDeck(missions, roundsPerLevel = { 1: 4, 2: 3, 3: 3 }) {
  const levels = [1, 2, 3];
  const deck = [];

  levels.forEach((level) => {
    const pool = missions.filter((m) => m.level === level);
    const count = roundsPerLevel[level] || 0;
    deck.push(...shuffleArray(pool).slice(0, count));
  });

  return deck;
}

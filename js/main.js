// Main entry point for Quake & Landmark Radar

document.addEventListener("DOMContentLoaded", async () => {
  const mapController = createMapController("map-container");
  const coordReadout = document.getElementById("coord-readout");
  const feedbackBox = document.getElementById("feedback-box");
  const recenterBtn = document.getElementById("btn-recenter");
  const basemapBtn = document.getElementById("btn-basemap");

  let missionCatalog = [];

  // Update live cursor coordinate readout
  mapController.map.on("mousemove", (event) => {
    const { lat, lng } = event.latlng;
    coordReadout.textContent = `Lat: ${lat.toFixed(2)}°, Lon: ${lng.toFixed(2)}°`;
  });

  // Reset map to default global view
  recenterBtn.addEventListener("click", () => {
    mapController.resetView();
    feedbackBox.textContent = "Map view reset to global radar overview.";
  });

  // Switch between Dark Radar and Voyager Light basemaps
  basemapBtn.addEventListener("click", () => {
    const activeName = mapController.toggleBasemap();
    feedbackBox.textContent = `Switched basemap to ${activeName}.`;
  });

  // Load GeoJSON mission dataset
  try {
    const dataset = await loadMissionDataset();
    missionCatalog = dataset.missions;
    const seismicCount = missionCatalog.filter((m) => m.category === "seismic").length;
    const landmarkCount = missionCatalog.filter((m) => m.category === "landmark").length;

    feedbackBox.textContent =
      `GeoJSON dataset loaded: ${missionCatalog.length} targets ` +
      `(${seismicCount} seismic zones, ${landmarkCount} landmarks) across 3 difficulty levels.`;
  } catch (error) {
    console.error(error);
    feedbackBox.textContent =
      "Could not load local GeoJSON dataset. Serve the project via a local server or GitHub Pages.";
  }
});

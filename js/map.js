// Leaflet map setup and basemap management for Quake & Landmark Radar

const DEFAULT_VIEW = {
  center: [20, 15],
  zoom: 2,
};

const BASEMAPS = {
  dark: {
    name: "Dark Radar",
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  voyager: {
    name: "Voyager Light",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
};

function createMapController(containerId) {
  const map = L.map(containerId, {
    center: DEFAULT_VIEW.center,
    zoom: DEFAULT_VIEW.zoom,
    minZoom: 2,
    maxZoom: 12,
    worldCopyJump: true,
  });

  let activeBasemapKey = "dark";
  let tileLayer = L.tileLayer(BASEMAPS[activeBasemapKey].url, {
    attribution: BASEMAPS[activeBasemapKey].attribution,
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);

  function resetView() {
    map.flyTo(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom, { duration: 0.75 });
  }

  function toggleBasemap() {
    map.removeLayer(tileLayer);
    activeBasemapKey = activeBasemapKey === "dark" ? "voyager" : "dark";
    const nextConfig = BASEMAPS[activeBasemapKey];
    tileLayer = L.tileLayer(nextConfig.url, {
      attribution: nextConfig.attribution,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    return nextConfig.name;
  }

  return {
    map,
    resetView,
    toggleBasemap,
  };
}

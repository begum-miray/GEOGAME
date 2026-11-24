// Leaflet map setup, basemap management, and animated radar overlays

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

function createRadarIcon(variant) {
  return L.divIcon({
    className: "radar-marker-wrapper",
    html:
      `<div class="radar-pin ${variant}">` +
      `<span class="radar-ring ring-1"></span>` +
      `<span class="radar-ring ring-2"></span>` +
      `<span class="radar-core"></span>` +
      `</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createMapController(containerId) {
  const containerEl = document.getElementById(containerId);
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

  const roundLayer = L.layerGroup().addTo(map);

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

  function clearRoundOverlays() {
    roundLayer.clearLayers();
  }

  function setCrosshairMode(active) {
    if (!containerEl) return;
    containerEl.classList.toggle("crosshair-active", active);
  }

  function showGuessResult(guessLatLng, target, distanceKm, isHit) {
    clearRoundOverlays();

    const targetLatLng = L.latLng(target.lat, target.lon);
    const lineColor = isHit ? "#22c55e" : "#f97316";

    // Target tolerance zone
    L.circle(targetLatLng, {
      radius: target.maxToleranceKm * 1000,
      color: isHit ? "#22c55e" : "#38bdf8",
      weight: 1.5,
      dashArray: "6 6",
      fillColor: isHit ? "#22c55e" : "#38bdf8",
      fillOpacity: 0.12,
    }).addTo(roundLayer);

    // Animated dashed line connecting guess and target
    const connector = L.polyline([guessLatLng, targetLatLng], {
      color: lineColor,
      weight: 2.5,
      dashArray: "8 8",
      className: "animated-guess-line",
    }).addTo(roundLayer);

    connector
      .bindTooltip(`${Math.round(distanceKm).toLocaleString()} km`, {
        permanent: true,
        direction: "center",
        className: "distance-tooltip",
      })
      .openTooltip();

    // Animated pulse markers for guess and true location
    L.marker(guessLatLng, {
      icon: createRadarIcon("guess-pin"),
      interactive: false,
    }).addTo(roundLayer);

    L.marker(targetLatLng, {
      icon: createRadarIcon(isHit ? "target-pin hit-pin" : "target-pin"),
    })
      .bindPopup(
        `<strong>${target.name}</strong><br/>` +
          `Lat: ${target.lat.toFixed(2)}°, Lon: ${target.lon.toFixed(2)}°<br/>` +
          `Distance: ${Math.round(distanceKm).toLocaleString()} km`
      )
      .addTo(roundLayer);

    // Smooth camera focus covering both guess and target
    const bounds = L.latLngBounds([guessLatLng, targetLatLng]);
    map.flyToBounds(bounds, {
      padding: [70, 70],
      maxZoom: 6,
      duration: 0.9,
    });
  }

  return {
    map,
    resetView,
    toggleBasemap,
    clearRoundOverlays,
    setCrosshairMode,
    showGuessResult,
  };
}

// Leaflet map setup, reliable light basemaps with automatic fallback, and animated radar overlays

const DEFAULT_VIEW = {
  center: [25, 18],
  zoom: 2,
};

const BASEMAPS = {
  positron: {
    name: "Beyaz Harita (Etiketsiz)",
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap katkıcıları &copy; CARTO",
    subdomains: "abcd",
  },
  voyager: {
    name: "Açık Renkli Harita (Etiketsiz)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap katkıcıları &copy; CARTO",
    subdomains: "abcd",
  },
  osm: {
    name: "OpenStreetMap Standart",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap katkıcıları",
    subdomains: "",
  },
};

const BASEMAP_ORDER = ["positron", "voyager", "osm"];

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

  let activeIndex = 0;
  let tileLayer = null;
  let fallbackTriggered = false;

  function mountBasemap(key) {
    if (tileLayer) {
      map.removeLayer(tileLayer);
    }

    const cfg = BASEMAPS[key];
    const options = {
      attribution: cfg.attribution,
      maxZoom: 18,
    };
    if (cfg.subdomains) {
      options.subdomains = cfg.subdomains;
    }

    tileLayer = L.tileLayer(cfg.url, options);

    // Automatic fallback if primary tile server fails to load
    tileLayer.on("tileerror", () => {
      if (!fallbackTriggered && key === "positron") {
        fallbackTriggered = true;
        activeIndex = BASEMAP_ORDER.indexOf("osm");
        mountBasemap("osm");
      }
    });

    tileLayer.addTo(map);
    return cfg.name;
  }

  mountBasemap(BASEMAP_ORDER[activeIndex]);

  const roundLayer = L.layerGroup().addTo(map);

  L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);

  // Ensure Leaflet computes exact viewport dimensions after layout paint
  requestAnimationFrame(() => map.invalidateSize());
  window.addEventListener("resize", () => map.invalidateSize());

  function invalidate() {
    setTimeout(() => map.invalidateSize(), 60);
  }

  function resetView() {
    map.flyTo(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom, { duration: 0.75 });
  }

  function toggleBasemap() {
    activeIndex = (activeIndex + 1) % BASEMAP_ORDER.length;
    return mountBasemap(BASEMAP_ORDER[activeIndex]);
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
    const lineColor = isHit ? "#16a34a" : "#ea580c";

    // Target tolerance zone
    L.circle(targetLatLng, {
      radius: target.maxToleranceKm * 1000,
      color: isHit ? "#16a34a" : "#0284c7",
      weight: 2,
      dashArray: "6 6",
      fillColor: isHit ? "#22c55e" : "#38bdf8",
      fillOpacity: 0.16,
    }).addTo(roundLayer);

    // Animated dashed line connecting guess and target
    const connector = L.polyline([guessLatLng, targetLatLng], {
      color: lineColor,
      weight: 3,
      dashArray: "8 8",
      className: "animated-guess-line",
    }).addTo(roundLayer);

    connector
      .bindTooltip(`${Math.round(distanceKm).toLocaleString("tr-TR")} km`, {
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
          `Enlem: ${target.lat.toFixed(2)}°, Boylam: ${target.lon.toFixed(2)}°<br/>` +
          `Sapma: ${Math.round(distanceKm).toLocaleString("tr-TR")} km`
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
    invalidate,
    resetView,
    toggleBasemap,
    clearRoundOverlays,
    setCrosshairMode,
    showGuessResult,
  };
}

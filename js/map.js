// Leaflet map setup centered on Turkey with reliable light basemaps and fun animations

const TURKEY_VIEW = {
  center: [39.05, 35.25],
  zoom: 6,
};

const TURKEY_BOUNDS = [
  [34.2, 24.5],
  [43.5, 46.2],
];

const BASEMAPS = {
  lightGray: {
    name: "Beyaz Harita (Etiketsiz)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    subdomains: "",
  },
  physical: {
    name: "Fiziki Rölyef (Etiketsiz)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    subdomains: "",
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap katkıcıları",
    subdomains: "",
  },
};

const BASEMAP_ORDER = ["lightGray", "physical", "osm"];

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
    center: TURKEY_VIEW.center,
    zoom: TURKEY_VIEW.zoom,
    minZoom: 5,
    maxZoom: 12,
    maxBounds: TURKEY_BOUNDS,
    maxBoundsViscosity: 0.75,
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

    tileLayer.on("tileerror", () => {
      if (!fallbackTriggered && key === "lightGray") {
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

  requestAnimationFrame(() => map.invalidateSize());
  window.addEventListener("resize", () => map.invalidateSize());

  function invalidate() {
    setTimeout(() => map.invalidateSize(), 60);
  }

  function resetView() {
    map.flyTo(TURKEY_VIEW.center, TURKEY_VIEW.zoom, { duration: 0.7 });
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
    const lineColor = isHit ? "#16a34a" : "#f97316";

    L.circle(targetLatLng, {
      radius: target.maxToleranceKm * 1000,
      color: isHit ? "#16a34a" : "#2563eb",
      weight: 2,
      dashArray: "6 6",
      fillColor: isHit ? "#22c55e" : "#60a5fa",
      fillOpacity: 0.16,
    }).addTo(roundLayer);

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
          `Mesafe: ${Math.round(distanceKm).toLocaleString("tr-TR")} km`
      )
      .addTo(roundLayer);

    const bounds = L.latLngBounds([guessLatLng, targetLatLng]);
    map.flyToBounds(bounds, {
      padding: [80, 80],
      maxZoom: 8,
      duration: 0.85,
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

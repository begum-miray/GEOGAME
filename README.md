# Quake & Landmark Radar — GMT 458 Web GIS GeoGame

**Live Application (GitHub Pages):** https://begum-miray.github.io/GEOGAME/  
**Repository:** https://github.com/begum-miray/GEOGAME

---

## 1. Game Description & Functional Requirements

**Quake & Landmark Radar** is an interactive, browser-based Web GIS coordinate-guessing game built with HTML5, CSS3, and vanilla JavaScript. Players act as spatial analysts who must read geographic and tectonic clues and pinpoint major seismic zones (fault lines, subduction trenches, volcanic arcs) and iconic world landmarks directly on a label-free world map before a 60-second radar window expires.

### Functional Requirements
- **FR-1 (Interactive Web Map):** Render a responsive, pan/zoom Leaflet map using label-free basemaps (`CartoDB Dark Radar` and `Voyager Light`) with a metric scale bar and live cursor coordinate (`Lat / Lon`) tracking.
- **FR-2 (Open GeoJSON Mission Loading):** Load target locations asynchronously from a local RFC 7946 GeoJSON `FeatureCollection` (`data/missions.geojson`) containing coordinates, spatial clues, tolerance radii, and educational facts.
- **FR-3 (Progressive Difficulty):** Organize missions into 3 escalating difficulty levels (Level 1 Global → Level 2 Regional → Level 3 Precision) with progressively stricter spatial tolerance radii.
- **FR-4 (Spatial Distance Calculation):** Compute the great-circle distance in kilometers between the player's clicked map coordinates and the actual GeoJSON target using the **Haversine formula**.
- **FR-5 (Visual & Radar Animations):** Display animated radar pulse markers, target tolerance circles, flowing dashed distance polylines with km tooltips, and smooth `flyToBounds` camera framing after each guess.
- **FR-6 (Temporal Pressure & Bonuses):** Enforce a 60-second countdown timer with a live progress bar, speed point bonuses, `+3s` precision time bonuses, and an urgent visual pulse during the final 10 seconds.
- **FR-7 (Lives, Scoring & Persistence):** Track 3 player lives (`♥♥♥`), consecutive hit streaks, cumulative score, and persistent high score via browser `localStorage`.
- **FR-8 (Post-Game Spatial Analytics):** Present an interactive **Chart.js** dual-axis debrief modal visualizing per-round Haversine error distance (km) alongside points earned.

---

## 2. Frontend Layout Sketch

The interface uses a dark-radar GIS layout consisting of a top HUD status bar, a real-time temporal progress strip, a left mission briefing & feedback panel, and a full-height interactive Leaflet canvas:

![Quake and Landmark Radar Frontend Layout Sketch](assets/images/layout-sketch.svg)

---

## 3. Game Progression, Rules & Mechanics

### Difficulty Progression
Each game session builds a shuffled 10-round deck from 15 curated GeoJSON targets, progressing from broad global recognition to high-precision spatial targeting:

| Difficulty Tier | Rounds | Category Mix | Spatial Tolerance Radius |
| :--- | :---: | :--- | :---: |
| **Level 1 · Global** | 4 | Iconic landmarks & major fault zones | **900 km** |
| **Level 2 · Regional** | 3 | Tectonic boundaries, straits & mountain belts | **550 km** |
| **Level 3 · Precision** | 3 | Subduction zones, rift systems & micro-regions | **300 km** |

### Number of Tasks & Lives
- **Tasks per Game:** **10 rounds** (selected dynamically via Fisher–Yates shuffle per level from `data/missions.geojson`).
- **Lives:** **3 lives (`♥♥♥`)**. If a player's clicked coordinate falls outside the target's `maxToleranceKm` radius, 1 life is deducted and the active hit streak resets to `0`. Losing all 3 lives ends the mission immediately.

### Scoring & High-Score Mechanisms
When a guess lands within the target's tolerance radius (`distanceKm <= maxToleranceKm`), the player earns:
1. **Proximity Base Score (up to 1,000 pts):** Scaled inversely by Haversine error distance relative to the target's tolerance radius.
2. **Consecutive Streak Bonus:** `+100 × (streak - 1)` extra points for consecutive accurate hits.
3. **Speed Bonus:** `+150 pts` for answers submitted within `5s`, or `+75 pts` within `9s`.
4. **High-Score Persistence:** The best score is stored in `window.localStorage` under the key `geogame_quake_radar_highscore` and restored automatically across browser sessions.

### Temporal Component & Gameplay Impact
- Players operate within a **60-second** total countdown clock (`js/timer.js`), visualized both numerically in the HUD (`Time`) and as a continuous shrinking progress bar beneath the header.
- The timer **pauses** between rounds while the player inspects the Haversine distance line and reads the geographic fact, then **resumes** immediately upon clicking `Next Target →`.
- **Precision Time Bonus (`+3s`):** Pinpointing a target within the innermost **35%** of its tolerance radius awards `+3` bonus seconds (capped at 60s), rewarding both geographic accuracy and quick decision-making.
- During the final **10 seconds**, the HUD timer and progress bar switch to an urgent pulsing red warning state (`@keyframes timerUrgent`). If time reaches `0s`, `endByTimeout()` terminates the run and opens the analytics debrief.

---

## 4. JavaScript Libraries & Open Datasets

### JavaScript Libraries
- **[Leaflet.js 1.9.4](https://leafletjs.com/):** Core Web GIS mapping engine used for tile layers, custom animated `L.divIcon` radar markers, `L.circle` tolerance zones, `L.polyline` distance vectors, tooltips, metric scale controls, and `flyToBounds` camera transitions.
- **[Chart.js 4.4.3](https://www.chartjs.org/) *(Bonus Geovisualisation & Analytics)*:** Used in `js/analytics.js` to render an interactive dual-axis bar/line combo chart comparing per-round spatial error (km) against points earned, with custom hover tooltips displaying target metadata, tolerance, and response time.

### Openly Available Datasets
- **Curated GeoJSON Mission Dataset (`data/missions.geojson`):** RFC 7946 `FeatureCollection` containing 15 real-world `[longitude, latitude]` point features compiled from open geographic repositories:
  - **USGS Earthquake Hazards Program** (historic megathrust, transform, and rift seismic zones)
  - **UNESCO World Heritage Centre** (open site coordinates and geological heritage landmarks)
  - **Natural Earth** (open physical geography reference points)
- **CartoDB & OpenStreetMap Basemaps:** Label-free `dark_nolabels` and `voyager_nolabels` raster tile layers so place names do not spoil gameplay.

---

## 5. Implementation Details

### Three Key Event Handlers
1. **Live Coordinate Tracking (`map.on("mousemove", ...)` in `js/main.js`):** Listens to Leaflet pointer movement across the map canvas and continuously updates `#coord-readout` with formatted geographic coordinates (`Lat` / `Lon` to 2 decimal places).
2. **Spatial Guess Submission (`map.on("click", ...)` in `js/main.js`):** Captures the clicked `event.latlng`, pauses the mission timer, invokes `gameEngine.evaluateGuess(lat, lng, elapsedSeconds)` to calculate Haversine distance and bonuses, renders animated radar overlays on the map, and updates HUD/feedback elements.
3. **Game Flow & Modal Controls (`addEventListener("click" / "keydown", ...)` in `js/main.js`):** Manages mission lifecycle buttons (`#btn-start`, `#btn-next`, `#btn-analytics`, `#btn-recenter`, `#btn-basemap`), modal backdrop click dismissal, and the `Escape` keyboard shortcut.

### Use of Closures
Closures are used across four modular controllers to encapsulate private mutable state and prevent unintended global variable mutations:
- **`createGameEngine()` (`js/game.js`):** Encapsulates `deck`, `currentIndex`, `score`, `highScore`, `lives`, `streak`, `phase`, and `roundResults`, exposing only controlled methods (`start`, `evaluateGuess`, `nextRound`, `endByTimeout`, `getState`).
- **`createMissionTimer()` (`js/timer.js`):** Encapsulates `remainingSeconds`, `intervalId`, and `roundStartedAt`, guaranteeing single-interval cleanup and safe pause/resume timing.
- **`createMapController()` (`js/map.js`):** Encapsulates the Leaflet `map` instance, active `tileLayer`, `activeBasemapKey`, and `roundLayer` group.
- **`createAnalyticsController()` (`js/analytics.js`):** Encapsulates the active Chart.js `chartInstance` so previous chart instances are cleanly destroyed before re-rendering on replay.

### DOM Interaction
- **Dynamic HUD & Accessibility Updates:** Updates text content and `aria-label` attributes for `#hud-round`, `#hud-timer`, `#hud-score`, `#hud-lives`, and `#hud-highscore`, plus inline width styling on `#timer-progress-fill`.
- **Animation & State Class Toggling:** Dynamically toggles CSS classes (`crosshair-active`, `hit`, `miss`, `urgent`, `bonus-flash`, `hidden`) and forces reflow (`void element.offsetWidth`) to cleanly replay `score-pop` and `panel-shake` keyframe animations.
- **Dynamic Feedback & Modal Rendering:** Injects structured round feedback and geographic facts into `#feedback-box`, updates KPI stat cards inside `#analytics-modal`, and renders the interactive Chart.js graph onto `#performance-chart`.

---

## 6. Project Structure

```text
GEOGAME/
├── index.html                    # Main HTML5 entry point (GitHub Pages ready)
├── css/
│   └── style.css                 # Dark radar theme, responsive layout & keyframe animations
├── js/
│   ├── data.js                   # Async GeoJSON loader & progressive deck shuffler
│   ├── game.js                   # Closure-based game engine, Haversine math & localStorage
│   ├── timer.js                  # Closure-based 60s countdown timer & speed tracker
│   ├── map.js                    # Leaflet map controller, basemaps & radar animations
│   ├── analytics.js              # Chart.js post-game spatial debrief controller
│   └── main.js                   # DOM wiring & event handlers
├── data/
│   └── missions.geojson          # RFC 7946 GeoJSON dataset (15 seismic & landmark targets)
└── assets/
    └── images/
        └── layout-sketch.svg     # Frontend layout wireframe diagram
```

---

## 7. What I Learned from AI

During the design and step-by-step development of this GeoGame with AI assistance (Google Gemini / Antigravity):
- **Modular Closure Architecture:** Learned how to structure vanilla JavaScript applications without frameworks by encapsulating state inside factory closures (`createGameEngine`, `createMissionTimer`, `createMapController`, `createAnalyticsController`) rather than relying on global variables.
- **GeoJSON vs. Leaflet Coordinate Order:** Reinforced the practical distinction between RFC 7946 GeoJSON `[longitude, latitude]` coordinate arrays and Leaflet's `[latitude, longitude]` API, and how to normalize coordinates cleanly in a dedicated data loader.
- **Spatial Computation & Geovisualisation:** Practiced implementing the Haversine great-circle distance formula, combining Leaflet `DivIcon` CSS keyframe animations with `L.circle` tolerance zones and `flyToBounds`, and integrating a dual-axis Chart.js visualization with proper canvas instance cleanup.
- **Disciplined Git Workflow:** Practiced atomic, feature-scoped commits (`1 feature = 1 commit`) with descriptive Conventional Commit messages and multi-line English bodies.

**AI Interaction URL:** *(Add shared AI conversation link here if applicable — developed iteratively via Google Antigravity / Gemini workspace session.)*

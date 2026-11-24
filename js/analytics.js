// Chart.js post-game spatial accuracy and score analytics modal controller

function createAnalyticsController() {
  const modalEl = document.getElementById("analytics-modal");
  const subtitleEl = document.getElementById("modal-subtitle");
  const statScoreEl = document.getElementById("stat-final-score");
  const statAccuracyEl = document.getElementById("stat-accuracy");
  const statAvgErrorEl = document.getElementById("stat-avg-error");
  const statAvgTimeEl = document.getElementById("stat-avg-time");
  const chartCanvas = document.getElementById("performance-chart");
  const emptyNoticeEl = document.getElementById("chart-empty-notice");

  let chartInstance = null;

  function computeSummary(results) {
    if (!results.length) {
      return { hits: 0, total: 0, hitRate: 0, avgErrorKm: 0, avgTimeSec: 0 };
    }

    const hits = results.filter((r) => r.isHit).length;
    const totalError = results.reduce((sum, r) => sum + r.distanceKm, 0);
    const totalTime = results.reduce((sum, r) => sum + (r.elapsedSeconds || 0), 0);

    return {
      hits,
      total: results.length,
      hitRate: Math.round((hits / results.length) * 100),
      avgErrorKm: Math.round(totalError / results.length),
      avgTimeSec: (totalTime / results.length).toFixed(1),
    };
  }

  function renderChart(results) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    if (!results.length || typeof Chart === "undefined") {
      chartCanvas.classList.add("hidden");
      emptyNoticeEl.classList.remove("hidden");
      return;
    }

    chartCanvas.classList.remove("hidden");
    emptyNoticeEl.classList.add("hidden");

    const labels = results.map((r) => `R${r.round} (L${r.level})`);
    const distances = results.map((r) => r.distanceKm);
    const points = results.map((r) => r.points);
    const barColors = results.map((r) =>
      r.isHit ? "rgba(34, 197, 94, 0.72)" : "rgba(249, 115, 22, 0.75)"
    );
    const barBorders = results.map((r) =>
      r.isHit ? "#4ade80" : "#fb923c"
    );

    chartInstance = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Spatial Error (km)",
            data: distances,
            backgroundColor: barColors,
            borderColor: barBorders,
            borderWidth: 1.5,
            borderRadius: 5,
            yAxisID: "yDistance",
          },
          {
            type: "line",
            label: "Round Score (pts)",
            data: points,
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.2)",
            pointBackgroundColor: "#38bdf8",
            pointBorderColor: "#0f172a",
            pointBorderWidth: 2,
            pointRadius: 5,
            tension: 0.3,
            yAxisID: "yPoints",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            labels: {
              color: "#e2e8f0",
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.96)",
            titleColor: "#f8fafc",
            bodyColor: "#cbd5e1",
            borderColor: "rgba(148, 163, 184, 0.35)",
            borderWidth: 1,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                const rec = results[idx];
                return `Round ${rec.round}: ${rec.name}`;
              },
              afterBody: (items) => {
                const idx = items[0].dataIndex;
                const rec = results[idx];
                const status = rec.isHit ? "HIT" : "MISS";
                return [
                  `Category: ${rec.category} (Level ${rec.level})`,
                  `Tolerance: ${rec.maxToleranceKm} km · Status: ${status}`,
                  `Response Time: ${rec.elapsedSeconds}s`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148, 163, 184, 0.1)" },
          },
          yDistance: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: {
              display: true,
              text: "Error Distance (km)",
              color: "#94a3b8",
            },
            ticks: { color: "#94a3b8" },
            grid: { color: "rgba(148, 163, 184, 0.12)" },
          },
          yPoints: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: {
              display: true,
              text: "Points Earned",
              color: "#38bdf8",
            },
            ticks: { color: "#38bdf8" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  function open(state) {
    const summary = computeSummary(state.results);

    let reasonLabel = "Mission Complete — All 10 targets evaluated";
    if (state.endReason === "timeout") {
      reasonLabel = "60-Second Radar Window Expired";
    } else if (state.endReason === "no_lives") {
      reasonLabel = "Mission Ended — All 3 lives lost";
    }

    subtitleEl.textContent = reasonLabel;
    statScoreEl.textContent = state.score.toLocaleString();
    statAccuracyEl.textContent = `${summary.hits}/${summary.total} (${summary.hitRate}%)`;
    statAvgErrorEl.textContent = summary.total ? `${summary.avgErrorKm.toLocaleString()} km` : "—";
    statAvgTimeEl.textContent = summary.total ? `${summary.avgTimeSec}s` : "—";

    modalEl.classList.remove("hidden");
    modalEl.setAttribute("aria-hidden", "false");
    renderChart(state.results);
  }

  function close() {
    modalEl.classList.add("hidden");
    modalEl.setAttribute("aria-hidden", "true");
  }

  return {
    open,
    close,
  };
}

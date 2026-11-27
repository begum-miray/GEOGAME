// Chart.js post-game spatial accuracy and score analytics modal controller (Turkish light theme)

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

    const labels = results.map((r) => `T${r.round} (S${r.level})`);
    const distances = results.map((r) => r.distanceKm);
    const points = results.map((r) => r.points);
    const barColors = results.map((r) =>
      r.isHit ? "rgba(22, 163, 74, 0.72)" : "rgba(234, 88, 12, 0.75)"
    );
    const barBorders = results.map((r) =>
      r.isHit ? "#15803d" : "#c2410c"
    );

    chartInstance = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Hata Mesafesi (km)",
            data: distances,
            backgroundColor: barColors,
            borderColor: barBorders,
            borderWidth: 1.5,
            borderRadius: 5,
            yAxisID: "yDistance",
          },
          {
            type: "line",
            label: "Tur Puanı",
            data: points,
            borderColor: "#0284c7",
            backgroundColor: "rgba(2, 132, 199, 0.16)",
            pointBackgroundColor: "#0284c7",
            pointBorderColor: "#ffffff",
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
              color: "#334155",
              font: { size: 12, weight: "600" },
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.94)",
            titleColor: "#f8fafc",
            bodyColor: "#e2e8f0",
            borderColor: "rgba(148, 163, 184, 0.35)",
            borderWidth: 1,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                const rec = results[idx];
                return `Tur ${rec.round}: ${rec.name}`;
              },
              afterBody: (items) => {
                const idx = items[0].dataIndex;
                const rec = results[idx];
                const categoryLabel = rec.category === "seismic" ? "Sismik Bölge" : "Coğrafi Nokta";
                const status = rec.isHit ? "İSABET" : "KAÇTI";
                return [
                  `Kategori: ${categoryLabel} (Seviye ${rec.level})`,
                  `Tolerans: ${rec.maxToleranceKm} km · Durum: ${status}`,
                  `Cevap Süresi: ${rec.elapsedSeconds} sn`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#475569" },
            grid: { color: "rgba(148, 163, 184, 0.2)" },
          },
          yDistance: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: {
              display: true,
              text: "Hata Mesafesi (km)",
              color: "#475569",
            },
            ticks: { color: "#475569" },
            grid: { color: "rgba(148, 163, 184, 0.22)" },
          },
          yPoints: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: {
              display: true,
              text: "Kazanılan Puan",
              color: "#0284c7",
            },
            ticks: { color: "#0284c7" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  function open(state) {
    const summary = computeSummary(state.results);

    let reasonLabel = "Görev Tamamlandı — 10 hedefin tamamı değerlendirildi";
    if (state.endReason === "timeout") {
      reasonLabel = "60 Saniyelik Radar Süresi Doldu";
    } else if (state.endReason === "no_lives") {
      reasonLabel = "Oyun Bitti — 3 can hakkı tükendi";
    }

    subtitleEl.textContent = reasonLabel;
    statScoreEl.textContent = state.score.toLocaleString("tr-TR");
    statAccuracyEl.textContent = `${summary.hits}/${summary.total} (%${summary.hitRate})`;
    statAvgErrorEl.textContent = summary.total ? `${summary.avgErrorKm.toLocaleString("tr-TR")} km` : "—";
    statAvgTimeEl.textContent = summary.total ? `${summary.avgTimeSec} sn` : "—";

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

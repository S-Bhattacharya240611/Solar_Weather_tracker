const CONFIG = {
    API_KP: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
    API_WIND: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json',
    API_XRAY: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',
    API_FORECAST: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
    IMG_SDO: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg',
    IMG_AURORA: 'https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.jpg',
    IMG_DRAP: 'https://services.swpc.noaa.gov/images/animations/d-rap/global/d-rap/latest.png',
    REFRESH_RATE: 60 * 1000,
    THEME: {
        cyan: '#00f3ff',
        blue: '#2d6eff',
        grid: 'rgba(255,255,255,0.1)',
        text: '#94a3b8'
    }
};

let activeTimezone = 'local';

let charts = {
    wind: null,
    kp: null,
    xray: null
};

let latestKpData = null;
let latestWindData = null;
let latestXrayData = null;
let latestForecastData = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('timezone-selector').addEventListener('change', (e) => {
        activeTimezone = e.target.value;
        if (latestKpData) processKpData(latestKpData);
        if (latestWindData) processWindData(latestWindData);
        if (latestXrayData) processXrayData(latestXrayData);
        if (latestForecastData) processForecastData(latestForecastData);
        updateTime();
    });

    initCharts();
    fetchData();
    setInterval(fetchData, CONFIG.REFRESH_RATE);

    document.getElementById('alarm-dismiss').addEventListener('click', () => {
        document.getElementById('alarm-modal').classList.add('hidden');
    });
});

function initCharts() {
    const ctxWind = document.getElementById('windChart').getContext('2d');

    const gradientSpeed = ctxWind.createLinearGradient(0, 0, 0, 400);
    gradientSpeed.addColorStop(0, 'rgba(0, 243, 255, 0.4)');
    gradientSpeed.addColorStop(1, 'rgba(0, 243, 255, 0.0)');

    charts.wind = new Chart(ctxWind, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Wind Speed (km/s)',
                    data: [],
                    borderColor: CONFIG.THEME.cyan,
                    backgroundColor: gradientSpeed,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Density (p/cm³)',
                    data: [],
                    borderColor: CONFIG.THEME.blue,
                    borderWidth: 1,
                    pointRadius: 0,
                    borderDash: [5, 5],
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(11, 13, 23, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: CONFIG.THEME.text, maxTicksLimit: 8 }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: CONFIG.THEME.cyan }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: CONFIG.THEME.blue }
                }
            }
        }
    });

    const ctxKp = document.getElementById('kpChart').getContext('2d');
    charts.kp = new Chart(ctxKp, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Kp Index',
                data: [],
                backgroundColor: (context) => {
                    const value = context.raw;
                    if (value >= 6) return '#ff2d55';
                    if (value >= 4) return '#ffaa00';
                    return '#00ff9d';
                },
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: CONFIG.THEME.text, maxTicksLimit: 6 }
                },
                y: {
                    beginAtZero: true,
                    max: 9,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: CONFIG.THEME.text, stepSize: 1 }
                }
            }
        }
    });

    const ctxXray = document.getElementById('xrayChart').getContext('2d');
    charts.xray = new Chart(ctxXray, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'X-Ray Flux (Watts/m²)',
                data: [],
                borderColor: '#ff2d55',
                backgroundColor: 'rgba(255, 45, 85, 0.2)',
                borderWidth: 2,
                fill: true,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(11, 13, 23, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            return context.raw.toExponential(2) + ' W/m²';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: CONFIG.THEME.text, maxTicksLimit: 6 }
                },
                y: {
                    type: 'logarithmic',
                    display: true,
                    position: 'right',
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: {
                        color: '#ff2d55',
                        callback: function (value) {
                            const exp = Math.log10(value);
                            if (Math.abs(exp % 1) < 0.01) {
                                return '10^' + Math.round(exp);
                            }
                            return null;
                        }
                    },
                    min: 1e-9,
                    max: 1e-2
                }
            }
        }
    });
}

async function fetchData() {
    updateStatus('RECEIVING TELEMETRY...', true);

    try {
        const results = await Promise.allSettled([
            fetch(CONFIG.API_KP),
            fetch(CONFIG.API_WIND),
            fetch(CONFIG.API_XRAY),
            fetch(CONFIG.API_FORECAST)
        ]);

        const getData = async (res) => {
            if (res.status === 'fulfilled' && res.value.ok) {
                try {
                    return await res.value.json();
                } catch (e) {
                    console.warn('JSON Parse Error:', e);
                    return null;
                }
            }
            return null;
        };

        const kpData = await getData(results[0]);
        const windData = await getData(results[1]);
        const xrayData = await getData(results[2]);
        const forecastData = await getData(results[3]);

        if (kpData) { latestKpData = kpData; processKpData(kpData); }
        if (windData) { latestWindData = windData; processWindData(windData); }
        if (xrayData) { latestXrayData = xrayData; processXrayData(xrayData); }
        if (forecastData) { latestForecastData = forecastData; processForecastData(forecastData); }

        refreshImages();

        updateTime();

        if (kpData || windData || xrayData) {
            updateStatus('SYSTEM ONLINE', true);
        } else {
            updateStatus('CONNECTION LOST', false);
        }

    } catch (error) {
        console.error('Fetch Logic Error:', error);
        updateStatus('SYSTEM ERROR', false);
    }
}

function formatTime(dateStr) {
    if (!dateStr) return 'Invalid Date';

    let date;
    if (dateStr.includes('T') && dateStr.endsWith('Z')) {
        date = new Date(dateStr);
    } else {
        let safeStr = dateStr.replace(' ', 'T');
        if (!safeStr.endsWith('Z')) safeStr += 'Z';
        date = new Date(safeStr);
    }

    let timeZone = activeTimezone === 'local' ? undefined : activeTimezone;

    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timeZone
    }).format(date);
}

function processKpData(data) {
    const rows = data.slice(1);
    const latest = rows[rows.length - 1];

    const kpValue = parseFloat(latest[1]);
    document.getElementById('kp-display').innerText = kpValue.toFixed(2);

    const riskBadge = document.getElementById('risk-badge');
    if (kpValue >= 6) {
        riskBadge.innerText = 'STORM WARNING';
        riskBadge.className = 'risk-badge risk-high';
    } else if (kpValue >= 4) {
        riskBadge.innerText = 'MODERATE';
        riskBadge.className = 'risk-badge risk-moderate';
    } else {
        riskBadge.innerText = 'NORMAL';
        riskBadge.className = 'risk-badge risk-low';
    }

    const labels = rows.map(r => formatTime(r[0]));
    const values = rows.map(r => parseFloat(r[1]));

    charts.kp.data.labels = labels;
    charts.kp.data.datasets[0].data = values;
    charts.kp.update();
}

function processWindData(data) {
    const rows = data.slice(1).filter(r => r[2] !== null && r[1] !== null);
    const latest = rows[rows.length - 1];

    document.getElementById('wind-speed-display').innerText = Math.round(latest[2]);
    document.getElementById('density-display').innerText = parseFloat(latest[1]).toFixed(1);

    const sampled = rows.filter((_, i) => i % 5 === 0 || i === rows.length - 1);

    const labels = sampled.map(r => formatTime(r[0]));
    const speedData = sampled.map(r => parseFloat(r[2]));
    const densityData = sampled.map(r => parseFloat(r[1]));

    charts.wind.data.labels = labels;
    charts.wind.data.datasets[0].data = speedData;
    charts.wind.data.datasets[1].data = densityData;
    charts.wind.update();
}

function processXrayData(data) {
    const cleanData = data.filter(d => d.energy === "0.1-0.8nm" && d.flux > 0);

    const sampled = cleanData.filter((_, i) => i % 2 === 0);

    const labels = sampled.map(d => formatTime(d.time_tag));
    const values = sampled.map(d => d.flux);

    charts.xray.data.labels = labels;
    charts.xray.data.datasets[0].data = values;
    charts.xray.update();

    if (values.length > 0) {
        const currentFlux = values[values.length - 1];
        checkFlareStatus(currentFlux);
        updateRadioBlackoutStatus(currentFlux);
    }
}

function updateRadioBlackoutStatus(flux) {
    const statusEl = document.getElementById('radio-status');
    const descEl = document.getElementById('radio-desc');

    if (flux >= 1e-4) {
        statusEl.innerText = 'SEVERE (R3)';
        statusEl.style.color = 'var(--accent-alert)';
        descEl.innerText = 'Wide area HF blackout likely';
    } else if (flux >= 5e-5) {
        statusEl.innerText = 'MODERATE (R2)';
        statusEl.style.color = 'var(--accent-warning)';
        descEl.innerText = 'Limited blackout on sunlit side';
    } else if (flux >= 1e-5) {
        statusEl.innerText = 'MINOR (R1)';
        statusEl.style.color = '#ffd700';
        descEl.innerText = 'Weak or minor degradation';
    } else {
        statusEl.innerText = 'NORMAL';
        statusEl.style.color = 'var(--accent-safe)';
        descEl.innerText = 'No Blackouts Detected';
    }
}

function checkFlareStatus(flux) {
    const body = document.body;
    const statusText = document.getElementById('status-text');

    body.classList.remove('alert-mode-critical', 'alert-mode-moderate');

    if (flux >= 1e-4) {
        body.classList.add('alert-mode-critical');
        statusText.innerText = 'WARNING: X-CLASS FLARE IN PROGRESS';
        updateStatus('WARNING: X-CLASS FLARE', false);

        const modal = document.getElementById('alarm-modal');
        if (modal.classList.contains('hidden')) {
            document.getElementById('alarm-title').innerText = 'X-CLASS FLARE DETECTED';
            document.getElementById('alarm-message').innerText = 'High-energy X-rays exceeding 10^-4 W/m². Extreme radio blackout risk.';
            modal.classList.remove('hidden');
        }

    } else if (flux >= 1e-5) {
        body.classList.add('alert-mode-moderate');
        statusText.innerText = 'ALERT: M-CLASS FLARE DETECTED';
        document.getElementById('connection-status').style.background = 'var(--accent-warning)';
        document.getElementById('connection-status').style.boxShadow = '0 0 8px var(--accent-warning)';
    } else {
        statusText.innerText = 'SYSTEM ONLINE';
    }
}

function processForecastData(data) {
    const predictions = data.filter(d => d[2] === 'predicted');

    const days = {};
    predictions.forEach(p => {
        const datePart = p[0].split(' ')[0];
        if (!days[datePart]) days[datePart] = [];
        days[datePart].push(p);
    });

    const sortedDays = Object.keys(days).sort().slice(0, 3);

    const tbody = document.getElementById('forecast-body');
    tbody.innerHTML = '';

    sortedDays.forEach(dayDate => {
        const dayData = days[dayDate];
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        const dateObj = new Date(dayDate);
        dateCell.innerText = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        row.appendChild(dateCell);

        const slots = ['00', '03', '06', '09', '12', '15', '18', '21'];

        slots.forEach(slot => {
            const match = dayData.find(d => d[0].includes(` ${slot}:00:00`));
            const cell = document.createElement('td');

            if (match) {
                const kp = parseFloat(match[1]);
                cell.innerText = kp.toFixed(1);

                if (kp >= 5) cell.className = 'kp-high';
                else if (kp >= 4) cell.className = 'kp-mod';
                else cell.className = 'kp-low';
            } else {
                cell.innerText = '-';
            }
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

function refreshImages() {
    const timestamp = new Date().getTime();

    document.getElementById('sdo-image').src = CONFIG.IMG_SDO + '?t=' + timestamp;
    document.getElementById('sdo-timestamp').innerText = new Date().toLocaleTimeString();

    document.getElementById('aurora-image').src = CONFIG.IMG_AURORA + '?t=' + timestamp;

    document.getElementById('drap-image').src = CONFIG.IMG_DRAP + '?t=' + timestamp;
}

function updateStatus(msg, isOnline) {
    const text = document.getElementById('status-text');
    const dot = document.getElementById('connection-status');
    text.innerText = msg;
    dot.style.background = isOnline ? 'var(--accent-safe)' : 'var(--accent-alert)';
    dot.style.boxShadow = isOnline ? '0 0 8px var(--accent-safe)' : 'none';
}

function updateTime() {
    const now = new Date();

    let timeZone = activeTimezone === 'local' ? undefined : activeTimezone;

    document.getElementById('last-update-time').innerText = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timeZone
    }).format(now);

    document.getElementById('last-update-date').innerText = new Intl.DateTimeFormat('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric', timeZone: timeZone
    }).format(now);
}

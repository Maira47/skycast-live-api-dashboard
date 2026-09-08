const cityInput = document.getElementById('cityInput');
const loader = document.getElementById('loader');
const errorMsg = document.getElementById('errorMsg');

// Home Elements
const cityNameEl = document.getElementById('cityName');
const weatherConditionEl = document.getElementById('weatherCondition');
const temperatureEl = document.getElementById('temperature');
const windSpeedEl = document.getElementById('windSpeed');
const humidityEl = document.getElementById('humidity');
const pressureEl = document.getElementById('pressure');
const visibilityEl = document.getElementById('visibility');
const sunriseTimeEl = document.getElementById('sunriseTime');
const sunsetTimeEl = document.getElementById('sunsetTime');
const weatherIconClass = document.getElementById('weatherIconClass');
const recentTagsContainer = document.getElementById('recentTags');
const hourlyContainer = document.getElementById('hourlyContainer');
const weeklyContainer = document.getElementById('weeklyContainer');
const currentDateEl = document.getElementById('currentDate');

// Analytics Elements
const analyticsCityName = document.getElementById('analyticsCityName');
const statMaxTemp = document.getElementById('statMaxTemp');
const statMinTemp = document.getElementById('statMinTemp');
const statAvgTemp = document.getElementById('statAvgTemp');
const statRainProb = document.getElementById('statRainProb');
const tempTrendLine = document.getElementById('tempTrendLine');

// Map Elements & Buttons
const mapLahoreTemp = document.getElementById('mapLahoreTemp');
const mapIslamabadTemp = document.getElementById('mapIslamabadTemp');
const mapKarachiTemp = document.getElementById('mapKarachiTemp');
const mapFilterBtns = document.querySelectorAll('.map-btn');

// API View Elements
const apiLastUpdated = document.getElementById('apiLastUpdated');
const apiLoc = document.getElementById('apiLoc');
const apiTemp = document.getElementById('apiTemp');
const apiHumidity = document.getElementById('apiHumidity');
const apiCondition = document.getElementById('apiCondition');
const rawJsonResponse = document.getElementById('rawJsonResponse');

// Global States
let currentUnit = 'C'; // 'C' or 'F'
let currentWindUnit = 'kmh'; // 'kmh' or 'mph'
let currentWeatherData = null;
let currentCityName = 'Lahore';

const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
if (currentDateEl) {
    currentDateEl.innerText = new Date().toLocaleDateString('en-US', options);
}

// Sidebar Navigation Switching Logic
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        const targetId = item.getAttribute('data-target');
        viewSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetId) section.classList.add('active');
        });
    });
});

if (cityInput) {
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) fetchWeatherData(city);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    displayRecentSearches();
    fetchWeatherData('Lahore');
    loadMapData('temp');
    initSettingsListeners();
});

// --- SETTINGS INTERACTIVITY LOGIC (Synced with HTML Radio & Checkboxes) ---
function initSettingsListeners() {
    // Temperature Radio Buttons
    const unitRadios = document.querySelectorAll('input[name="unit"]');
    unitRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentUnit = e.target.value; // 'C' or 'F'
            if (currentWeatherData) {
                updateDashboard(currentCityName, currentWeatherData);
                updateAnalytics(currentCityName, currentWeatherData);
                updateApiView(currentCityName, currentWeatherData.current_weather, currentWeatherData.hourly);
            }
        });
    });

    // Wind Speed Radio Buttons
    const windRadios = document.querySelectorAll('input[name="wind"]');
    windRadios.forEach(radio => {
        windRadios.forEach(r => {
            radio.addEventListener('change', (e) => {
                currentWindUnit = e.target.value; // 'kmh' or 'mph'
                if (currentWeatherData) {
                    updateDashboard(currentCityName, currentWeatherData);
                }
            });
        });
    });
}

// --- MAP & RADAR LAYER LOGIC ---
mapFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        mapFilterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const layerType = e.target.getAttribute('data-layer') || 'temp';
        loadMapData(layerType);
    });
});

async function loadMapData(type) {
    const cities = [
        { name: 'Islamabad', el: mapIslamabadTemp, lat: 33.6844, lon: 73.0479, defaultTemp: 28 },
        { name: 'Lahore', el: mapLahoreTemp, lat: 31.5497, lon: 74.3436, defaultTemp: 34 },
        { name: 'Karachi', el: mapKarachiTemp, lat: 24.8607, lon: 67.0011, defaultTemp: 32 }
    ];

    for (let city of cities) {
        if (!city.el) continue;
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&hourly=relative_humidity_2m,precipitation,wind_speed_10m`);
            const data = await res.json();
            if (data && data.current_weather) {
                let tempVal = data.current_weather.temperature;
                if (currentUnit === 'F') tempVal = (tempVal * 9/5) + 32;

                if (type === 'rain') {
                    const rainVal = data.hourly && data.hourly.precipitation ? data.hourly.precipitation[0] : 0;
                    city.el.innerText = `${rainVal} mm`;
                } else if (type === 'wind') {
                    let windVal = data.current_weather.windspeed;
                    if (currentWindUnit === 'mph') windVal = Math.round(windVal * 0.621371);
                    city.el.innerText = `${windVal} ${currentWindUnit}`;
                } else if (type === 'clouds') {
                    const humVal = data.hourly && data.hourly.relative_humidity_2m ? data.hourly.relative_humidity_2m[0] : 45;
                    city.el.innerText = `${humVal}% Hum`;
                } else {
                    city.el.innerText = `${Math.round(tempVal)}°${currentUnit}`;
                }
            } else {
                let t = city.defaultTemp;
                if (currentUnit === 'F') t = Math.round((t * 9/5) + 32);
                city.el.innerText = `${t}°${currentUnit}`;
            }
        } catch (err) {
            let t = city.defaultTemp;
            if (currentUnit === 'F') t = Math.round((t * 9/5) + 32);
            city.el.innerText = `${t}°${currentUnit}`;
        }
    }
}

// --- API FETCH & DATA HANDLING ---
async function fetchWeatherData(city) {
    showLoader();
    hideError();
    currentCityName = city;

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found. Please check spelling.");
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,surface_pressure,precipitation,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,time&timezone=auto`;
        
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (!weatherData || !weatherData.current_weather) {
            throw new Error("API structure mismatch.");
        }

        currentWeatherData = weatherData;
        const locationName = `${name}, ${country || 'Pakistan'}`;
        
        updateDashboard(locationName, weatherData);
        updateAnalytics(locationName, weatherData);
        updateApiView(locationName, weatherData.current_weather, weatherData.hourly);
        saveRecentSearch(name);

    } catch (error) {
        console.warn("API fetch encountered an issue, switching to fallback for: ", city);
        loadSmartFallback(city);
    } finally {
        hideLoader();
    }
}

function loadSmartFallback(city) {
    const cityTemps = { 'lahore': 34, 'karachi': 32, 'islamabad': 28, 'gujranwala': 35, 'multan': 37, 'faisalabad': 36 };
    const baseTemp = cityTemps[city.toLowerCase()] || 30;

    const fallbackData = {
        current_weather: { temperature: baseTemp, windspeed: 14, weathercode: 0 },
        hourly: {
            time: Array.from({length: 24}, (_, i) => new Date().toISOString()),
            temperature_2m: Array.from({length: 24}, () => baseTemp),
            relative_humidity_2m: Array.from({length: 24}, () => 45),
            surface_pressure: Array.from({length: 24}, () => 1012),
            precipitation: Array.from({length: 24}, () => 0),
            wind_speed_10m: Array.from({length: 24}, () => 14),
            weather_code: Array.from({length: 24}, () => 0)
        },
        daily: {
            temperature_2m_max: [baseTemp + 2, baseTemp + 1, baseTemp + 3, baseTemp, baseTemp - 1, baseTemp + 2, baseTemp + 1],
            temperature_2m_min: [baseTemp - 8, baseTemp - 9, baseTemp - 7, baseTemp - 8, baseTemp - 9, baseTemp - 8, baseTemp - 7],
            sunrise: [new Date().toISOString()],
            sunset: [new Date().toISOString()],
            time: Array.from({length: 7}, (_, i) => new Date(Date.now() + i*86400000).toISOString()),
            weather_code: [0, 1, 2, 0, 0, 1, 0]
        }
    };

    currentWeatherData = fallbackData;
    const locationName = `${city.charAt(0).toUpperCase() + city.slice(1)}, Pakistan`;
    updateDashboard(locationName, fallbackData);
    updateAnalytics(locationName, fallbackData);
    updateApiView(locationName, fallbackData.current_weather, fallbackData.hourly);
    saveRecentSearch(city);
}

// --- HOME DASHBOARD UPDATER ---
function updateDashboard(location, data) {
    const current = data.current_weather;
    const hourly = data.hourly || {};
    const currentHourIndex = new Date().getHours();

    if (cityNameEl) cityNameEl.innerText = location;

    let temp = current.temperature;
    if (currentUnit === 'F') temp = (temp * 9/5) + 32;
    if (temperatureEl) temperatureEl.innerHTML = `${Math.round(temp)}<span class="unit">°${currentUnit}</span>`;

    let wind = current.windspeed || 12;
    if (currentWindUnit === 'mph') wind = Math.round(wind * 0.621371);
    if (windSpeedEl) windSpeedEl.innerText = `${wind}`;
    
    // Update wind speed unit text label if present
    const windUnitTextEl = document.querySelector('.metric-value .unit-text');
    if (windUnitTextEl && windSpeedEl === windSpeedEl) {
        // Find specific element for wind unit text
    }

    const humidityVal = hourly.relative_humidity_2m && hourly.relative_humidity_2m[currentHourIndex] !== undefined ? hourly.relative_humidity_2m[currentHourIndex] : 45;
    const pressureVal = hourly.surface_pressure && hourly.surface_pressure[currentHourIndex] !== undefined ? hourly.surface_pressure[currentHourIndex] : 1012;

    if (humidityEl) humidityEl.innerText = humidityVal;
    if (pressureEl) pressureEl.innerText = pressureVal;
    if (visibilityEl) visibilityEl.innerText = '10';

    const { text, icon } = getWeatherInfo(current.weathercode);
    if (weatherConditionEl) weatherConditionEl.innerText = text;
    if (weatherIconClass) weatherIconClass.className = icon;

    if (sunriseTimeEl) sunriseTimeEl.innerText = "05:45 AM";
    if (sunsetTimeEl) sunsetTimeEl.innerText = "06:25 PM";

    if (data.hourly && hourlyContainer) renderHourlyForecast(data.hourly);
    if (data.daily && weeklyContainer) renderWeeklyForecast(data.daily);
}

// --- ANALYTICS UPDATER WITH BAR GRAPH ---
function updateAnalytics(location, data) {
    if (analyticsCityName) analyticsCityName.innerText = location;
    const daily = data.daily;

    if (daily && daily.temperature_2m_max) {
        let maxs = daily.temperature_2m_max;
        let mins = daily.temperature_2m_min;

        if (currentUnit === 'F') {
            maxs = maxs.map(t => (t * 9/5) + 32);
            mins = mins.map(t => (t * 9/5) + 32);
        }

        const highest = Math.max(...maxs);
        const lowest = Math.min(...mins);
        const avg = Math.round((highest + lowest) / 2);

        if (statMaxTemp) statMaxTemp.innerText = `${Math.round(highest)}°${currentUnit}`;
        if (statMinTemp) statMinTemp.innerText = `${Math.round(lowest)}°${currentUnit}`;
        if (statAvgTemp) statAvgTemp.innerText = `${avg}°${currentUnit}`;
        if (statRainProb) statRainProb.innerText = '30%';

        // Dynamic Bar Graph Generation for Weekly Max Temperatures
        if (tempTrendLine) {
            tempTrendLine.innerHTML = '';
            // Container styling for bar graph layout
            tempTrendLine.style.display = 'flex';
            tempTrendLine.style.alignItems = 'flex-end';
            tempTrendLine.style.justifyContent = 'space-around';
            tempTrendLine.style.height = '180px';
            tempTrendLine.style.paddingTop = '20px';

            const absoluteMax = Math.max(...maxs) || 40;

            maxs.forEach((tempVal, index) => {
                const dateObj = new Date(daily.time[index]);
                const dayLabel = index === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                
                // Calculate percentage height for the bar relative to max temp
                const heightPercentage = Math.round((tempVal / absoluteMax) * 100);

                const barWrapper = document.createElement('div');
                barWrapper.style.display = 'flex';
                barWrapper.style.flexDirection = 'column';
                barWrapper.style.alignItems = 'center';
                barWrapper.style.flex = '1';
                barWrapper.style.height = '100%';
                barWrapper.style.justifyContent = 'flex-end';

                barWrapper.innerHTML = `
                    <span style="font-size: 11px; color: #38bdf8; margin-bottom: 5px; font-weight: 600;">${Math.round(tempVal)}°</span>
                    <div style="width: 24px; height: ${heightPercentage}%; background: linear-gradient(to top, #0284c7, #38bdf8); border-radius: 6px 6px 0 0; transition: height 0.4s ease;"></div>
                    <span style="font-size: 12px; color: #94a3b8; margin-top: 8px;">${dayLabel}</span>
                `;
                tempTrendLine.appendChild(barWrapper);
            });
        }
    }
}
// --- API TELEMETRY VIEW UPDATER ---
function updateApiView(location, current, hourly) {
    const currentHourIndex = new Date().getHours();
    const humidityVal = hourly && hourly.relative_humidity_2m ? hourly.relative_humidity_2m[currentHourIndex] : 45;
    const pressureVal = hourly && hourly.surface_pressure ? hourly.surface_pressure[currentHourIndex] : 1012;

    let temp = current.temperature;
    if (currentUnit === 'F') temp = (temp * 9/5) + 32;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    if (apiLastUpdated) apiLastUpdated.innerText = `Last Updated: ${nowStr}`;
    if (apiLoc) apiLoc.innerText = location;
    if (apiTemp) apiTemp.innerText = `${Math.round(temp)}°${currentUnit}`;
    if (apiHumidity) apiHumidity.innerText = `${humidityVal}%`;
    
    const { text } = getWeatherInfo(current.weathercode);
    if (apiCondition) apiCondition.innerText = text;

    if (rawJsonResponse) {
        rawJsonResponse.innerText = JSON.stringify({
            location: location,
            temperature: current.temperature,
            unit: currentUnit,
            humidity: humidityVal,
            windspeed: current.windspeed,
            windUnit: currentWindUnit,
            pressure: pressureVal,
            condition: text,
            timestamp: new Date().toISOString()
        }, null, 2);
    }
}

// --- FORECAST RENDERERS ---
function renderHourlyForecast(hourly) {
    hourlyContainer.innerHTML = '';
    const currentHourIndex = new Date().getHours();
    
    for (let i = currentHourIndex; i < currentHourIndex + 12; i++) {
        if (!hourly.time || hourly.time[i] === undefined) break;
        const timeVal = new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        
        let temp = hourly.temperature_2m[i];
        if (currentUnit === 'F') temp = (temp * 9/5) + 32;

        const { icon } = getWeatherInfo(hourly.weather_code ? hourly.weather_code[i] : 0);

        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <span>${timeVal}</span>
            <i class="${icon}"></i>
            <strong>${Math.round(temp)}°${currentUnit}</strong>
        `;
        hourlyContainer.appendChild(card);
    }
}

function renderWeeklyForecast(daily) {
    weeklyContainer.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        if (!daily.time || !daily.time[i]) break;
        const dateObj = new Date(daily.time[i]);
        const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        
        let maxTemp = daily.temperature_2m_max[i];
        let minTemp = daily.temperature_2m_min[i];
        if (currentUnit === 'F') {
            maxTemp = (maxTemp * 9/5) + 32;
            minTemp = (minTemp * 9/5) + 32;
        }

        const { icon } = getWeatherInfo(daily.weather_code ? daily.weather_code[i] : 0);

        const item = document.createElement('div');
        item.className = 'weekly-item';
        item.innerHTML = `
            <span>${dayName}</span>
            <i class="${icon}" style="color: #38bdf8;"></i>
            <strong>${Math.round(maxTemp)}° / ${Math.round(minTemp)}°</strong>
        `;
        weeklyContainer.appendChild(item);
    }
}

function getWeatherInfo(code) {
    const weatherMap = {
        0: { text: 'Clear Sky', icon: 'fa-solid fa-sun' },
        1: { text: 'Mainly Clear', icon: 'fa-solid fa-cloud-sun' },
        2: { text: 'Partly Cloudy', icon: 'fa-solid fa-cloud-sun' },
        3: { text: 'Overcast', icon: 'fa-solid fa-cloud' },
        45: { text: 'Foggy', icon: 'fa-solid fa-smog' },
        51: { text: 'Light Drizzle', icon: 'fa-solid fa-cloud-rain' },
        61: { text: 'Rain Showers', icon: 'fa-solid fa-cloud-showers-heavy' }
    };
    return weatherMap[code] || { text: 'Fair Conditions', icon: 'fa-solid fa-cloud-sun' };
}

function saveRecentSearch(city) {
    let searches = JSON.parse(localStorage.getItem('weather_dashboard_searches')) || [];
    searches = searches.filter(item => item.toLowerCase() !== city.toLowerCase());
    searches.unshift(city);
    if (searches.length > 4) searches.pop();
    localStorage.setItem('weather_dashboard_searches', JSON.stringify(searches));
    displayRecentSearches();
}

function displayRecentSearches() {
    if (!recentTagsContainer) return;
    const searches = JSON.parse(localStorage.getItem('weather_dashboard_searches')) || [];
    if (searches.length === 0) {
        recentTagsContainer.innerHTML = '<p class="no-recent">No recent searches</p>';
        return;
    }
    recentTagsContainer.innerHTML = '';
    searches.forEach(city => {
        const tag = document.createElement('span');
        tag.className = 'recent-tag';
        tag.textContent = city;
        tag.addEventListener('click', () => {
            if (cityInput) cityInput.value = city;
            fetchWeatherData(city);
        });
        recentTagsContainer.appendChild(tag);
    });
}

document.getElementById('clearStorageBtn')?.addEventListener('click', () => {
    localStorage.removeItem('weather_dashboard_searches');
    displayRecentSearches();
    alert('Recent searches cleared!');
});

function showLoader() { if (loader) loader.style.display = 'flex'; }
function hideLoader() { if (loader) loader.style.display = 'none'; }
function showError(msg) {
    if (!errorMsg) return;
    errorMsg.innerText = msg;
    errorMsg.style.display = 'block';
    setTimeout(() => { errorMsg.style.display = 'none'; }, 4000);
}
function hideError() { if (errorMsg) errorMsg.style.display = 'none'; }
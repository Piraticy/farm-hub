// Clock + weather widget shared by login.html and index.html.
// Weather comes from Open-Meteo (https://open-meteo.com) — free, no API
// key required. Location is either the browser's geolocation or a city
// the user searches for, and is remembered in localStorage.
const FarmHubWeather = (function () {
    const LOCATION_KEY = 'farmhub_weather_location';

    const WEATHER_CODES = {
        0: ['☀️', 'Clear sky'],
        1: ['🌤️', 'Mostly clear'],
        2: ['⛅', 'Partly cloudy'],
        3: ['☁️', 'Overcast'],
        45: ['🌫️', 'Fog'],
        48: ['🌫️', 'Fog'],
        51: ['🌦️', 'Light drizzle'],
        53: ['🌦️', 'Drizzle'],
        55: ['🌦️', 'Dense drizzle'],
        56: ['🌧️', 'Freezing drizzle'],
        57: ['🌧️', 'Freezing drizzle'],
        61: ['🌧️', 'Light rain'],
        63: ['🌧️', 'Rain'],
        65: ['🌧️', 'Heavy rain'],
        66: ['🌧️', 'Freezing rain'],
        67: ['🌧️', 'Freezing rain'],
        71: ['🌨️', 'Light snow'],
        73: ['🌨️', 'Snow'],
        75: ['❄️', 'Heavy snow'],
        77: ['❄️', 'Snow grains'],
        80: ['🌦️', 'Rain showers'],
        81: ['🌧️', 'Rain showers'],
        82: ['⛈️', 'Violent showers'],
        85: ['🌨️', 'Snow showers'],
        86: ['🌨️', 'Snow showers'],
        95: ['⛈️', 'Thunderstorm'],
        96: ['⛈️', 'Thunderstorm w/ hail'],
        99: ['⛈️', 'Thunderstorm w/ hail']
    };

    function describe(code) {
        return WEATHER_CODES[code] || ['🌡️', 'Weather'];
    }

    function getSavedLocation() {
        try {
            return JSON.parse(localStorage.getItem(LOCATION_KEY) || 'null');
        } catch (e) {
            return null;
        }
    }

    function saveLocation(loc) {
        localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    }

    function clearLocation() {
        localStorage.removeItem(LOCATION_KEY);
    }

    async function geocode(query) {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            return null;
        }
        const r = data.results[0];
        const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
        return { lat: r.latitude, lon: r.longitude, label };
    }

    async function fetchWeather(lat, lon) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            '&current_weather=true&daily=temperature_2m_max,temperature_2m_min' +
            '&temperature_unit=fahrenheit&timezone=auto';
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error('Weather request failed');
        }
        return res.json();
    }

    function startClock(clockEl, dateEl) {
        function tick() {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
            dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        }
        tick();
        setInterval(tick, 1000);
    }

    function renderLocationForm(card, message) {
        card.innerHTML = `
            <p class="text-gray-500 text-sm mb-3">${message}</p>
            <form id="fhLocationForm" class="flex gap-2">
                <input type="text" id="fhLocationInput" placeholder="City name..." class="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-2 border">
                <button type="submit" class="px-3 py-2 rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shrink-0">Set</button>
            </form>
        `;
        card.querySelector('#fhLocationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = card.querySelector('#fhLocationInput').value.trim();
            if (!query) {
                return;
            }
            card.innerHTML = '<p class="text-gray-500 text-sm">Looking up location...</p>';
            try {
                const loc = await geocode(query);
                if (!loc) {
                    renderLocationForm(card, `Couldn't find "${query}". Try another search.`);
                    return;
                }
                saveLocation(loc);
                loadWeather(card);
            } catch (err) {
                renderLocationForm(card, 'Could not look up that location. Try again.');
            }
        });
    }

    function renderWeather(card, loc, data) {
        const [emoji, label] = describe(data.current_weather.weathercode);
        const temp = Math.round(data.current_weather.temperature);
        const hasRange = data.daily && Array.isArray(data.daily.temperature_2m_max) && data.daily.temperature_2m_max.length > 0;
        const high = hasRange ? Math.round(data.daily.temperature_2m_max[0]) : null;
        const low = hasRange ? Math.round(data.daily.temperature_2m_min[0]) : null;
        card.innerHTML = `
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <p class="text-3xl font-bold text-gray-800">${temp}°F <span class="text-2xl align-middle">${emoji}</span></p>
                    <p class="text-gray-500 text-sm mt-1">${label}${high !== null ? ` · H:${high}° L:${low}°` : ''}</p>
                    <p class="text-gray-400 text-xs mt-1 truncate">${loc.label || 'Current location'}</p>
                </div>
                <button id="fhChangeLocation" type="button" class="text-xs text-emerald-700 underline shrink-0">Change</button>
            </div>
        `;
        card.querySelector('#fhChangeLocation').addEventListener('click', () => {
            clearLocation();
            renderLocationForm(card, 'Search for a different location:');
        });
    }

    function loadWeather(card) {
        const saved = getSavedLocation();
        if (saved) {
            fetchWeather(saved.lat, saved.lon)
                .then((data) => renderWeather(card, saved, data))
                .catch(() => renderLocationForm(card, 'Could not load weather. Try setting your location.'));
            return;
        }

        if (!('geolocation' in navigator)) {
            renderLocationForm(card, 'Set your farm location to see the weather:');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Your location' };
                saveLocation(loc);
                fetchWeather(loc.lat, loc.lon)
                    .then((data) => renderWeather(card, loc, data))
                    .catch(() => renderLocationForm(card, 'Could not load weather. Try setting your location.'));
            },
            () => {
                renderLocationForm(card, 'Set your farm location to see the weather:');
            },
            { timeout: 8000 }
        );
    }

    function mount(containerId, options) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        const showClock = !options || options.showClock !== false;

        container.innerHTML = showClock
            ? `
                <div class="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-center">
                    <p id="fhClock" class="text-3xl font-bold text-gray-800"></p>
                    <p id="fhDate" class="text-gray-500 text-sm mt-1"></p>
                </div>
                <div class="bg-white rounded-2xl shadow-lg p-6" id="fhWeatherCard">
                    <p class="text-gray-500 text-sm">Loading weather...</p>
                </div>
            `
            : `
                <div class="bg-white rounded-2xl shadow-lg p-6 max-w-xs" id="fhWeatherCard">
                    <p class="text-gray-500 text-sm">Loading weather...</p>
                </div>
            `;

        if (showClock) {
            startClock(document.getElementById('fhClock'), document.getElementById('fhDate'));
        }
        loadWeather(document.getElementById('fhWeatherCard'));
    }

    return { mount };
})();

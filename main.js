"use strict";

const API_KEY = "8a75afd5b63343ab5746b4371bc4ad4d";

// Elements (only exist on some pages)
const weatherForm = document.getElementById("weather-form");
const cityInput = document.getElementById("city-input");
const weatherResult = document.getElementById("weather-result");
const weatherAlertBox = document.getElementById("weather-alert");

// Track last searched city so we can auto-refresh
let lastCitySearched = "";
let refreshTimerId = null;

// Change this if you want faster/slower updates:
const AUTO_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

function nowTimeString() {
    const d = new Date();
    return d.toLocaleString();
}
/** Build alert object from weather data */
function buildAlert(data) {
    const name = data.name || "this location";
    const temp = Number(data.main?.temp);
    const wind = Number(data.wind?.speed);
    const weatherId = Number(data.weather?.[0]?.id || 0);
    const main = data.weather?.[0]?.main || "";
    const desc = data.weather?.[0]?.description || "";

    // Defaults
    let type = "info";       
    let title = "No severe alerts";
    let icon = "images/sun.png"; 
    const messages = [];

    // Thunderstorm (2xx)
    if (weatherId >= 200 && weatherId < 300) {
        type = "severe";
        title = "Severe Weather Alert";
        icon = "image/humidity.png";
        messages.push("Thunderstorm detected. Stay indoors and avoid open areas if possible.");
    }

    // Rain 
    if (weatherId >= 500 && weatherId < 600) {
        if (type !== "severe") type = "warning";
        title = type === "severe" ? "Severe Weather Alert" : "Weather Warning";
        icon = "image/rain.png";
        messages.push("Rain detected. Roads may be slippery — allow extra travel time.");
    }

    // Snow 
    if (weatherId >= 600 && weatherId < 700) {
        if (type !== "severe") type = "warning";
        title = "Weather Warning";
        icon = "image/snoe.png";
        messages.push("Snow/cold conditions detected. Watch for ice and dress warmly.");
    }

    // Heat
    if (!Number.isNaN(temp) && temp >= 35) {
        if (temp >= 40) {
            type = "severe";
            title = "Severe Heat Alert";
        } else if (type !== "severe") {
            type = "warning";
            title = "Heat Warning";
        }
        icon = "image/clear.png";
        messages.push(`High temperature around ${Math.round(temp)}°C. Stay hydrated and avoid direct sun.`);
    }

    // Wind
    if (!Number.isNaN(wind) && wind >= 15) {
        if (type !== "severe") type = "warning";
        title = "Wind Warning";
        icon = "image/wind2.png";
        messages.push("Strong wind expected. Secure loose outdoor items and take care when travelling.");
    }

    // If no messages, keep info + friendly note
    if (messages.length === 0) {
        return {
            type: "info",
            title: "No severe alerts",
            icon: "image/sun.webp",
            meta: `Updated: ${nowTimeString()}`,
            messages: [`No major weather alerts right now for ${name}.`],
        };
    }

    return {
        type,
        title: `${title} for ${name}`,
        icon,
        meta: `Condition: ${main} (${desc}) · Updated: ${nowTimeString()}`,
        messages,
    };
}
/** Render alert card */
function renderAlert(alert) {
    if (!weatherAlertBox) return;

    if (!alert) {
        weatherAlertBox.innerHTML = "";
        return;
    }

    const items = alert.messages.map(m => `<li>${m}</li>`).join("");

    weatherAlertBox.innerHTML = `
        <div class="weather-alert-card ${alert.type}">
            <img class="weather-alert-icon" src="${alert.icon}" alt="Weather alert icon">
            <div class="weather-alert-content">
                <div class="weather-alert-title">${alert.title}</div>
                <div class="weather-alert-meta">${alert.meta || ""}</div>
                <ul class="weather-alert-details">
                    ${items}
                </ul>
            </div>
        </div>
    `;
}

/** Fetch weather data for a city and render results + alerts */
async function fetchWeather(city) {
    if (!weatherResult) return;

    if (!API_KEY) {
        weatherResult.innerHTML = `
            <div class="weather-result-card error">
                API key missing in <code>main.js</code>.
            </div>
        `;
        renderAlert(null);
        return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
    )}&units=metric&appid=${API_KEY}`;

    try {
        weatherResult.innerHTML = `
            <div class="weather-result-card loading">
                Loading weather...
            </div>
        `;
        renderAlert(null);

        const res = await fetch(url);
        if (!res.ok) throw new Error("City not found");

        const data = await res.json();

        lastCitySearched = data.name || city;

        const name = data.name;
        const temp = Math.round(data.main.temp);
        const desc = data.weather[0]?.description || "";
        const feels = Math.round(data.main.feels_like);
        const humidity = data.main.humidity;

        weatherResult.innerHTML = `
            <article class="weather-result-card">
                <h4>${name}</h4>
                <p class="weather-main">${temp}°C – ${desc}</p>
                <p class="weather-extra">Feels like ${feels}°C · Humidity ${humidity}%</p>
            </article>
        `;

        // Alert card with icon
        const alert = buildAlert(data);
        renderAlert(alert);
    } catch (err) {
        weatherResult.innerHTML = `
            <div class="weather-result-card error">
                Sorry, we couldn't find weather for "<strong>${city}</strong>".
            </div>
        `;
        renderAlert(null);
        console.error(err);
    }
}

/* Auto refresh: re-fetch the last city every AUTO_REFRESH_MS */
function startAutoRefresh() {
    if (refreshTimerId) clearInterval(refreshTimerId);

    refreshTimerId = setInterval(() => {
        if (lastCitySearched) {
            fetchWeather(lastCitySearched);
        }
    }, AUTO_REFRESH_MS);
}
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && lastCitySearched) {
        fetchWeather(lastCitySearched);
    }
});

if (weatherForm && cityInput) {
    weatherForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (!city) return;
        fetchWeather(city);
        startAutoRefresh();
    });
}

// Popular locations buttons
document.querySelectorAll(".location-details-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const card = btn.closest(".location-card");
        const city = card?.dataset.city;
        if (!city) return;

        if (cityInput) cityInput.value = city;
        fetchWeather(city);
        startAutoRefresh();
        if (weatherForm) {
            window.scrollTo({ top: weatherForm.offsetTop - 80, behavior: "smooth" });
        }
    });
});

// Contact form validation
const contactForm = document.getElementById("contact-form");
const nameInputContact = document.getElementById("name");
const emailInputContact = document.getElementById("email");
const messageInputContact = document.getElementById("message");

const nameError = document.getElementById("name-error");
const emailError = document.getElementById("email-error");
const messageError = document.getElementById("message-error");
const contactStatus = document.getElementById("contact-status");

function validEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();

        let ok = true;

        if (!nameInputContact.value.trim()) {
            nameError.textContent = "Name is required.";
            ok = false;
        } else nameError.textContent = "";

        if (!emailInputContact.value.trim()) {
            emailError.textContent = "Email is required.";
            ok = false;
        } else if (!validEmail(emailInputContact.value.trim())) {
            emailError.textContent = "Enter a valid email.";
            ok = false;
        } else emailError.textContent = "";

        if (!messageInputContact.value.trim()) {
            messageError.textContent = "Message cannot be empty.";
            ok = false;
        } else messageError.textContent = "";

        if (!ok) {
            contactStatus.textContent = "";
            return;
        }

        contactStatus.textContent = "Thank you! Your message has been submitted.";
        contactForm.reset();
    });
}

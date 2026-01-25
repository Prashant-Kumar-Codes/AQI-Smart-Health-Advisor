// ========== Global State ==========
let currentAQIData = null;
let map = null;
let selectedLatLng = null;
let aiAdvisorData = {
    age: null,
    conditions: [],
    location: '',
    customQuestion: ''
};

// ========== UI State Management ==========
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('nearestAlert').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.innerHTML = `<strong>⚠️ Error:</strong> ${message}`;
    errorDiv.style.display = 'block';
    hideLoading();
}

function showSuccess() {
    hideLoading();
    document.getElementById('results').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('results').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

function showNearestAlert(stationName, originalSearch, distance) {
    const alertDiv = document.getElementById('nearestAlert');
    const infoSpan = document.getElementById('nearestStationInfo');
    const distanceDiv = document.getElementById('distanceInfo');
    
    infoSpan.innerHTML = `Could not find exact data for "<strong>${originalSearch}</strong>". Showing data from: <strong>${stationName}</strong>`;
    
    if (distance && distance !== 'Unknown') {
        const distanceNum = parseFloat(distance);
        let distanceText = '';
        let colorClass = '';
        
        if (distanceNum < 5) {
            distanceText = `📍 Distance: ${distance} km (Very close)`;
            colorClass = 'color: #059669;';
        } else if (distanceNum < 20) {
            distanceText = `📍 Distance: ${distance} km (Nearby)`;
            colorClass = 'color: #0891b2;';
        } else if (distanceNum < 50) {
            distanceText = `📍 Distance: ${distance} km (Moderate distance)`;
            colorClass = 'color: #f59e0b;';
        } else {
            distanceText = `⚠️ Distance: ${distance} km (Far - data may not be representative)`;
            colorClass = 'color: #dc2626;';
        }
        
        distanceDiv.innerHTML = `<span style="${colorClass}">${distanceText}</span>`;
    }
    
    alertDiv.style.display = 'flex';
}

function showAlternativeStations(stations) {
    if (!stations || stations.length === 0) {
        document.getElementById('alternativeStations').style.display = 'none';
        return;
    }
    
    const container = document.getElementById('alternativeStations');
    const listDiv = document.getElementById('alternativeStationsList');
    
    listDiv.innerHTML = '';
    
    stations.forEach(station => {
        const stationDiv = document.createElement('div');
        stationDiv.className = 'station-option';
        stationDiv.onclick = () => loadStationData(station.uid);
        
        const distance = station.distance !== 'Unknown' ? `${station.distance} km away` : 'Distance unknown';
        
        stationDiv.innerHTML = `
            <span class="station-name">${station.name}</span>
            <span class="station-distance">${distance}</span>
        `;
        
        listDiv.appendChild(stationDiv);
    });
    
    container.style.display = 'block';
}

async function loadStationData(uid) {
    showLoading();
    
    try {
        const response = await fetch(`/api/aqi/station/${uid}`);
        const data = await response.json();
        
        if (response.ok && !data.error) {
            document.getElementById('alternativeStations').style.display = 'none';
            displayAQIData(data);
            await fetchAIRecommendation(data.aqi);
        } else {
            showError('Failed to load station data. Please try again.');
        }
    } catch (error) {
        showError('Failed to load station data.');
        console.error('Error:', error);
    }
}

function hideNearestAlert() {
    document.getElementById('nearestAlert').style.display = 'none';
    document.getElementById('alternativeStations').style.display = 'none';
}

// ========== Search Functions ==========
function quickSearch(city) {
    document.getElementById('locationInput').value = city;
    searchAQI();
}

async function searchAQI() {
    const location = document.getElementById('locationInput').value.trim();
    
    if (!location) {
        showError('Please enter a city name or location');
        return;
    }

    showLoading();
    hideNearestAlert();

    try {
        const response = await fetch(`/api/aqi/city/${encodeURIComponent(location)}`);
        const data = await response.json();

        if (response.ok && !data.error) {
            if (data.is_nearest && data.nearest_info) {
                showNearestAlert(
                    data.nearest_info.station_name, 
                    data.nearest_info.original_search,
                    data.nearest_info.distance || data.distance_km
                );
            }
            
            if (data.alternative_stations && data.alternative_stations.length > 0) {
                showAlternativeStations(data.alternative_stations);
            }
            
            displayAQIData(data);
            await fetchAIRecommendation(data.aqi);
        } else {
            showError(data.error || 'Location not found. Please try another city or use your current location.');
        }
    } catch (error) {
        showError('Failed to fetch air quality data. Please check your internet connection and try again.');
        console.error('Error:', error);
    }
}

async function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser. Please enter a city name manually.');
        return;
    }

    showLoading();
    hideNearestAlert();

    const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                console.log(`Getting AQI for coordinates: ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
                
                const response = await fetch(`/api/aqi/geo?lat=${latitude}&lng=${longitude}`);
                const data = await response.json();

                if (response.ok && !data.error) {
                    if (data.is_nearest && data.nearest_info) {
                        showNearestAlert(
                            data.nearest_info.station_name, 
                            data.nearest_info.original_search,
                            data.nearest_info.distance || data.distance_km
                        );
                    }
                    
                    if (data.alternative_stations && data.alternative_stations.length > 0) {
                        showAlternativeStations(data.alternative_stations);
                    }
                    
                    displayAQIData(data);
                    
                    if (data.city && data.city.name) {
                        document.getElementById('locationInput').value = data.city.name;
                        document.getElementById('aiAdvisorLocation').value = data.city.name;
                        aiAdvisorData.location = data.city.name;
                    }
                    
                    await fetchAIRecommendation(data.aqi);
                } else {
                    showError(data.error || 'No air quality monitoring station found near your location.');
                }
            } catch (error) {
                showError('Failed to fetch air quality data for your location.');
                console.error('Error:', error);
            }
        },
        (error) => {
            let errorMessage = 'Unable to retrieve your location. ';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
            }
            
            showError(errorMessage);
        },
        options
    );
}

// ========== Map Functions ==========
function openMapSelector() {
    document.getElementById('mapOverlay').style.display = 'flex';
    
    if (!map) {
        setTimeout(() => {
            map = L.map('mapSelector').setView([28.6139, 77.2090], 5);
            
            // Use English-labeled tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            map.on('click', async function(e) {
                selectedLatLng = e.latlng;
                
                // Fetch location name in English immediately
                try {
                    // Using Nominatim API with explicit English language parameter
                    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=en&addressdetails=1`;
                    const response = await fetch(geocodeUrl);
                    const data = await response.json();
                    
                    // Extract location name in English, prioritizing city/town/village
                    let locationName = data.address?.city || 
                                      data.address?.town || 
                                      data.address?.village || 
                                      data.address?.municipality ||
                                      data.address?.county ||
                                      data.address?.state || 
                                      data.address?.country ||
                                      'Selected Location';
                    
                    // Store the English name
                    selectedLatLng.englishName = locationName;
                    
                    if (window.mapMarker) {
                        map.removeLayer(window.mapMarker);
                    }
                    
                    window.mapMarker = L.marker([e.latlng.lat, e.latlng.lng])
                        .bindPopup(`<b>${locationName}</b><br>${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`)
                        .addTo(map)
                        .openPopup();
                    
                    document.getElementById('mapCoordinates').textContent = 
                        `Selected: ${locationName} (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;
                    document.getElementById('confirmLocationBtn').disabled = false;
                } catch (error) {
                    console.error('Geocoding error:', error);
                    // Fallback to coordinates only
                    if (window.mapMarker) {
                        map.removeLayer(window.mapMarker);
                    }
                    window.mapMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
                    document.getElementById('mapCoordinates').textContent = 
                        `Selected: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
                    document.getElementById('confirmLocationBtn').disabled = false;
                }
            });
        }, 100);
    }
}

function closeMapSelector() {
    document.getElementById('mapOverlay').style.display = 'none';
}

async function confirmMapLocation() {
    if (!selectedLatLng) return;
    
    closeMapSelector();
    showLoading();
    hideNearestAlert();
    
    try {
        // Get English location name - use stored one or fetch fresh
        let locationName = selectedLatLng.englishName || '';
        
        if (!locationName) {
            try {
                const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedLatLng.lat}&lon=${selectedLatLng.lng}&accept-language=en&addressdetails=1`;
                const geoResponse = await fetch(geocodeUrl);
                const geoData = await geoResponse.json();
                
                // Extract city name in English with multiple fallback options
                locationName = geoData.address?.city || 
                              geoData.address?.town || 
                              geoData.address?.village || 
                              geoData.address?.municipality ||
                              geoData.address?.county ||
                              geoData.address?.state || 
                              geoData.address?.country ||
                              geoData.display_name?.split(',')[0] || 
                              'Selected Location';
            } catch (geoError) {
                console.log('Geocoding error:', geoError);
                locationName = 'Selected Location';
            }
        }
        
        const response = await fetch(`/api/aqi/geo?lat=${selectedLatLng.lat}&lng=${selectedLatLng.lng}`);
        const data = await response.json();

        if (response.ok && !data.error) {
            if (data.is_nearest && data.nearest_info) {
                showNearestAlert(
                    data.nearest_info.station_name, 
                    data.nearest_info.original_search,
                    data.nearest_info.distance || data.distance_km
                );
            }
            
            if (data.alternative_stations && data.alternative_stations.length > 0) {
                showAlternativeStations(data.alternative_stations);
            }
            
            displayAQIData(data);
            
            // Update location inputs with English name - prefer API name, fallback to geocoded name
            const displayName = data.city?.name || locationName;
            document.getElementById('locationInput').value = displayName;
            document.getElementById('aiAdvisorLocation').value = displayName;
            aiAdvisorData.location = displayName;
            
            await fetchAIRecommendation(data.aqi);
        } else {
            showError(data.error || 'No monitoring station found at this location.');
        }
    } catch (error) {
        showError('Failed to fetch air quality data for selected location.');
        console.error('Error:', error);
    }
}


// ========== AI Recommendation Functions ==========
async function fetchAIRecommendation(aqi) {
    try {
        const requestData = {
            aqi: aqi,
            conditions: []
        };

        const response = await fetch('/api/aqi/ai-recommendation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            const data = await response.json();
            displayCustomRecommendation(data.recommendation);
        } else {
            displayCustomRecommendation(getDefaultRecommendation(aqi));
        }
    } catch (error) {
        console.error('AI Recommendation error:', error);
        displayCustomRecommendation(getDefaultRecommendation(aqi));
    }
}

function displayCustomRecommendation(recommendation) {
    const recommendationElement = document.getElementById('customRecommendation');
    recommendationElement.textContent = recommendation;
}

function getDefaultRecommendation(aqi) {
    if (aqi <= 50) {
        return "🌟 Excellent news! The air quality today is outstanding. Perfect for outdoor activities and exercise!";
    } else if (aqi <= 100) {
        return "👍 Air quality is acceptable for most people. You can proceed with normal outdoor activities.";
    } else if (aqi <= 150) {
    return "⚠️ Sensitive individuals should take precautions. Consider reducing prolonged outdoor activities.";
    } else if (aqi <= 200) {
    return "🚨 Air quality is unhealthy for everyone. Reduce outdoor activities and consider wearing masks.";
    } else if (aqi <= 300) {
    return "⛔ Very unhealthy air! Everyone should minimize outdoor exposure. Use air purifiers indoors.";
    } else {
    return "☠️ HAZARDOUS CONDITIONS - Health emergency! Stay indoors with sealed windows. Seek medical help if needed.";
    }
}
// ========== AQI Category Functions ==========
function getAQICategory(aqi) {
    if (aqi <= 50) return { category: 'Good', class: 'aqi-good' };
    if (aqi <= 100) return { category: 'Moderate', class: 'aqi-moderate' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', class: 'aqi-unhealthy-sensitive' };
    if (aqi <= 200) return { category: 'Unhealthy', class: 'aqi-unhealthy' };
    if (aqi <= 300) return { category: 'Very Unhealthy', class: 'aqi-very-unhealthy' };
    return { category: 'Hazardous', class: 'aqi-hazardous' };
}
function updateBodyBackground(aqiClass) {
    const body = document.body;
    body.className = '';
    if (aqiClass === 'aqi-good') {
        body.classList.add('aqi-good-bg');
    } else if (aqiClass === 'aqi-moderate') {
        body.classList.add('aqi-moderate-bg');
    } else if (aqiClass === 'aqi-unhealthy-sensitive') {
        body.classList.add('aqi-unhealthy-sensitive-bg');
    } else if (aqiClass === 'aqi-unhealthy') {
        body.classList.add('aqi-unhealthy-bg');
    } else if (aqiClass === 'aqi-very-unhealthy') {
        body.classList.add('aqi-very-unhealthy-bg');
    } else if (aqiClass === 'aqi-hazardous') {
        body.classList.add('aqi-hazardous-bg');
    }
}
function getRecommendations(aqi) {
    if (aqi <= 50) {
        return [
        { icon: '✅', title: 'Excellent Air Quality', desc: 'Perfect time to enjoy the outdoors!' },
        { icon: '🏃', title: 'Perfect for Outdoor Activities', desc: 'Great conditions for exercise and sports.' },
        { icon: '🪟', title: 'Fresh Air Ventilation', desc: 'Open windows to circulate fresh air.' },
        { icon: '👨‍👩‍👧‍👦', title: 'Safe for Everyone', desc: 'Air quality poses no risk to any groups.' }
        ];
    } else if (aqi <= 100) {
        return [
        { icon: '⚠️', title: 'Moderate Air Quality', desc: 'Acceptable for most people.' },
        { icon: '🏃', title: 'Generally Safe Activities', desc: 'Most can enjoy normal outdoor activities.' },
        { icon: '👶', title: 'Sensitive Groups Monitor', desc: 'Watch for symptoms if sensitive.' },
        { icon: '🪟', title: 'Moderate Ventilation', desc: 'Safe to open windows moderately.' }
        ];
    } else if (aqi <= 150) {
        return [
        { icon: '⚠️', title: 'Unhealthy for Sensitive Groups', desc: 'Vulnerable groups may experience effects.' },
        { icon: '😷', title: 'Masks Recommended', desc: 'Sensitive individuals should wear N95 masks.' },
        { icon: '🏠', title: 'Limit Outdoor Exposure', desc: 'Reduce prolonged outdoor activities.' },
        { icon: '🪟', title: 'Keep Windows Closed', desc: 'Prevent outdoor air from entering.' },
        { icon: '💊', title: 'Monitor Symptoms', desc: 'Have rescue medications available.' }
        ];
    } else if (aqi <= 200) {
        return [
        { icon: '🚨', title: 'Unhealthy Air Quality', desc: 'Everyone may experience health effects.' },
        { icon: '😷', title: 'Masks Essential Outdoors', desc: 'Everyone should wear N95/KN95 masks.' },
        { icon: '🏠', title: 'Stay Indoors', desc: 'Avoid all outdoor activities.' },
        { icon: '💨', title: 'Use Air Purifiers', desc: 'Run HEPA purifiers indoors.' },
        { icon: '🚫', title: 'Cancel Outdoor Events', desc: 'Postpone outdoor activities.' },
        { icon: '💊', title: 'Health Monitoring', desc: 'Watch for respiratory symptoms.' }
        ];
    } else if (aqi <= 300) {
        return [
        { icon: '🚨', title: 'Very Unhealthy Air', desc: 'Significant health risk for everyone.' },
        { icon: '🏠', title: 'Mandatory Indoor Stay', desc: 'Everyone should stay indoors.' },
        { icon: '😷', title: 'N95/N99 Masks Required', desc: 'Proper respirators essential if outside.' },
        { icon: '💨', title: 'Air Purification Critical', desc: 'Keep purifiers running continuously.' },
        { icon: '🏥', title: 'Health Vigilance', desc: 'Monitor for severe symptoms.' },
        { icon: '🚗', title: 'Avoid Vehicle Emissions', desc: 'Limit driving to reduce pollution.' },
        { icon: '📞', title: 'Emergency Contacts Ready', desc: 'Have medical contacts available.' }
        ];
    } else {
        return [
        { icon: '☠️', title: 'Hazardous - Emergency', desc: 'Severe health warning for everyone.' },
        { icon: '🚫', title: 'Do NOT Go Outside', desc: 'Public health emergency - stay indoors!' },
        { icon: '💨', title: 'Maximum Air Purification', desc: 'Run multiple HEPA purifiers.' },
        { icon: '😷', title: 'Emergency Masks Only', desc: 'N95/N99/P100 respirators if evacuation needed.' },
        { icon: '🏥', title: 'Medical Emergency Protocol', desc: 'Seek immediate help for symptoms.' },
        { icon: '📞', title: 'Emergency Services', desc: 'Consider evacuation if high-risk.' },
        { icon: '🚨', title: 'Follow Official Guidance', desc: 'Monitor emergency broadcasts.' },
        { icon: '👥', title: 'Check on Vulnerable People', desc: 'Ensure neighbors have protection.' }
        ];
    }
}
// ========== Data Display Functions ==========
function displayAQIData(data) {
    currentAQIData = data;
    const cityName = data.city?.name || 'Unknown Location';
    document.getElementById('cityName').textContent = cityName;

    const updateTime = data.time?.s || 'Unknown';
    document.getElementById('updateTimeText').textContent = `Updated: ${updateTime}`;

    const aqi = data.aqi || 0;
    const aqiInfo = getAQICategory(aqi);

    const aqiDisplay = document.getElementById('aqiDisplay');
    aqiDisplay.className = `aqi-display-pro ${aqiInfo.class}`;
    document.getElementById('aqiValue').textContent = aqi;
    document.getElementById('aqiCategory').textContent = aqiInfo.category;

    updateBodyBackground(aqiInfo.class);

    displayWeatherInfo(data.iaqi, data.enhanced_weather);
    displayPollutants(data.iaqi);
    displayDominantPollutant(data.dominentpol);
    displayRecommendations(aqi);

    showSuccess();
}
function displayWeatherInfo(iaqi, enhancedWeather) {
    const weatherInfo = document.getElementById('weatherInfo');
    weatherInfo.innerHTML = '';
    if (!iaqi) {
        weatherInfo.innerHTML = '<p style="text-align: center; color: #6b7280;">Weather data not available</p>';
        return;
    }

    const roundValue = (val, decimals = 1) => {
        if (val === undefined || val === null) return 'N/A';
        return typeof val === 'number' ? val.toFixed(decimals) : val;
    };

    const weatherData = [
        { label: 'Temperature', value: iaqi.t?.v !== undefined ? `${roundValue(iaqi.t.v, 1)}°C` : 'N/A', icon: '🌡️' },
        { label: 'Humidity', value: iaqi.h?.v !== undefined ? `${roundValue(iaqi.h.v, 1)}%` : 'N/A', icon: '💧' },
        { label: 'Pressure', value: iaqi.p?.v !== undefined ? `${roundValue(iaqi.p.v, 1)} hPa` : 'N/A', icon: '📽' },
        { label: 'Wind Speed', value: iaqi.w?.v !== undefined ? `${roundValue(iaqi.w.v, 1)} m/s` : 'N/A', icon: '💨' }
    ];

    if (enhancedWeather && enhancedWeather.description) {
        weatherData.push({
            label: 'Conditions',
            value: enhancedWeather.description.charAt(0).toUpperCase() + enhancedWeather.description.slice(1),
            icon: '🌤️'
        });
    }

    weatherData.forEach(item => {
        const weatherItem = document.createElement('div');
        weatherItem.className = 'weather-item';
        weatherItem.innerHTML = `
            <div class="weather-item-label">${item.icon} ${item.label}</div>
            <div class="weather-item-value">${item.value}</div>
        `;
        weatherInfo.appendChild(weatherItem);
    });
}

function displayPollutants(iaqi) {
    const pollutantsGrid = document.getElementById('pollutantsGrid');
    pollutantsGrid.innerHTML = '';
    if (!iaqi) {
        pollutantsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6b7280;">Pollutant data not available</p>';
        return;
    }

    const roundValue = (val, decimals = 1) => {
        if (val === undefined || val === null) return 'N/A';
        return typeof val === 'number' ? val.toFixed(decimals) : val;
    };

    const pollutantMapping = {
        pm25: { name: 'PM2.5', unit: 'µg/m³', desc: 'Fine Particles' },
        pm10: { name: 'PM10', unit: 'µg/m³', desc: 'Coarse Particles' },
        o3: { name: 'O₃', unit: 'ppb', desc: 'Ozone' },
        no2: { name: 'NO₂', unit: 'ppb', desc: 'Nitrogen Dioxide' },
        so2: { name: 'SO₂', unit: 'ppb', desc: 'Sulfur Dioxide' },
        co: { name: 'CO', unit: 'ppm', desc: 'Carbon Monoxide' }
    };

    let hasData = false;

    Object.keys(pollutantMapping).forEach(key => {
        if (iaqi[key]?.v !== undefined) {
            hasData = true;
            const pollutant = pollutantMapping[key];
            const card = document.createElement('div');
            card.className = 'pollutant-card';
            card.innerHTML = `
                <div class="pollutant-name">${pollutant.name}</div>
                <div class="pollutant-value">${roundValue(iaqi[key].v, 1)}</div>
                <div class="pollutant-unit">${pollutant.unit}</div>
            `;
            card.title = pollutant.desc;
            pollutantsGrid.appendChild(card);
        }
    });

    if (!hasData) {
        pollutantsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6b7280;">Detailed pollutant data not available</p>';
    }

}

function displayDominantPollutant(dominentpol) {
    const pollutantCard = document.getElementById('dominantPollutantCard');
    const pollutantText = document.getElementById('dominantPollutant');
    if (!dominentpol) {
        pollutantCard.style.display = 'none';
        return;
    }

    const pollutantNames = {
        pm25: 'PM2.5 (Fine Particulate Matter)',
        pm10: 'PM10 (Coarse Particulate Matter)',
        o3: 'Ozone (O₃)',
        no2: 'Nitrogen Dioxide (NO₂)',
        so2: 'Sulfur Dioxide (SO₂)',
        co: 'Carbon Monoxide (CO)'
    };

    const pollutantName = pollutantNames[dominentpol] || dominentpol.toUpperCase();

    pollutantCard.style.display = 'flex';
    pollutantText.innerHTML = `<strong>Primary Pollutant:</strong> ${pollutantName} is the dominant contributor to the current Air Quality Index.`;
}

function displayRecommendations(aqi) {
    const recommendations = getRecommendations(aqi);
    const recommendationsDiv = document.getElementById('recommendations');
    recommendationsDiv.innerHTML = '';
    recommendations.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'recommendation-item';
        item.innerHTML = `
            <div class="recommendation-icon">${rec.icon}</div>
            <div class="recommendation-text">
                <h4>${rec.title}</h4>
                <p>${rec.desc}</p>
            </div>
        `;
        recommendationsDiv.appendChild(item);
    });
    }
    // ========== Expandable Card Functions ==========
    function toggleCard(cardId) {
    const card = document.getElementById(cardId).parentElement;
    card.classList.toggle('expanded');
}

// ========== Event Listeners ==========
document.addEventListener('DOMContentLoaded', function() {
    const locationInput = document.getElementById('locationInput');
    const aiAdvisorLocationInput = document.getElementById('aiAdvisorLocation');
    const aiAdvisorAgeInput = document.getElementById('aiAdvisorAge');
    // Enter key to search
    locationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchAQI();
        }
    });

    // Sync location input changes between main input and AI advisor input
    locationInput.addEventListener('input', function() {
        const value = this.value;
        if (aiAdvisorLocationInput) {
            aiAdvisorLocationInput.value = value;
            aiAdvisorData.location = value;
        }
    });

    // Sync AI Advisor location input back to main
    if (aiAdvisorLocationInput) {
        aiAdvisorLocationInput.addEventListener('input', function() {
            const value = this.value;
            locationInput.value = value;
            aiAdvisorData.location = value;
        });
    }

    // Update age in data object when changed
    if (aiAdvisorAgeInput) {
        aiAdvisorAgeInput.addEventListener('input', function() {
            const age = parseInt(this.value);
            if (age && age >= 1 && age <= 120) {
                aiAdvisorData.age = age;
            }
        });
    }

    // Word count for custom question
    const customQuestion = document.getElementById('customQuestion');
    if (customQuestion) {
        customQuestion.addEventListener('input', updateWordCount);
    }

    locationInput.focus();
});
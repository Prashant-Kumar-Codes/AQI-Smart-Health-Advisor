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

// ========== Global Variables for Predictions ==========
let currentPredictionData = null;

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
    MessageManager.show(message, 'error');
    hideLoading();
    document.getElementById('results').style.display = 'none';
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
            distanceText = `<i class="fas fa-location-dot"></i> Distance: ${distance} km (Very close)`;
            colorClass = 'color: #059669;';
        } else if (distanceNum < 20) {
            distanceText = `<i class="fas fa-location-dot"></i> Distance: ${distance} km (Nearby)`;
            colorClass = 'color: #0891b2;';
        } else if (distanceNum < 50) {
            distanceText = `<i class="fas fa-location-dot"></i> Distance: ${distance} km (Moderate distance)`;
            colorClass = 'color: #f59e0b;';
        } else {
            distanceText = `<i class="fas fa-triangle-exclamation"></i> Distance: ${distance} km (Far - data may not be representative)`;
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
            
            // Fetch predictions for the station
            const cityName = data.city?.name;
            if (cityName) {
                await fetchAQIPrediction(cityName, null, null);
            }
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

// ========== Search Functions (Using Centralized LocationService) ==========
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
    hidePredictionSection();  // Hide predictions before new search

    try {
        console.log('🔍 Using centralized LocationService for location search');
        
        // ✅ Use centralized LocationService
        const result = await LocationService.getAQIFromLocationName(location);
        
        currentAQIData = result.aqiData;
        
        // Check if showing nearest station
        if (result.aqiData.is_nearest && result.aqiData.nearest_info) {
            showNearestAlert(
                result.aqiData.nearest_info.station_name, 
                result.aqiData.nearest_info.original_search,
                result.aqiData.nearest_info.distance || result.aqiData.distance_km
            );
        }
        
        if (result.aqiData.alternative_stations && result.aqiData.alternative_stations.length > 0) {
            showAlternativeStations(result.aqiData.alternative_stations);
        }
        
        displayAQIData(result.aqiData);
        await fetchAIRecommendation(result.aqiData.aqi);
        
        // Fetch predictions after successful search
        await fetchAQIPrediction(location, null, null);
        
        MessageManager.show(`AQI data & graph loaded for ${result.location.displayName}`, 'success');
        
    } catch (error) {
        console.error('❌ Search error:', error);
        showError(error.message || 'Location not found. Please try another city or use your current location.');
    }
}

async function getCurrentLocation() {
    showLoading();
    hideNearestAlert();
    hidePredictionSection();  // Hide predictions before getting new location

    try {
        console.log('📡 Using centralized LocationService for current location');
        
        // ✅ Use centralized LocationService
        const result = await LocationService.getAQIFromCurrentLocation();
        
        currentAQIData = result.aqiData;
        
        // Check if showing nearest station
        if (result.aqiData.is_nearest && result.aqiData.nearest_info) {
            showNearestAlert(
                result.aqiData.nearest_info.station_name, 
                result.aqiData.nearest_info.original_search,
                result.aqiData.nearest_info.distance || result.aqiData.distance_km
            );
        }
        
        if (result.aqiData.alternative_stations && result.aqiData.alternative_stations.length > 0) {
            showAlternativeStations(result.aqiData.alternative_stations);
        }
        
        displayAQIData(result.aqiData);
        
        // Update location inputs with detected location name
        const displayName = result.location.displayName;
        document.getElementById('locationInput').value = displayName;
        
        const aiAdvisorLocationInput = document.getElementById('aiAdvisorLocation');
        if (aiAdvisorLocationInput) {
            aiAdvisorLocationInput.value = displayName;
            aiAdvisorData.location = displayName;
        }
        
        await fetchAIRecommendation(result.aqiData.aqi);
        
        // Fetch predictions after getting location
        await fetchAQIPrediction(displayName, result.location.lat, result.location.lng);
        
        MessageManager.show(`Location detected: ${displayName}`, 'success');
        
    } catch (error) {
        console.error('❌ Current location error:', error);
        showError(error.message);
    }
}

// ========== Map Functions ==========
function openMapSelector() {
    document.getElementById('mapOverlay').style.display = 'flex';
    
    if (!map) {
        setTimeout(() => {
            map = L.map('mapSelector').setView([28.6139, 77.2090], 5);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            map.on('click', async function(e) {
                selectedLatLng = e.latlng;
                
                try {
                    console.log('📍 Using centralized LocationService for reverse geocoding');
                    
                    // ✅ Use centralized LocationService for reverse geocoding
                    const locationInfo = await LocationService.getNameFromCoordinates(
                        e.latlng.lat, 
                        e.latlng.lng
                    );
                    
                    const locationName = locationInfo.displayName;
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
                    console.error('Reverse geocoding error:', error);
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
    hidePredictionSection();  // Hide predictions before confirming map location
    
    try {
        console.log('🗺️ Fetching AQI data for map location:', selectedLatLng);
        
        // Fetch AQI for selected coordinates
        const coordResult = await fetch(`/api/aqi/geo?lat=${selectedLatLng.lat}&lng=${selectedLatLng.lng}`);
        const data = await coordResult.json();
        
        if (coordResult.ok && !data.error) {
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
            
            // Get location name
            let locationName = selectedLatLng.englishName;
            
            if (!locationName) {
                try {
                    const locationInfo = await LocationService.getNameFromCoordinates(
                        selectedLatLng.lat,
                        selectedLatLng.lng
                    );
                    locationName = locationInfo.displayName;
                } catch (error) {
                    locationName = data.city?.name || 'Selected Location';
                }
            }
            
            // Update location inputs with English name
            const displayName = data.city?.name || locationName;
            document.getElementById('locationInput').value = displayName;
            
            const aiAdvisorLocationInput = document.getElementById('aiAdvisorLocation');
            if (aiAdvisorLocationInput) {
                aiAdvisorLocationInput.value = displayName;
                aiAdvisorData.location = displayName;
            }
            
            await fetchAIRecommendation(data.aqi);
            
            // Fetch predictions after confirming location
            await fetchAQIPrediction(displayName, selectedLatLng.lat, selectedLatLng.lng);
            
            MessageManager.show(`AQI data & graph loaded for ${displayName}`, 'success');
        } else {
            showError(data.error || 'No monitoring station found at this location.');
        }
    } catch (error) {
        console.error('❌ Map location error:', error);
        showError('Failed to fetch air quality data for selected location.');
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
        return "Excellent news! The air quality today is outstanding. Perfect for outdoor activities and exercise!";
    } else if (aqi <= 100) {
        return "Air quality is acceptable for most people. You can proceed with normal outdoor activities.";
    } else if (aqi <= 150) {
        return "Sensitive individuals should take precautions. Consider reducing prolonged outdoor activities.";
    } else if (aqi <= 200) {
        return "Air quality is unhealthy for everyone. Reduce outdoor activities and consider wearing masks.";
    } else if (aqi <= 300) {
        return "Very unhealthy air! Everyone should minimize outdoor exposure. Use air purifiers indoors.";
    } else {
        return "HAZARDOUS CONDITIONS - Health emergency! Stay indoors with sealed windows. Seek medical help if needed.";
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
            { icon: '<i class="fas fa-circle-check"></i>', title: 'Excellent Air Quality', desc: 'Perfect time to enjoy the outdoors!' },
            { icon: '<i class="fas fa-person-running"></i>', title: 'Perfect for Outdoor Activities', desc: 'Great conditions for exercise and sports.' },
            { icon: '<i class="fas fa-wind"></i>', title: 'Fresh Air Ventilation', desc: 'Open windows to circulate fresh air.' },
            { icon: '<i class="fas fa-users"></i>', title: 'Safe for Everyone', desc: 'Air quality poses no risk to any groups.' }
        ];
    } else if (aqi <= 100) {
        return [
            { icon: '<i class="fas fa-triangle-exclamation"></i>', title: 'Moderate Air Quality', desc: 'Acceptable for most people.' },
            { icon: '<i class="fas fa-person-walking"></i>', title: 'Generally Safe Activities', desc: 'Most can enjoy normal outdoor activities.' },
            { icon: '<i class="fas fa-child"></i>', title: 'Sensitive Groups Monitor', desc: 'Watch for symptoms if sensitive.' },
            { icon: '<i class="fas fa-border-all"></i>', title: 'Moderate Ventilation', desc: 'Safe to open windows moderately.' }
        ];
    } else if (aqi <= 150) {
        return [
            { icon: '<i class="fas fa-triangle-exclamation"></i>', title: 'Unhealthy for Sensitive Groups', desc: 'Vulnerable groups may experience effects.' },
            { icon: '<i class="fas fa-head-side-mask"></i>', title: 'Masks Recommended', desc: 'Sensitive individuals should wear N95 masks.' },
            { icon: '<i class="fas fa-house"></i>', title: 'Limit Outdoor Exposure', desc: 'Reduce prolonged outdoor activities.' },
            { icon: '<i class="fas fa-border-all"></i>', title: 'Keep Windows Closed', desc: 'Prevent outdoor air from entering.' },
            { icon: '<i class="fas fa-pills"></i>', title: 'Monitor Symptoms', desc: 'Have rescue medications available.' }
        ];
    } else if (aqi <= 200) {
        return [
            { icon: '<i class="fas fa-circle-exclamation"></i>', title: 'Unhealthy Air Quality', desc: 'Everyone may experience health effects.' },
            { icon: '<i class="fas fa-head-side-mask"></i>', title: 'Masks Essential Outdoors', desc: 'Everyone should wear N95/KN95 masks.' },
            { icon: '<i class="fas fa-house"></i>', title: 'Stay Indoors', desc: 'Avoid all outdoor activities.' },
            { icon: '<i class="fas fa-fan"></i>', title: 'Use Air Purifiers', desc: 'Run HEPA purifiers indoors.' },
            { icon: '<i class="fas fa-ban"></i>', title: 'Cancel Outdoor Events', desc: 'Postpone outdoor activities.' },
            { icon: '<i class="fas fa-heart-pulse"></i>', title: 'Health Monitoring', desc: 'Watch for respiratory symptoms.' }
        ];
    } else if (aqi <= 300) {
        return [
            { icon: '<i class="fas fa-circle-exclamation"></i>', title: 'Very Unhealthy Air', desc: 'Significant health risk for everyone.' },
            { icon: '<i class="fas fa-house-lock"></i>', title: 'Mandatory Indoor Stay', desc: 'Everyone should stay indoors.' },
            { icon: '<i class="fas fa-head-side-mask"></i>', title: 'N95/N99 Masks Required', desc: 'Proper respirators essential if outside.' },
            { icon: '<i class="fas fa-fan"></i>', title: 'Air Purification Critical', desc: 'Keep purifiers running continuously.' },
            { icon: '<i class="fas fa-hospital"></i>', title: 'Health Vigilance', desc: 'Monitor for severe symptoms.' },
            { icon: '<i class="fas fa-car"></i>', title: 'Avoid Vehicle Emissions', desc: 'Limit driving to reduce pollution.' },
            { icon: '<i class="fas fa-phone"></i>', title: 'Emergency Contacts Ready', desc: 'Have medical contacts available.' }
        ];
    } else {
        return [
            { icon: '<i class="fas fa-biohazard"></i>', title: 'Hazardous - Emergency', desc: 'Severe health warning for everyone.' },
            { icon: '<i class="fas fa-ban"></i>', title: 'Do NOT Go Outside', desc: 'Public health emergency - stay indoors!' },
            { icon: '<i class="fas fa-fan"></i>', title: 'Maximum Air Purification', desc: 'Run multiple HEPA purifiers.' },
            { icon: '<i class="fas fa-head-side-mask"></i>', title: 'Emergency Masks Only', desc: 'N95/N99/P100 respirators if evacuation needed.' },
            { icon: '<i class="fas fa-hospital-user"></i>', title: 'Medical Emergency Protocol', desc: 'Seek immediate help for symptoms.' },
            { icon: '<i class="fas fa-phone-flip"></i>', title: 'Emergency Services', desc: 'Consider evacuation if high-risk.' },
            { icon: '<i class="fas fa-bullhorn"></i>', title: 'Follow Official Guidance', desc: 'Monitor emergency broadcasts.' },
            { icon: '<i class="fas fa-people-roof"></i>', title: 'Check on Vulnerable People', desc: 'Ensure neighbors have protection.' }
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

    const aqiHeader = document.getElementById('aqiHeader');
    if (aqiHeader) {
        aqiHeader.className = `aqi-header-pro ${aqiInfo.class}`;
    }

    const aqiDisplay = document.getElementById('aqiDisplay');
    if (aqiDisplay) {
        aqiDisplay.className = `aqi-display-pro ${aqiInfo.class}`;
    }
    document.getElementById('aqiValue').textContent = aqi;
    document.getElementById('aqiCategory').textContent = aqiInfo.category;

    updateBodyBackground(aqiInfo.class);

    displayWeatherInfo(data.weather, data.iaqi, data.enhanced_weather);
    displayPollutants(data.iaqi);
    displayDominantPollutant(data.dominentpol);
    displayRecommendations(aqi);

    showSuccess();
}

function displayWeatherInfo(weather, iaqi, enhancedWeather) {
    const weatherInfo = document.getElementById('weatherInfo');
    weatherInfo.innerHTML = '';
    
    const w = weather || {};
    const ia = iaqi || {};

    const roundValue = (val, decimals = 1) => {
        if (val === undefined || val === null) return 'N/A';
        return typeof val === 'number' ? val.toFixed(decimals) : val;
    };

    const getVal = (weatherVal, iaqiKey, unit) => {
        if (weatherVal !== undefined && weatherVal !== null) {
            return `${roundValue(weatherVal, 1)}${unit}`;
        }
        if (ia[iaqiKey]?.v !== undefined && ia[iaqiKey]?.v !== null) {
            return `${roundValue(ia[iaqiKey].v, 1)}${unit}`;
        }
        return 'N/A';
    };

    const temp = getVal(w.temperature, 't', '°C');
    const hum = getVal(w.humidity, 'h', '%');
    const press = getVal(w.pressure, 'p', ' hPa');
    const wind = getVal(w.wind_speed, 'w', ' m/s');

    const weatherData = [
        { label: 'Temperature', value: temp, icon: '<i class="fas fa-temperature-half"></i>', color: '#f97316' },
        { label: 'Humidity', value: hum, icon: '<i class="fas fa-droplet"></i>', color: '#3b82f6' },
        { label: 'Pressure', value: press, icon: '<i class="fas fa-gauge-high"></i>', color: '#8b5cf6' },
        { label: 'Wind Speed', value: wind, icon: '<i class="fas fa-wind"></i>', color: '#06b6d4' }
    ];

    let conditionsVal = null;
    if (w.conditions) {
        conditionsVal = w.conditions;
    } else if (enhancedWeather && enhancedWeather.description) {
        conditionsVal = enhancedWeather.description;
    }

    if (conditionsVal) {
        weatherData.push({
            label: 'Conditions',
            value: conditionsVal.charAt(0).toUpperCase() + conditionsVal.slice(1),
            icon: '<i class="fas fa-cloud-sun"></i>',
            color: '#eab308'
        });
    }

    weatherData.forEach(item => {
        const weatherItem = document.createElement('div');
        weatherItem.className = 'weather-item';
        weatherItem.innerHTML = `
            <div class="weather-item-icon" style="background: ${item.color}18; color: ${item.color};">
                ${item.icon}
            </div>
            <div class="weather-item-content">
                <div class="weather-item-label">${item.label}</div>
                <div class="weather-item-value">${item.value}</div>
            </div>
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
        pm25: { name: 'PM2.5', unit: 'µg/m³', desc: 'Fine Particles', icon: 'fa-smog', color: '#ef4444' },
        pm10: { name: 'PM10', unit: 'µg/m³', desc: 'Coarse Particles', icon: 'fa-cloud-meatball', color: '#f97316' },
        o3: { name: 'O₃', unit: 'ppb', desc: 'Ozone', icon: 'fa-sun', color: '#eab308' },
        no2: { name: 'NO₂', unit: 'ppb', desc: 'Nitrogen Dioxide', icon: 'fa-industry', color: '#10b981' },
        so2: { name: 'SO₂', unit: 'ppb', desc: 'Sulfur Dioxide', icon: 'fa-cloud', color: '#8b5cf6' },
        co: { name: 'CO', unit: 'ppm', desc: 'Carbon Monoxide', icon: 'fa-car-side', color: '#06b6d4' }
    };

    let hasData = false;

    Object.keys(pollutantMapping).forEach(key => {
        if (iaqi[key]?.v !== undefined) {
            hasData = true;
            const pollutant = pollutantMapping[key];
            const card = document.createElement('div');
            card.className = 'pollutant-card';
            card.innerHTML = `
                <div class="pollutant-card-header">
                    <span class="pollutant-name">${pollutant.name}</span>
                    <span class="pollutant-icon-badge" style="background: ${pollutant.color}18; color: ${pollutant.color};">
                        <i class="fas ${pollutant.icon}"></i>
                    </span>
                </div>
                <div class="pollutant-card-body">
                    <div class="pollutant-value">${roundValue(iaqi[key].v, 1)}</div>
                    <div class="pollutant-unit">${pollutant.unit}</div>
                </div>
                <div class="pollutant-desc">${pollutant.desc}</div>
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
    const card = document.getElementById(cardId)?.parentElement;
    if (card) {
        card.classList.toggle('expanded');
    }
}

// ========== Prediction Functions ==========

/**
 * Fetch 24-hour AQI prediction (12h historical + 12h forecast)
 */
async function fetchAQIPrediction(cityName, lat, lon) {
    try {
        console.log('🤖 Fetching ML predictions...');
        
        let targetCity = cityName;
        let targetLat = lat;
        let targetLon = lon;

        // Fallback to currentAQIData if parameters are incomplete
        if (!targetCity && (targetLat === null || targetLat === undefined || targetLon === null || targetLon === undefined)) {
            if (currentAQIData) {
                targetCity = currentAQIData.city?.name || currentAQIData.query_location;
                if (currentAQIData.city?.geo && currentAQIData.city.geo.length >= 2) {
                    targetLat = currentAQIData.city.geo[0];
                    targetLon = currentAQIData.city.geo[1];
                }
            }
        }

        showPredictionSection(); // Show the section card immediately
        showPredictionLoading(); // Show the skeleton inside the section
        document.getElementById('aqiPredictionGraph').style.display = 'none'; // Hide empty graph area
        
        let url;
        // Get current AQI from the displayed data
        const currentAQI = currentAQIData ? currentAQIData.aqi : null;
        
        if (targetCity) {
            url = `/api/aqi/predict/city/${encodeURIComponent(targetCity)}`;
            // Add current_aqi parameter if available
            if (currentAQI) {
                url += `?current_aqi=${currentAQI}`;
            }
        } else if ((targetLat !== null && targetLat !== undefined) && (targetLon !== null && targetLon !== undefined)) {
            url = `/api/aqi/predict/geo?lat=${targetLat}&lng=${targetLon}`;
            // Add current_aqi parameter if available
            if (currentAQI) {
                url += `&current_aqi=${currentAQI}`;
            }
        } else {
            throw new Error('City name or coordinates required');
        }
        
        console.log(`📡 Prediction URL: ${url}`);
        if (currentAQI) {
            console.log(`✓ Using current AQI from display: ${currentAQI}`);
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to fetch predictions');
        }
        
        currentPredictionData = data;
        
        console.log('✅ Predictions received:', data);
        
        // Reveal the graph and hide the skeleton
        hidePredictionLoading();
        document.getElementById('aqiPredictionGraph').style.display = 'block';
        
        // Display the predictions with animation
        displayPredictions(data);
        
        return data;
        
    } catch (error) {
        console.error('❌ Prediction error:', error);
        hidePredictionLoading();
        MessageManager.show(`Prediction error: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Display predictions with Plotly graph
 */
function displayPredictions(predictionData) {
    // Create Plotly graph
    createPredictionGraph(predictionData);
    
    // Update info cards
    updatePredictionInfo(predictionData);
    
    // Generate and display insights
    generatePredictionInsights(predictionData);
}

/**
 * Create beautiful Plotly graph for 24-hour AQI data
 */
function createPredictionGraph(predictionData) {
    const graphDiv = document.getElementById('aqiPredictionGraph');
    
    if (!graphDiv) {
        console.error('Graph container not found');
        return;
    }
    
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;

    // Prepare data arrays
    const historicalTimes = [];
    const historicalAQI = [];
    const forecastTimes = [];
    const forecastAQI = [];
    
    // Extract historical data (12 hours back)
    predictionData.historical_data.forEach(item => {
        historicalTimes.push(item.timestamp);
        historicalAQI.push(parseFloat(item.aqi));
    });
    
    // Extract forecast data (12 hours ahead)
    predictionData.forecast_data.forEach(item => {
        forecastTimes.push(item.timestamp);
        forecastAQI.push(parseFloat(item.aqi));
    });
    
    // Get current AQI for the connecting point
    const currentTime = predictionData.current.timestamp;
    const currentAQI = parseFloat(predictionData.current.aqi);
    
    // Combine historical with current for smooth line
    const allHistoricalTimes = [...historicalTimes, currentTime];
    const allHistoricalAQI = [...historicalAQI, currentAQI];
    
    // Combine current with forecast for smooth line
    const allForecastTimes = [currentTime, ...forecastTimes];
    const allForecastAQI = [currentAQI, ...forecastAQI];
    
    // Define traces
    const traces = [
        // Historical data trace (solid line)
        {
            x: allHistoricalTimes,
            y: allHistoricalAQI,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Historical AQI',
            line: {
                color: '#3b82f6',
                width: isMobile ? 2.5 : 3
            },
            marker: {
                size: isMobile ? 6 : 8,
                color: '#3b82f6'
            },
            hovertemplate: '<b>Time:</b> %{x}<br><b>AQI:</b> %{y:.1f}<br><b>Type:</b> Actual<extra></extra>'
        },
        // Forecast data trace (dashed line)
        {
            x: allForecastTimes,
            y: allForecastAQI,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Predicted AQI',
            line: {
                color: '#8b5cf6',
                width: isMobile ? 2.5 : 3,
                dash: 'dash'
            },
            marker: {
                size: isMobile ? 6 : 8,
                color: '#8b5cf6',
                symbol: 'diamond'
            },
            hovertemplate: '<b>Time:</b> %{x}<br><b>AQI:</b> %{y:.1f}<br><b>Type:</b> Predicted<extra></extra>'
        },
        // Current AQI marker (highlighted)
        {
            x: [currentTime],
            y: [currentAQI],
            type: 'scatter',
            mode: 'markers',
            name: 'Current AQI',
            marker: {
                size: isMobile ? 11 : 15,
                color: '#ef4444',
                symbol: 'star',
                line: {
                    color: 'white',
                    width: 2
                }
            },
            hovertemplate: '<b>CURRENT</b><br><b>Time:</b> %{x}<br><b>AQI:</b> %{y:.1f}<extra></extra>'
        }
    ];
    
    // Define layout with animation and mobile responsiveness
    const layout = {
        hovermode: isMobile ? 'closest' : 'x unified',
        hoverdistance: 50,
        spikedistance: 50,
        transition: {
            duration: 800,
            easing: 'cubic-in-out'
        },
        xaxis: {
            title: {
                text: isSmallMobile ? '' : '<b>Time</b>',
                font: { size: isMobile ? 11 : 14, color: '#4b5563' }
            },
            tickfont: { size: isSmallMobile ? 9 : (isMobile ? 10 : 12) },
            tickformat: '%H:%M',
            tickangle: isMobile ? -45 : 0,
            nticks: isSmallMobile ? 6 : (isMobile ? 8 : 12),
            gridcolor: '#e5e7eb',
            showgrid: true,
            showspikes: !isMobile,
            spikethickness: 2,
            spikedash: 'dot',
            spikecolor: '#9ca3af',
            spikemode: 'across'
        },
        yaxis: {
            title: {
                text: isSmallMobile ? '<b>AQI</b>' : '<b>AQI Value</b>',
                font: { size: isMobile ? 11 : 14, color: '#4b5563' }
            },
            tickfont: { size: isSmallMobile ? 9 : (isMobile ? 10 : 12) },
            gridcolor: '#e5e7eb',
            showgrid: true,
            zeroline: false,
            range: [0, Math.max(400, ...allHistoricalAQI, ...allForecastAQI) + 30]
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        showlegend: true,
        legend: {
            x: 0.5,
            xanchor: 'center',
            y: isMobile ? 1.2 : 1.1,
            yanchor: 'top',
            orientation: 'h',
            font: { size: isSmallMobile ? 9 : (isMobile ? 10 : 12) }
        },
        margin: isSmallMobile 
            ? { l: 30, r: 10, t: 35, b: 50 } 
            : (isMobile ? { l: 40, r: 15, t: 40, b: 45 } : { l: 50, r: 30, t: 50, b: 50 }),
        // AQI category background zones
        shapes: [
            { type: 'rect', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 0, y1: 50, fillcolor: '#10b981', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 51, y1: 100, fillcolor: '#fbbf24', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 101, y1: 200, fillcolor: '#f97316', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 201, y1: 300, fillcolor: '#ef4444', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 301, y1: 400, fillcolor: '#dc2626', opacity: 0.08, line: { width: 0 } }
        ]
    };
    
    // Configuration options
    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        scrollZoom: false
    };
    
    // Create the plot
    Plotly.newPlot(graphDiv, traces, layout, config).then(() => {
        Plotly.Plots.resize(graphDiv);
    });

    if (!window.hasPredictionGraphResizeListener) {
        window.hasPredictionGraphResizeListener = true;
        window.addEventListener('resize', () => {
            const gDiv = document.getElementById('aqiPredictionGraph');
            if (gDiv && gDiv.data) {
                Plotly.Plots.resize(gDiv);
            }
        });
    }
    
    console.log('✅ Plotly mobile-optimized graph created successfully');
}

/**
 * Update prediction info cards
 */
function updatePredictionInfo(predictionData) {
    // Update counts
    const historicalCount = predictionData.historical_data.length;
    const forecastCount = predictionData.forecast_data.length;
    const processingTime = predictionData.metadata.processing_time_ms;
    
    const historicalCountEl = document.getElementById('historicalCount');
    const forecastCountEl = document.getElementById('forecastCount');
    const processingTimeEl = document.getElementById('processingTime');
    
    if (historicalCountEl) {
        historicalCountEl.textContent = `${historicalCount} hours`;
    }
    
    if (forecastCountEl) {
        forecastCountEl.textContent = `${forecastCount} hours`;
    }
    
    if (processingTimeEl) {
        processingTimeEl.textContent = `${processingTime}ms`;
    }
}

/**
 * Generate insights from prediction data
 */
function generatePredictionInsights(predictionData) {
    const insightsDiv = document.getElementById('predictionInsights');
    
    if (!insightsDiv) return;
    
    // Convert to numbers to avoid .toFixed errors
    const currentAQI = parseFloat(predictionData.current.aqi);
    const forecastData = predictionData.forecast_data;
    
    // Calculate trend - ensure all values are numbers
    const firstForecastAQI = parseFloat(forecastData[0].aqi);
    const lastForecastAQI = parseFloat(forecastData[forecastData.length - 1].aqi);
    const aqiChange = lastForecastAQI - currentAQI;
    const aqiChangePercent = ((aqiChange / currentAQI) * 100).toFixed(1);
    
    // Determine trend
    let trendIcon, trendText, trendColor;
    if (aqiChange > 10) {
        trendIcon = '<i class="fas fa-arrow-trend-up"></i>';
        trendText = 'worsening';
        trendColor = '#ef4444';
    } else if (aqiChange < -10) {
        trendIcon = '<i class="fas fa-arrow-trend-down"></i>';
        trendText = 'improving';
        trendColor = '#10b981';
    } else {
        trendIcon = '<i class="fas fa-arrow-right"></i>';
        trendText = 'stable';
        trendColor = '#3b82f6';
    }
    
    // Find peak AQI in forecast - ensure numbers
    const peakAQI = Math.max(...forecastData.map(d => parseFloat(d.aqi)));
    const peakTime = forecastData.find(d => parseFloat(d.aqi) === peakAQI).timestamp;
    const peakHour = new Date(peakTime).getHours();
    
    // Find best AQI in forecast - ensure numbers
    const bestAQI = Math.min(...forecastData.map(d => parseFloat(d.aqi)));
    const bestTime = forecastData.find(d => parseFloat(d.aqi) === bestAQI).timestamp;
    const bestHour = new Date(bestTime).getHours();
    
    // Generate HTML with vibrant colorful icon highlights
    const insightsHTML = `
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
            <li><span style="color: ${trendColor}; font-weight: 600;">${trendIcon} <strong style="color: ${trendColor};">Trend:</strong></span> AQI is predicted to be <strong style="color: ${trendColor};">${trendText}</strong> over the next 12 hours (${aqiChangePercent > 0 ? '+' : ''}${aqiChangePercent}%)</li>
            <li><i class="fas fa-chart-pie" style="color: #3b82f6; width: 20px; text-align: center;"></i> <strong>Current AQI:</strong>&nbsp;${currentAQI.toFixed(1)} (${predictionData.current.category})</li>
            <li><i class="fas fa-chart-line" style="color: #ef4444; width: 20px; text-align: center;"></i> <strong>Peak AQI:</strong>&nbsp;${peakAQI.toFixed(1)} expected around ${peakHour}:00</li>
            <li><i class="fas fa-circle-check" style="color: #10b981; width: 20px; text-align: center;"></i> <strong>Best time:</strong>&nbsp;${bestHour}:00 with AQI of ${bestAQI.toFixed(1)}</li>
            <li><i class="fas fa-bullseye" style="color: #8b5cf6; width: 20px; text-align: center;"></i> <strong>Prediction accuracy:</strong>&nbsp;Our ML models achieve ~85% accuracy on 12-hour forecasts</li>
            <li><i class="fas fa-clock" style="color: #06b6d4; width: 20px; text-align: center;"></i> <strong>Data freshness:</strong>&nbsp;Using ${predictionData.metadata.data_points_used} hours of recent data</li>
        </ul>
        <div style="margin-top: 16px; padding: 12px 16px; background: rgba(245, 158, 11, 0.1); border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.25); font-size: 0.92em; color: #92400e; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-lightbulb" style="color: #f59e0b; font-size: 1.15em; flex-shrink: 0;"></i> 
            <span><strong>Tip:</strong> ${getActivityRecommendation(currentAQI, bestAQI, peakAQI)}</span>
        </div>
    `;
    
    insightsDiv.innerHTML = insightsHTML;
}

/**
 * Get activity recommendation based on AQI trends
 */
function getActivityRecommendation(currentAQI, bestAQI, peakAQI) {
    if (bestAQI < 100) {
        const bestTime = new Date();
        bestTime.setHours(bestTime.getHours() + 1);
        return `Plan outdoor activities for ${bestTime.getHours()}:00 when air quality will be at its best.`;
    } else if (peakAQI > 200) {
        return 'Air quality will remain poor. Consider staying indoors and using air purifiers.';
    } else if (currentAQI > 150) {
        return 'Limit outdoor exposure, especially for sensitive groups. Keep windows closed.';
    } else {
        return 'Moderate air quality expected. Light outdoor activities should be fine for most people.';
    }
}

/**
 * Show prediction loading state
 */
function showPredictionLoading() {
    const loadingDiv = document.getElementById('predictionLoading');
    if (loadingDiv) {
        loadingDiv.style.display = 'flex';
    }
}

/**
 * Hide prediction loading state
 */
function hidePredictionLoading() {
    const loadingDiv = document.getElementById('predictionLoading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Show prediction section
 */
function showPredictionSection() {
    const predictionSection = document.getElementById('predictionSection');
    if (predictionSection) {
        predictionSection.style.display = 'block';
        
        // Smooth scroll to prediction section
        setTimeout(() => {
            predictionSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 300);
    }
}

/**
 * Hide prediction section
 */
function hidePredictionSection() {
    const predictionSection = document.getElementById('predictionSection');
    if (predictionSection) {
        predictionSection.style.display = 'none';
    }
}

// ========== Event Listeners ==========
document.addEventListener('DOMContentLoaded', function () {

    const locationInput = document.getElementById('locationInput');
    const aiAdvisorLocationInput = document.getElementById('aiAdvisorLocation');
    const aiAdvisorAgeInput = document.getElementById('aiAdvisorAge');
    const customQuestion = document.getElementById('customQuestion');

    // Prevent errors if aiAdvisorData is not defined
    window.aiAdvisorData = window.aiAdvisorData || {};

    // Enter key triggers AQI search
    if (locationInput) {
        locationInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchAQI();
            }
        });

        // Sync main location → AI Advisor
        locationInput.addEventListener('input', function () {
            const value = this.value;
            if (aiAdvisorLocationInput) {
                aiAdvisorLocationInput.value = value;
            }
            aiAdvisorData.location = value;
        });

        locationInput.focus();
    }

    // Sync AI Advisor → main location
    if (aiAdvisorLocationInput && locationInput) {
        aiAdvisorLocationInput.addEventListener('input', function () {
            const value = this.value;
            locationInput.value = value;
            aiAdvisorData.location = value;
        });
    }

    // Age input validation
    if (aiAdvisorAgeInput) {
        aiAdvisorAgeInput.addEventListener('input', function () {
            const age = parseInt(this.value, 10);
            if (!isNaN(age) && age >= 1 && age <= 120) {
                aiAdvisorData.age = age;
            }
        });
    }

    // Word count handling
    if (customQuestion) {
        customQuestion.addEventListener('input', updateWordCount);
    }
});

// ========== Word Count ==========
function updateWordCount() {
    const textarea = document.getElementById('customQuestion');
    const wordCountElement = document.getElementById('wordCount');

    if (!textarea || !wordCountElement) return;

    const words = textarea.value.trim().split(/\s+/).filter(Boolean);
    const count = words.length;

    wordCountElement.textContent = `${count}/30 words`;

    if (count > 30) {
        wordCountElement.style.color = '#dc2626';
        wordCountElement.style.fontWeight = '700';
    } else {
        wordCountElement.style.color = '#6b7280';
        wordCountElement.style.fontWeight = '600';
    }

    aiAdvisorData.customQuestion = textarea.value;
}

console.log('✅ AQI Prediction module loaded');